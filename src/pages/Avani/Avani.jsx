// Avani AI coach: choose a persona, then Assess (chat), Learn (path) or Practise (record + feedback).
import { useEffect, useRef, useState } from 'react';
import { personas, assessChips, assessAnswer, seedSessions, modules, steps, scoreStep } from '../../data/avani.js';
import { useIngest } from '../../context/IngestContext.jsx';
import { useUi } from '../../context/UiContext.jsx';
import './Avani.css';

const sr = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

function Assess() {
  const { weak } = useIngest();
  const [sessions, setSessions] = useState(seedSessions);
  const [cur, setCur] = useState(null); // session id or null = new
  const [hist, setHist] = useState([]);
  const [text, setText] = useState('');
  const [showList, setShowList] = useState(false);
  const end = useRef(null);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [hist]);

  const send = (q) => {
    const m = (q ?? text).trim();
    if (!m) return;
    const next = [...hist, { role: 'user', content: m }, { role: 'assistant', content: assessAnswer(m, weak) }];
    setHist(next); setText('');
    if (cur) setSessions((s) => s.map((x) => (x.id === cur ? { ...x, history: next } : x)));
    else { const id = 's' + Date.now(); setCur(id); setSessions((s) => [{ id, title: m.slice(0, 48), history: next }, ...s]); }
  };
  const open = (s) => { setCur(s.id); setHist(s.history); setShowList(false); };
  const fresh = () => { setCur(null); setHist([]); setShowList(false); };

  return (
    <div className="av-chat">
      <div className="av-chat__bar">
        <button className="av-chip" onClick={() => setShowList((v) => !v)}><i className="ti ti-layout-sidebar" /> Chats</button>
        <span className="muted">{cur ? sessions.find((s) => s.id === cur)?.title : 'New session'}</span>
        <button className="av-new" aria-label="New chat" onClick={fresh}><i className="ti ti-edit" /></button>
      </div>
      {showList && (
        <div className="av-list card">
          {sessions.map((s) => <button key={s.id} onClick={() => open(s)}>{s.title}</button>)}
        </div>
      )}
      <div className="av-msgs">
        <Bubble text="Ask me about products or a tricky customer. I'll coach you. 🎯" />
        {hist.length === 0 && (
          <div className="av-chips">
            {assessChips.map((c) => <button key={c.id} className="av-chip" onClick={() => send(c.q)}><i className={`ti ${c.icon}`} /> {c.label}</button>)}
          </div>
        )}
        {hist.map((h, i) => (h.role === 'user'
          ? <div key={i} className="av-me">{h.content}</div>
          : <Bubble key={i} text={h.content} />))}
        <div ref={end} />
      </div>
      <form className="av-input" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask Avani anything…" aria-label="Ask Avani" />
        <button type="submit" aria-label="Send"><i className="ti ti-send" /></button>
      </form>
    </div>
  );
}

const Bubble = ({ text }) => (
  <div className="av-bot"><span className="av-bot__ic"><i className="ti ti-menu-2" /></span><div><b>Avani AI</b><p>{text}</p></div></div>
);

function Learn() {
  const { showToast } = useUi();
  const [openId, setOpenId] = useState(null);
  const [pct, setPct] = useState(() => Object.fromEntries(modules.map((m) => [m.id, m.pct])));
  const done = Object.values(pct).filter((v) => v === 100).length;
  return (
    <div className="av-learn">
      <div className="av-learn__head"><b>✦ Avani · Your Learning Path</b><small>{modules.length} modules assigned this week · 2 core + 2 personalised from your site conversations. {done}/{modules.length} done</small></div>
      {modules.map((m) => (
        <div key={m.id} className="card av-mod">
          <button className="av-mod__row" onClick={() => setOpenId(openId === m.id ? null : m.id)}>
            <span className="av-mod__ic">{m.icon}</span>
            <span className="av-mod__t"><b>{m.title}</b><small>{m.sub}</small></span>
            <span className={pct[m.id] === 100 ? 'av-done' : 'av-pct'}>{pct[m.id] === 100 ? 'Done ✓' : `${pct[m.id]}%`}</span>
          </button>
          {openId === m.id && (
            <div className="av-mod__body">
              <ul>{m.points.map((p) => <li key={p}>{p}</li>)}</ul>
              {pct[m.id] < 100 && <button className="av-btn" onClick={() => { setPct((s) => ({ ...s, [m.id]: 100 })); showToast(`${m.title} marked done`); }}>Mark as done</button>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Practise() {
  const [step, setStep] = useState(null);
  const [phase, setPhase] = useState('pick'); // pick | rec | result
  const [secs, setSecs] = useState(0);
  const [heard, setHeard] = useState('');
  const [typed, setTyped] = useState('');
  const [res, setRes] = useState(null);
  const recog = useRef(null);
  const timer = useRef(null);

  useEffect(() => () => { clearInterval(timer.current); try { recog.current?.stop(); } catch { /* ignore */ } }, []);

  const start = () => {
    setPhase('rec'); setSecs(0); setHeard(''); setTyped('');
    timer.current = setInterval(() => setSecs((s) => s + 1), 1000);
    if (sr) {
      try {
        const r = new sr(); r.lang = 'en-IN'; r.continuous = true; r.interimResults = true;
        r.onresult = (e) => setHeard(Array.from(e.results).map((x) => x[0].transcript).join(' '));
        r.onerror = () => {}; r.start(); recog.current = r;
      } catch { /* typing fallback below */ }
    }
  };
  const stop = () => {
    clearInterval(timer.current);
    try { recog.current?.stop(); } catch { /* ignore */ }
    setRes(scoreStep(step, `${heard} ${typed}`)); setPhase('result');
  };
  const mm = (n) => `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;

  if (phase === 'pick') {
    return (
      <div className="av-prac">
        <div className="av-learn__head"><b>🎙️ ✦ Your Net Practise</b><small>Pick a step to rehearse. Watch, record, get feedback. Like net practice.</small></div>
        <div className="av-steps">
          {steps.map((s) => <button key={s.id} className="card av-step" onClick={() => { setStep(s); setPhase('ready'); }}><span>{s.icon}</span><b>{s.name}</b></button>)}
        </div>
      </div>
    );
  }
  return (
    <div className="av-prac">
      <button className="av-link" onClick={() => { setPhase('pick'); setStep(null); }}>← All steps</button>
      <div className="card av-prac__card">
        <h3>{step.icon} {step.name}</h3>
        <h4>How to do this well</h4><p>{step.tip}</p>
        <h4>Example script</h4><blockquote>{step.example}</blockquote>
        {phase === 'ready' && <button className="av-btn" onClick={start}><i className="ti ti-microphone" /> Record your rendition</button>}
        {phase === 'rec' && (
          <>
            <div className="av-rec"><span className="av-rec__dot" /> Recording, say it like you would on the floor · {mm(secs)}</div>
            <p className="muted">{heard || (sr ? 'Listening…' : 'This browser has no speech recognition, type below.')}</p>
            <textarea placeholder="Or type what you would say" value={typed} onChange={(e) => setTyped(e.target.value)} rows={3} aria-label="Type your rendition" />}
            <button className="av-btn" onClick={stop}>Stop &amp; Get Feedback</button>
          </>
        )}
        {phase === 'result' && res && (
          <>
            <div className="av-score">{res.score}<small>/100</small></div>
            <h4>What we checked for</h4>
            <ul className="av-checks">{res.checks.map((c) => <li key={c.label} className={c.ok ? 'ok' : 'no'}>{c.ok ? '✓' : '✗'} {c.label}</li>)}</ul>
            <h4>Coach's note</h4><p>{res.note}</p>
            <div className="av-row">
              <button className="av-btn" onClick={() => { setPhase('ready'); setRes(null); }}>Practise Again</button>
              <button className="av-btn av-btn--ghost" onClick={() => { setPhase('pick'); setStep(null); setRes(null); }}>Choose Another Step</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function Avani() {
  const [persona, setPersona] = useState(() => { try { return localStorage.getItem('og_persona') || 'traditional'; } catch { return 'traditional'; } });
  const [tab, setTab] = useState('assess');
  const pick = (id) => { setPersona(id); try { localStorage.setItem('og_persona', id); } catch { /* ignore */ } };
  return (
    <div className="avani-page">
      <section className="av-hero">
        <div className="label-caps">Choose your Avani</div>
        <div className="av-personas">
          {personas.map((p) => (
            <button key={p.id} className={`av-per ${persona === p.id ? 'is-on' : ''}`} onClick={() => pick(p.id)} aria-pressed={persona === p.id}>
              <span style={{ background: p.bg }}>{p.emoji}</span>{p.name}
            </button>
          ))}
        </div>
        <div className="av-title"><b>Avani AI</b> <small>Your personal sales coach ✨</small></div>
        <div className="av-tabs" role="tablist">
          {['assess', 'learn', 'practise'].map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'is-on' : ''} onClick={() => setTab(t)}>{t[0].toUpperCase() + t.slice(1)}</button>
          ))}
        </div>
      </section>
      {tab === 'assess' && <Assess />}
      {tab === 'learn' && <Learn />}
      {tab === 'practise' && <Practise />}
    </div>
  );
}
