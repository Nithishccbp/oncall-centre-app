// In-call consent prompt: say the line, tap what the customer said. Then a short result card (yes saved / no deleted).
import { useEffect, useRef, useState } from 'react';
import { useCall } from '../../context/CallContext.jsx';
import { useConsent } from '../../context/ConsentContext.jsx';
import { useUi } from '../../context/UiContext.jsx';

const LINE = 'Can we record this? Only for your service and follow-up. You can say no, or ask us to delete it any time.';

export default function ConsentCard({ onMore, gateOpen, onDone }) {
  const { call, goLive } = useCall();
  const { consent, grant, refuse } = useConsent();
  const { showToast } = useUi();
  const [result, setResult] = useState(null); // 'yes' | 'no'

  const waiting = call.status === 'ringing'; // shown straight away; buttons unlock when they pick up
  const asking = (call.status === 'consent' || waiting) && !(call.mode === 'aiphone' && call.autoConsent) && consent.status === 'none';
  const told = useRef(false);
  useEffect(() => {
    if (call.status === 'consent' && consent.status === 'none' && !told.current) { told.current = true; showToast('On call · recording · ask for consent now'); }
    if (call.status === 'idle' || call.status === 'precheck') told.current = false;
  }, [call.status, consent.status]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (consent.status !== 'none' && consent.status !== 'pending' && gateOpen) onDone(); }, [consent.status]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!result) return undefined;
    const t = setTimeout(() => setResult(null), 4500);
    return () => clearTimeout(t);
  }, [result]);
  useEffect(() => { if (call.status === 'idle' || call.status === 'precheck') setResult(null); }, [call.status]);

  const yes = () => { grant(call.seconds, 'Verbal'); goLive(); setResult('yes'); };
  const no = () => { refuse(call.seconds, 'said no out loud'); goLive(); setResult('no'); showToast('Recording withdrawn'); };

  if (asking && !gateOpen) {
    return (
      <div className="cc cc--ask" role="dialog" aria-label="Recording consent">
        <div className="cc__t">On call · recording the consent</div>
        <div className="cc__say">Say now: “{LINE}”</div>
        <div className="cc__btns">
          <button className="cc__yes" onClick={yes} disabled={waiting}>✓ They said yes</button>
          <button className="cc__no" onClick={no} disabled={waiting}>✕ They said no</button>
        </div>
        {waiting ? <div className="cc__wait">Ringing… the buttons turn on when they pick up.</div> : <button className="cc__more" onClick={onMore}>Ask on WhatsApp or in another language</button>}
      </div>
    );
  }
  if (result === 'yes') return <div className="cc cc--yes"><div className="cc__t"><span className="cc__ok">✓</span> Consent on the recording</div><div className="cc__s">Their yes is saved as a clip. Keep talking.</div></div>;
  if (result === 'no') return <div className="cc cc--no"><div className="cc__t"><span className="cc__stop">■</span> Recording stopped and deleted</div><div className="cc__s">They said no. Carry on the call as normal.</div></div>;
  return null;
}
