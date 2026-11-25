// Recent: today's calls, filterable; tap a row for transcript and SOP in the call drawer.
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import CallDrawer from './CallDrawer';
import { Path, Stage, Stars, useB2B } from './parts';
import type { RecentRow } from '../../data/b2b';

const CSAT = [0, 40, 55, 70, 85, 95];

export default function RecentView() {
  const D = useB2B(); const loc = useLocation();
  const [rf, setRf] = useState<'all' | 'low' | 'fu'>('all'); const [open, setOpen] = useState<number | null>(null);
  useEffect(() => { const o = (loc.state as { open?: number } | null)?.open; if (typeof o === 'number') setOpen(o); }, [loc.state]);
  const F = { all: 'All', low: 'Needs a look', fu: 'Follow-up set' } as const;
  const flt = (r: RecentRow) => rf === 'all' || (rf === 'low' && (r[4] <= 4 || r[5] < 75)) || (rf === 'fu' && /follow|callback/i.test(r[3] + r[6]));
  return (
    <div>
      <Link to="/" className="back">‹ Today</Link>
      <div className="hd" style={{ ['--a' as string]: '#64748b' }}><span className="bb" /><div><h1>Recent · today</h1><div className="s">Tap a call for transcript and SOP</div></div>
        <div className="seg">{(Object.keys(F) as (keyof typeof F)[]).map((k) => <span key={k} className={rf === k ? 'on' : ''} onClick={() => setRf(k)}>{F[k]}</span>)}</div></div>
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="rth"><span>Time</span><span>Customer and journey</span><span>What happened</span><span>Rating</span><span>CSAT</span><span>SOP</span><span>Next</span></div>
        {D.rec.map((r, i) => !flt(r) ? null : (
          <div className="rrow" key={r[0] + r[1]} onClick={() => setOpen(i)}>
            <span className="mini">{r[0]}</span><div className="nm"><b>{r[1]}</b><div className="path"><Stage s={r[2]} /></div></div>
            <div className="why">{r[3]}</div><div><Stars n={r[4]} /></div><div>{CSAT[r[4]]}%</div><div><span className="mini">SOP {r[5]}</span></div><div className="why">{r[6]}</div>
          </div>))}
        <div style={{ padding: '10px 14px', fontSize: 12, color: '#8a8378' }}>Latest {D.rec.length} shown · {14 - D.rec.length} earlier today</div>
      </div>
      {open !== null && <CallDrawer r={D.rec[open]} onClose={() => setOpen(null)} />}
    </div>
  );
}
export { Path };
