// Plan > Calls to make: leads ranked by score, one expandable row at a time, 2 per page.
import { useMemo, useState } from 'react';
import Pager from '../../components/Pager/Pager.jsx';
import { getOutgoingPlan } from '../../data/selectors.js';
import { useCall } from '../../context/CallContext.jsx';

const PAGE_SIZE = 2;
const scoreColor = (s) => (s >= 80 ? '#0f6e56' : s >= 55 ? '#c8860a' : '#e24b4a');

import { useIngest } from '../../context/IngestContext.jsx';

export default function OutgoingCalls() {
  const { version } = useIngest();
  const plan = useMemo(getOutgoingPlan, [version]);
  const { startCall } = useCall();
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState(null);
  const totalPages = Math.max(1, Math.ceil(plan.length / PAGE_SIZE));
  const rows = plan.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const changePage = (p) => { setPage(p); setOpenId(null); };

  return (
    <>
      <div className="plan">
        <h1 className="plan__title">Planned outgoing calls</h1>
        <p className="plan__sub">Ranked by lead attractiveness score — tap a lead for the full picture</p>
        {rows.map((l) => {
          const open = openId === l.id;
          return (
            <div className="row" key={l.id}>
              <button className="row__head" aria-expanded={open} onClick={() => setOpenId(open ? null : l.id)}>
                <span className="row__av" style={{ background: l.avatarBg, color: l.avatarColor }}>{l.initials}</span>
                <span className="row__txt"><div className="row__name">{l.name}</div><div className="row__sub">{l.interest}</div></span>
                <span className="row__score"><b style={{ color: scoreColor(l.score) }}>{l.score}</b><small>score</small></span>
                <i className={`ti ${open ? 'ti-chevron-up' : 'ti-chevron-down'} row__chev`} />
              </button>
              {open && (
                <div className="row__detail">
                  <div className="row__label">Story so far</div>
                  <div className="row__story">{l.story}</div>
                  <div className="row__tiles">
                    <div className="tile"><small>Preferred product</small><b>{l.product}</b></div>
                    <div className="tile"><small>Cross-sell</small><b>{l.crossSell}</b></div>
                  </div>
                  <div className="emi"><small>EMI / financing</small><span>{l.emiNote}</span></div>
                  <button className="btn-call" onClick={() => startCall(l.name)}><i className="ti ti-phone" /> Place call</button>
                </div>
              )}
            </div>
          );
        })}
        <Pager page={page} totalPages={totalPages} onChange={changePage} />
      </div>
    </>
  );
}
