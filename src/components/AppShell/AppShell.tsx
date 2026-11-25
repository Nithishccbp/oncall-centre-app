// Layout frame: sidebar + top bar + scrolling page, plus global overlays (leads modal, calling).
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../Sidebar/Sidebar';
import TopBar from '../TopBar/TopBar';
import LeadsModal from '../LeadsModal/LeadsModal';
import CallHost from '../Calling/CallHost';
import Overlays from '../Overlays/Overlays';
import SheetHost from '../Sheets/Sheets';
import Toast from '../Toast/Toast';
import './AppShell.css';

const tabs = [
  { to: '/', icon: 'ti-layout-dashboard', label: 'Dashboard', match: (p: any) => p === '/' },
  { to: '/plan/outgoing', icon: 'ti-phone', label: 'Plan', match: (p: any) => p.startsWith('/plan') },
  { to: '/calendar', icon: 'ti-calendar', label: 'Calendar', match: (p: any) => p.startsWith('/calendar') },
  { to: '/pulse', icon: 'ti-messages', label: 'Pulse', match: (p: any) => p.startsWith('/pulse') },
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
