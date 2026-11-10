// After hang-up: AI-drafted summary (editable), outcome chips, Save to CRM.
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../Modal/Modal.jsx';
import { useCall, fmtClock } from '../../context/CallContext.jsx';
import { useConsent } from '../../context/ConsentContext.jsx';
import { draftSummary, outcomes } from '../../data/calling.js';
import { estimateCsat } from '../../services/csatEstimate.js';
import { estimateNotes, OBJECTIONS } from '../../services/callNotes.js';

export default function WrapUpModal() {
  const { call, lead, finishWrapup, finishPractice } = useCall();
  const navigate = useNavigate();
  const { consent } = useConsent();
  const open = call.status === 'wrapup';
  const [summary, setSummary] = useState('');
  const [outcome, setOutcome] = useState(null);
  const [csat, setCsat] = useState(0);
  const [cmt, setCmt] = useState('');
  const [rating, setRating] = useState('idle'); // idle | busy | done | none
  const [notes, setNotes] = useState(null);
  const setN = (k, v) => setNotes((n) => ({ ...(n || {}), [k]: v }));

  // Practice calls skip the CRM wrap-up: they are saved in Practise a call, with a review.
  useEffect(() => {
    if (!open || call.mode !== 'practice') return;
    const id = finishPractice();
    navigate(id ? `/plan/practice?s=${id}` : '/plan/practice');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || call.mode === 'practice') return;
    const noTranscript = consent.status === 'declined' || call.shown.length === 0;
    setSummary(noTranscript
      ? `Recording was off for this call with ${call.name.split(' ')[0]}. Add your notes here.`
      : draftSummary(lead, call.shown.filter((l) => l.who !== 'nudge'), call.sopDone));
    setOutcome(null); setCsat(0); setCmt('');
    setNotes(noTranscript ? { budget: '', timeline: '', objection: 'none', nextStep: '', siteVisit: false, interest: null, source: 'manual' } : null); // no transcript: fill the notes by hand
    const lines = noTranscript ? [] : call.shown.filter((l) => (l.who === 'agent' || l.who === 'cust') && l.text).map((l) => ({ who: l.who, text: l.text }));
    let live = true;
    setRating('busy');
    estimateNotes(lines).then((n) => { if (!live || !n) return; setNotes(n); if (n.summary && !noTranscript) setSummary((cur) => (cur.startsWith('Recording was off') ? cur : `${n.summary}`)); });
    estimateCsat(lines).then((r) => { if (!live) return; if (r) { setCsat(r.stars); setCmt(r.comment); setRating('done'); } else setRating('none'); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (call.mode === 'practice') return null;
  return (
    <Modal open={open} onClose={() => finishWrapup({ save: false })} width={480} label="Call wrap-up">
      <div className="wu__head">
        <span className="wu__ic"><i className="ti ti-phone-check" /></span>
        <div><div className="wu__title">Call with {call.name}</div><div className="muted">{fmtClock(call.seconds)} · just now</div></div>
      </div>
      <div className="wu__cap"><i className="ti ti-sparkles" /> AI-DRAFTED SUMMARY — EDIT IF NEEDED</div>
      <textarea className="wu__text" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} aria-label="Call summary" />
      {notes && (
        <>
          <div className="wu__cap"><i className="ti ti-wand" /> {notes.source === 'manual' ? 'CRM NOTES · FILL IN BY HAND' : 'AUTO-FILLED CRM NOTES · EDIT IF NEEDED'}</div>
          <div className="wu__grid">
            <label>Budget<input value={notes.budget || ''} onChange={(e) => setN('budget', e.target.value)} placeholder="Not mentioned" /></label>
            <label>When<input value={notes.timeline || ''} onChange={(e) => setN('timeline', e.target.value)} placeholder="Not mentioned" /></label>
            <label>Main concern<select value={notes.objection || 'none'} onChange={(e) => setN('objection', e.target.value)}>{Object.entries(OBJECTIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <label>Next step<input value={notes.nextStep || ''} onChange={(e) => setN('nextStep', e.target.value)} placeholder="None agreed" /></label>
          </div>
          <div className="wu__chips">
            {[['hot', 'Hot lead'], ['warm', 'Warm'], ['cold', 'Cold']].map(([k, l]) => <button key={k} className={notes.interest === k ? 'on' : ''} aria-pressed={notes.interest === k} onClick={() => setN('interest', k)}>{l}</button>)}
            <button className={notes.siteVisit ? 'on' : ''} aria-pressed={!!notes.siteVisit} onClick={() => setN('siteVisit', !notes.siteVisit)}><i className="ti ti-map-pin" /> Site visit planned</button>
          </div>
        </>
      )}
      <div className="wu__cap muted">OUTCOME</div>
      <div className="wu__chips">
        {outcomes.map((o) => (
          <button key={o.id} className={outcome === o.id ? 'on' : ''} aria-pressed={outcome === o.id} onClick={() => setOutcome(o.id)}><i className={`ti ${o.icon}`} /> {o.label}</button>
        ))}
      </div>
      <div className="wu__cap muted"><i className="ti ti-sparkles" /> CUSTOMER SATISFACTION (CSAT) · READ FROM THE CONVERSATION</div>
      {rating === 'busy' && <div className="wu__stars"><span className="muted">Reading the conversation…</span></div>}
      {rating === 'none' && <div className="wu__stars"><span className="muted">Not rated: the customer spoke too little (or recording was off), so there is nothing to judge.</span></div>}
      {rating === 'done' && (
        <>
          <div className="wu__stars">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} className={n <= csat ? 'on' : ''} aria-label={`${n} star${n > 1 ? 's' : ''}`} aria-pressed={csat === n} onClick={() => setCsat(csat === n ? 0 : n)}>★</button>
            ))}
            <span className="muted">{csat ? `${csat * 20}% · AI estimate, tap to change` : 'Not rated'}</span>
          </div>
          <input className="wu__cmt" placeholder="Why (edit if needed)" value={cmt} onChange={(e) => setCmt(e.target.value)} />
        </>
      )}
      <div className="wu__btns">
        <button className="wu__skip" onClick={() => finishWrapup({ save: false, csat, comment: cmt, notes })}>Skip</button>
        <button className="wu__save" onClick={() => finishWrapup({ save: true, summary, outcome, csat, comment: cmt, notes })}><i className="ti ti-database-plus" /> Save to CRM</button>
      </div>
    </Modal>
  );
}
