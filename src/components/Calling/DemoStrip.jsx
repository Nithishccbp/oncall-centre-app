// Floating DEMO strip (optional in the brief): start a call, simulate an incoming one, fire consent nudges, open the consent log.
import { useCall } from '../../context/CallContext.jsx';
import { useUi } from '../../context/UiContext.jsx';
import { useNavigate } from 'react-router-dom';

export default function DemoStrip() {
  const { call, startCall, simulateIncoming, triggerNudge } = useCall();
  const { openOverlay } = useUi();
  const navigate = useNavigate();
  const idle = call.status === 'idle';
  const live = call.status === 'inCall';

  return (
    <div className="demo" role="toolbar" aria-label="Demo controls">
      <span className="demo__tag">DEMO</span>
      {live ? (
        <>
          <button onClick={() => triggerNudge('unsure')}>“Unsure?”</button>
          <button onClick={() => triggerNudge('mydata')}>“My data?”</button>
          <button onClick={() => triggerNudge('stop')}>“Stop!”</button>
        </>
      ) : (
        <>
          <button disabled={!idle} onClick={() => { navigate('/plan/outgoing'); startCall('Ritu S.'); }}><i className="ti ti-phone" /> In-app call</button>
          <button disabled={!idle} onClick={() => { navigate('/plan/outgoing'); simulateIncoming('Ritu S.'); }}><i className="ti ti-phone-incoming" /> Phone call</button>
        </>
      )}
      <button className="demo__shield" aria-label="Consent log" onClick={() => openOverlay('consentlog')}><i className="ti ti-shield-check" /></button>
    </div>
  );
}
