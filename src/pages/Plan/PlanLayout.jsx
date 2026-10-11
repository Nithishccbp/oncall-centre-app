// Layout route for /plan/*: navy header + the active sub-page, or the live call workspace while a call is on.
import { Outlet } from 'react-router-dom';
import PlanHeader from './PlanHeader.jsx';
import CallWorkspace from '../../components/Calling/CallWorkspace.jsx';
import { useCall } from '../../context/CallContext.jsx';

const WORKSPACE = ['ringing', 'consent', 'inCall', 'wrapup'];

export default function PlanLayout() {
  const { call } = useCall();
  return (
    <>
      <PlanHeader />
      {WORKSPACE.includes(call.status) ? <CallWorkspace /> : <Outlet />}
    </>
  );
}
