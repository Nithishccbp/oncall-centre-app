// Plan > Recent: call history; tapping a call opens its SOP review.
import { useMemo, useState } from 'react';
import CallReviewModal from './CallReviewModal.jsx';
import { useCall } from '../../context/CallContext.jsx';

const dirStyle = {
  in: { icon: 'ti-phone-incoming', color: '#0f6e56', bg: '#e1f5ee' },
  out: { icon: 'ti-phone-outgoing', color: '#185fa5', bg: '#e8f0fe' },
  missed: { icon: 'ti-phone-x', color: '#e24b4a', bg: '#fdecec' },
};

const first = (n) => String(n || '').toLowerCase().split(' ')[0];
const hhmm12 = (d) => d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();
const label = (c) => {
  if (!c.ts) return c.time;
  const d = new Date(c.ts); const now = new Date(); const y = new Date(); y.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return `Today ${hhmm12(d)}`;
  if (d.toDateString() === y.toDateString()) return `Yesterday ${hhmm12(d)}`;
  return `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} ${hhmm12(d)}`;
};

export default function RecentCalls() {
  const { recent: all } = useCall();
  // Newest first; a call made here is hidden once the backend sends the same call (same person, within 10 minutes).
  const recent = useMemo(() => {
    const backend = all.filter((c) => c.ingested && c.ts);
    const kept = all.filter((c) => !(c.local && backend.some((b) => first(b.name) === first(c.name) && Math.abs(new Date(b.ts) - new Date(c.ts)) < 10 * 60 * 1000)));
    const dated = kept.filter((c) => c.ts).sort((a, b) => new Date(b.ts) - new Date(a.ts));
    return [...dated, ...kept.filter((c) => !c.ts)].map((c) => ({ ...c, time: label(c) }));
  }, [all]);
  const [selected, setSelected] = useState(null);

  return (
    <>
      <div className="plan">
        <h1 className="plan__title">Recent calls</h1>
        <p className="plan__sub">Tap a call to review it against SOP</p>
        {!recent.length && <p className="plan__sub">No calls yet. Calls you make or receive will show up here.</p>}
        {recent.map((c) => {
          const s = dirStyle[c.dir];
          return (
            <div className="row" key={c.id}>
              <button className="row__head" onClick={() => setSelected(c)}>
                <span className="row__av" style={{ background: s.bg, color: s.color }}><i className={`ti ${s.icon}`} /></span>
                <span className="row__txt"><div className="row__name">{c.name}</div><div className="row__sub">{c.time} · {c.note || c.duration}</div></span>
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
