// Progress, who's waiting, earnings and tasks cards for the dashboard.
import { Link } from 'react-router-dom';
import { earnings, tasks, waiting, todaysCalls, thanks, visits } from '../../data/dashboard.js';
import { DEMO } from '../../data/demo.js';
import { getOutgoingPlan } from '../../data/selectors.js';
import { formatINR } from '../../data/selectors.js';
import { usePulse } from '../../context/PulseContext.jsx';
import { useIngest } from '../../context/IngestContext.jsx';
import { useKpiData } from '../../data/kpiStats.js';

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

export function TodaysCalls() {
  const { todays, handledToday } = useIngest();
  const { todaysLocal, csatToday } = useKpiData();
  const rows = [...todaysLocal, ...todays, ...todaysCalls].slice(0, 6);
  return (
    <section className="card dcard">
      <div className="dcard__head"><b className="label-caps">Today's calls</b><span className="muted">{(DEMO ? 14 : 0) + handledToday + todaysLocal.length} handled · {csatToday ?? (DEMO ? 94 : 0)}% CSAT</span></div>
      {rows.length === 0 && <div className="empty">No calls yet today</div>}
      {rows.map((c, i) => (
        <div key={`${c.time}-${c.name}-${i}`} className="dcall">
          <span className="dcall__t">{c.time}</span>
          <span className="dcall__n"><b>{c.name}</b><small>{c.topic}</small></span>
          <Stars n={c.stars} />
        </div>
      ))}
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
