// Left navigation: Dashboard, Plan (4 sub-items), Calendar, Pulse.
import { NavLink, useLocation } from 'react-router-dom';
import './Sidebar.css';

const planItems = [
  { to: '/plan/outgoing', label: 'Calls to make', icon: 'ti-phone-outgoing' },
  { to: '/plan/incoming', label: 'Incoming', icon: 'ti-phone-incoming' },
  { to: '/plan/recent', label: 'Recent', icon: 'ti-history' },
];

function MainItem({ to, icon, tone, label, active }) {
  return (
    <NavLink to={to} className={`sb-item ${active ? 'is-active' : ''}`}>
      <span className={`sb-tile sb-tile--${tone}`}><i className={`ti ${icon}`} /></span>
      <span>{label}</span>
    </NavLink>
  );
}

export default function Sidebar() {
  const { pathname } = useLocation();
  const is = (p) => (p === '/' ? pathname === '/' : pathname.startsWith(p));

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">On-Ground.ai</div>
      <nav aria-label="Main">
        <MainItem to="/" icon="ti-layout-dashboard" tone="teal" label="Dashboard" active={is('/')} />
        <MainItem to="/plan/outgoing" icon="ti-phone" tone="blue" label="Plan" active={is('/plan')} />
        <div className="sb-sub">
          {planItems.map((s) => (
            <NavLink key={s.to} to={s.to} className={({ isActive }) => `sb-subitem ${isActive ? 'is-active' : ''}`}>
              <i className={`ti ${s.icon}`} /> {s.label}
            </NavLink>
          ))}
          <NavLink to="/plan/practice" className={({ isActive }) => `sb-subitem ${isActive ? 'is-active' : ''}`}>
            <i className="ti ti-phone-ringing" /> Practise a call
          </NavLink>
        </div>
        <MainItem to="/calendar" icon="ti-calendar" tone="amber" label="Calendar" active={is('/calendar')} />
        <MainItem to="/avani" icon="ti-sparkles" tone="green" label="Avani AI" active={is('/avani')} />
        <MainItem to="/impact" icon="ti-chart-line" tone="teal" label="Impact" active={is('/impact')} />
        <MainItem to="/pulse" icon="ti-messages" tone="purple" label="Pulse" active={is('/pulse')} />
      </nav>
    </aside>
  );
}
