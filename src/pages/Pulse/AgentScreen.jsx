// Custom agent (role or task) screen: team metric vs target, member cards and a detail overlay.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import agents from '../../data/agents.json';
import Modal from '../../components/Modal/Modal.jsx';
import { useUi } from '../../context/UiContext.jsx';

export const agentList = agents;

export default function AgentScreen({ id, header }) {
  const a = agents[id];
  const { showToast } = useUi();
  const navigate = useNavigate();
  const [sel, setSel] = useState(null);
  const [acks, setAcks] = useState(() => Object.fromEntries(a.members.map((m) => [m.n, !!m.ack])));
  const [notes, setNotes] = useState({});
  const [draft, setDraft] = useState('');
  const avg = Math.round(a.members.reduce((n, m) => n + m.val, 0) / a.members.length);
  const m = sel != null ? a.members[sel] : null;
  const unit = a.metric === 'Conversion' || a.target <= 100 ? '%' : '';

  return (
    <div className="chat">
      {header(`# ${id}`, a.name)}
      <div className="chat__scroll">
        <div className="agent-top card">
          <span className="agent-top__ic" style={{ background: a.color }}><i className={`ti ${a.icon}`} /></span>
          <div><b>{a.name}</b><small>{a.type === 'role' ? 'Role agent' : 'Task agent'} · {a.scope}</small></div>
          <div className="agent-top__m"><b className={avg >= a.target ? 'up' : 'down'}>{avg}{unit}</b><small>{a.metric} · target {a.target}{unit}</small></div>
        </div>
        <div className="label-caps ksect">Team · {a.members.length} members</div>
        {a.members.map((mm, i) => (
          <button key={mm.n} className="agent-mem card" onClick={() => setSel(i)}>
            <span className="agent-mem__av">{mm.n.split(' ').map((w) => w[0]).join('').slice(0, 2)}</span>
            <span className="agent-mem__t"><b>{mm.n}</b><small>{mm.r}</small><small>✅ {mm.well}</small></span>
            <span className="agent-mem__v"><b className={mm.val >= a.target ? 'up' : 'down'}>{mm.val}{unit}</b><small>{mm.d >= 0 ? '▲' : '▼'}{Math.abs(mm.d)}</small>{acks[mm.n] && <em>Ack ✓</em>}</span>
          </button>
        ))}
        <button className="agent-back" onClick={() => navigate('/pulse')}>← Back to Pulse</button>
      </div>
      <Modal open={!!m} onClose={() => setSel(null)} label={m ? `${m.n} detail` : 'Detail'}>
        {m && (
          <div className="agent-det">
            <h3>{m.n}</h3><small className="muted">{m.r} · {a.metric} {m.val}{unit} (target {a.target}{unit})</small>
            <h4>Went well</h4><p>{m.well}</p>
            <h4>To improve</h4><p>{m.imp}</p>
            <h4>{a.itemsLabel}</h4>
            <ul>{m.items.map(([n, t]) => <li key={n}><b>{n}</b><br /><span className="muted">{t}</span></li>)}</ul>
            <div className="agent-det__tags">{m.good.map((g) => <span key={g} className="tg tg--g">👍 {g}</span>)}{m.work.map((g) => <span key={g} className="tg tg--w">🔧 {g}</span>)}</div>
            {(notes[m.n] || []).map((t, i) => <p key={i} className="agent-det__note">📝 {t}</p>)}
            <div className="agent-det__row">
              <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add a coaching note…" aria-label="Coaching note" />
              <button onClick={() => { if (!draft.trim()) return; setNotes((s) => ({ ...s, [m.n]: [...(s[m.n] || []), draft.trim()] })); setDraft(''); showToast('Note saved'); }}>Save</button>
            </div>
            <button className="agent-det__ack" onClick={() => { setAcks((s) => ({ ...s, [m.n]: !s[m.n] })); showToast(acks[m.n] ? 'Acknowledgement removed' : 'Acknowledged'); }}>{acks[m.n] ? 'Acknowledged ✓' : 'Acknowledge'}</button>
          </div>
        )}
      </Modal>
    </div>
  );
}
