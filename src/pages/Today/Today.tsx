// Today: KPI strip, your plan, three lanes (Calls to make / Incoming / Recent), charts and coaching.
import { Link, useNavigate } from 'react-router-dom';
import { agent } from '../../data/b2b';
import { useUi } from '../../context/UiContext';
import { Spark, Stage, Stars, useB2B } from './parts';

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };
const K: Record<string, string> = { m: '#D97706', c: '#0E9AA7' };

export default function Today() {
  const D = useB2B(); const nav = useNavigate(); const { range, openOverlay } = useUi();
  const k = D.kpis, sp = D.spark;
  const S = 14, E = 20; const x = (h: number) => ((h - S) / (E - S)) * 100;
  const groups: Record<string, number[]> = {}; D.make.forEach((m, i) => { (groups[m.g] = groups[m.g] || []).push(i); });
  const calls = D.inc.filter((i) => i.k === 'call'), chats = D.inc.filter((i) => i.k === 'chat');
  const mx = Math.max(...D.hours.map((h) => Math.max(h[1], h[2])));
  const openKpi = (o: string) => { if (openOverlay) openOverlay(o); };
  return (
    <>
      <div className="hero-b">
        <div><div style={{ fontSize: 18, color: '#6f6a60' }}>{greeting()} 👋</div><h1 style={{ margin: '2px 0', fontSize: 22 }}>{agent.name}</h1><div style={{ fontSize: 15, color: '#6f6a60' }}>{agent.company} · {agent.team}</div></div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span className="card" style={{ padding: '7px 14px', fontWeight: 700, color: '#0f6e56' }}>● On Queue</span>
          <span className="card" style={{ padding: '7px 14px', fontWeight: 700, color: '#0f6e56' }}>{D.inc.length - 3} in queue</span>
          <button className="card" style={{ padding: '7px 14px', fontWeight: 700, cursor: 'pointer', font: 'inherit' }} onClick={() => openKpi('daterange')} aria-label="Date range">📅 {range} ▾</button>
        </div>
      </div>
      <div className="kpis">
        <div className="k"><div><b>{k.done}</b> <span style={{ color: '#6f6a60' }}>/ {k.plan} calls</span></div><div><div className="prog"><i style={{ width: Math.round((k.done * 100) / k.plan) + '%' }} /></div><small>{k.note}</small></div></div>
        <div className="k cl" onClick={() => openKpi('stCsat')}><div><b>{k.csat}</b> <em className="up">{k.csatD}</em><small>CSAT · team {k.team}</small></div><Spark v={sp.csat} color="#2563EB" /></div>
        <div className="k cl" onClick={() => openKpi('og')}><div><b>{k.sop}</b> <em className="up">{k.sopD}</em><small>SOP score</small></div><Spark v={sp.sop} color="#1f7a55" /></div>
        <div className="k"><div><b>{k.booked}</b> <em className="up">{k.bookedV}</em><small>Booked today</small></div><Spark v={sp.booked} color="#D97706" /></div>
        <div className="k cl" onClick={() => openKpi('stAht')}><div><b>{k.aht}</b> <em className="up">{k.ahtD}</em><small>Avg handle</small></div><Spark v={sp.aht} color="#6B3FA0" inv /></div>
      </div>
      <div className="card plan">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}><span className="h3">Your plan</span><span style={{ marginLeft: 'auto', fontSize: 11.5, color: '#2563EB', fontWeight: 600 }}><span style={{ display: 'inline-block', width: 18, height: 8, borderRadius: 3, background: 'repeating-linear-gradient(45deg,#cfe0ff,#cfe0ff 3px,#f4f8ff 3px,#f4f8ff 6px)', verticalAlign: 'middle', marginRight: 6 }} />Peak · {D.in} covers</span></div>
        <div className="tl">
          <div className="ax" />
          {Array.from({ length: E - S + 1 }, (_, i) => S + i).map((t) => <span key={t} className="hr" style={{ left: x(t) + '%' }}>{t > 12 ? t - 12 : t} pm</span>)}
          <div className="peak" style={{ left: x(D.peak[0]) + '%', width: x(D.peak[1]) - x(D.peak[0]) + '%' }} />
          {D.plan.map((e, i) => <div key={e[2]} className="ev" style={{ left: x(e[0]) + '%', color: K[e[1]] }}><span className="l" style={i % 2 ? { top: 48 } : undefined}>{e[2]}</span><span className="d" /></div>)}
          <div className="now" style={{ left: x(D.now) + '%' }}><span>NOW</span></div>
        </div>
      </div>
      <div className="cols">
        <div className="card col" style={{ ['--a' as string]: '#D97706' }}>
          <div className="ch"><b>Calls to make</b><span className="n">{D.make.length}</span><Link to="/calls/make">See all ›</Link></div>
          {Object.keys(groups).map((g) => { const later = /later/i.test(g); return (
            <div key={g}><div className="grp" style={/tried/i.test(g) ? { color: '#D97706' } : undefined}>{g}{later ? ' · ' + groups[g].length + ' more' : ''}</div>
              {!later && groups[g].map((i) => { const m = D.make[i]; return (
                <div className="r" key={m.n} onClick={() => nav('/calls/make', { state: { sel: i } })}><div className="l1"><span className={'sc' + (m.sc < 50 ? ' lo' : '')}>{m.sc}</span><b>{m.n}</b><Stage s={m.st} /><span className="v">{m.v}</span></div>
                  {m.ho ? <div className="ho" style={{ ['--x' as string]: '#D97706' }}><b>{D.out} · {(m.lt[0].split('· ')[1]) || ''}</b> {m.ho}</div> : <div className="l2">{m.why}</div>}</div>); })}
            </div>); })}
        </div>
        <div className="card col" style={{ ['--a' as string]: '#2563EB' }}>
          <div className="ch"><b>Incoming</b><span className="n">{D.inc.length}</span><span style={{ fontSize: 11.5, color: '#8a8378', whiteSpace: 'nowrap' }}>{calls.length} calls · {chats.length} chats</span><Link to="/calls/incoming">See all ›</Link></div>
          {calls.map((c, i) => <div className="r" key={c.n} onClick={() => nav('/calls/incoming')}><div className="l1"><span>☎</span><b>{c.n}</b><Stage s={c.st} /><span className={'wait' + (i ? ' y' : '')}>{c.w}</span></div>{c.ho ? <div className="ho"><b>{D.in}</b> {c.ho}</div> : <div className="l2">{c.mood}</div>}</div>)}
          <div className="grp" style={{ color: '#0E9AA7' }}>Chats {D.in} handed to you</div>
          {chats.slice(0, 2).map((c) => <div className="r" key={c.n} onClick={() => nav('/calls/incoming')}><div className="l1"><span>💬</span><b>{c.n}</b><Stage s={c.st} />{c.v && <span className="v">{c.v}</span>}</div>{c.ho ? <div className="ho" style={{ ['--x' as string]: '#0E9AA7' }}><b>{D.in}</b> {c.ho}</div> : <div className="l2">{c.mood}</div>}</div>)}
        </div>
        <div className="card col" style={{ ['--a' as string]: '#64748b' }}>
          <div className="ch"><b>Recent</b><span className="n">14</span><Link to="/calls/recent">See all ›</Link></div>
          {D.rec.map((r, i) => <div className="r" key={r[0] + r[1]} onClick={() => nav('/calls/recent', { state: { open: i } })}><div className="l1"><span className="mini">{r[0]}</span><b>{r[1]}</b><Stage s={r[2]} /></div><div className="l2" style={{ display: 'flex', gap: 6, alignItems: 'center' }}><span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r[3]}</span><Stars n={r[4]} /><span className="mini">SOP {r[5]}</span></div></div>)}
        </div>
      </div>
      <div className="bot">
        <div className="card bx"><div style={{ display: 'flex', alignItems: 'center' }}><span className="h3">Calls by hour</span><span className="lg"><span><i style={{ background: '#E8573A' }} />Done</span><span><i style={{ background: '#f0e9dc' }} />Plan</span></span></div>
          <div className="hb">{D.hours.map((h, i) => <div key={h[0]} className={i === D.hourNow ? 'now' : ''}><i style={{ height: (h[2] * 100) / mx + '%' }} /><em style={{ height: (h[1] * 100) / mx + '%' }} /><span>{h[0]}</span></div>)}</div></div>
        <div className="card bx"><div className="h3" style={{ marginBottom: 6 }}>CSAT by journey stage</div>{D.csat.map((c) => { const g = /griev/i.test(c[0]); return <div className="bar" key={c[0]}><span>{c[0]}</span><i><em style={{ width: c[1] + '%', ...(g ? { background: '#c2410c' } : {}) }} /></i><b style={g ? { color: '#c2410c' } : undefined}>{c[1]}%</b><span className="t">{c[2]} calls</span></div>; })}</div>
        <div className="card bx"><div className="h3" style={{ marginBottom: 6 }}>Coaching<span className="pill">Avani Manage</span></div><div style={{ fontSize: 13 }}><b>{D.habit[0]}</b> · {D.habit[1]}</div><div className="tip">{D.habit[2]}</div><Link to="/pulse" style={{ display: 'inline-block', fontSize: 12, fontWeight: 700, color: '#6B3FA0', marginTop: 8 }}>Open Pulse ›</Link></div>
      </div>
    </>
  );
}
