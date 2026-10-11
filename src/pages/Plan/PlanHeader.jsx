// Navy strip shared by the Plan screens (+ sub-tab pills on phone width).
import { NavLink } from 'react-router-dom';
import { TODAY } from '../../data/calendar.js';
import './Plan.css';

const tabs = [['outgoing', 'Calls to make'], ['incoming', 'Incoming'], ['recent', 'Recent']];

export default function PlanHeader() {
  const date = TODAY.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
  return (
    <>
      <header className="planhead">
        <div><div className="planhead__kicker">Today's calling plan</div><div className="planhead__title">Planner</div></div>
        <span className="planhead__date">{date}</span>
      </header>
      <nav className="plantabs" aria-label="Plan sections">
        {tabs.map(([to, label]) => <NavLink key={to} to={`/plan/${to}`} className={({ isActive }) => (isActive ? 'is-active' : '')}>{label}</NavLink>)}
      </nav>
    </>
  );
}
