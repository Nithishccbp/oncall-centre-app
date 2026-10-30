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
      <div className="acc__kicker">{ringing ? 'CALLING…' : call.mode === 'aiphone' && call.autoConsent && consent.status === 'none' ? 'AVANI IS ASKING FOR CONSENT' : consent.status === 'none' || consent.status === 'pending' ? 'CONNECTED' : hold ? 'ON HOLD' : 'CALL IN PROGRESS'}</div>
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
        {consent.consentId && !off && <div className="lt__pill">Consent {consent.consentId} · recording on</div>}
        {(consent.status === 'none' || consent.status === 'pending') && <div className="lt__note">Waiting for the customer's answer on recording…</div>}
        {off && <div className="lt__note">Recording is off{consent.status === 'withdrawn' ? ' (consent withdrawn)' : ''} — nothing is being transcribed. Tick the SOP chips yourself as you go.</div>}
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

export default function CallWorkspace() {
  return (
    <div className="cw page-pad">
      <div className="cw__main"><ActiveCallCard /><LiveTranscript /></div>
      <AiAssist />
    </div>
  );
}
