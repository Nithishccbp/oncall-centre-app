// Progress, who's waiting, earnings and tasks cards for the dashboard.
import { Link } from 'react-router-dom';
import { earnings, progress, tasks, waiting } from '../../data/dashboard.js';
import { formatINR } from '../../data/selectors.js';
import { usePulse } from '../../context/PulseContext.jsx';

export function ProgressCard() {
  const tiles = [
    { ...progress.leadsCreated, label: 'Leads Created', tone: 'amber' },
    { ...progress.leadsCalled, label: 'Leads Called', tone: 'green' },
  ];
  return (
    <section className="progress">
      <div className="progress__title">● MY PROGRESS · TODAY</div>
      <div className="progress__tiles">
        {tiles.map((t) => (
          <div key={t.label} className="progress__tile">
            <div className="progress__num">{t.value}</div>
            <span className={`progress__chip progress__chip--${t.tone}`}>▲ {t.delta}</span>
            <div className="progress__cap">{t.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function WhosWaiting() {
  return (
    <section>
      <div className="waiting__head">
        <h2 className="label-caps">Who's waiting</h2>
        <Link to="/plan/outgoing" className="waiting__link">Open planner →</Link>
      </div>
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
