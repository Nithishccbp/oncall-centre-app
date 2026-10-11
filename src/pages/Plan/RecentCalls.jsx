// Plan > Recent: call history; tapping a call opens its SOP review.
import { useState } from 'react';
import CallReviewModal from './CallReviewModal.jsx';
import { useCall } from '../../context/CallContext.jsx';

const dirStyle = {
  in: { icon: 'ti-phone-incoming', color: '#0f6e56', bg: '#e1f5ee' },
  out: { icon: 'ti-phone-outgoing', color: '#185fa5', bg: '#e8f0fe' },
  missed: { icon: 'ti-phone-x', color: '#e24b4a', bg: '#fdecec' },
};

export default function RecentCalls() {
  const { recent } = useCall();
  const [selected, setSelected] = useState(null);

  return (
    <>
      <div className="plan">
        <h1 className="plan__title">Recent calls</h1>
        <p className="plan__sub">Tap a call to review it against SOP</p>
        {recent.map((c) => {
          const s = dirStyle[c.dir];
          return (
            <div className="row" key={c.id}>
              <button className="row__head" onClick={() => setSelected(c)}>
                <span className="row__av" style={{ background: s.bg, color: s.color }}><i className={`ti ${s.icon}`} /></span>
                <span className="row__txt"><div className="row__name">{c.name}</div><div className="row__sub">{c.time} · {c.duration}</div></span>
                <i className="ti ti-chevron-right row__chev" />
              </button>
            </div>
          );
        })}
      </div>
      <CallReviewModal call={selected} onClose={() => setSelected(null)} />
    </>
  );
}
