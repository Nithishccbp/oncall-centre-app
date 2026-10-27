// Routes + app-wide providers.
import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell/AppShell.jsx';
import { LeadsModalProvider } from './context/LeadsModalContext.jsx';
import { PulseProvider } from './context/PulseContext.jsx';
import { CallProvider } from './context/CallContext.jsx';
import { ConsentProvider } from './context/ConsentContext.jsx';
import { UiProvider } from './context/UiContext.jsx';
import PlanLayout from './pages/Plan/PlanLayout.jsx';
import CustomerLine from './pages/Customer/CustomerLine.jsx';
import AudioTest from './pages/AudioTest/AudioTest.jsx';
import Dashboard from './pages/Dashboard/Dashboard.jsx';
import OutgoingCalls from './pages/Plan/OutgoingCalls.jsx';
import IncomingCalls from './pages/Plan/IncomingCalls.jsx';
import RecentCalls from './pages/Plan/RecentCalls.jsx';
import CalendarPage from './pages/Calendar/CalendarPage.jsx';
import Avani from './pages/Avani/Avani.jsx';
import PulseHome from './pages/Pulse/PulseHome.jsx';
import ChannelChat from './pages/Pulse/ChannelChat.jsx';

export default function App() {
  return (
    <UiProvider>
    <PulseProvider>
      <ConsentProvider>
      <CallProvider>
        <LeadsModalProvider>
          <Routes>
            <Route path="customer" element={<CustomerLine />} />
            <Route path="audiotest" element={<AudioTest />} />
            <Route element={<AppShell />}>
              <Route index element={<Dashboard />} />
              <Route path="plan" element={<PlanLayout />}>
                <Route index element={<Navigate to="/plan/outgoing" replace />} />
                <Route path="outgoing" element={<OutgoingCalls />} />
                <Route path="incoming" element={<IncomingCalls />} />
                <Route path="recent" element={<RecentCalls />} />
              </Route>
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="avani" element={<Avani />} />
              <Route path="pulse" element={<PulseHome />} />
              <Route path="pulse/:channelId" element={<ChannelChat />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </LeadsModalProvider>
      </CallProvider>
      </ConsentProvider>
    </PulseProvider>
    </UiProvider>
  );
}
