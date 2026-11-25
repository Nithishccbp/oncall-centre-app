// Small shared pieces for the Today family of screens.
import { useOutletContext } from 'react-router-dom';
import type { B2BData } from '../../data/b2b';

export const useB2B = () => useOutletContext<B2BData>();
export const stageText = (s: string) => (/grievance/i.test(s) ? 'Grievance' : s);
export const Stage = ({ s }: { s: string }) => <span className={'stage' + (/grievance/i.test(s) ? ' g' : '')}>{stageText(s)}</span>;
export const Stars = ({ n }: { n: number }) => <span className="stars">{'★'.repeat(n)}<i>{'★'.repeat(5 - n)}</i></span>;
export const Path = ({ path, now }: { path: string[]; now?: string }) => (
  <div className="path">{path.map((p, i) => <span key={p + i} style={{ display: 'contents' }}>{i > 0 && '›'}<i>{p}</i></span>)}{now && <>›<b style={{ color: '#9a5b00' }}>{now}</b></>}</div>
);
export function Spark({ v, color, inv }: { v: number[]; color: string; inv?: boolean }) {
  const W = 120, H = 24, mn = Math.min(...v), mx = Math.max(...v), r = mx - mn || 1;
  const pts = v.map((y, i) => { let yy = (y - mn) / r; if (inv) yy = 1 - yy; return [(i * W) / (v.length - 1), H - 2 - yy * (H - 4)]; });
  const last = pts[pts.length - 1];
  return <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none"><polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={color} strokeWidth="1.8" vectorEffect="non-scaling-stroke" /><circle cx={last[0]} cy={last[1]} r="2.5" fill={color} /></svg>;
}
export const amount = (v: string) => { const s = String(v || ''), n = parseFloat(s.replace(/[^\d.]/g, '')) || 0; if (/cr/i.test(s)) return n * 1e7; if (/\dL|lakh/i.test(s)) return n * 1e5; if (/\dK/.test(s)) return n * 1e3; return +s.replace(/[^\d]/g, '') || 0; };
export const fmtAmt = (t: number) => (t >= 1e7 ? '₹' + (t / 1e7).toFixed(1) + ' Cr' : '₹' + (t / 1e5).toFixed(1) + 'L');
