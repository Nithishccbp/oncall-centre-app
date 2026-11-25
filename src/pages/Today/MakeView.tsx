// Calls to make: filter pills, ranked table, and the Lead brief for the selected customer.
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { callScript, type Journey, type MakeRow } from '../../data/b2b';
import { useCall } from '../../context/CallContext';
import { Path, Stage, fmtAmt, amount, useB2B } from './parts';

const JC: Record<Journey, string> = { c: '#0E9AA7', l: '#2E6B57', o: '#D97706', t: '#64748b', x: '#E8573A' };

function Brief({ m, out, onCall }: { m: MakeRow; out: string; onCall: () => void }) {
  const tl = m.brief || ([[m.lt[0].indexOf(out) === 0 ? 'o' : 't', m.lt[0].toUpperCase(), m.lt[1], ''], ['x', 'NEXT', m.why, '']] as MakeRow['brief'])!;
  const say = m.say || callScript.before;
  return (
    <div className="card brief"><div className="h3" style={{ color: '#D97706' }}>Lead brief</div><h2>{m.n}</h2><div className="s">Intent {m.sc} · {m.v} · {m.st}</div>
      <Path path={m.path} now={m.st} />
      <div className="jt">{tl.map((e, i) => <div className="e" key={i} style={{ ['--c' as string]: JC[e[0]] || '#8a8378' }}><span className="w">{e[1]}</span><br /><b>{e[2]}</b>{e[3] && <small>{e[3]}</small>}</div>)}</div>
      {m.op && <div className="note"><b>Open with</b><span style={{ fontFamily: 'Lora,Georgia,serif', fontStyle: 'italic' }}>"{m.op}"</span></div>}
      <div className="note"><b>What to say</b><ul>{say.map((s) => <li key={s}>{s}</li>)}</ul></div>
      <div className="bbtn"><button className="cn" style={{ background: '#E8573A', color: '#fff' }} onClick={onCall}>📞 Call {m.n.split(' ')[0]}</button><button style={{ background: '#f4f0e8' }}>WhatsApp</button></div>
    </div>
  );
}

export default function MakeView() {
  const D = useB2B(); const { startCall } = useCall(); const loc = useLocation();
  const [sel, setSel] = useState<number>((loc.state as { sel?: number } | null)?.sel ?? 0);
  const [f, setF] = useState('all');
  const F: Record<string, string> = { all: 'All', prom: 'Promised', sunny: D.out + ' tried', hold: 'Price holds', trial: 'Trial check-ins' };
  const flt = (m: MakeRow) => f === 'all' || (f === 'prom' && /promis/i.test(m.why + m.bt[1])) || (f === 'sunny' && !!m.ho) || (f === 'hold' && /hold/i.test(m.why + m.path.join())) || (f === 'trial' && /trial/i.test(m.why + m.st));
  const tot = D.make.reduce((a, m) => a + amount(m.v), 0);
  let last = '';
  return (
    <div>
      <Link to="/" className="back">‹ Today</Link>
      <div className="hd" style={{ ['--a' as string]: '#D97706' }}><span className="bb" /><div><h1>Calls to make · {D.make.length}</h1><div className="s">{fmtAmt(tot)} at stake</div></div>
        <div className="seg">{Object.keys(F).map((k) => <span key={k} className={f === k ? 'on' : ''} onClick={() => setF(k)}>{F[k]}</span>)}</div></div>
      <div className="fv">
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="th"><span /><span>Customer and journey</span><span>Why now</span><span>Last touch</span><span>Best time</span><span /></div>
          {D.make.map((m, i) => { if (!flt(m)) return null; const head = m.g !== last; last = m.g; const hot = m.sc >= 50; return (
            <div key={m.n}>
              {head && <div className="fg" style={/tried/i.test(m.g) ? { color: '#D97706' } : undefined}>{m.g}{/due/i.test(m.g) ? <em> · promised callbacks first</em> : /tried/i.test(m.g) ? <em> · AI couldn't close these</em> : null}</div>}
              <div className={'row' + (i === sel ? ' sel' : '')} onClick={() => setSel(i)}>
                <span className={'sc' + (hot ? '' : ' lo')}>{m.sc}</span>
                <div className="nm"><b>{m.n} · {m.v}</b><Path path={m.path} now={m.st} /></div>
                <div className="why">{m.why}</div>
                <div className="lt">{m.lt[0]}<small>{m.lt[1]}</small></div>
                <div className="bt">{m.bt[0]}<small>{m.bt[1]}</small></div>
                <div className="act"><button className="c" onClick={(e) => { e.stopPropagation(); startCall(m.n); }}>Call</button><button className="g">WA</button></div>
              </div>
            </div>); })}
        </div>
        <Brief m={D.make[sel]} out={D.out} onCall={() => startCall(D.make[sel].n)} />
      </div>
    </div>
  );
}
export { Stage };
