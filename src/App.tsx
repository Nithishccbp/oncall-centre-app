// Routes + app-wide providers.
import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell/AppShell';
import { LeadsModalProvider } from './context/LeadsModalContext';
import { PulseProvider } from './context/PulseContext';
import { CallProvider } from './context/CallContext';
import { ConsentProvider } from './context/ConsentContext';
import { IngestProvider } from './context/IngestContext';
import { UiProvider } from './context/UiContext';
import UpdateBanner from './components/UpdateBanner/UpdateBanner';
import PlanLayout from './pages/Plan/PlanLayout';
import CustomerLine from './pages/Customer/CustomerLine';
import AudioTest from './pages/AudioTest/AudioTest';
import AvcLayout from './pages/Today/AvcLayout';
import Today from './pages/Today/Today';
import MakeView from './pages/Today/MakeView';
import IncomingView from './pages/Today/IncomingView';
import RecentView from './pages/Today/RecentView';
import OutgoingCalls from './pages/Plan/OutgoingCalls';
import IncomingCalls from './pages/Plan/IncomingCalls';
import RecentCalls from './pages/Plan/RecentCalls';
import PracticePage from './pages/Plan/PracticePage';
import CalendarPage from './pages/Calendar/CalendarPage';
import Avani from './pages/Avani/Avani';
import ImpactPage from './pages/Impact/ImpactPage';
import PulseHome from './pages/Pulse/PulseHome';
import ChannelChat from './pages/Pulse/ChannelChat';

export default function App() {
  return (
    <UiProvider>
    <UpdateBanner />
    <PulseProvider>
      <ConsentProvider>
      <CallProvider>
        <LeadsModalProvider>
         <IngestProvider>
          <Routes>
            <Route path="customer" element={<CustomerLine />} />
            <Route path="audiotest" element={<AudioTest />} />
            <Route element={<AppShell />}>
              <Route element={<AvcLayout />}>
                <Route index element={<Today />} />
                <Route path="calls/make" element={<MakeView />} />
                <Route path="calls/incoming" element={<IncomingView />} />
                <Route path="calls/recent" element={<RecentView />} />
              </Route>
              <Route path="plan" element={<PlanLayout />}>
                <Route index element={<Navigate to="/plan/outgoing" replace />} />
                <Route path="outgoing" element={<OutgoingCalls />} />
                <Route path="incoming" element={<IncomingCalls />} />
                <Route path="recent" element={<RecentCalls />} />
                <Route path="practice" element={<PracticePage />} />
              </Route>
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="avani" element={<Avani />} />
              <Route path="impact" element={<ImpactPage />} />
              <Route path="pulse" element={<PulseHome />} />
              <Route path="pulse/:channelId" element={<ChannelChat />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
         </IngestProvider>
        </LeadsModalProvider>
      </CallProvider>
      </ConsentProvider>
    </PulseProvider>
    </UiProvider>
  );
}
