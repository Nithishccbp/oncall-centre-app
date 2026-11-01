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
  const { created: createdList, calledToday, calledLeads, handled, ratedToday, aht: ahtSec, csatToday } = useKpiData();
  const created = createdList.length;
  const ahtTxt = `${Math.floor(ahtSec / 60)}m ${String(ahtSec % 60).padStart(2, '0')}s`;
  const per = range === 'Custom' ? 'selected dates' : range.toLowerCase();
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const shown = kpis.map((k) => {
    if (DEMO) {
      return k.label === 'LEADS CALLED' ? { ...k, value: String(2 + calledLeads) } : k.label === 'LEADS CREATED' ? { ...k, value: String(created) } : k.label === 'CSAT TODAY' && csatToday ? { ...k, value: `${csatToday}%`, tone: 'good' } : k;
    }
    if (k.label === 'LEADS CREATED') return { ...k, value: String(created), delta: `new ${per}` };
    if (k.label === 'LEADS CALLED') return { ...k, value: String(calledLeads), delta: `in ${plural(calledToday.length, 'call')}` };
    if (k.label === 'AVG HANDLE TIME') return { ...k, value: ahtTxt, delta: `${plural(handled, 'call')} ${per}` };
    if (k.label === 'CSAT TODAY') return { ...k, value: csatToday ? `${csatToday}%` : '0%', delta: `${ratedToday.length} rated`, tone: csatToday ? 'good' : 'info' };
    return k;
  });
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
      <div className="hero__kpis">{shown.map((k) => <KpiCard key={k.label} {...k} label={k.label === 'CSAT TODAY' && range !== 'Today' ? 'CSAT' : k.label} onClick={KPI_MODAL[k.label] ? () => openOverlay(KPI_MODAL[k.label]) : undefined} />)}</div>
    </section>
  );
}
