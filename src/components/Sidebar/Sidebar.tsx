// Left navigation: Dashboard, Plan (4 sub-items), Calendar, Pulse.
import { NavLink, useLocation } from 'react-router-dom';
import './Sidebar.css';

const planItems = [
  { to: '/calls/make', label: 'Calls to make', icon: 'ti-phone-outgoing' },
  { to: '/calls/incoming', label: 'Incoming', icon: 'ti-phone-incoming' },
  { to: '/calls/recent', label: 'Recent', icon: 'ti-history' },
];

function MainItem({ to, icon, tone, label, active, badge, badgeTone }: any) {
  return (
    <NavLink to={to} className={`sb-item ${active ? 'is-active' : ''}`}>
      <span className={`sb-tile sb-tile--${tone}`}><i className={`ti ${icon}`} /></span>
      <span className="sb-lbl">{label}{badge && <em className={'sb-badge sb-badge--' + badgeTone}>{badge}</em>}</span>
    </NavLink>
  );
}

export default function Sidebar() {
  const { pathname } = useLocation();
  const is = (p: any) => (p === '/' ? pathname === '/' : pathname.startsWith(p));

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">On-Ground.ai</div>
      <nav aria-label="Main">
        <MainItem to="/" icon="ti-layout-dashboard" tone="teal" label="Today" active={is('/')} />
        <MainItem to="/calls/make" icon="ti-phone" tone="blue" label="Calls" badge="Avani Connect" badgeTone="red" active={is('/plan') || is('/calls')} />
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
        <MainItem to="/pulse" icon="ti-messages" tone="purple" label="Pulse" badge="Avani Manage" badgeTone="purple" active={is('/pulse')} />
      </nav>
    </aside>
  );
}
