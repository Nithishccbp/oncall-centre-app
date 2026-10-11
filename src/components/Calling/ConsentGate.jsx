// "Ask before you record" — shown right after the customer picks up. Nothing is recorded until they say yes.
import { useEffect, useState } from 'react';
import Modal from '../Modal/Modal.jsx';
import { useCall } from '../../context/CallContext.jsx';
import { useConsent } from '../../context/ConsentContext.jsx';
import { useUi } from '../../context/UiContext.jsx';
import { consentLanguages, leadMeta } from '../../data/calling.js';

export default function ConsentGate() {
  const { call, lead, goLive } = useCall();
  const { consent, setField, sendRequest, grant, refuse } = useConsent();
  const { showToast } = useUi();
  const [lang, setLang] = useState('en');
  const [mode, setMode] = useState('whatsapp'); // 'whatsapp' | 'voice'
  const [phone, setPhone] = useState(leadMeta(lead).phone);
  useEffect(() => { setPhone(leadMeta(lead).phone); }, [call.name]); // eslint-disable-line react-hooks/exhaustive-deps
  const open = call.status === 'consent' && (consent.status === 'none' || consent.status === 'pending');
  const pending = consent.status === 'pending';
  const script = consentLanguages.find((l) => l.id === lang);
  const first = (call.name || '').split(' ')[0];

  const yes = (method) => {
    const id = grant(call.seconds, method);
    showToast(`Consent ${id} · recording on`);
    goLive();
  };
  const no = (why) => { refuse(call.seconds, why); showToast('Recording off — call continues without recording'); goLive(); };

  // Demo: the customer "taps Yes" a few seconds after the WhatsApp request is sent.
  useEffect(() => {
    if (!open || !pending) return undefined;
    const t = setTimeout(() => yes('WhatsApp'), 4500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, pending]);

  return (
    <Modal open={open} onClose={() => no('closed without an answer')} width={420} label="Ask before you record">
      <div className="cg__head">
        <span className="cg__icon"><i className="ti ti-shield-check" /></span>
        <div><div className="cg__title">Ask before you record</div><div className="muted cg__sub">Call centre · {call.name}</div></div>
      </div>

      <div className="cg__step"><span className="cg__num">1</span> Say this · right after hello</div>
      <div className="cg__script">
        <div className="cg__langs">
          {consentLanguages.map((l) => (
            <button key={l.id} className={lang === l.id ? 'is-on' : ''} onClick={() => setLang(l.id)}>{l.label}</button>
          ))}
          <span className="muted">+20</span>
        </div>
        <p>{script.text}</p>
      </div>

      <div className="cg__step"><span className="cg__num">2</span> Get their yes</div>
      <div className="cg__tabs" role="tablist">
        <button role="tab" aria-selected={mode === 'whatsapp'} className={mode === 'whatsapp' ? 'is-on' : ''} onClick={() => setMode('whatsapp')}><i className="ti ti-brand-whatsapp" /> On WhatsApp</button>
        <button role="tab" aria-selected={mode === 'voice'} className={mode === 'voice' ? 'is-on' : ''} onClick={() => setMode('voice')}><i className="ti ti-microphone" /> Said out loud</button>
      </div>

      {mode === 'whatsapp' ? (
        pending ? (
          <div className="cg__wait">
            <div><i className="ti ti-loader-2 spin" /> Sent to +91 {phone} — waiting for {first} to tap…</div>
            <div className="cg__demo">
              <button onClick={() => yes('WhatsApp')}>Customer tapped Yes</button>
              <button onClick={() => no('tapped No on WhatsApp')}>Customer tapped No</button>
            </div>
          </div>
        ) : (
          <>
            <div className="cg__send">
              <span className="cg__cc">+91</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="WhatsApp number" inputMode="tel" />
              <button className="btn-primary" disabled={phone.replace(/\D/g, '').length < 10} onClick={() => sendRequest(call.seconds, 'WhatsApp')}><i className="ti ti-send" /> Send</button>
            </div>
            <p className="muted cg__hint">They get the same words, and tap Yes or No. Offers are asked separately in the message.</p>
          </>
        )
      ) : (
        <div className="cg__voice">
          <p className="muted cg__hint">Ask the line above out loud. Tap what the customer said — a short clip of the answer is saved as proof.</p>
          <div className="cg__demo">
            <button className="yes" onClick={() => yes('Verbal')}><i className="ti ti-check" /> Customer said yes</button>
            <button onClick={() => no('said no out loud')}><i className="ti ti-x" /> Customer said no</button>
          </div>
        </div>
      )}

      <label className="cg__toggle">
        <span><b>Also ask about offers?</b><small>Marketing offers are a separate yes/no.</small></span>
        <input type="checkbox" checked={consent.offers} onChange={(e) => setField({ offers: e.target.checked })} />
        <i className="cg__switch" />
      </label>
      <label className="cg__toggle">
        <span><b>Under 18?</b><small>Send it to a parent's number instead.</small></span>
        <input type="checkbox" checked={consent.minor} onChange={(e) => { setField({ minor: e.target.checked }); setPhone(e.target.checked ? '' : leadMeta(lead).phone); }} />
        <i className="cg__switch" />
      </label>

      <p className="muted cg__foot">A yes gives a Consent ID tied to this call. A no is logged too, and you carry on without recording.</p>
    </Modal>
  );
}
