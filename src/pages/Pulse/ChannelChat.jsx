// A channel / DM conversation: header, pinned needs-input bar, message bubbles and composer.
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { avaniReply, kudos } from '../../data/pulse.js';
import { customerThreads } from '../../data/calling.js';
import { useCall } from '../../context/CallContext.jsx';
import { usePulse } from '../../context/PulseContext.jsx';
import { useLeadsModal } from '../../context/LeadsModalContext.jsx';
import NeedsInputBar from './NeedsInputBar.jsx';
import renderFormatted from './renderFormatted.jsx';
import './Pulse.css';

function Card({ card }) {
  const { openLeads } = useLeadsModal();
  return (
    <div className="mcard">
      <div className="mcard__head"><span>{card.icon} <b>{card.title}</b></span>{card.badge && <em>{card.badge}</em>}</div>
      {card.fields.map(([k, v]) => <div key={k} className="mcard__f"><span>{k}</span><b>{v}</b></div>)}
      {card.actions.length > 0 && (
        <div className="mcard__acts">
          {card.actions.map((a) => (
            <button key={a.label} className={a.primary ? 'primary' : ''} onClick={() => a.openLeads && openLeads(0)}>{a.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function Bubble({ m }) {
  return (
    <div className={`msg ${m.mine ? 'msg--mine' : ''}`}>
      <span className="msg__av" style={m.mine ? undefined : { background: m.bg || '#e1f5ee', color: m.color || '#0f6e56' }}>{m.initials}</span>
      <div className="msg__col">
        <div className="msg__meta"><b>{m.who}</b> <small>{m.time}</small></div>
        {m.text && <div className="msg__bubble">{renderFormatted(m.text)}</div>}
        {m.card && <Card card={m.card} />}
      </div>
    </div>
  );
}

function KudosScreen({ header }) {
  return (
    <div className="chat chat--kudos">
      {header('🏆 kudos', 'Team recognition, sent by your leaders')}
      <div className="chat__scroll">
        <div className="kinfo"><i className="ti ti-info-circle" /> You receive kudos — leaders send them to celebrate your wins 🎉</div>
        <div className="label-caps ksect">Incoming kudos</div>
        {kudos.feed.map((k) => (
          <article key={k.id} className={`kcard kcard--${k.tone}`}>
            <span className="kcard__av">{k.initials}</span>
            <div><b>{k.from}</b> <small>{k.time}</small><p>{k.text}</p></div>
            <span className="kcard__ic">{k.icon}</span>
          </article>
        ))}
        <div className="ktotal">Your all-time kudos: <b>{kudos.total}</b> 🎉</div>
      </div>
    </div>
  );
}

function CustomerDiscussions({ header }) {
  const navigate = useNavigate();
  const { startCall } = useCall();
  return (
    <div className="chat chat--teal">
      {header('💬 customer-discussions', 'Relayed via WhatsApp Business · 2 open')}
      <div className="chat__scroll">
        <div className="kinfo warn"><i className="ti ti-alert-circle" /> 1 unanswered call &amp; 1 unreplied chat need attention</div>
        <div className="label-caps ksect">Customer conversations</div>
        {customerThreads.map((c) => (
          <div key={c.id} className="cdrow">
            <button className="cdrow__main" disabled={c.missed} onClick={() => navigate(`/pulse/${c.id}`)}>
              <span className="cdrow__av" style={{ background: c.bg, color: c.color }}>{c.initials}</span>
              <span className="cdrow__txt"><b>{c.name} {c.wa && <em className="wa">WA</em>}{c.missed && <em className="miss"><i className="ti ti-phone-x" /> Missed</em>}</b><small>{c.preview}</small></span>
              {!c.missed && <span className="cdrow__meta"><small>{c.time}</small><span className="unread">{c.unread}</span></span>}
            </button>
            {c.missed && <button className="cdrow__call" onClick={() => startCall(c.name)}><i className="ti ti-phone" /> Call back</button>}
          </div>
        ))}
        <div className="ktotal muted">Customer threads managed via WhatsApp Business + On-ground Calling</div>
      </div>
    </div>
  );
}

export default function ChannelChat() {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const { threads, addMessage } = usePulse();
  const thread = threads[channelId];
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  const endRef = useRef(null);
  const timer = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [thread?.messages.length, typing, channelId]);
  useEffect(() => () => clearTimeout(timer.current), [channelId]);

  const header = (title, sub) => (
    <header className="chat__head">
      <button aria-label="Back to Pulse" onClick={() => navigate('/pulse')}><i className="ti ti-arrow-left" /></button>
      <span className="chat__title"><b>{title}</b>{sub && <small>{sub}</small>}</span>
      <button aria-label="Ask AvaniBot" className="spark" onClick={() => navigate('/pulse/avanibot')}><i className="ti ti-sparkles" /></button>
    </header>
  );

  if (channelId === 'kudos') return <KudosScreen header={header} />;
  if (channelId === 'customer-discussions') return <CustomerDiscussions header={header} />;
  if (!thread) {
    return <div className="chat">{header('Not found')}<p className="chat__empty">Channel not found. <Link to="/pulse">Back to Pulse</Link></p></div>;
  }

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    addMessage(channelId, { who: 'You', initials: 'AR', mine: true, text });
    setDraft('');
    const reply = channelId === 'avanibot' ? avaniReply(text) : thread.reply;
    if (reply) {
      setTyping(true);
      timer.current = setTimeout(() => { setTyping(false); addMessage(channelId, reply); }, 900);
    }
  };

  return (
    <div className="chat">
      {header(thread.title)}
      <NeedsInputBar channelId={channelId} />
      <div className="chat__scroll">
        <div className="chat__date">{thread.dateLabel}</div>
        {thread.messages.map((m) => <Bubble key={m.id} m={m} />)}
        {typing && <div className="chat__typing">{channelId === 'avanibot' ? 'AvaniBot' : thread.reply.who} is typing…</div>}
        <div ref={endRef} />
      </div>
      <div className="composer">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder={`Message ${thread.title}…`} aria-label="Message" />
        <button aria-label="Add emoji" className="emoji" onClick={() => setDraft((d) => `${d}😊`)}>😊</button>
        <button aria-label="Send" className="sendbtn" onClick={send} disabled={!draft.trim()}><i className="ti ti-send" /></button>
      </div>
    </div>
  );
}
