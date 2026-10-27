// Indigo hero: greeting, status pills and the 4 KPI cards.
import KpiCard from '../../components/KpiCard/KpiCard.jsx';
import { kpis, user, queueCount } from '../../data/dashboard.js';
import { useUi } from '../../context/UiContext.jsx';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};

export default function HeroHeader() {
  const { range, openOverlay } = useUi();
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
      <div className="hero__kpis">{kpis.map((k) => <KpiCard key={k.label} {...k} />)}</div>
    </section>
  );
}
