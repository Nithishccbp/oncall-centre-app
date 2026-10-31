// Calling flow + shared call history.
// status: idle -> precheck -> ringing -> consent -> inCall -> wrapup -> idle   (incoming calls: incoming -> consent -> ...)
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { recentCalls as seedCalls } from '../data/calls.js';
import { leads, leadByFirstName } from '../data/leads.js';
import { logAppCall } from '../data/callLog.js';
import { startPractice } from '../services/practice.js';
import { pickPersona } from '../data/practice.js';
import { buildScript, detectSopSteps, moodOf, nudges, outcomes, sentimentLabel } from '../data/calling.js';
import { setAgentCaptions, setMuted, signal, startLiveCall, stopLiveCall } from '../services/liveCall.js';
import { useConsent } from './ConsentContext.jsx';
import { useUi } from './UiContext.jsx';

const Ctx = createContext(null);
const initial = { status: 'idle', name: '', dir: 'out', seconds: 0, script: [], shown: [], scriptIdx: 0, sopDone: [], sentiment: 70, mode: 'sim', code: '', phone: '', autoConsent: false };

function reducer(state, a) {
  switch (a.type) {
    case 'START': return { ...initial, status: 'precheck', name: a.name, dir: 'out' };
    case 'RING': return { ...state, status: 'ringing', mode: a.mode || 'sim', code: a.code || '', phone: a.phone || '', autoConsent: !!a.autoConsent };
    case 'CONNECT': return { ...state, status: 'consent', seconds: 0, script: a.script, shown: [], scriptIdx: 0, sopDone: [], sentiment: 70 };
    case 'TICK': return { ...state, seconds: state.seconds + 1 };
    case 'GO_LIVE': return { ...state, status: 'inCall' };
    case 'NEXT_LINE': {
      const line = state.script[state.scriptIdx];
      if (!line) return state;
      return {
        ...state, scriptIdx: state.scriptIdx + 1, shown: [...state.shown, line],
        sopDone: line.sop !== undefined && !state.sopDone.includes(line.sop) ? [...state.sopDone, line.sop] : state.sopDone,
        sentiment: line.mood ?? state.sentiment,
      };
    }
    case 'ADD_LINE': return {
      ...state, shown: [...state.shown, a.line],
      sopDone: [...new Set([...state.sopDone, ...(a.line.sop !== undefined ? [a.line.sop] : []), ...(a.line.sops || [])])],
      sentiment: a.line.mood ?? state.sentiment,
    };
    case 'TOGGLE_SOP': return { ...state, sopDone: state.sopDone.includes(a.i) ? state.sopDone.filter((x) => x !== a.i) : [...state.sopDone, a.i] };
    case 'INCOMING': return { ...initial, status: 'incoming', name: a.name, dir: 'in' };
    case 'PRACTICE_INCOMING': return { ...initial, status: 'incoming', name: a.persona.name, dir: 'in', mode: 'practice', persona: a.persona };
    case 'WRAPUP': return { ...state, status: 'wrapup' };
    case 'HANGUP_REMOTE': return state.status === 'inCall' || state.status === 'consent' ? { ...state, status: 'wrapup' } : initial;
    case 'RESET': return initial;
    default: return state;
  }
}

export const fmtDuration = (s) => `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
export const fmtClock = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const LINE_MS = 2600;

const REC_KEY = 'og_recent_calls';
const loadLocal = () => { try { return JSON.parse(localStorage.getItem(REC_KEY) || '[]').filter((c) => Date.now() - new Date(c.ts).getTime() < 30 * 864e5); } catch { return []; } };

export function CallProvider({ children }) {
  const [call, dispatch] = useReducer(reducer, initial);
  const [recent, setRecent] = useState(() => [...loadLocal(), ...seedCalls]);
  // Calls made or received in this app survive a reload (the backend's own calls come back from the API).
  useEffect(() => { try { localStorage.setItem(REC_KEY, JSON.stringify(recent.filter((c) => c.local).slice(0, 100))); } catch { /* ignore */ } }, [recent]);
  const logCall = useCallback((dir, name, duration = '—', extra = {}) => {
    setRecent((list) => [{ id: `c-${Date.now()}-${list.length}`, dir, name: name || 'Unknown', time: 'Just now', ts: new Date().toISOString(), local: true, duration, ...extra }, ...list]);
  }, []);
  const mergeRecent = useCallback((list) => setRecent((cur) => {
    const have = new Set(cur.map((c) => c.id));
    const add = list.filter((c) => !have.has(c.id));
    return add.length ? [...add, ...cur] : cur;
  }), []);
  const { consent, begin, reset: resetConsent, withdraw, addLog, grant, refuse } = useConsent();
  const secsRef = useRef(0);
  const { showToast } = useUi();
  const lead = leadByFirstName(call.name) || null;
  secsRef.current = call.seconds;

  // Live (real) calls push the remote person's / AI's words into the transcript through this handler.
  const onLiveLine = useCallback((l) => {
    dispatch({ type: 'ADD_LINE', line: { who: l.who, ai: l.ai, text: l.text, mood: l.who === 'cust' ? moodOf(l.text) : undefined, sops: l.who === 'agent' ? detectSopSteps(l.text) : [] } });
  }, []);
  const liveHandlers = useMemo(() => ({
    onLine: onLiveLine,
    onEnd: (reason) => { showToast(reason); dispatch({ type: 'HANGUP_REMOTE' }); },
  }), [onLiveLine, showToast]);

  // ringing -> connected: simulated calls after 1.5 s; real calls when the other person answers
  useEffect(() => {
    if (call.status !== 'ringing') return undefined;
    if (call.mode === 'sim') {
      const t = setTimeout(() => { begin(); dispatch({ type: 'CONNECT', script: buildScript(lead) }); }, 1500);
      return () => clearTimeout(t);
    }
    let cancelled = false;
    // Avani asks for recording consent out loud on a phone call; her server tells us what the customer answered.
    const onConsent = (v) => {
      if (v === 'yes') { const id = grant(secsRef.current, 'Verbal'); showToast(`Consent ${id} · recording on`); } else { refuse(secsRef.current, 'said no on the phone'); showToast('Customer declined recording'); }
      dispatch({ type: 'GO_LIVE' });
    };
    startLiveCall({ mode: call.mode, code: call.code, phone: call.phone, lead, handlers: { ...liveHandlers, onConsent } })
      .then(() => { if (!cancelled) { begin(); dispatch({ type: 'CONNECT', script: [] }); } })
      .catch((e) => { if (!cancelled) { showToast(e.message); logCall('out', call.name, '—', { note: 'Not connected' }); dispatch({ type: 'RESET' }); resetConsent(); } });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call.status === 'ringing']);

  // call clock runs while the customer is on the line
  const connected = call.status === 'consent' || call.status === 'inCall';
  useEffect(() => {
    if (!connected) return undefined;
    const t = setInterval(() => dispatch({ type: 'TICK' }), 1000);
    return () => clearInterval(t);
  }, [connected]);

  // live transcript only runs while recording is ON (no consent = nothing is captured)
  const transcribing = call.status === 'inCall' && consent.status === 'recording' && call.mode === 'sim';
  useEffect(() => {
    if (!transcribing) return undefined;
    const t = setInterval(() => dispatch({ type: 'NEXT_LINE' }), LINE_MS);
    return () => clearInterval(t);
  }, [transcribing]);

  // Consent is enforced on the real call too: the other side only transcribes while recording consent is ON,
  // and the AI voice agent only starts talking once the consent step is finished.
  const aiStarted = useRef(false);
  useEffect(() => {
    if (call.mode === 'sim' || call.mode === 'practice' || !['consent', 'inCall'].includes(call.status)) { aiStarted.current = false; return; }
    if (call.mode === 'phone' || call.mode === 'webphone') { setAgentCaptions(consent.status === 'recording', onLiveLine); return; }
    if (call.mode === 'aiphone' || call.mode === 'staffphone') return; // Avani and the server handle consent and transcript on that call
    const on = consent.status === 'recording';
    signal({ type: 'transcribe', on });
    if (call.mode === 'human') setAgentCaptions(on, onLiveLine);
    if (call.mode === 'ai' && call.status === 'inCall' && !aiStarted.current) { aiStarted.current = true; signal({ type: 'start' }); }
  }, [call.status, call.mode, consent.status, onLiveLine]);

  // Practise a call: once the agent picks up, the AI customer starts talking.
  const practiceOn = useRef(false);
  useEffect(() => {
    if (call.mode !== 'practice' || call.status !== 'inCall') { if (call.status !== 'inCall') practiceOn.current = false; return; }
    if (practiceOn.current) return;
    practiceOn.current = true;
    startPractice({ persona: call.persona, onLine: onLiveLine, onEnd: (m) => { showToast(m); dispatch({ type: 'HANGUP_REMOTE' }); }, onError: (m) => showToast(m) });
  }, [call.status, call.mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const startCall = useCallback((name) => dispatch({ type: 'START', name }), []);
  const placeCall = useCallback((opts) => dispatch({ type: 'RING', ...(opts || {}) }), []);
  const simulateIncoming = useCallback((name) => {
    const pick = name || (leads.length ? leads[Math.floor(Math.random() * leads.length)].name : 'Unknown caller');
    dispatch({ type: 'INCOMING', name: pick });
  }, []);
  const practiceCall = useCallback(() => dispatch({ type: 'PRACTICE_INCOMING', persona: pickPersona() }), []);
  const acceptIncoming = useCallback(() => {
    begin();
    if (call.mode === 'practice') { dispatch({ type: 'CONNECT', script: [] }); dispatch({ type: 'GO_LIVE' }); return; } // practice: no consent step, nothing is recorded
    dispatch({ type: 'CONNECT', script: buildScript(leadByFirstName(call.name)) });
  }, [begin, call.name, call.mode]);
  const goLive = useCallback(() => dispatch({ type: 'GO_LIVE' }), []);
  const toggleSop = useCallback((i) => dispatch({ type: 'TOGGLE_SOP', i }), []);
  const addAgentLine = useCallback((text, sop) => dispatch({ type: 'ADD_LINE', line: { who: 'agent', text, sop } }), []);

  /** Demo nudges: customer says something about recording/data, assistant tells the agent what to do. */
  const triggerNudge = useCallback((key) => {
    const n = nudges[key];
    if (!n) return;
    dispatch({ type: 'ADD_LINE', line: { who: 'cust', text: n.customer, mood: key === 'stop' ? 25 : key === 'unsure' ? 45 : undefined } });
    dispatch({ type: 'ADD_LINE', line: { who: 'nudge', ...n, key } });
  }, []);

  const withdrawConsent = useCallback(() => {
    withdraw(call.seconds);
    showToast('Consent withdrawn — recording stopped');
  }, [withdraw, call.seconds, showToast]);

  /** Hang up. With a live customer we go to the wrap-up form; otherwise just close. */
  const end = useCallback(() => {
    if (call.status === 'ringing') logCall('out', call.name, '—', { note: 'Not connected' });
    if (call.status === 'incoming') logCall('missed', call.name, '—');
    if (call.mode !== 'sim') stopLiveCall();
    if (call.status === 'inCall' || call.status === 'consent') {
      if (call.status === 'consent') addLog(call.seconds, 'Call ended before consent was answered.');
      dispatch({ type: 'WRAPUP' });
    } else {
      dispatch({ type: 'RESET' });
      resetConsent();
    }
  }, [call.status, call.seconds, call.name, call.mode, addLog, resetConsent, logCall]);

  const finishWrapup = useCallback(({ outcome, summary, save }) => {
    const entry = {
      id: `c-${Date.now()}`, dir: call.dir, name: call.name, time: 'Just now', ts: new Date().toISOString(), local: true, duration: `${fmtDuration(call.seconds)}${call.mode === 'practice' ? ' · Practice' : ''}`,
      live: true, sopDone: call.sopDone, recorded: consent.status === 'recording' || consent.status === 'withdrawn',
      consentId: consent.consentId, outcome: outcome || null, summary: save ? summary : '',
    };
    setRecent((list) => [entry, ...list.map((c) => (c.dir === 'missed' && call.dir === 'out' && c.name.startsWith(call.name.split(' ')[0]) ? { ...c, handled: true } : c))]);
    if (call.dir === 'out') {
      const lo = outcomes.find((x) => x.id === outcome);
      logAppCall({ name: call.name, leadId: lead?.id, dur: call.seconds, outcome: summary ? summary.split(/[.\n]/)[0].slice(0, 60) : (lo?.label || 'Called'), summary });
      if (lead) lead.called = true;
    }
    if (save) {
      const o = outcomes.find((x) => x.id === outcome);
      showToast(`Saved to CRM ✓${o ? ` · closing chance ${o.chance}%` : ''}`);
    } else showToast('Call logged — summary skipped');
    dispatch({ type: 'RESET' });
    resetConsent();
  }, [call, consent, showToast, resetConsent]);

  const sentiment = useMemo(() => ({ value: call.sentiment, label: sentimentLabel(call.sentiment) }), [call.sentiment]);

  const value = useMemo(() => ({
    call, lead, recent, mergeRecent, sentiment, dispatch, startCall, placeCall, simulateIncoming, practiceCall, acceptIncoming, goLive, toggleSop,
    addAgentLine, triggerNudge, withdrawConsent, end, finishWrapup,
    leadFor: (name) => leadByFirstName(name),
  }), [call, lead, recent, mergeRecent, sentiment, startCall, placeCall, simulateIncoming, practiceCall, acceptIncoming, goLive, toggleSop, addAgentLine, triggerNudge, withdrawConsent, end, finishWrapup]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useCall = () => useContext(Ctx);
