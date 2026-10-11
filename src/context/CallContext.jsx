// Calling flow + shared call history.
// status: idle -> precheck -> ringing -> consent -> inCall -> wrapup -> idle   (incoming calls: incoming -> consent -> ...)
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import { recentCalls as seedCalls } from '../data/calls.js';
import { leads, leadByFirstName } from '../data/leads.js';
import { buildScript, nudges, outcomes, sentimentLabel } from '../data/calling.js';
import { useConsent } from './ConsentContext.jsx';
import { useUi } from './UiContext.jsx';

const Ctx = createContext(null);
const initial = { status: 'idle', name: '', dir: 'out', seconds: 0, script: [], shown: [], scriptIdx: 0, sopDone: [], sentiment: 70 };

function reducer(state, a) {
  switch (a.type) {
    case 'START': return { ...initial, status: 'precheck', name: a.name, dir: 'out' };
    case 'RING': return { ...state, status: 'ringing' };
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
      sopDone: a.line.sop !== undefined && !state.sopDone.includes(a.line.sop) ? [...state.sopDone, a.line.sop] : state.sopDone,
      sentiment: a.line.mood ?? state.sentiment,
    };
    case 'TOGGLE_SOP': return { ...state, sopDone: state.sopDone.includes(a.i) ? state.sopDone.filter((x) => x !== a.i) : [...state.sopDone, a.i] };
    case 'INCOMING': return { ...initial, status: 'incoming', name: a.name, dir: 'in' };
    case 'WRAPUP': return { ...state, status: 'wrapup' };
    case 'RESET': return initial;
    default: return state;
  }
}

export const fmtDuration = (s) => `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
export const fmtClock = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const LINE_MS = 2600;

export function CallProvider({ children }) {
  const [call, dispatch] = useReducer(reducer, initial);
  const [recent, setRecent] = useState(seedCalls);
  const { consent, begin, reset: resetConsent, withdraw, addLog } = useConsent();
  const { showToast } = useUi();
  const lead = leadByFirstName(call.name) || null;

  // ringing -> connected after 1.5 s (then the consent question appears)
  useEffect(() => {
    if (call.status !== 'ringing') return undefined;
    const t = setTimeout(() => { begin(); dispatch({ type: 'CONNECT', script: buildScript(lead) }); }, 1500);
    return () => clearTimeout(t);
  }, [call.status, begin, lead]);

  // call clock runs while the customer is on the line
  const connected = call.status === 'consent' || call.status === 'inCall';
  useEffect(() => {
    if (!connected) return undefined;
    const t = setInterval(() => dispatch({ type: 'TICK' }), 1000);
    return () => clearInterval(t);
  }, [connected]);

  // live transcript only runs while recording is ON (no consent = nothing is captured)
  const transcribing = call.status === 'inCall' && consent.status === 'recording';
  useEffect(() => {
    if (!transcribing) return undefined;
    const t = setInterval(() => dispatch({ type: 'NEXT_LINE' }), LINE_MS);
    return () => clearInterval(t);
  }, [transcribing]);

  const startCall = useCallback((name) => dispatch({ type: 'START', name }), []);
  const placeCall = useCallback(() => dispatch({ type: 'RING' }), []);
  const simulateIncoming = useCallback((name) => {
    const pick = name || leads[Math.floor(Math.random() * leads.length)].name;
    dispatch({ type: 'INCOMING', name: pick });
  }, []);
  const acceptIncoming = useCallback(() => {
    begin();
    dispatch({ type: 'CONNECT', script: buildScript(leadByFirstName(call.name)) });
  }, [begin, call.name]);
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
    if (call.status === 'inCall' || call.status === 'consent') {
      if (call.status === 'consent') addLog(call.seconds, 'Call ended before consent was answered.');
      dispatch({ type: 'WRAPUP' });
    } else {
      dispatch({ type: 'RESET' });
      resetConsent();
    }
  }, [call.status, call.seconds, addLog, resetConsent]);

  const finishWrapup = useCallback(({ outcome, summary, save }) => {
    const entry = {
      id: `c-${Date.now()}`, dir: call.dir, name: call.name, time: 'Just now', duration: fmtDuration(call.seconds),
      live: true, sopDone: call.sopDone, recorded: consent.status === 'recording' || consent.status === 'withdrawn',
      consentId: consent.consentId, outcome: outcome || null, summary: save ? summary : '',
    };
    setRecent((list) => [entry, ...list.map((c) => (c.dir === 'missed' && call.dir === 'out' && c.name.startsWith(call.name.split(' ')[0]) ? { ...c, handled: true } : c))]);
    if (save) {
      const o = outcomes.find((x) => x.id === outcome);
      showToast(`Saved to CRM ✓${o ? ` · closing chance ${o.chance}%` : ''}`);
    } else showToast('Call logged — summary skipped');
    dispatch({ type: 'RESET' });
    resetConsent();
  }, [call, consent, showToast, resetConsent]);

  const sentiment = useMemo(() => ({ value: call.sentiment, label: sentimentLabel(call.sentiment) }), [call.sentiment]);

  const value = useMemo(() => ({
    call, lead, recent, sentiment, dispatch, startCall, placeCall, simulateIncoming, acceptIncoming, goLive, toggleSop,
    addAgentLine, triggerNudge, withdrawConsent, end, finishWrapup,
    leadFor: (name) => leadByFirstName(name),
  }), [call, lead, recent, sentiment, startCall, placeCall, simulateIncoming, acceptIncoming, goLive, toggleSop, addAgentLine, triggerNudge, withdrawConsent, end, finishWrapup]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useCall = () => useContext(Ctx);
