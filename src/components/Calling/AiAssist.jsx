// AI Assist side panel: what to offer, live SOP checklist, drift warning, Ask AI, quick replies, drafted summary, case history.
import { useState } from 'react';
import { useCall } from '../../context/CallContext.jsx';
import { useConsent } from '../../context/ConsentContext.jsx';
import { useUi } from '../../context/UiContext.jsx';
import { sopChecklist } from '../../data/calls.js';
import { formatINR } from '../../data/selectors.js';
import { briefFor } from '../../data/prep.js';
import Collapsible from '../Collapsible/Collapsible.jsx';
import { askAi, draftSummary, quickReplies } from '../../data/calling.js';

const emiLine = (lead, sopDone) => (sopDone.includes(3) ? 'Mentioned on this call ✓' : lead?.emiNote || 'Raise early if the customer asks about cost');

export default function AiAssist() {
  const { call, lead, addAgentLine } = useCall();
  const { consent } = useConsent();
  const { openSheet, showToast } = useUi();
  const { toggleSop } = useCall();
  const [q, setQ] = useState('');
  const [qa, setQa] = useState([]);
  const [history, setHistory] = useState(false);

  const price = lead ? lead.price : 0;
  const brief = briefFor(lead);
  const product = lead ? lead.product : 'Product enquiry';
  const drift = call.sopDone.includes(2) && !call.sopDone.includes(3) && call.status === 'inCall';
  const tip = call.shown.some((l) => l.tip === 'possession');
  const recording = consent.status === 'recording';

  const ask = (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    setQa((list) => [{ q: q.trim(), a: askAi(q, lead) }, ...list]);
    setQ('');
  };

  const quick = (r) => {
    if (r.id === 'price') { openSheet('whatsapp', lead || { name: call.name }); return; }
    if (r.id === 'escalate') { showToast('Manager Sunita Rao has been notified'); return; }
    addAgentLine(r.agent, r.sop);
    showToast(`Added to the call: “${r.label}”`);
  };

  const summary = draftSummary(lead, call.shown.filter((l) => l.who !== 'nudge'), call.sopDone);

  return (
    <aside className="ai">
      <header className="ai__head"><span className="ai__star"><i className="ti ti-sparkles" /></span> <b>AI Assist</b><span className="ai__live">● LIVE</span></header>
      <div className="ai__gami">
        <i className="ti ti-trophy" />
        <div><b>{formatINR(price)} unlock</b></div>
        <div><b className="gold">+{brief ? brief.pts : 5} pts</b> OG Score™</div>
        <div><b>#1</b> rank if closed</div>
      </div>

      <div className="ai__body">
        {lead && (
          <div className="aib">
            <div className="ai__cap"><i className="ti ti-report" /> LEAD BRIEF</div>
            <div className="aib__who"><span className="lead__av" style={{ background: lead.avatarBg, color: lead.avatarColor }}>{lead.initials}</span>
              <div><b>{lead.name}</b><small>{lead.interest}</small></div><span className="aib__sla">{lead.slaLeft}</span></div>
            {lead.actionNote && <div className="aib__stage">{lead.actionNote}</div>}
            <div className="aib__sc">
              <div><small>Intent score</small><b>{brief.intent}</b><em>{brief.intentLabel}</em></div>
              <div><small>ICP fit</small><b>{brief.icp}%</b></div>
            </div>
            <Collapsible title="Why this lead fits" icon="ti-target" tone="grey"><small>{brief.fitLine}</small></Collapsible>
            <Collapsible title="What to sell" icon="ti-shopping-bag" tone="grey" defaultOpen><p><b>{brief.sellLine}</b></p><small>Add-on: {brief.cross}</small></Collapsible>
            <Collapsible title="How to finance" icon="ti-credit-card" tone="grey"><p><b>{brief.finLine}</b></p><small>{brief.fin}</small></Collapsible>
            <Collapsible title="Remember when pitching" icon="ti-link" tone="amber" defaultOpen><ul>{brief.cap.map((c) => <li key={c}>{c}</li>)}</ul></Collapsible>
            <Collapsible title="Customer story" icon="ti-book-2" tone="grey"><p>{brief.story}</p></Collapsible>
            <Collapsible title="Signals heard" icon="ti-ear" tone="grey">{lead.signals.map((s) => <p key={s.category}><b>{s.category}.</b> {s.quote}</p>)}</Collapsible>
          </div>
        )}
        <div className="ai__cap"><i className="ti ti-target-arrow" /> MAIN OBJECTIVE — WHAT TO OFFER</div>
        <div className="ai__prod"><span className="ai__emoji">🛋️</span>
          <div><b>{product}{price ? ` · ${formatINR(price)}` : ''}</b><small>{lead ? lead.interest : 'Unknown caller — qualify first'}</small></div></div>
        <div className="ai__two">
          <div><small>🔁 CROSS-SELL THIS</small><b>{lead ? lead.crossSell : 'Ask what they need first'}</b></div>
          <div><small>💳 home-loan EMI TO OFFER</small><b>{emiLine(lead, call.sopDone)}</b></div>
        </div>
        {lead?.signals[1] && <span className="ai__sig">{lead.signals[1].category}</span>}

        <div className="ai__cap sop"><i className="ti ti-clipboard-check" /> SOP CHECKLIST — THIS CALL</div>
        <div className="ai__chips">
          {sopChecklist.map((s, i) => (
            <button key={s} className={call.sopDone.includes(i) ? 'done' : ''} aria-pressed={call.sopDone.includes(i)} onClick={() => toggleSop(i)}>
              <i className={`ti ${call.sopDone.includes(i) ? 'ti-check' : 'ti-circle'}`} /> {s}
            </button>
          ))}
        </div>

        {drift && (
          <div className="ai__drift" role="status">
            <b><i className="ti ti-alert-triangle" /> DRIFTING OFF SOP</b>
            <p>EMI hasn't come up yet and the pitch is done — this customer responds well to financing options. Mention the no-cost home-loan EMI plan before moving to close.</p>
          </div>
        )}

        <div className="ai__cap ask"><i className="ti ti-message-chatbot" /> ASK AI ABOUT THIS CALL</div>
        <form className="ai__ask" onSubmit={ask}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. what's our return policy? has he mentioned a budget?" aria-label="Ask AI" />
          <button aria-label="Ask"><i className="ti ti-send" /></button>
        </form>
        {qa.map((x, i) => <div key={i} className="ai__qa"><small>You asked: {x.q}</small><p>💡 {x.a}</p></div>)}

        {tip && <div className="ai__tip">💡 <b>Tip:</b> Asked "how soon can this be delivered" — very high buying signal, close fast.</div>}

        <div className="ai__quick">{quickReplies.map((r) => <button key={r.id} onClick={() => quick(r)}>{r.label}</button>)}</div>

        <div className="ai__cap"><i className="ti ti-notes" /> SUMMARY, DRAFTING AS YOU TALK</div>
        <div className="ai__sum">{recording || call.shown.length ? summary : 'Starts once the call is being transcribed.'}</div>

        {lead && (
          <>
            <button className="ai__hist" aria-expanded={history} onClick={() => setHistory(!history)}><i className="ti ti-history" /> CASE HISTORY <i className={`ti ti-chevron-${history ? 'up' : 'down'}`} /></button>
            {history && lead.journey.map((j) => <div key={j.date + j.channel} className="ai__j"><b>{j.date} · {j.channel}</b><span>{j.text}</span></div>)}
          </>
        )}
      </div>
    </aside>
  );
}
