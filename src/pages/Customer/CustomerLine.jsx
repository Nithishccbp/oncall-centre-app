// /customer — the "customer's phone". Open it on a second device/tab: it shows a line code, rings when the
// call centre calls, and either connects a human voice call or lets the AI agent (Avani) talk to you.
import { useCallback, useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';
import { LINE_PREFIX, peerOptions, speechSupported, startCaptions } from '../../services/liveCall.js';
import { nextAiReply } from '../../services/aiAgent.js';
import './Customer.css';

const speechMsg = (c) => ({ 'not-allowed': 'Speech input is blocked: allow the microphone for this site and reload.', 'service-not-allowed': 'Speech input is blocked: allow the microphone for this site and reload.', 'audio-capture': 'No microphone found for speech input.', network: 'Speech input needs the internet (Google). Check your connection or VPN.' }[c] || `Speech input problem (${c}).`);
const randomCode = () => String(Math.floor(10000 + Math.random() * 90000));
const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function CustomerLine() {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState('connecting'); // connecting | ready | ringing | incall | error
  const [error, setError] = useState('');
  const [kind, setKind] = useState('human');
  const [caller, setCaller] = useState('');
  const [lines, setLines] = useState([]);
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [typed, setTyped] = useState('');
  const [source, setSource] = useState('');
  const [speechErr, setSpeechErr] = useState('');
  const r = useRef({ peer: null, conn: null, call: null, stream: null, audio: null, caps: null, share: false, lead: null, history: [], speaking: false, kind: 'human' });
  const endRef = useRef(null);

  const addLine = useCallback((who, text, ai = false) => {
    setLines((l) => [...l, { who, text, ai }]);
    const s = r.current;
    if (s.share && s.conn?.open) s.conn.send({ type: 'line', who, text, ai });
  }, []);

  const speak = (text) => new Promise((resolve) => {
    const synth = window.speechSynthesis;
    if (!synth) { resolve(); return; }
    r.current.speaking = true;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-IN'; u.rate = 1;
    const done = () => { r.current.speaking = false; resolve(); };
    u.onend = done; u.onerror = done;
    synth.cancel(); synth.speak(u);
    setTimeout(done, 4000 + text.length * 90);
  });

  const aiSay = useCallback(async (text) => { r.current.history.push({ role: 'ai', text }); addLine('agent', text, true); await speak(text); }, [addLine]);

  const aiHear = useCallback(async (text) => {
    const s = r.current;
    if (s.busy) return;
    s.busy = true;
    addLine('cust', text);
    s.history.push({ role: 'user', text });
    const reply = await nextAiReply(s.history, s.lead);
    setSource(reply.source);
    await aiSay(reply.text);
    s.busy = false;
  }, [addLine, aiSay]);

  const cleanup = useCallback((notify) => {
    const s = r.current;
    try { if (notify && s.conn?.open) s.conn.send({ type: 'end' }); } catch { /* ignore */ }
    s.caps?.stop(); s.caps = null;
    s.stream?.getTracks().forEach((t) => t.stop()); s.stream = null;
    try { s.call?.close(); } catch { /* ignore */ }
    if (s.audio) s.audio.srcObject = null;
    window.speechSynthesis?.cancel();
    s.call = null; s.share = false; s.busy = false; s.history = [];
    setSharing(false); setSeconds(0); setMuted(false); setLines([]); setSource(''); setSpeechErr('');
    setStatus('ready');
  }, []);

  // keep the transcript scrolled
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }); }, [lines.length]);

  // call timer
  useEffect(() => {
    if (status !== 'incall') return undefined;
    const t = setInterval(() => setSeconds((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  // register this page as a "phone line"
  useEffect(() => {
    let alive = true;
    let peer;
    const open = (attempt = 0) => {
      const c = randomCode();
      peer = new Peer(`${LINE_PREFIX}${c}`, peerOptions());
      r.current.peer = peer;
      peer.on('open', () => { if (alive) { setCode(c); setStatus('ready'); } });
      peer.on('error', (e) => {
        if (!alive) return;
        if (e.type === 'unavailable-id' && attempt < 5) { peer.destroy(); open(attempt + 1); return; }
        setError(`Could not reach the call server (${e.type}). Refresh to retry.`); setStatus('error');
      });
      peer.on('connection', (conn) => {
        r.current.conn = conn;
        conn.on('data', (msg) => {
          const s = r.current;
          if (msg.type === 'human-call') { setKind('human'); s.kind = 'human'; setCaller(msg.agent || 'Call Centre'); }
          if (msg.type === 'ai-call') { s.kind = 'ai'; setKind('ai'); s.lead = msg.lead; setCaller('On-Ground AI · Avani'); setStatus('ringing'); }
          if (msg.type === 'transcribe') {
            s.share = !!msg.on; setSharing(!!msg.on);
            if (s.kind === 'human' && s.stream) {
              if (msg.on && !s.caps) s.caps = startCaptions((t) => addLine('cust', t));
              if (!msg.on) { s.caps?.stop(); s.caps = null; }
            }
          }
          if (msg.type === 'start' && s.kind === 'ai') {
            const first = (s.lead?.name || 'there').split(' ')[0];
            aiSay(`Hi ${first}, this is Avani from Godrej Properties. Is this a good time to talk about the ${s.lead?.product || 'product'} you were interested in?`);
            if (speechSupported()) s.caps = startCaptions((t) => { if (!s.speaking) aiHear(t); }, 'en-IN', (c) => setSpeechErr(speechMsg(c)));
          }
          if (msg.type === 'end') cleanup(false);
        });
        conn.on('close', () => { if (r.current.call || r.current.kind === 'ai') cleanup(false); });
      });
      peer.on('call', (call) => { r.current.call = call; r.current.kind = 'human'; setKind('human'); setStatus('ringing'); });
    };
    open();
    return () => { alive = false; r.current.caps?.stop(); r.current.stream?.getTracks().forEach((t) => t.stop()); peer?.destroy(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const accept = async () => {
    const s = r.current;
    if (s.kind === 'ai') {
      s.conn?.send({ type: 'accepted' });
      setStatus('incall');
      return;
    }
    try {
      s.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch { setError('Microphone permission is needed to talk.'); return; }
    s.call.answer(s.stream);
    s.call.on('stream', (remote) => { s.audio = new Audio(); s.audio.srcObject = remote; s.audio.autoplay = true; s.audio.play().catch(() => {}); });
    s.call.on('close', () => cleanup(false));
    setStatus('incall');
    if (s.share) s.caps = startCaptions((t) => addLine('cust', t));
  };

  const decline = () => { r.current.conn?.send({ type: 'declined' }); try { r.current.call?.close(); } catch { /* ignore */ } r.current.call = null; setStatus('ready'); };
  const toggleMute = () => { const m = !muted; setMuted(m); r.current.stream?.getAudioTracks().forEach((t) => { t.enabled = !m; }); };
  const sendTyped = (e) => { e.preventDefault(); const t = typed.trim(); if (!t) return; setTyped(''); if (kind === 'ai') aiHear(t); else addLine('cust', t); };

  return (
    <div className="cu">
      <header className="cu__head"><span className="cu__logo">OG</span><div><b>Customer line</b><small>Demo phone for the Call Centre app</small></div></header>

      {status === 'connecting' && <div className="cu__card"><i className="ti ti-loader-2 spin" /> Getting your line…</div>}
      {status === 'error' && <div className="cu__card cu__err">{error} <a href="/audiotest" target="_blank" rel="noreferrer">Run the audio check</a></div>}

      {(status === 'ready' || status === 'ringing') && (
        <div className="cu__card cu__code">
          <small>YOUR LINE CODE</small>
          <div className="cu__num" aria-label="Line code">{code}</div>
          <p>Type this code in the Call Centre app when you place a <b>Human call</b> or an <b>AI call</b>. Keep this page open and allow the microphone.</p>
          <div className="cu__wait">{status === 'ready' ? <><span className="cu__dot" /> Waiting for a call…</> : null}</div>
          <p style={{ fontSize: 12.5, marginTop: 10 }}>Can't hear or talk? <a href="/audiotest" target="_blank" rel="noreferrer">Test your microphone and speaker</a></p>
        </div>
      )}

      {status === 'ringing' && (
        <div className="cu__ring" role="alertdialog" aria-label="Incoming call">
          <div className="cu__av">{kind === 'ai' ? '🤖' : '☎️'}</div>
          <div className="cu__who">{caller || 'Call Centre'}</div>
          <div className="cu__sub">{kind === 'ai' ? 'AI voice call — speak or type to reply' : 'Incoming voice call'}</div>
          <div className="cu__btns"><button className="decline" onClick={decline} aria-label="Decline"><i className="ti ti-phone-off" /></button>
            <button className="accept" onClick={accept} aria-label="Accept"><i className="ti ti-phone" /></button></div>
        </div>
      )}

      {status === 'incall' && (
        <div className="cu__card cu__live">
          <div className="cu__livehead"><span className="cu__dot red" /> {kind === 'ai' ? 'Talking to Avani (AI)' : `On call with ${caller || 'Call Centre'}`} · {fmt(seconds)}</div>
          <div className="cu__priv">{sharing ? '🔴 You agreed to recording — the call centre sees this transcript.' : '⚪ Not recording — nothing is shared.'}{kind === 'ai' && source ? ` · AI: ${source}` : ''}</div>
          {speechErr && <div className="cu__priv" style={{ background: '#fdecec', color: '#b42318' }}>{speechErr} You can still type your reply below.</div>}
          <div className="cu__lines">
            {lines.length === 0 && <div className="cu__empty">{kind === 'ai' ? 'Avani will start talking once the agent finishes the consent step…' : 'Speak — you are live.'}</div>}
            {lines.map((l, i) => <div key={i} className={`cu__line ${l.who}`}><small>{l.ai ? 'Avani (AI)' : l.who === 'cust' ? 'You' : 'Agent'}</small><p>{l.text}</p></div>)}
            <div ref={endRef} />
          </div>
          {kind === 'ai' && (
            <form className="cu__type" onSubmit={sendTyped}>
              <input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={speechSupported() ? 'Speak, or type a reply…' : 'Type your reply (speech input needs Chrome)…'} aria-label="Type a reply" />
              <button aria-label="Send reply"><i className="ti ti-send" /></button>
            </form>
          )}
          <div className="cu__btns">
            {kind === 'human' && <button className={muted ? 'on' : ''} onClick={toggleMute} aria-label="Mute"><i className="ti ti-microphone-off" /></button>}
            <button className="decline" onClick={() => cleanup(true)} aria-label="Hang up"><i className="ti ti-phone-off" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
