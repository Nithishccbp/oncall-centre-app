// Consent log (shield on the DEMO strip): every yes / no / withdrawal saved in this browser.
import Modal from '../Modal/Modal.jsx';
import { useUi } from '../../context/UiContext.jsx';

export default function ConsentLog() {
  const { overlay, closeOverlay } = useUi();
  const open = overlay === 'consentlog';
  let events = [];
  if (open) {
    try { events = JSON.parse(localStorage.getItem('og_consent_events') || '[]').reverse(); } catch { events = []; }
  }
  return (
    <Modal open={open} onClose={closeOverlay} width={480} label="Consent log">
      <div className="cg__title" style={{ marginRight: 36 }}>Consent log</div>
      <p className="muted cg__hint">Saved in this browser (localStorage key <code>og_consent_events</code>). Newest first.</p>
      {events.length === 0 && <div className="empty">No consent events yet — start a call.</div>}
      {events.map((e, i) => (
        <div key={i} className="rp__log"><span>{new Date(e.ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span><p>{e.text}</p></div>
      ))}
    </Modal>
  );
}
