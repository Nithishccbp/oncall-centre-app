// Right-hand drawer for one call: Summary, Transcript, SOP score, Problems.
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { agent, callScript as S, type RecentRow } from '../../data/b2b';

const COL = '#E8573A';
const CSAT = [0, 40, 55, 70, 85, 95];
function Ring({ v, label }: { v: number; label?: string }) {
  const r = 26, c = 2 * Math.PI * r;
  return <svg width="64" height="64"><circle cx="32" cy="32" r={r} fill="none" stroke="#efeae0" strokeWidth="6" /><circle cx="32" cy="32" r={r} fill="none" stroke={COL} strokeWidth="6" strokeLinecap="round" strokeDasharray={`${(c * v) / 100} ${c}`} transform="rotate(-90 32 32)" /><text x="32" y="37" textAnchor="middle" fontSize="14" fontWeight="700" fill="#1f1d1a">{label ?? v}</text></svg>;
}
function Wave() {
  return <svg viewBox="0 0 672 48" width="100%" height="48">{Array.from({ length: 120 }, (_, i) => { const h = 4 + Math.abs(Math.sin(i * 0.37) * 14 + Math.sin(i * 1.3) * 8); return <rect key={i} x={i * 5.6} y={24 - h / 2} width="3" height={h} rx="1.5" fill={i < 62 ? COL : '#e3ddd0'} />; })}</svg>;
}

export default function CallDrawer({ r, onClose }: { r: RecentRow; onClose: () => void }) {
  const [tab, setTab] = useState<'s' | 't' | 'o' | 'p'>('s');
  const sop = r[5], csat = CSAT[r[4]], sent = r[4] >= 4 ? 36 : r[4] === 3 ? 8 : -22;
  const fn = r[1].split(' ')[0], spk = agent.short.split(' ')[0];
  const tr: [string, string, string, string][] = [
    ['0:02', spk, `Hi, this is ${spk} calling from ${S.brand}. Is this a good time to talk for two minutes?`, ''], ['0:06', fn, 'Yes, go ahead.', ''],
    ['0:09', spk, 'Can I record this call so we can help you better?', 'Consent'], ['0:15', fn, 'Sure.', ''],
    ['0:22', spk, 'What mattered most to you when you saw it?', 'Need'],
    ['0:31', fn, `Mainly ${S.need}. But honestly I am also looking at ${S.comp}, it is cheaper.`, 'Objection'],
    ['0:44', spk, S.priceLine, 'Value'], ['1:02', fn, 'Okay, that is better than I thought.', ''],
    ['1:08', spk, `Would you like to come in once more? I have ${S.slots}.`, 'Next step'], ['1:15', fn, 'The first one works.', 'Booked']];
  const steps: [string, boolean, string][] = [['Opened with name and reason for call', true, '0:02'], ['Asked for consent before recording', true, '0:09'], ['Recalled the visit and the product', true, '0:09'], ['Asked about the need', true, '0:22'], ['Handled the price objection with value', true, '0:44'], ['Explained payment options', true, '0:44'], ['Offered two specific slots', true, '1:08'], ['Confirmed on WhatsApp before hanging up', false, '—']];
  const tabs: ['s' | 't' | 'o' | 'p', string][] = [['s', 'Summary'], ['t', 'Transcript'], ['o', 'SOP score'], ['p', 'Problems']];
  return createPortal(
    <div className="cx-ov show" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="cx-dr" role="dialog" aria-label="Call details">
        <div className="cx-drh"><div><span className="cx-chip" style={{ color: COL, background: COL + '1a' }}>Call centre</span><h2>{r[1]} · {r[3]}</h2><div className="sub">{agent.short} · Today {r[0]} · 4m 10s</div></div><button className="cx-x" aria-label="Close" onClick={onClose}>✕</button></div>
        <div className="cx-dt">{tabs.map(([k, l]) => <span key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</span>)}</div>
        {tab === 's' && <>
          <div className="cx-sg"><div className="c"><Ring v={Math.round((sent + 100) / 2)} label={(sent > 0 ? '+' : '') + sent} /><div className="l">Sentiment</div><div className="h">−100 to +100</div></div><div className="c"><Ring v={csat} /><div className="l">CSAT</div><div className="h">predicted, out of 100</div></div><div className="c"><Ring v={sop} /><div className="l">SOP score</div><div className="h">{steps.filter((s) => s[1]).length} of 8 steps</div></div><div className="c"><Ring v={81} /><div className="l">Intent</div><div className="h">ready to buy, 0–100</div></div></div>
          <div className="cx-note"><b>Avani's note</b>Main need: {S.need}. Comparing with {S.comp} on price. Warmed up once the value and payment options came up. {S.book}.<br /><span style={{ color: '#8a8378' }}>Next step: {r[6] || 'confirm on WhatsApp today.'}</span></div>
          <div className="cx-wave"><div style={{ fontSize: 11, fontWeight: 700, color: '#8a8378', letterSpacing: '.06em', textTransform: 'uppercase' }}>Call · 4m 10s</div><Wave /><div className="mk"><span>0:09 Consent</span><span>0:22 Need</span><span style={{ background: '#fde5de' }}>0:31 Objection: price</span><span>0:44 Value</span><span style={{ background: '#dde9e2' }}>1:08 {S.book}</span></div></div>
          <div className="cx-acts"><button className="p">Confirm on WhatsApp</button><button>Send to Pulse for coaching</button><button>Save as example call</button></div></>}
        {tab === 't' && <><div className="cx-wave"><Wave /></div><div className="cx-tr" style={{ marginTop: 10 }}>{tr.map((x) => <div key={x[0]} className={'t' + (x[3] ? ' hl' : '')}><span className="ts">{x[0]}</span><span className="sp">{x[1]}</span><span>{x[2]}{x[3] && <span className="tag">{x[3]}</span>}</span></div>)}</div></>}
        {tab === 'o' && <><div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}><Ring v={sop} /><div><b style={{ fontSize: 15 }}>SOP score {sop}</b><div style={{ color: '#6f6a60' }}>{steps.filter((s) => s[1]).length} of 8 steps done.</div></div></div><div className="cx-sop">{steps.map((s) => <div className="s" key={s[0]}><span className={s[1] ? 'ok' : 'no'}>{s[1] ? '✓' : '✕'}</span><span>{s[0]}</span><small>{s[2]}</small></div>)}</div></>}
        {tab === 'p' && <div className="cx-prob"><div className="p"><b>Price objection: {S.comp}</b><div style={{ color: '#5f5a50', marginTop: 3 }}>Raised at 0:31. Handled with value and payment options. Resolved.</div></div><div className="p"><b>Missed step: confirm on WhatsApp</b><div style={{ color: '#5f5a50', marginTop: 3 }}>The call ended without confirming the slot in writing.</div></div></div>}
      </div>
    </div>, document.body);
}
