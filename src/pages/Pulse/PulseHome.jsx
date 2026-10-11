// Pulse home: search, AvaniBot card, custom agents, channels, Kudos and direct messages.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { agents, general, kudos, channels, dms } from '../../data/pulse.js';
import { usePulse } from '../../context/PulseContext.jsx';
import './Pulse.css';

const pinBadge = (n) => n > 0 && <span className="pin-badge"><i className="ti ti-pin" /> {n}</span>;

function Row({ to, icon, name, sub, right, color, hash = true }) {
  return (
    <Link to={to} className={`prow ${color ? `prow--${color}` : ''}`}>
      {icon && <span className={`prow__icon ${color ? `tint-${color}` : ''}`}><i className={`ti ${icon}`} /></span>}
      <span className="prow__txt">
        <b>{hash && '# '}{name}</b>
        <small>{sub}</small>
      </span>
      <span className="prow__right">{right}</span>
    </Link>
  );
}

export default function PulseHome() {
  const navigate = useNavigate();
  const { pendingFor } = usePulse();
  const [query, setQuery] = useState('');
  const [agentsOpen, setAgentsOpen] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const q = query.trim().toLowerCase();
  const match = (...s) => !q || s.join(' ').toLowerCase().includes(q);
  const pins = (id) => pendingFor(id).length;

  const agentRow = (a) => match(a.id, a.sub) && (
    <Row key={a.id} to={`/pulse/${a.id}`} color={a.color} icon={a.icon} name={a.id} sub={a.sub}
      right={<>{a.metric && <span className="metric">{a.metric} <small>{a.trend}</small></span>}{pinBadge(a.pins)}</>} />
  );
  const roleRows = agents.role.map(agentRow);
  const taskRows = agents.task.map(agentRow);

  return (
    <div className="pulse">
      <header className="pulse__head">
        <span className="pulse__logo" />
        <b>Pulse</b><span>The Sleep Company · Koramangala</span>
        <div className="pulse__plus">
          <button aria-label="New message" onClick={() => setMenuOpen((o) => !o)}><i className="ti ti-plus" /></button>
          {menuOpen && (
            <div className="pulse__menu">
              <div className="label-caps">New message</div>
              {dms.map((d) => <button key={d.id} onClick={() => navigate(`/pulse/${d.id}`)}>{d.name}</button>)}
            </div>
          )}
        </div>
      </header>

      <div className="pulse__body">
        <label className="search">
          <span className="tile-ic">✨</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ask AvaniBot or search Pulse…" aria-label="Search Pulse" />
          <i className="ti ti-search" />
          {pinBadge(2)}
        </label>

        <section className="avani">
          <div className="avani__top">
            <span className="avani__av">✨</span>
            <div><b>AvaniBot</b> <span className="avani__badge">ALWAYS ON</span>
              <p>Ask me about anything happening in Pulse — daily briefs, action items, quick answers</p></div>
          </div>
          <div className="avani__btns">
            <Link to="/pulse/avanibot"><i className="ti ti-sparkles" /> Daily Brief</Link>
            <Link to="/pulse/avanibot"><i className="ti ti-message-circle" /> Ask a question</Link>
          </div>
          {pinBadge(pins('avanibot'))}
        </section>

        <section className="agents card">
          <button className="agents__head" onClick={() => setAgentsOpen((o) => !o)} aria-expanded={agentsOpen}>
            <span className="tile-ic">✨</span>
            <span><b>Custom Agents</b><small>Set up by your manager — already live, tap to open</small></span>
            <i className={`ti ti-chevron-${agentsOpen ? 'up' : 'down'}`} />
          </button>
          {agentsOpen && (
            <div className="agents__body">
              <div className="group"><span>ROLE AGENTS</span> run a team</div>{roleRows}
              <div className="group"><span>TASK AGENTS</span> move one metric</div>{taskRows}
            </div>
          )}
        </section>

        <div className="label-caps sect">General</div>
        {general.map((g) => match(g.name, g.sub) && (
          <Row key={g.id} to={`/pulse/${g.id}`} hash={false} icon="ti-brand-whatsapp" color="green" name={g.name} sub={g.sub}
            right={<span className="unread">{g.unread}</span>} />
        ))}

        <Link to="/pulse/kudos" className="kudos">
          <span className="kudos__ic">🏆</span>
          <span className="kudos__txt"><b>Kudos <em>{kudos.newCount} NEW</em></b><small>{kudos.latest}</small></span>
          <span className="kudos__n"><b>{kudos.total}</b><small>ALL-TIME</small></span>
        </Link>

        <div className="label-caps sect">Channels</div>
        {channels.map((c) => match(c.name, c.preview) && (
          <Link key={c.id} to={`/pulse/${c.id}`} className="crow">
            <span className="crow__hash">#</span>
            <span className="prow__txt"><b>{c.name}</b><small>{c.preview}</small></span>
            <span className="crow__meta">{c.mention && <i className="at">@</i>}{c.time && <small>{c.time}</small>}
              {c.unread > 0 && <span className="unread">{c.unread}</span>}</span>
          </Link>
        ))}

        <div className="label-caps sect">Direct messages</div>
        {dms.map((d) => match(d.name, d.preview) && (
          <Link key={d.id} to={`/pulse/${d.id}`} className="crow">
            <span className="crow__av">{d.initials}</span>
            <span className="prow__txt"><b>{d.name} {d.badge && <em className="mgr">{d.badge}</em>}</b><small>{d.preview}</small></span>
            <span className="crow__meta"><small>{d.time}</small></span>
          </Link>
        ))}
      </div>
    </div>
  );
}
