// Opened from the "Rights" pill: the customer's data rights, each one sends a logged request to the DPO.
import Modal from '../Modal/Modal.jsx';
import { useCall } from '../../context/CallContext.jsx';
import { useConsent } from '../../context/ConsentContext.jsx';
import { useUi } from '../../context/UiContext.jsx';
import { rightsActions } from '../../data/calling.js';

const statusChip = { recording: ['Recording', 'on'], declined: ['Not recording', 'off'], withdrawn: ['Stopped', 'off'], pending: ['Waiting', 'wait'], none: ['Not asked', 'wait'] };

export default function RightsPanel() {
  const { overlay, closeOverlay, showToast } = useUi();
  const { call, end, withdrawConsent } = useCall();
  const { consent, rightsRequest } = useConsent();
  const [label, tone] = statusChip[consent.status];

  const act = (a) => {
    if (a.id === 'withdraw') { withdrawConsent(); return; }
    const ref = rightsRequest(call.seconds, a.title, a.sec);
    showToast(`Sent to the DPO · ref ${ref}`);
  };

  return (
    <Modal open={overlay === 'rights'} onClose={closeOverlay} width={500} label="Customer rights">
      <div className="rp__name">{call.name}</div>
      <div className="muted rp__sub">Call centre{consent.consentId ? ` · ${consent.consentId}` : ''}</div>
      <div className="rp__status">Recording <span className={`rp__chip ${tone}`}>{label}</span> Offers <span className="rp__chip off">{consent.offers ? 'Yes' : 'No'}</span></div>

      <div className="rp__h">Customer is asking to…</div>
      <div className="muted rp__help">One tap sends it to the DPO with a reference number.</div>
      <div className="rp__grid">
        {rightsActions.map((a) => (
          <button key={a.id} className="rp__tile" disabled={a.id === 'withdraw' && consent.status !== 'recording'} onClick={() => act(a)}>
            <span className={`rp__ic ${a.tone}`}><i className={`ti ${a.icon}`} /></span>
            <span><b>{a.title}</b><small>{a.sec}</small></span>
          </button>
        ))}
      </div>

      <div className="rp__h">Logged</div>
      {consent.log.length === 0 && <div className="muted">Nothing logged yet.</div>}
      {consent.log.map((l, i) => (
        <div key={i} className="rp__log"><span>{l.at}</span><p>{l.text}</p></div>
      ))}
      <button className="rp__end" onClick={() => { closeOverlay(); end(); }}>End this call</button>
    </Modal>
  );
}
