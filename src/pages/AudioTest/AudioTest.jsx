// /audiotest: "Can't hear or talk?" Checks the microphone, the speaker, speech-to-text and the real call path
// (two call peers inside this one page) so you can see which part is broken, in plain words.
import { useCallback, useEffect, useRef, useState } from 'react';
import Peer from 'peerjs';
import { peerOptions } from '../../services/liveCall.js';
import './AudioTest.css';

const micMessage = (e) => ({
  NotAllowedError: 'Blocked. Click the lock icon next to the address bar, set Microphone to Allow, then reload. Also check Windows Settings > Privacy & security > Microphone: "Microphone access" and "Let desktop apps access your microphone" must be On.',
  NotFoundError: 'No microphone found. Plug one in, or enable it in Windows Settings > System > Sound > Input.',
  NotReadableError: 'Another app is using the microphone (Teams, Zoom, WhatsApp, another browser tab). Close it and try again.',
}[e?.name] || `Could not open the microphone (${e?.name || 'error'}).`);

const speechMessage = (code) => ({
  'not-allowed': 'Speech recognition is blocked. Allow the microphone for this site (lock icon in the address bar) and reload.',
  'service-not-allowed': 'Speech recognition is blocked. Allow the microphone for this site (lock icon in the address bar) and reload.',
  'audio-capture': 'No microphone was found for speech recognition.',
  network: 'Speech recognition needs the internet (it uses Google). Check your connection, VPN or firewall.',
  'no-speech': 'It did not hear any speech. Speak closer to the microphone and try again.',
}[code] || `Speech recognition problem (${code}).`);

/** Draws a live level from a MediaStream and remembers the loudest moment. */
function useMeter() {
  const [level, setLevel] = useState(0);
  const peak = useRef(0);
  const ref = useRef({});
  const stop = useCallback(() => {
    cancelAnimationFrame(ref.current.raf);
    try { ref.current.ctx?.close(); } catch { /* ignore */ }
    ref.current = {}; setLevel(0);
  }, []);
  const start = useCallback((stream) => {
    stop(); peak.current = 0;
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC(); ctx.resume?.();
    const an = ctx.createAnalyser(); an.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(an);
    const buf = new Uint8Array(an.fftSize);
    const tick = () => {
      an.getByteTimeDomainData(buf);
      let s = 0; for (const v of buf) { const x = (v - 128) / 128; s += x * x; }
      const rms = Math.sqrt(s / buf.length);
      peak.current = Math.max(peak.current, rms);
      setLevel(Math.min(1, rms * 4));
      ref.current.raf = requestAnimationFrame(tick);
    };
    ref.current = { ctx, raf: requestAnimationFrame(tick) };
  }, [stop]);
  return { level, peak, start, stop };
}

const Bar = ({ level }) => <div className="at__bar"><span style={{ width: `${Math.round(level * 100)}%` }} /></div>;
const Result = ({ r }) => (r ? <p className={`at__res ${r.ok === true ? 'ok' : r.ok === false ? 'bad' : ''}`}>{r.ok === true ? '✅ ' : r.ok === false ? '❌ ' : ''}{r.msg}</p> : null);

export default function AudioTest() {
  const mic = useMeter();
  const loop = useMeter();
  const [micRes, setMicRes] = useState(null);
  const [micBusy, setMicBusy] = useState(false);
  const [spkRes, setSpkRes] = useState(null);
  const [heard, setHeard] = useState('');
  const [srRes, setSrRes] = useState(null);
  const [listening, setListening] = useState(false);
  const [loopRes, setLoopRes] = useState(null);
  const [loopBusy, setLoopBusy] = useState(false);
  const [playback, setPlayback] = useState(false);
  const audioRef = useRef(null);
  const loopRef = useRef({});

  const stopLoop = useCallback(() => {
    const l = loopRef.current;
    clearTimeout(l.timer);
    l.stream?.getTracks().forEach((t) => t.stop());
    try { l.a?.destroy(); l.b?.destroy(); } catch { /* ignore */ }
    loopRef.current = {}; loop.stop(); setLoopBusy(false);
  }, [loop]);
  useEffect(() => () => { mic.stop(); stopLoop(); window.speechSynthesis?.cancel(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 1. microphone
  const testMic = async () => {
    setMicRes(null); setMicBusy(true);
    let stream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { setMicRes({ ok: false, msg: micMessage(e) }); setMicBusy(false); return; }
    const label = stream.getAudioTracks()[0]?.label || 'your microphone';
    setMicRes({ msg: `Listening on "${label}". Say something for 5 seconds…` });
    mic.start(stream);
    setTimeout(() => {
      const p = mic.peak.current;
      mic.stop(); stream.getTracks().forEach((t) => t.stop()); setMicBusy(false);
      setMicRes(p > 0.03
        ? { ok: true, msg: `The microphone works ("${label}").` }
        : { ok: false, msg: `Connected to "${label}" but it heard almost silence. Speak louder, or choose another microphone in Windows Settings > System > Sound > Input (check the volume bar moves there).` });
    }, 5000);
  };

  // 2. speaker
  const beep = () => {
    try {
      const AC = window.AudioContext || window.webkitAudioContext; const ctx = new AC(); ctx.resume?.();
      const o = ctx.createOscillator(); const g = ctx.createGain(); g.gain.value = 0.15; o.frequency.value = 523;
      o.connect(g); g.connect(ctx.destination); o.start(); setTimeout(() => { o.stop(); ctx.close(); }, 900);
      setSpkRes({ msg: 'A beep should be playing now. If you hear nothing, raise your volume and check the output device (speaker icon in the Windows taskbar).' });
    } catch { setSpkRes({ ok: false, msg: 'This browser could not play sound.' }); }
  };
  const voice = () => {
    const s = window.speechSynthesis;
    if (!s) { setSpkRes({ ok: false, msg: 'This browser cannot speak. Use Chrome or Edge.' }); return; }
    s.cancel(); const u = new SpeechSynthesisUtterance('Hello, this is Avani. Can you hear me?'); u.lang = 'en-IN'; s.speak(u);
    setSpkRes({ msg: 'Avani is speaking. If you hear her, the AI voice will work.' });
  };

  // 3. speech to text (how the AI "hears" you)
  const testSpeech = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setSrRes({ ok: false, msg: 'This browser cannot turn speech into text. Use Chrome or Edge on a laptop.' }); return; }
    setHeard(''); setSrRes({ msg: 'Listening… say "I want to buy a home".' }); setListening(true);
    const rec = new SR(); rec.lang = 'en-IN'; rec.interimResults = true; rec.continuous = false;
    let got = false;
    rec.onresult = (e) => { got = true; setHeard(Array.from(e.results).map((r) => r[0].transcript).join(' ')); };
    rec.onerror = (e) => { setSrRes({ ok: false, msg: speechMessage(e.error) }); got = true; };
    rec.onend = () => { setListening(false); setSrRes((r) => (r?.ok === false ? r : got ? { ok: true, msg: 'Speech recognition works. This is what the AI hears.' } : { ok: false, msg: speechMessage('no-speech') })); };
    try { rec.start(); } catch { setListening(false); }
  };

  // 4. the real call path: two call peers in this page; peer A talks, peer B receives
  const testLoop = async () => {
    stopLoop(); setLoopRes({ msg: 'Connecting to the call server…' }); setLoopBusy(true);
    const l = loopRef.current;
    try { l.stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { setLoopRes({ ok: false, msg: micMessage(e) }); setLoopBusy(false); return; }
    const open = (p) => new Promise((res, rej) => { p.on('open', res); p.on('error', rej); });
    try {
      l.a = new Peer(undefined, peerOptions()); l.b = new Peer(undefined, peerOptions());
      await Promise.race([Promise.all([open(l.a), open(l.b)]), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 12000))]);
    } catch { setLoopRes({ ok: false, msg: 'Could not reach the free call server (PeerJS). Try a mobile hotspot: office, college and some home networks block it.' }); stopLoop(); return; }
    setLoopRes({ msg: 'Connected to the call server. Starting a call to yourself… keep talking.' });
    l.b.on('call', (c) => {
      c.answer();
      c.on('stream', (remote) => {
        if (audioRef.current) { audioRef.current.srcObject = remote; audioRef.current.play().catch(() => {}); }
        loop.start(remote);
        setLoopRes({ msg: 'The call is connected. Say something: the bar below should move.' });
        l.timer = setTimeout(() => {
          const ok = loop.peak.current > 0.02;
          setLoopRes(ok ? { ok: true, msg: 'Real calling works end to end: your voice travelled through the call and came back.' }
            : { ok: false, msg: 'The call connected but no sound arrived. Speak louder while it runs, or try another network (hotspot).' });
          stopLoop();
        }, 8000);
      });
    });
    l.a.call(l.b.id, l.stream);
    setTimeout(() => { if (loopRef.current.a === l.a && !loop.peak.current) setLoopRes((r) => (r?.ok === undefined ? { msg: r.msg + ' (waiting for audio…)' } : r)); }, 6000);
  };

  return (
    <div className="at">
      <header><h1>Audio check</h1><p>Can't hear or talk? Run these four tests, top to bottom. Use <b>Chrome</b> on a laptop, and <b>headphones</b> for test 4.</p></header>

      <section><h2>1. Microphone</h2>
        <button onClick={testMic} disabled={micBusy}>Test my microphone</button><Bar level={mic.level} /><Result r={micRes} /></section>

      <section><h2>2. Speaker</h2>
        <div className="at__row"><button onClick={beep}>Play a beep</button><button onClick={voice}>Hear Avani's voice</button></div><Result r={spkRes} /></section>

      <section><h2>3. Speech to text (how the AI hears you)</h2>
        <button onClick={testSpeech} disabled={listening}>{listening ? 'Listening…' : 'Start listening'}</button>
        {heard && <blockquote>"{heard}"</blockquote>}<Result r={srRes} /></section>

      <section><h2>4. Real call test (you call yourself)</h2>
        <p className="at__hint">This uses the same call technology as the app. Wear headphones, press the button and keep talking for 8 seconds.</p>
        <div className="at__row"><button onClick={testLoop} disabled={loopBusy}>Run call test</button>
          <label><input type="checkbox" checked={playback} onChange={(e) => setPlayback(e.target.checked)} /> Play it back (headphones only)</label></div>
        <Bar level={loop.level} /><Result r={loopRes} />
        <audio ref={audioRef} muted={!playback} autoPlay playsInline /></section>
    </div>
  );
}
