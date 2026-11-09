// Inline call workspace (replaces the Plan page while a call is live): call card, live transcript, AI Assist.
import { useEffect, useRef, useState } from 'react';
import { useCall, fmtClock } from '../../context/CallContext.jsx';
import { useConsent } from '../../context/ConsentContext.jsx';
import { useUi } from '../../context/UiContext.jsx';
import AiAssist from './AiAssist.jsx';
import { setMuted as liveMute } from '../../services/liveCall.js';

function ActiveCallCard() {
  const { call, sentiment, end } = useCall();
  const { consent } = useConsent();
  const [muted, setMuted] = useState(false);
  const [hold, setHold] = useState(false);
  const ringing = call.status === 'ringing';
  const tone = sentiment.value >= 65 ? 'pos' : sentiment.value >= 40 ? 'neu' : 'neg';
  return (
    <section className="acc">
      <div className="acc__kicker">{ringing ? 'CALLING…' : call.mode === 'practice' ? 'PRACTICE CALL' : call.mode === 'aiphone' && call.autoConsent && consent.status === 'none' ? 'AVANI IS ASKING FOR CONSENT' : consent.status === 'none' || consent.status === 'pending' ? 'CONNECTED' : hold ? 'ON HOLD' : 'CALL IN PROGRESS'}</div>
      <div className="acc__name">{call.name}</div>
      <div className="acc__time">{fmtClock(call.seconds)}</div>
      {call.mode !== 'sim' && <span className="acc__mode">{{ ai: '🤖 AI → HUMAN · LIVE', human: '🎙️ HUMAN ↔ HUMAN · LIVE', phone: '📞 WEB → PHONE NUMBER · LIVE', staffphone: '☎️ YOUR PHONE → CUSTOMER · LIVE', webphone: '🎧 WEB → CUSTOMER · LIVE', aiphone: '🤖 AI → PHONE NUMBER · LIVE' }[call.mode]}</span>}
      <div className="acc__sent">Sentiment
        <span className="acc__bar"><span className={tone} style={{ width: `${sentiment.value}%` }} /></span>
        <b className={tone}>{sentiment.label}</b>
      </div>
      <div className="acc__btns">
        <button className={muted ? 'on' : ''} aria-pressed={muted} aria-label="Mute" onClick={() => { setMuted(!muted); if (call.mode !== 'sim') liveMute(!muted); }}><i className="ti ti-microphone-off" /></button>
        <button className={hold ? 'on' : ''} aria-pressed={hold} aria-label="Hold" onClick={() => { setHold(!hold); if (call.mode !== 'sim') liveMute(!hold || muted); }}><i className="ti ti-player-pause" /></button>
        <button className="end" aria-label="End call" onClick={end}><i className="ti ti-phone-off" /></button>
      </div>
    </section>
  );
}

const face = (t) => (t < 20 ? '😠' : t < 40 ? '😕' : t < 60 ? '😐' : t < 80 ? '🙂' : '😍');
// Practice only: how much the AI customer trusts you right now, plus a private one-line tip for your next sentence.
function PracticeMeter() {
  const { meter } = useCall();
  const [flash, setFlash] = useState(null);
  useEffect(() => { if (meter && meter.delta) { setFlash(meter.delta); const t = setTimeout(() => setFlash(null), 2200); return () => clearTimeout(t); } return undefined; }, [meter?.trust, meter?.delta]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!meter) return null;
  const t = meter.trust ?? 50; const tone = t >= 60 ? 'pos' : t >= 35 ? 'neu' : 'neg';
  const h = meter.hist || [t]; const pts = h.map((v, i) => `${h.length < 2 ? 0 : (i / (h.length - 1)) * 100},${30 - (v / 100) * 28}`).join(' ');
  return (
    <section className={`pm pm--${tone}`} aria-live="polite">
      <div className="pm__top">
        <span className="pm__face" aria-hidden="true">{face(t)}</span>
        <div className="pm__mid">
          <div className="pm__lbl">Customer trust <span className="pm__hint">{t <= 15 ? 'About to hang up!' : t >= 85 ? 'Close it now!' : ''}</span></div>
          <div className="pm__bar" role="progressbar" aria-valuenow={t} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${t}%` }} /></div>
        </div>
        <b className="pm__n">{t}%{flash ? <em className={flash > 0 ? 'up' : 'dn'}>{flash > 0 ? `+${flash}` : `−${Math.abs(flash)}`}</em> : null}</b>
      </div>
      {h.length > 1 && <svg className="pm__spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><polyline points={pts} fill="none" strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg>}
      {meter.whisper && !meter.result && <div className="pm__whisper"><i className="ti ti-ear" /> <b>Avani whispers</b> {meter.whisper}</div>}
      {meter.result === 'won' && <div className="pm__end pm__end--won">🏆 You won the customer over</div>}
      {meter.result === 'lost' && <div className="pm__end pm__end--lost">📵 The customer hung up</div>}
    </section>
  );
}

function Nudge({ n }) {
  const { openOverlay } = useUi();
  const { withdrawConsent } = useCall();
  const { consent } = useConsent();
  return (
    <div className="tnudge" role="alert">
      <div className="tnudge__t"><i className="ti ti-bulb" /> {n.title}</div>
      <p>{n.body}</p>
      {n.action === 'rights' && <button onClick={() => openOverlay('rights')}>Open Rights panel</button>}
      {n.action === 'withdraw' && <button disabled={consent.status !== 'recording'} onClick={withdrawConsent}>{consent.status === 'recording' ? 'Withdraw consent now' : 'Recording already off'}</button>}
    </div>
  );
}

function LiveTranscript() {
  const { call } = useCall();
  const { consent } = useConsent();
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }); }, [call.shown.length]);

  const off = consent.status === 'declined' || consent.status === 'withdrawn';
  return (
    <section className="lt">
      <h2 className="lt__h"><span className="lt__dot" /> LIVE TRANSCRIPT</h2>
      <div className="lt__body">
        {call.mode === 'practice' && <div className="lt__pill">Practice call · AI customer · nothing is recorded</div>}
        {call.mode !== 'practice' && (consent.status === 'none' || consent.status === 'pending' || consent.status === 'declined') && <div className="lt__pill">On call · recording · ask for consent now</div>}
        {call.mode !== 'practice' && (consent.status === 'recording' || consent.status === 'withdrawn') && <div className="lt__pill">On call · recording · consent given</div>}
        {off && call.mode !== 'practice' && <div className="lt__pill">Recording stopped · nothing after this is kept</div>}
        {call.shown.map((l, i) => (l.who === 'nudge' ? <Nudge key={i} n={l} /> : (
          <div key={i} className={`bub bub--${l.who} ${l.ai ? 'bub--ai' : ''}`}>
            <span className="bub__av">{l.ai ? 'AI' : l.who === 'agent' ? 'AR' : 'C'}</span>
            <div><small>{l.ai ? 'Avani (AI)' : l.who === 'agent' ? 'You' : 'Customer'}</small><p>{l.text}</p></div>
          </div>
        )))}
        <div ref={endRef} />
      </div>
    </section>
  );
}

function PracticeGate() { const { call } = useCall(); return call.mode === 'practice' ? <PracticeMeter /> : null; }

export default function CallWorkspace() {
  return (
    <div className="cw page-pad">
      <div className="cw__main"><ActiveCallCard /><PracticeGate /><LiveTranscript /></div>
      <AiAssist />
    </div>
  );
}
