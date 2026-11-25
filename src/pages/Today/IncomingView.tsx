// Incoming: calls waiting, and chats the bot handed over with a note.
import { Link } from 'react-router-dom';
import { useCall } from '../../context/CallContext';
import { Path, Stage, useB2B } from './parts';

export default function IncomingView() {
  const D = useB2B(); const { startCall } = useCall();
  const groups: [string, string][] = [['call', 'Calls waiting'], ['chat', `Chats ${D.in} handed to you`]];
  return (
    <div>
      <Link to="/" className="back">‹ Today</Link>
      <div className="hd" style={{ ['--a' as string]: '#2563EB' }}><span className="bb" /><div><h1>Incoming · {D.inc.length}</h1><div className="s">{D.in} answers first and passes you a note</div></div></div>
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="ith"><span /><span>Customer and journey</span><span>Note</span><span>Waiting</span><span /></div>
        {groups.map(([k, label]) => (
          <div key={k}><div className="fg" style={k === 'chat' ? { color: '#0E9AA7' } : undefined}>{label}</div>
            {D.inc.map((x, i) => x.k !== k ? null : (
              <div className="irow" key={x.n + i} onClick={() => startCall(x.n)}>
                <span style={{ fontSize: 16 }}>{x.k === 'call' ? '☎' : '💬'}</span>
                <div className="nm"><b>{x.n}{x.v ? ' · ' + x.v : ''}</b>{x.path ? <Path path={x.path} now={x.st} /> : <div className="path"><Stage s={x.st} /></div>}</div>
                <div className="why">{x.ho ? <><b style={{ color: k === 'chat' ? '#0E9AA7' : '#E8573A' }}>{D.in}</b> {x.ho}</> : x.mood}{x.op && <div className="op">"{x.op}"</div>}</div>
                <span className={'wait' + (i === 0 ? '' : ' y')} style={{ marginLeft: 0, justifySelf: 'start' }}>{x.w || '—'}</span>
                <div className="act"><button className="c" onClick={(e) => { e.stopPropagation(); startCall(x.n); }}>{x.k === 'call' ? 'Answer' : 'Take over'}</button></div>
              </div>))}
          </div>))}
      </div>
    </div>
  );
}
