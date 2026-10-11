// Layout frame: sidebar + top bar + scrolling page, plus global overlays (leads modal, calling).
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../Sidebar/Sidebar.jsx';
import TopBar from '../TopBar/TopBar.jsx';
import LeadsModal from '../LeadsModal/LeadsModal.jsx';
import CallHost from '../Calling/CallHost.jsx';
import Overlays from '../Overlays/Overlays.jsx';
import SheetHost from '../Sheets/Sheets.jsx';
import Toast from '../Toast/Toast.jsx';
import './AppShell.css';

const tabs = [
  { to: '/', icon: 'ti-layout-dashboard', label: 'Dashboard', match: (p) => p === '/' },
  { to: '/plan/outgoing', icon: 'ti-phone', label: 'Plan', match: (p) => p.startsWith('/plan') },
  { to: '/calendar', icon: 'ti-calendar', label: 'Calendar', match: (p) => p.startsWith('/calendar') },
  { to: '/pulse', icon: 'ti-messages', label: 'Pulse', match: (p) => p.startsWith('/pulse') },
];

export default function AppShell() {
  const { pathname } = useLocation();
  return (
    <div className="shell">
      <Sidebar />
      <div className="shell__col">
        <TopBar />
        <main className="shell__main"><Outlet /></main>
        <nav className="tabbar" aria-label="Main tabs">
          {tabs.map((t) => (
            <NavLink key={t.to} to={t.to} className={`tabbar__item ${t.match(pathname) ? 'is-active' : ''}`}>
              <i className={`ti ${t.icon}`} /><span>{t.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
      <Overlays />
      <LeadsModal />
      <SheetHost />
      <CallHost />
      <Toast />
    </div>
  );
}
