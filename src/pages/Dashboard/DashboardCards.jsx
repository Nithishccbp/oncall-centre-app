// Progress, who's waiting, earnings and tasks cards for the dashboard.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Modal from '../../components/Modal/Modal.jsx';
import { earnings, tasks, waiting, todaysCalls, thanks, visits } from '../../data/dashboard.js';
import { DEMO } from '../../data/demo.js';
import { getOutgoingPlan } from '../../data/selectors.js';
import { formatINR } from '../../data/selectors.js';
import { usePulse } from '../../context/PulseContext.jsx';
import { useIngest } from '../../context/IngestContext.jsx';
import { useUi } from '../../context/UiContext.jsx';
import { useKpiData, whenLabel } from '../../data/kpiStats.js';

export function WhosWaiting() {
  return (
    <section>
      <div className="waiting__head">
        <h2 className="label-caps">Who's waiting</h2>
        <Link to="/plan/outgoing" className="waiting__link">Open planner →</Link>
      </div>
      {waiting.length === 0 && <div className="empty">Nobody is waiting</div>}
      {waiting.map((w) => (
        <div key={w.id} className="waiting__row card">
          <span className="waiting__icon"><i className="ti ti-headset" /></span>
          <div className="waiting__txt"><div className="waiting__name">{w.name}</div><div className="waiting__note">{w.note}</div></div>
          <span className={`waiting__pill waiting__pill--${w.level}`}>{w.wait}</span>
        </div>
      ))}
    </section>
  );
}

export function EarningsCard() {
  const pct = Math.min(100, Math.round((earnings.amount / earnings.slabMax) * 100));
  return (
    <section className="earn card">
      <div className="earn__row">
        <b>💰 My earnings this month</b>
        <span className="muted earn__slab">{formatINR(earnings.slabMin)} to {formatINR(earnings.slabMax)} slab</span>
      </div>
      <div className="earn__amount"><span>{formatINR(earnings.amount)}</span><em>{formatINR(earnings.coached)} from coached moves</em></div>
      <div className="earn__bar" role="progressbar" aria-valuenow={pct} aria-valuemin="0" aria-valuemax="100"><div style={{ width: `${pct}%` }} /></div>
    </section>
  );
}

export function TasksCard({ onTaskClick }) {
  const { answered } = usePulse();
  const open = tasks.filter((t) => !(t.pulseTaskId in answered));
  return (
    <section className="tasks">
      <div className="tasks__head">
        <i className="ti ti-clipboard-list" /><span>My Tasks</span>
        <span className="tasks__badge">{open.length}</span>
      </div>
      {open.length === 0 && <div className="tasks__done"><i className="ti ti-circle-check" /> All caught up</div>}
      {open.map((t) => (
        <button key={t.id} className="tasks__row" onClick={() => onTaskClick(t)}>
          <span className={`tasks__icon tasks__icon--${t.tone}`}><i className={`ti ${t.icon}`} /></span>
          <span className="tasks__txt"><b>{t.title}</b> <span className="muted">{t.sub}</span></span>
          <i className="ti ti-chevron-right tasks__chev" />
        </button>
      ))}
    </section>
  );
}

const Stars = ({ n }) => <span className="stars" aria-label={`${n} of 5`}>{'★'.repeat(n)}<i>{'★'.repeat(5 - n)}</i></span>;

const initialsOf = (n) => String(n || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
const durTxt = (s) => `${Math.floor((s || 0) / 60)}m ${String((s || 0) % 60).padStart(2, '0')}s`;
const dayTag = (ts, time) => { const w = ts ? whenLabel(ts) : `Today ${time}`; return w.startsWith('Today') ? time : w; };

function CallDetail({ c, onClose }) {
  const when = c.ts ? whenLabel(c.ts) : `Today ${c.time}`;
  const text = c.summary || (c.outcome && c.outcome !== 'Called' ? c.outcome : '');
  return (
    <Modal open onClose={onClose} width={440} label="Call details">
      <div className="cd">
        <div className="cd__top">
          <span className="cd__av">{initialsOf(c.name)}</span>
          <div><div className="cd__name">{c.name}</div><div className="cd__sub">{when} · {c.dur ? durTxt(c.dur) : c.topic}</div></div>
        </div>
        <div className="cd__chips">
          <span className="cd__chip"><i className="ti ti-phone-outgoing" /> {c.outcome && c.outcome.length < 28 ? c.outcome : 'Called'}</span>
          <span className="cd__chip"><i className="ti ti-clock" /> {c.dur ? durTxt(c.dur) : '—'}</span>
        </div>
        <div className="cd__cap">CALL SUMMARY</div>
        <p className="cd__sum">{text || 'No summary was saved for this call. Add notes in the wrap-up window after your next call.'}</p>
        <div className="cd__cap">CUSTOMER SATISFACTION</div>
        {c.stars ? (
          <div className="cd__rate"><Stars n={c.stars} /><b>{c.stars * 20}%</b>{c.comment ? <span>“{c.comment}”</span> : null}</div>
        ) : <p className="cd__sum muted">Not rated for this call.</p>}
      </div>
    </Modal>
  );
}

export function TodaysCalls() {
  const { todaysList, handled, csatToday } = useKpiData();
  const { range } = useUi();
  const [open, setOpen] = useState(null);
  const rows = [...todaysList, ...(DEMO ? todaysCalls : [])].slice(0, 6);
  const rated = csatToday ?? (DEMO ? 94 : 0);
  return (
    <section className="card dcard dcalls">
      <div className="dcard__head">
        <b className="label-caps"><i className="ti ti-phone-call" /> {range === 'Today' ? "Today's calls" : `Calls · ${range}`}</b>
        <span className="dcalls__pills"><span className="dcalls__pill">{(DEMO ? 14 : 0) + handled} handled</span><span className="dcalls__pill dcalls__pill--g">{rated}% CSAT</span></span>
      </div>
      {rows.length === 0 && <div className="empty">{range === 'Today' ? 'No calls yet today' : 'No calls in this period'}</div>}
      {rows.map((c, i) => (
        <button key={`${c.time}-${c.name}-${i}`} className="dcall dcall--row" onClick={() => setOpen(c)} aria-label={`Open call with ${c.name}`}>
          <span className="dcall__av">{initialsOf(c.name)}</span>
          <span className="dcall__n"><b>{c.name}</b><small>{c.topic}</small></span>
          <span className="dcall__r">
            <span className="dcall__when">{dayTag(c.ts, c.time)}</span>
            {c.stars ? <Stars n={c.stars} /> : <span className="dcall__nr">Not rated</span>}
          </span>
          <i className="ti ti-chevron-right dcall__go" />
        </button>
      ))}
      {open && <CallDetail c={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

export function LeadsNext({ onOpen }) {
  useIngest();
  const list = getOutgoingPlan().slice(0, 3);
  const total = getOutgoingPlan().reduce((n, l) => n + l.expectedValue, 0);
  return (
    <section className="card dcard">
      <div className="dcard__head"><b className="label-caps">Leads to call next</b><span className="muted">{getOutgoingPlan().length} open · {formatINR(total)}</span></div>
      {list.length === 0 && <div className="empty">No leads yet</div>}
      {list.map((l, i) => (
        <button key={l.id} className="dlead" onClick={() => onOpen(i)}>
          <span className={`dlead__s ${l.score >= 80 ? 'hi' : ''}`}>{l.score}</span>
          <span className="dcall__n"><b>{l.name}</b><small>{l.slaLeft} · {l.actionNote || l.product}</small></span>
          <b className="dlead__v">{formatINR(l.expectedValue)}</b>
        </button>
      ))}
    </section>
  );
}

export function ThanksVisits() {
  return (
    <div className="tv">
      <div className="tv__a"><span>🏆</span><b>{thanks.count} thanks</b><small>{thanks.sub}</small></div>
      <div className="tv__b"><span>🛡️</span><b>{visits.count} visits booked</b><small>{visits.sub}</small></div>
    </div>
  );
}
