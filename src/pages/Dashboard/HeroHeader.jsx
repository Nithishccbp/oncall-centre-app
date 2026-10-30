// Indigo hero: greeting, status pills and the 4 KPI cards.
import KpiCard from '../../components/KpiCard/KpiCard.jsx';
import { kpis, user, queueCount } from '../../data/dashboard.js';
import { useUi } from '../../context/UiContext.jsx';
import { useIngest } from '../../context/IngestContext.jsx';
import { DEMO } from '../../data/demo.js';
import { useKpiData } from '../../data/kpiStats.js';

const KPI_MODAL = { 'LEADS CREATED': 'kpi-leads', 'OG SCORE™': 'kpi-og', 'CSAT TODAY': 'kpi-csat', 'AVG HANDLE TIME': 'kpi-aht', 'LEADS CALLED': 'kpi-called' };

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

export default function HeroHeader() {
  const { range, openOverlay } = useUi();
  const { csatToday } = useIngest();
  const { created: createdList, calledToday, week } = useKpiData();
  const created = createdList.length;
  const today = week[6] || { calls: 0, aht: 0 };
  const ahtTxt = `${Math.floor(today.aht / 60)}m ${String(today.aht % 60).padStart(2, '0')}s`;
  const shown = kpis.map((k) => (k.label === 'LEADS CALLED' && !DEMO ? { ...k, value: String(calledToday.length) } : k.label === 'LEADS CALLED' ? { ...k, value: String(2 + calledToday.length) } : k.label === 'AVG HANDLE TIME' && !DEMO ? { ...k, value: ahtTxt } : k.label === 'CSAT TODAY' && csatToday ? { ...k, value: `${csatToday}%`, tone: 'good' } : k.label === 'LEADS CREATED' ? { ...k, value: String(created) } : k.label === 'LEADS CALLED' ? { ...k, value: String((DEMO ? 2 : 0) + handledToday) } : k));
  return (
    <section className="hero">
      <div className="hero__top">
        <div>
          <div className="hero__greet">{greeting()} 👋</div>
          <div className="hero__name">{user.name}</div>
          <div className="hero__team">{user.store} · {user.team}</div>
        </div>
        <div className="hero__pills">
          <span className="pill-queue"><span className="pill-queue__dot" />On Queue</span>
          <span className="pill-queue pill-queue--n">{queueCount} in queue</span>
          <button className="pill-range" aria-label="Date range" onClick={() => openOverlay('daterange')}>
            <i className="ti ti-calendar" /> {range} <i className="ti ti-chevron-down" />
          </button>
        </div>
      </div>
      <div className="hero__kpis">{shown.map((k) => <KpiCard key={k.label} {...k} onClick={KPI_MODAL[k.label] ? () => openOverlay(KPI_MODAL[k.label]) : undefined} />)}</div>
    </section>
  );
}
