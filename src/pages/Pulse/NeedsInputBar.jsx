// Pinned amber "Needs your input" bar: answer with a button or free text; answered cards disappear.
import { useState } from 'react';
import { usePulse } from '../../context/PulseContext.jsx';

function Card({ task, onAnswer }) {
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const send = () => {
    if (!text.trim()) return setErr('Type an answer first');
    onAnswer(text.trim());
  };
  return (
    <div className="ni__card">
      <div className="ni__q">{task.question}</div>
      <div className="ni__ctx">{task.context}</div>
      <div className="ni__opts">{task.options.map((o) => <button key={o} onClick={() => onAnswer(o)}>{o}</button>)}</div>
      <div className="ni__reply">
        <input value={text} placeholder="Or type your answer" aria-label="Your answer"
          onChange={(e) => { setText(e.target.value); setErr(''); }}
          onKeyDown={(e) => e.key === 'Enter' && send()} />
        <button className="ni__send" onClick={send}>Send</button>
      </div>
      <div className="ni__err" role="alert">{err}</div>
    </div>
  );
}

export default function NeedsInputBar({ channelId }) {
  const { pendingFor, answer } = usePulse();
  const [open, setOpen] = useState(true);
  const list = pendingFor(channelId);
  if (!list.length) return null;
  return (
    <div className="ni">
      <button className="ni__head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <i className="ti ti-pin" /><b>Needs your input</b><span className="ni__count">{list.length}</span><small>pinned</small>
        <i className={`ti ti-chevron-${open ? 'up' : 'down'} ni__chev`} />
      </button>
      {open
        ? list.map((t) => <Card key={t.id} task={t} onAnswer={(a) => answer(channelId, t.id, a)} />)
        : <div className="ni__collapsed">{list[0].question}{list.length > 1 && <em> +{list.length - 1} more</em>}</div>}
    </div>
  );
}
