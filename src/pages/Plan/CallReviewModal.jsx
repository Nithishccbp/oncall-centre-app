// Popup showing how a call scored against the call-centre SOP checklist.
import Modal from '../../components/Modal/Modal.jsx';
import { sopChecklist, sopReviews } from '../../data/calls.js';
import { useCall } from '../../context/CallContext.jsx';

export default function CallReviewModal({ call, onClose }) {
  const { startCall } = useCall();
  // Calls made in this session are scored from the SOP chips ticked during the call.
  const liveReview = call?.live ? {
    score: Math.round((call.sopDone.length / sopChecklist.length) * 100),
    items: sopChecklist.map((label, i) => ({
      label, passed: call.sopDone.includes(i),
      quote: call.sopDone.includes(i) ? 'Covered during this call.' : 'Not covered during this call.',
    })),
  } : null;
  const review = liveReview || call?.review || (call ? sopReviews[call.id] : null);

  return (
    <Modal open={!!call} onClose={onClose} width={480} label="Call review">
      {call && (
        <>
          <div className="review__head">
            <span className="review__icon"><i className="ti ti-clipboard-check" /></span>
            <div><div className="review__title">Call with {call.name}</div><div className="muted">{call.time} · {call.duration}</div></div>
          </div>
          {review ? (
            <>
              {call.live && !call.recorded && <div className="review__note"><i className="ti ti-microphone-off" /> Recording was off for this call — scored from the SOP chips ticked manually.</div>}
              {call.summary && <div className="review__note sum"><b>Summary:</b> {call.summary}</div>}
              <div className="review__score">
                <div className="review__bar"><small>SOP adherence on this call</small><div><div style={{ width: `${review.score}%` }} /></div></div>
                <span className="review__pct">{review.score}%</span>
              </div>
              {review.items.map((it) => (
                <div key={it.label} className={`sop-item ${it.passed ? '' : 'fail'}`}>
                  <i className={`ti ${it.passed ? 'ti-check ok' : 'ti-x no'}`} />
                  <div><div className="sop-item__label">{it.label}</div><div className="sop-item__quote">{it.quote}</div></div>
                  {!it.passed && <span className="miss-pill">Missed</span>}
                </div>
              ))}
            </>
          ) : (
            <div className="empty">
              No conversation to review — call this lead back instead.
              <button className="btn-primary" style={{ display: 'block', margin: '14px auto 0' }}
                onClick={() => { onClose(); startCall(call.name); }}><i className="ti ti-phone" /> Call back</button>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
