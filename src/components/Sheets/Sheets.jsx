// Action sheets opened from the Leads modal and AI Assist: WhatsApp, No Interest, Came Back.
import { useState } from 'react';
import Modal from '../Modal/Modal.jsx';
import { useUi } from '../../context/UiContext.jsx';
import { useLeadsModal } from '../../context/LeadsModalContext.jsx';
import { usePulse } from '../../context/PulseContext.jsx';
import { leadMeta } from '../../data/calling.js';
import './Sheets.css';

const waItems = ['📄 Product Quote', '📋 Brochure PDF', '💳 EMI Options', '🛡️ Warranty Info'];

function WhatsAppSheet({ lead, close }) {
  const { showToast } = useUi();
  const { addMessage } = usePulse();
  const [picked, setPicked] = useState([waItems[0]]);
  const [phone, setPhone] = useState(`+91 ${leadMeta(lead).phone}`);
  const toggle = (i) => setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));
  const send = () => {
    const first = (lead?.name || 'customer').split(' ')[0];
    addMessage('customer-discussions', { who: 'You', initials: 'AR', mine: true, text: `Sent to ${first} on WhatsApp: ${picked.map((i) => i.replace(/^\S+\s/, '')).join(', ')}` });
    showToast(`Sent on WhatsApp to ${first} ✓`);
    close();
  };
  return (
    <>
      <div className="sh__wa"><span className="sh__waic"><i className="ti ti-brand-whatsapp" /></span>
        <div><b>Send via WhatsApp</b><small>Quote, brochure, or product info</small></div></div>
      <div className="sh__cap">What to send</div>
      <div className="sh__chips">
        {waItems.map((i) => <button key={i} className={picked.includes(i) ? 'on' : ''} aria-pressed={picked.includes(i)} onClick={() => toggle(i)}>{i}</button>)}
      </div>
      <div className="sh__cap">Send to</div>
      <div className="sh__to"><i className="ti ti-brand-whatsapp" /><div><b>Customer's WhatsApp</b><small>Sent from brand WA Business account</small></div><i className="ti ti-circle-check-filled ok" /></div>
      <input className="sh__input" value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="Customer phone" />
      <div className="sh__btns two">
        <button className="outline" onClick={close}>Cancel</button>
        <button className="solid green" disabled={!picked.length} onClick={send}><i className="ti ti-brand-whatsapp" /> Send on WhatsApp</button>
      </div>
    </>
  );
}

const reasons = ['Price too high', 'Went to competitor', 'Not ready to buy', 'Other'];
function NoInterest({ lead, close }) {
  const { showToast } = useUi();
  const { closeLeads } = useLeadsModal();
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const confirm = () => { showToast(`${lead.name} marked No Interest · ${reason}`); close(); closeLeads(); };
  return (
    <>
      <header className="sh__bar red"><i className="ti ti-thumb-down" /><div><b>No Interest</b><small>{lead.name}</small></div></header>
      <div className="sh__pad">
        <div className="sh__q">Why did the customer lose interest?</div>
        {reasons.map((r) => (
          <label key={r} className="sh__radio"><input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} /> {r}</label>
        ))}
        <textarea className="sh__input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add more detail (optional)…" aria-label="Details" />
        <div className="sh__btns two"><button className="outline" onClick={close}>Cancel</button>
          <button className="solid red" disabled={!reason} onClick={confirm}>Confirm No Interest</button></div>
      </div>
    </>
  );
}

const whens = ['Today (already in store)', 'This week', 'Specific date'];
function CameBack({ lead, close }) {
  const { showToast } = useUi();
  const { closeLeads } = useLeadsModal();
  const [when, setWhen] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const ready = when && (when !== 'Specific date' || date);
  const confirm = () => { showToast(`${lead.name} marked as came back · ${when === 'Specific date' ? date : when}`); close(); closeLeads(); };
  return (
    <>
      <header className="sh__bar green"><i className="ti ti-calendar-check" /><div><b>Came Back ✓</b><small>{lead.name}</small></div></header>
      <div className="sh__pad">
        <div className="sh__q">When did/will the customer come back?</div>
        {whens.map((w) => (
          <label key={w} className="sh__radio"><input type="radio" name="when" checked={when === w} onChange={() => setWhen(w)} /> {w}</label>
        ))}
        <input type="date" className="sh__input" value={date} onChange={(e) => { setDate(e.target.value); setWhen('Specific date'); }} aria-label="Return date" />
        <textarea className="sh__input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any notes about the return visit…" aria-label="Notes" />
        <div className="sh__btns two"><button className="outline" onClick={close}>Cancel</button>
          <button className="solid green" disabled={!ready} onClick={confirm}>Confirm Return</button></div>
      </div>
    </>
  );
}

export default function SheetHost() {
  const { sheet, closeSheet } = useUi();
  const s = sheet || null;
  return (
    <Modal open={!!s} onClose={closeSheet} width={440} flush label="Action sheet">
      {s && s.type === 'whatsapp' && <div className="sh__pad"><WhatsAppSheet lead={s.lead} close={closeSheet} /></div>}
      {s && s.type === 'nointerest' && <NoInterest lead={s.lead} close={closeSheet} />}
      {s && s.type === 'cameback' && <CameBack lead={s.lead} close={closeSheet} />}
    </Modal>
  );
}
