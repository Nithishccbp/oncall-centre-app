// Impact: what the call centre is worth in rupees, hours and conversions, computed live from this app's own data.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCall } from '../../context/CallContext.jsx';
import { OBJECTIONS } from '../../services/callNotes.js';
import Modal from '../../components/Modal/Modal.jsx';
import { useImpact, useAssumptions, inr, ageText } from '../../data/impact.js';
import './Impact.css';

const pct = (n) => (n == null ? '—' : `${n}%`);
const mins = (n) => (n == null ? '—' : n < 60 ? `${Math.max(1, Math.round(n))} min` : n < 1440 ? `${(n / 60).toFixed(1).replace(/\.0$/, '')} h` : `${(n / 1440).toFixed(1).replace(/\.0$/, '')} d`);

function Tile({ icon, label, value, sub, tone, onOpen }) {
  return (
    <button className={`im__tile ${tone ? `im__tile--${tone}` : ''}`} onClick={onOpen} aria-label={`${label}: open details`}>
      <span className="im__ti"><i className={`ti ${icon}`} /></span>
      <b>{value}</b><span className="im__tl">{label}</span>{sub && <small>{sub}</small>}
      <i className="ti ti-chevron-right im__tgo" aria-hidden="true" />
    </button>
  );
}

const when = (ts) => { const t = new Date(ts); const n = new Date(); const same = t.toDateString() === n.toDateString(); return `${same ? 'Today' : t.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${t.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}`; };
const Empty = ({ t }) => <div className="empty">{t}</div>;
const LeadList = ({ rows, onCall, extra }) => (rows.length === 0 ? <Empty t="Nothing here. Good news." /> : rows.map((r) => (
  <button key={r.lead.id} className="im__lead" onClick={() => onCall(r.lead.name)} aria-label={`Call ${r.lead.name}`}>
    <span className="im__lav" style={{ background: r.lead.avatarBg, color: r.lead.avatarColor }}>{r.lead.initials}</span>
    <span className="im__ln"><b>{r.lead.name}</b><small>{extra(r)}</small></span>
    <span className="im__lv">{inr(r.value)}</span>
    <span className={`im__go ${r.age >= 864e5 ? 'hot' : ''}`}><i className="ti ti-phone" /> Call</span>
  </button>
)));

// What sits behind each tile.
function Detail({ k, d, onCall, close }) {
  const nm = (c) => c.name || 'Lead';
  if (k === 'risk') return <LeadList rows={d.atRisk} onCall={onCall} extra={(r) => `${r.lead.product} · no call for ${ageText(r.age)}`} />;
  if (k === 'waiting') return <LeadList rows={d.waiting} onCall={onCall} extra={(r) => `${r.lead.product} · waiting ${ageText(r.age)}`} />;
  if (k === 'speed') return d.contacted.length === 0 ? <Empty t="No lead has been called yet." /> : [...d.contacted].sort((a, b) => b.speed - a.speed).map((r) => (
    <div key={r.lead.id} className="im__row"><span className="im__ln"><b>{r.lead.name}</b><small>arrived {when(r.added)} · first call {when(r.firstCall)}</small></span><span className={`im__pill ${r.speed / 60000 <= d.SLA ? 'ok' : 'bad'}`}>{ageText(r.speed)}</span></div>
  ));
  if (k === 'csat') return d.ratedRows.length === 0 ? <Empty t="No rated calls yet. The AI rates a call from the conversation when it has enough to judge." /> : d.ratedRows.map((c) => (
    <div key={c.id} className="im__row"><span className="im__ln"><b>{nm(c)}</b><small>{when(c.ts)}{c.comment ? ` · ${c.comment}` : ''}</small></span><span className="im__stars">{'★'.repeat(c.csat)}<i>{'★'.repeat(5 - c.csat)}</i></span></div>
  ));
  if (k === 'notes') return d.notesRows.length === 0 ? <Empty t="No call has CRM notes yet. They are captured in the wrap-up window after a call." /> : d.notesRows.map((c) => (
    <div key={c.id} className="im__row im__row--col"><div className="im__rt"><b>{nm(c)}</b><small>{when(c.ts)}</small></div>
      <div className="im__tags">{c.notes.budget && <span>💰 {c.notes.budget}</span>}{c.notes.timeline && <span>🗓️ {c.notes.timeline}</span>}{c.notes.objection && c.notes.objection !== 'none' && <span>⚠️ {OBJECTIONS[c.notes.objection]}</span>}{c.notes.nextStep && <span>➡️ {c.notes.nextStep}</span>}{c.notes.siteVisit && <span>📍 Site visit</span>}{c.notes.interest && <span>{c.notes.interest === 'hot' ? '🔥 Hot' : c.notes.interest === 'cold' ? '❄️ Cold' : '🌤️ Warm'}</span>}</div></div>
  ));
  if (k === 'practice') return (
    <>
      {d.sessionRows.length === 0 ? <Empty t="No practice calls in this period." /> : d.sessionRows.map((s) => (
        <div key={s.id} className="im__row"><span className="im__ln"><b>{s.persona?.name || 'Practice call'}</b><small>{when(s.ts)}{s.result === 'won' ? ' · won them over' : s.result === 'lost' ? ' · customer hung up' : ''}</small></span><span className="im__pill ok">{s.review?.score ?? '—'}</span></div>
      ))}
      <Link className="im__link" to="/plan/practice" onClick={close}>Open Practise a call <i className="ti ti-arrow-right" /></Link>
    </>
  );
  return null;
}
const TITLES = { risk: 'Value at risk', waiting: 'Waiting for a first call', speed: 'First call speed', csat: 'Customer satisfaction', notes: 'Calls with CRM notes', practice: 'Practice sessions' };

function Funnel({ d }) {
  const steps = [
    ['Leads in the system', d.rows.length, d.valueAll],
    ['Contacted', d.contacted.length, d.valueContacted],
    ['Interested (hot or warm)', d.interested.length, d.valueInterested],
    ['Site visit planned', d.visits.length, d.valueVisits],
  ];
  const max = Math.max(1, steps[0][1]);
  return (
    <div className="im__funnel">
      {steps.map(([l, n, v], i) => (
        <div key={l} className="im__fr">
          <div className="im__fl"><span>{l}</span><b>{n}</b></div>
          <div className="im__fb"><i style={{ width: `${Math.max(n ? 4 : 0, (n / max) * 100)}%`, opacity: 1 - i * 0.18 }} /></div>
          <small>{inr(v)} pipeline{i > 0 && steps[i - 1][1] ? ` · ${Math.round((n / steps[i - 1][1]) * 100)}% of previous step` : ''}</small>
        </div>
      ))}
    </div>
  );
}

export default function ImpactPage() {
  const [days, setDays] = useState(30);
  const [A] = useAssumptions();
  const [open, setOpen] = useState(null);
  const d = useImpact(days, A);
  const navigate = useNavigate();
  const { startCall, call } = useCall();
  const callNow = (name) => { if (call.status !== 'idle') return; navigate('/plan/outgoing'); startCall(name); };
  const noData = d.calls === 0 && d.rows.length === 0;
  const topObj = d.objections[0];

  const headline = d.roi != null
    ? `In the last ${days} days your team made ${d.calls} call${d.calls === 1 ? '' : 's'}, saved about ${d.hours.toFixed(1)} hours of note-taking and planned ${d.visits.length} site visit${d.visits.length === 1 ? '' : 's'} worth ${inr(d.valueVisits)} of pipeline.`
    : `Make calls and finish the wrap-up to start filling this page. ${d.waiting.length ? `${d.waiting.length} lead${d.waiting.length === 1 ? ' is' : 's are'} waiting for a first call, worth ${inr(d.valueWaiting)}.` : ''}`;

  const tips = [];
  if (d.atRisk.length) tips.push({ icon: 'ti-alarm', text: `${d.atRisk.length} lead${d.atRisk.length > 1 ? 's' : ''} older than a day with no call, worth ${inr(d.valueAtRisk)}. Call these first.`, to: '/plan/outgoing', cta: 'Open Calls to make' });
  if (d.slaPct != null && d.slaPct < 70) tips.push({ icon: 'ti-bolt', text: `Only ${d.slaPct}% of leads got a first call within ${d.SLA} minutes. Faster first contact is the biggest lever on conversion.`, to: '/plan/outgoing', cta: 'Call the next lead' });
  if (topObj) tips.push({ icon: 'ti-target-arrow', text: `${OBJECTIONS[topObj[0]]} is the most common concern (${topObj[1]} call${topObj[1] > 1 ? 's' : ''}). Practise handling it with Avani.`, to: '/plan/practice', cta: 'Practise now' });
  if (d.practice.n === 0 && d.calls > 0) tips.push({ icon: 'ti-phone-ringing', text: 'No practice calls yet this period. Practice scores feed your OG Score and show their effect on CSAT here.', to: '/plan/practice', cta: 'Start a practice call' });
  if (!tips.length) tips.push({ icon: 'ti-circle-check', text: noData ? 'Add a lead and place a call to see insights here.' : 'Nothing urgent. Keep the first-call time short and keep practising.' });

  return (
    <div className="plan im">
      <div className="im__head">
        <div><h1 className="plan__title">Impact</h1><p className="plan__sub">What the call centre is worth in rupees, hours and conversions. Every number comes from your own calls, leads and practice sessions.</p></div>
        <div className="im__ctl">
          <div className="im__seg" role="group" aria-label="Period">{[7, 30].map((n) => <button key={n} className={days === n ? 'on' : ''} aria-pressed={days === n} onClick={() => setDays(n)}>{n} days</button>)}</div>
          <button className="im__print" onClick={() => window.print()}><i className="ti ti-printer" /> Print report</button>
        </div>
      </div>

      <section className="im__hero" aria-label="Return on investment">
        <div className="im__roi">
          <small>ESTIMATED RETURN ON TOOL COST</small>
          <b>{d.roi == null ? '—' : `${d.roi >= 10 ? Math.round(d.roi) : d.roi.toFixed(1)}×`}</b>
          <span>{d.roi == null ? 'Needs at least one call or practice session' : `${inr(d.gain)} gained for ${inr(d.cost)} spent`}</span>
        </div>
        <div className="im__hn">
          <div><b>{inr(d.valueInterested)}</b><span>Interested pipeline</span></div>
          <div><b>{d.hours.toFixed(1)} h</b><span>Note-taking time saved</span></div>
          <div><b>{d.visits.length}</b><span>Site visits planned</span></div>
        </div>
        <p className="im__hl">{headline}</p>
      </section>

      <div className="im__tiles">
        <Tile icon="ti-flame" tone={d.valueAtRisk ? 'bad' : undefined} label="Value at risk" onOpen={() => setOpen('risk')} value={inr(d.valueAtRisk)} sub={`${d.atRisk.length} lead${d.atRisk.length === 1 ? '' : 's'} idle over 24 h`} />
        <Tile icon="ti-hourglass" tone={d.waiting.length ? 'warn' : undefined} label="Waiting for a first call" onOpen={() => setOpen('waiting')} value={d.waiting.length} sub={`${inr(d.valueWaiting)} in play`} />
        <Tile icon="ti-bolt" label="First call speed" onOpen={() => setOpen('speed')} value={mins(d.medSpeed)} sub={d.slaPct == null ? 'no calls yet' : `${d.slaPct}% within ${d.SLA} min`} />
        <Tile icon="ti-mood-smile" label="Customer satisfaction" onOpen={() => setOpen('csat')} value={pct(d.csat)} sub={d.ratedCount ? `from ${d.ratedCount} rated call${d.ratedCount > 1 ? 's' : ''}` : 'read from the conversation'} />
        <Tile icon="ti-wand" label="Calls with CRM notes" onOpen={() => setOpen('notes')} value={d.withNotes} sub={d.stepRate == null ? 'next steps captured: —' : `${Math.round(d.stepRate * 100)}% ended with a next step`} />
        <Tile icon="ti-phone-ringing" label="Practice sessions" onOpen={() => setOpen('practice')} value={d.practice.n} sub={d.practice.avg == null ? 'none this period' : `average score ${d.practice.avg}`} />
      </div>

      <div className="im__two">
        <section className="card im__card">
          <div className="im__ch"><b className="label-caps">Lead funnel</b><span className="muted">from your calls</span></div>
          <Funnel d={d} />
        </section>
      </div>

      <div className="im__two">
        <section className="card im__card">
          <div className="im__ch"><b className="label-caps">Why customers hesitate</b><span className="muted">read from call notes</span></div>
          {d.objections.length === 0 && <div className="empty">No concerns captured yet. They appear after calls are wrapped up.</div>}
          {d.objections.map(([k, n]) => (
            <div key={k} className="im__ob"><span>{OBJECTIONS[k]}</span><div className="im__fb"><i style={{ width: `${(n / d.objections[0][1]) * 100}%` }} /></div><b>{n}</b></div>
          ))}
          {topObj && <Link className="im__link" to="/plan/practice">Practise the top concern <i className="ti ti-arrow-right" /></Link>}
        </section>
        <section className="card im__card">
          <div className="im__ch"><b className="label-caps">Does practice pay off?</b><span className="muted">your own data</span></div>
          <div className="im__pp">
            <div><b>{d.practice.n}</b><small>sessions</small></div>
            <div><b>{d.practice.avg ?? '—'}</b><small>avg score</small></div>
            <div><b className={d.practice.delta > 0 ? 'up' : d.practice.delta < 0 ? 'dn' : ''}>{d.practice.delta == null ? '—' : `${d.practice.delta > 0 ? '+' : ''}${d.practice.delta}`}</b><small>score change</small></div>
          </div>
          <p className="im__note">{d.practice.lift != null
            ? `Calls placed within a day of practising were rated ${d.practice.lift >= 0 ? `${d.practice.lift} points higher` : `${Math.abs(d.practice.lift)} points lower`} by customers (${d.practice.afterN} after practice vs ${d.practice.otherN} without).`
            : `Needs at least 3 rated calls after practice and 3 without to compare. So far: ${d.practice.afterN} after practice, ${d.practice.otherN} without.`}</p>
        </section>
      </div>

      <section className="card im__card im__tips">
        <div className="im__ch"><b className="label-caps"><i className="ti ti-sparkles" /> What Avani recommends</b></div>
        {tips.map((t, i) => (
          <div key={i} className="im__tip"><i className={`ti ${t.icon}`} /><span>{t.text}</span>{t.to && <Link to={t.to}>{t.cta} →</Link>}</div>
        ))}
      </section>

      <Modal open={!!open} onClose={() => setOpen(null)} width={520} label={open ? TITLES[open] : 'Details'}>
        {open && (
          <div className="im__dm">
            <h2>{TITLES[open]}</h2>
            <p className="muted">Last {days} days</p>
            <div className="im__dl"><Detail k={open} d={d} onCall={(n) => { setOpen(null); callNow(n); }} close={() => setOpen(null)} /></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
