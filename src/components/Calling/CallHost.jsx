// Global calling pieces: pre-call SOP check, incoming card, consent gate, wrap-up, rights panel, status bar, DEMO strip, keypad + dial button.
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Modal from '../Modal/Modal.jsx';
import ConsentGate from './ConsentGate.jsx';
import ConsentBar from './ConsentBar.jsx';
import ConsentLog from './ConsentLog.jsx';
import RightsPanel from './RightsPanel.jsx';
import WrapUpModal from './WrapUpModal.jsx';
import DemoStrip from './DemoStrip.jsx';
import { useCall, fmtClock } from '../../context/CallContext.jsx';
import { loadConfig, normalizePhone } from '../../services/phoneCall.js';
import { checkpointsFor, leadMeta, pitchFor } from '../../data/calling.js';
import { formatINR } from '../../data/selectors.js';
import './Calling.css';

const initials = (name) => name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();

/** "Before you call X": product to champion, pitching language, cross-sell, ideal EMI, SOP checkpoints. */
const modes = [
  { id: 'phone', label: '📞 Phone number', group: 'phone', hint: 'Real call to a normal mobile or landline number, spoken through this browser (Twilio).' },
  { id: 'aiphone', label: '🤖 AI → phone', group: 'phone', hint: 'Avani, our AI agent, rings a real phone number and talks to the customer (Twilio + Gemini).' },
  { id: 'sim', label: 'Practice', hint: 'Simulated customer — no mic needed.' },
  { id: 'human', label: 'Human (web)', hint: 'Real two-way voice with a person on the customer page.' },
  { id: 'ai', label: 'AI (web)', hint: 'Our AI agent (Avani) phones the person on the customer page.' },
];

function PreCall({ onPlace }) {
  const { call, lead, end } = useCall();
  const [mode, setMode] = useState('phone');
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [cfg, setCfg] = useState(null);
  useEffect(() => { loadConfig().then(setCfg); }, []);
  const isPhone = mode === 'phone' || mode === 'aiphone';
  const needCode = mode === 'human' || mode === 'ai';
  const phoneOk = !!normalizePhone(phone);
  const ready = !isPhone || !cfg || (mode === 'phone' ? cfg.phone : cfg.aiPhone);
  const canPlace = (!needCode || code.length >= 5) && (!isPhone || (phoneOk && ready));
  const first = call.name.split(' ')[0];
  const meta = leadMeta(lead);
  return (
    <Modal open onClose={end} width={460} flush label="Before you call">
      <div className="pc__head">
        <span className="pc__av">{initials(call.name)}</span>
        <div><div className="pc__title">Before you call {first}</div><div className="pc__sub">Lead SOP parameters · review, then place the call</div></div>
      </div>
      <div className="pc__scroll">
        {lead ? (
          <>
            <div className="pc__champ">
              <span className="pc__emoji">🛏️</span>
              <div><small>PRODUCT TO CHAMPION</small><b>{lead.product}</b>
                <span>{formatINR(lead.price)} <s>{formatINR(meta.mrp)}</s></span></div>
            </div>
            <p className="pc__why">{lead.actionNote} — {lead.signals[0].quote.split(' — ')[0]}.</p>
            <div className="pc__cap">PITCHING LANGUAGE</div>
            <blockquote className="pc__quote">{pitchFor(lead)}</blockquote>
            <div className="pc__two">
              <div><small>💊 Cross-sell</small><b>{lead.crossSell}</b></div>
              <div><small>Ideal EMI</small><b className="green">{formatINR(meta.idealEmi)}/mo</b><span>12-month zero-interest EMI</span></div>
            </div>
            <div className="pc__cap center">LEAD SOP CHECKPOINTS</div>
            {checkpointsFor(lead).map((c) => (
              <div key={c.category} className={`pc__cp ${c.relevant ? 'rel' : ''}`}>
                <span className="pc__dot" />
                <div><b>{c.category}{c.relevant && <em> · relevant here</em>}</b><span>{c.text}</span></div>
              </div>
            ))}
          </>
        ) : (
          <p className="muted pc__none">No lead record for {call.name} yet — qualify the need first, then offer the right product.</p>
        )}
      </div>
      <div className="pc__foot">
        <div className="pc__modes" role="radiogroup" aria-label="Call type">
          {modes.map((m) => <button key={m.id} role="radio" aria-checked={mode === m.id} className={mode === m.id ? 'on' : ''} onClick={() => setMode(m.id)}>{m.label}</button>)}
        </div>
        <p className="pc__hint">{modes.find((m) => m.id === mode).hint}</p>
        {isPhone && (
          <label className="pc__code">Customer's real phone number
            <input className="pc__tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d+ ]/g, '').slice(0, 16))} inputMode="tel" placeholder="e.g. 98765 43210 or +91…" aria-label="Customer phone number" />
            <small className="pc__note">{phone && !phoneOk ? 'This number does not look right.' : 'Demo leads have fake numbers — type a real one you can answer.'}</small>
          </label>
        )}
        {isPhone && cfg && !ready && <p className="pc__warn">Phone calling is not switched on for this site yet. Add the Twilio keys in Vercel (README → “Real phone calls”).</p>}
        {isPhone && cfg && !cfg.reachable && <p className="pc__warn">The /api server is not reachable here. Phone calls work on the deployed Vercel site (or with “vercel dev”), not plain “npm run dev”.</p>}
        {needCode && (
          <label className="pc__code">Customer line code
            <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 5))} inputMode="numeric" placeholder="5 digits shown on /customer" aria-label="Customer line code" />
          </label>
        )}
        <button className="pc__place" disabled={!canPlace} onClick={() => onPlace({ mode, code, phone: normalizePhone(phone) || '', autoConsent: !!cfg?.transcripts })}><i className="ti ti-phone" /> {mode === 'sim' ? 'Skip · Place the call' : 'Place the live call'}</button>
        <p>These are the same Lead SOP checkpoints your manager set — reviewing them takes 10 seconds and keeps the call on-target.</p>
      </div>
    </Modal>
  );
}

function Incoming() {
  const { call, lead, end, acceptIncoming } = useCall();
  const navigate = useNavigate();
  return (
    <Modal open onClose={end} width={380} label="Incoming call">
      <div className="incall">
        <div className="call-av pulse">{initials(call.name)}</div>
        <div className="incall__status">Incoming call</div>
        <div className="incall__name">{call.name}</div>
        {lead && <div className="muted">Interested: {lead.product}</div>}
        <div className="incall__btns">
          <button className="round decline" onClick={end} aria-label="Decline"><i className="ti ti-phone-off" /></button>
          <button className="round accept" onClick={() => { navigate('/plan/outgoing'); acceptIncoming(); }} aria-label="Accept"><i className="ti ti-phone" /></button>
        </div>
      </div>
    </Modal>
  );
}

function Keypad({ onClose, startCall }) {
  const [num, setNum] = useState('');
  return (
    <Modal open onClose={onClose} width={320} label="Keypad">
      <div className="kp-num">{num || 'Enter number'}</div>
      <div className="kp-grid">
        {'123456789*0#'.split('').map((d) => <button key={d} onClick={() => setNum(num + d)}>{d}</button>)}
      </div>
      <button className="btn-primary call-wide" disabled={!num} onClick={() => { onClose(); startCall(num); }}><i className="ti ti-phone" /> Call</button>
    </Modal>
  );
}

export default function CallHost() {
  const { call, placeCall, startCall } = useCall();
  const [pad, setPad] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const live = ['ringing', 'consent', 'inCall'].includes(call.status);

  const place = (opts) => { if (!pathname.startsWith('/plan')) navigate('/plan/outgoing'); placeCall(opts); };

  return (
    <>
      {call.status === 'precheck' && <PreCall onPlace={place} />}
      {call.status === 'incoming' && <Incoming />}
      <ConsentGate />
      <WrapUpModal />
      <RightsPanel />
      <ConsentLog />
      <ConsentBar />
      {live && !pathname.startsWith('/plan') && (
        <button className="call-pill" onClick={() => navigate('/plan/outgoing')}>
          <span className="call-pill__dot" /> {call.name} · {fmtClock(call.seconds)} · Return to call
        </button>
      )}
      <DemoStrip />
      <button className="dial-fab" onClick={() => setPad(true)} aria-label="Open keypad"><i className="ti ti-keyboard" /></button>
      {pad && <Keypad onClose={() => setPad(false)} startCall={startCall} />}
    </>
  );
}
