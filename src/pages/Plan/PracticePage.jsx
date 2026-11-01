// Plan > Practise a call: start a practice call with an AI customer, and look back at every session with its review.
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCall } from '../../context/CallContext.jsx';
import { usePracticeSessions, removeSession } from '../../data/practiceLog.js';
import { practiceSupported } from '../../services/practice.js';
import { SKILLS } from '../../services/practiceReview.js';
import './Practice.css';

const when = (iso) => {
  const d = new Date(iso); const now = new Date(); const y = new Date(); y.setDate(now.getDate() - 1);
  const t = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();
  return d.toDateString() === now.toDateString() ? `Today ${t}` : d.toDateString() === y.toDateString() ? `Yesterday ${t}` : `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} ${t}`;
};
const dur = (s) => `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
const tone = (n) => (n >= 75 ? 'good' : n >= 50 ? 'warn' : 'bad');
const Stars = ({ n }) => <span className="pr__stars" aria-label={`${n} of 5`}>{'★'.repeat(n)}<i>{'★'.repeat(5 - n)}</i></span>;

export default function PracticePage() {
  const { call, practiceCall } = useCall();
  const sessions = usePracticeSessions();
  const [sp, setSp] = useSearchParams();
  const [openId, setOpenId] = useState(sp.get('s'));
  useEffect(() => { if (sp.get('s')) setOpenId(sp.get('s')); }, [sp]);
  const open = sessions.find((s) => s.id === openId) || null;

  const stats = useMemo(() => {
    const n = sessions.length;
    const avg = n ? Math.round(sessions.reduce((a, s) => a + s.review.score, 0) / n) : 0;
    const best = n ? Math.max(...sessions.map((s) => s.review.score)) : 0;
    const last3 = sessions.slice(0, 3); const prev3 = sessions.slice(3, 6);
    const m = (l) => l.reduce((a, s) => a + s.review.score, 0) / l.length;
    const trend = last3.length && prev3.length ? Math.round(m(last3) - m(prev3)) : null;
    return { n, avg, best, trend };
  }, [sessions]);

  const close = () => { setOpenId(null); if (sp.get('s')) setSp({}); };
  const busy = call.status !== 'idle';

  if (open) {
    const r = open.review;
    return (
      <div className="plan pr">
        <button className="pr__back" onClick={close}><i className="ti ti-arrow-left" /> All sessions</button>
        <div className="card pr__hero">
          <div className={`pr__score pr__score--${tone(r.score)}`}><b>{r.score}</b><small>/ 100</small></div>
          <div className="pr__herotxt">
            <h2>Call with {open.persona?.name}</h2>
            <div className="muted">{when(open.ts)} · {dur(open.seconds || 0)} · {open.persona?.product}</div>
            <Stars n={r.stars} />
            <p>{r.summary}</p>
            {r.source !== 'ai' && <small className="muted">Quick review shown. The AI coach's detailed review replaces it in a moment if it is available.</small>}
          </div>
        </div>
        <div className="card pr__skills">
          <div className="label-caps">Skill by skill</div>
          {SKILLS.map(([k, label]) => (
            <div className="pr__skill" key={k}>
              <span>{label}</span>
              <div className="pr__bar"><i className={`pr__fill pr__fill--${tone(r.skills[k])}`} style={{ width: `${r.skills[k]}%` }} /></div>
              <b>{r.skills[k]}</b>
            </div>
          ))}
        </div>
        <div className="pr__two">
          <div className="card pr__list pr__list--good"><div className="label-caps">What went well</div>{r.strengths.length ? r.strengths.map((t, i) => <p key={i}><i className="ti ti-circle-check" /> {t}</p>) : <p className="muted">Nothing stood out this time.</p>}</div>
          <div className="card pr__list pr__list--bad"><div className="label-caps">Work on next</div>{r.improve.length ? r.improve.map((t, i) => <p key={i}><i className="ti ti-target-arrow" /> {t}</p>) : <p className="muted">Nothing to fix. Great call.</p>}</div>
        </div>
        <div className="card pr__tr">
          <div className="label-caps">Conversation</div>
          {open.lines.map((l, i) => (<div key={i} className={`pr__line pr__line--${l.who}`}><b>{l.who === 'agent' ? 'You' : open.persona?.name}</b><span>{l.text}</span></div>))}
        </div>
        <div className="pr__btns">
          <button className="btn-primary" disabled={busy} onClick={() => { close(); practiceCall(); }}><i className="ti ti-phone-ringing" /> Practise again</button>
          <button className="pr__del" onClick={() => { removeSession(open.id); close(); }}><i className="ti ti-trash" /> Delete session</button>
        </div>
      </div>
    );
  }

  return (
    <div className="plan pr">
      <h1 className="plan__title">Practise a call</h1>
      <p className="plan__sub">An AI customer rings you. Talk to them like a real call. Nothing here is a real customer and nothing is added to your Recent calls or dashboard.</p>
      <div className="card pr__start">
        <div><b>Ready when you are</b><div className="muted">You will get a call from a random buyer. Pick up, speak, and hang up when you are done to see your review.</div>
          {!practiceSupported() && <div className="pr__warn">Practising needs Chrome or Edge with a microphone.</div>}</div>
        <button className="btn-primary" disabled={busy} onClick={practiceCall}><i className="ti ti-phone-ringing" /> {busy ? 'A call is on' : 'Start practice call'}</button>
      </div>
      {stats.n > 0 && (
        <div className="summary card">
          <div><b>{stats.n}</b><small>Sessions</small></div><div className="summary__sep" />
          <div><b>{stats.avg}</b><small>Average score</small></div><div className="summary__sep" />
          <div><b>{stats.best}</b><small>Best score</small></div>
          {stats.trend !== null && <><div className="summary__sep" /><div><b style={{ color: stats.trend >= 0 ? 'var(--green-600)' : '#e24b4a' }}>{stats.trend >= 0 ? '▲' : '▼'} {Math.abs(stats.trend)}</b><small>Last 3 vs before</small></div></>}
        </div>
      )}
      <div className="label-caps pr__h">Your practice sessions</div>
      {sessions.length === 0 && <div className="empty">🎧<br />No practice sessions yet. Start one above.</div>}
      {sessions.map((s) => (
        <button key={s.id} className="row pr__row" onClick={() => setOpenId(s.id)}>
          <span className={`pr__mini pr__score--${tone(s.review.score)}`}>{s.review.score}</span>
          <span className="row__txt"><span className="row__name">{s.persona?.name}</span>
            <span className="row__sub">{when(s.ts)} · {dur(s.seconds || 0)} · {s.persona?.product}</span></span>
          <Stars n={s.review.stars} /><i className="ti ti-chevron-right row__chev" />
        </button>
      ))}
    </div>
  );
}
