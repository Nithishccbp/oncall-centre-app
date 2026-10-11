// Plan > Incoming: missed calls ranked by expected value, derived from history + leads.
import { formatINR, getMissedCallsWithValue, signalFor } from '../../data/selectors.js';
import { useCall } from '../../context/CallContext.jsx';

export default function IncomingCalls() {
  const { recent, startCall } = useCall();
  const missed = getMissedCallsWithValue(recent);
  const total = missed.reduce((sum, m) => sum + m.value, 0);

  return (
    <>
      <div className="plan">
        <h1 className="plan__title">Missed calls</h1>
        <p className="plan__sub">Ranked by expected value — call the highest-value leads back first</p>
        {missed.length === 0 ? (
          <div className="empty">✅<br />No missed calls</div>
        ) : (
          <>
            <div className="summary card">
              <div><b>{missed.length}</b><small>Missed today</small></div>
              <div className="summary__sep" />
              <div><b style={{ color: 'var(--green-600)' }}>{formatINR(total)}</b><small>Expected value at stake</small></div>
            </div>
            {missed.map(({ call, lead, value }) => (
              <div className="row" key={call.id}>
                <div className="row__head static">
                  <span className="row__av" style={{ background: '#fdecec', color: '#e24b4a' }}><i className="ti ti-phone-x" /></span>
                  <span className="row__txt"><div className="row__name">{call.name}</div>
                    <div className="row__sub">Missed {call.time} · {signalFor(lead)}</div></span>
                  <span className="row__right">
                    <div className={`row__value ${lead ? '' : 'new'}`}>{lead ? `${formatINR(value)} expected` : 'New contact'}</div>
                    <button className="btn-small" onClick={() => startCall(call.name)}><i className="ti ti-phone" /> Call back</button>
                  </span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
}
