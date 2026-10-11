// After hang-up: AI-drafted summary (editable), outcome chips, Save to CRM.
import { useEffect, useState } from 'react';
import Modal from '../Modal/Modal.jsx';
import { useCall, fmtClock } from '../../context/CallContext.jsx';
import { useConsent } from '../../context/ConsentContext.jsx';
import { draftSummary, outcomes } from '../../data/calling.js';

export default function WrapUpModal() {
  const { call, lead, finishWrapup } = useCall();
  const { consent } = useConsent();
  const open = call.status === 'wrapup';
  const [summary, setSummary] = useState('');
  const [outcome, setOutcome] = useState(null);

  useEffect(() => {
    if (!open) return;
    const noTranscript = consent.status === 'declined' || call.shown.length === 0;
    setSummary(noTranscript
      ? `Recording was off for this call with ${call.name.split(' ')[0]}. Add your notes here.`
      : draftSummary(lead, call.shown.filter((l) => l.who !== 'nudge'), call.sopDone));
    setOutcome(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Modal open={open} onClose={() => finishWrapup({ save: false })} width={480} label="Call wrap-up">
      <div className="wu__head">
        <span className="wu__ic"><i className="ti ti-phone-check" /></span>
        <div><div className="wu__title">Call with {call.name}</div><div className="muted">{fmtClock(call.seconds)} · just now</div></div>
      </div>
      <div className="wu__cap"><i className="ti ti-sparkles" /> AI-DRAFTED SUMMARY — EDIT IF NEEDED</div>
      <textarea className="wu__text" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} aria-label="Call summary" />
      <div className="wu__cap muted">OUTCOME</div>
      <div className="wu__chips">
        {outcomes.map((o) => (
          <button key={o.id} className={outcome === o.id ? 'on' : ''} aria-pressed={outcome === o.id} onClick={() => setOutcome(o.id)}><i className={`ti ${o.icon}`} /> {o.label}</button>
        ))}
      </div>
      <div className="wu__btns">
        <button className="wu__skip" onClick={() => finishWrapup({ save: false })}>Skip</button>
        <button className="wu__save" onClick={() => finishWrapup({ save: true, summary, outcome })}><i className="ti ti-database-plus" /> Save to CRM</button>
      </div>
    </Modal>
  );
}
