// Glass-style KPI tile used in the dashboard hero.
import './KpiCard.css';

export default function KpiCard({ label, value, delta, tone }) {
  return (
    <div className="kpi">
      <div className="kpi__value">{value}</div>
      <div className="kpi__label">{label}</div>
      <span className={`kpi__delta kpi__delta--${tone}`}>
        {tone === 'info' && <span className="kpi__live" />}{delta}
      </span>
    </div>
  );
}
