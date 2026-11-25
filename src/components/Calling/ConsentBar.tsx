// Small recording pill at the bottom while a call is live: shows consent status and opens the Rights panel.
import { useCall } from '../../context/CallContext';
import { useConsent } from '../../context/ConsentContext';
import { useUi } from '../../context/UiContext';

export default function ConsentBar() {
  const { call } = useCall();
  const { consent } = useConsent();
  const { openOverlay } = useUi();
  if (call.mode === 'practice' || (call.status !== 'inCall' && call.status !== 'consent')) return null;
  const id = consent.consentId ? consent.consentId.split('-').pop() : '';
  const map = {
    recording: ['rec', `Recording · ${id}`],
    declined: ['off', 'Not recording'],
    withdrawn: ['off', 'Recording stopped'],
    pending: ['wait', 'Waiting for their tap'],
    none: ['wait', 'Asking for consent'],
  };
  const [tone, label] = (map as any)[consent.status];
  return (
    <div className={`cbar cbar--${tone}`}>
      <span className="cbar__dot" /> {label}
      <button onClick={() => openOverlay('rights')}><i className="ti ti-user-shield" /> Rights</button>
    </div>
  );
}
