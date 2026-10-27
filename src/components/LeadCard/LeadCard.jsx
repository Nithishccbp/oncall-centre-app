// One lead inside the Leads modal: status, ICP, intent score, collapsible detail, actions.
import Collapsible from '../Collapsible/Collapsible.jsx';
import { useCall } from '../../context/CallContext.jsx';
import { useLeadsModal } from '../../context/LeadsModalContext.jsx';
import { useUi } from '../../context/UiContext.jsx';
import './LeadCard.css';

const statusColor = { Open: '#1d9e75', Ageing: '#c8860a', Cold: '#e24b4a' };
const barColor = (v) => (v >= 80 ? '#1d9e75' : v >= 55 ? '#c8860a' : '#e24b4a');
const signalIcon = {
  'Financing Related': 'ti-currency-rupee', 'Quotation Demanded': 'ti-file-invoice', 'Project Related': 'ti-building',
  'Warranty Related': 'ti-shield-check', 'In-Store Experience Needed': 'ti-building-store',
};

export default function LeadCard({ lead }) {
  const { startCall } = useCall();
  const { closeLeads } = useLeadsModal();
  const { openSheet } = useUi();

  const call = () => { closeLeads(); startCall(lead.name); };

  return (
    <article className="lead">
      <div className="lead__own">🛡️ This lead is yours. If it closes by phone, WhatsApp or online, it still counts for you.</div>
      <div className="lead__status" style={{ color: statusColor[lead.status] }}>
        <span className="lead__dot" style={{ background: statusColor[lead.status] }} /> {lead.status.toUpperCase()}
      </div>
      <div className="lead__person">
        <span className="lead__av" style={{ background: lead.avatarBg, color: lead.avatarColor }}>{lead.initials}</span>
        <div className="lead__who"><div className="lead__name">{lead.name}</div><div className="lead__interest">{lead.interest}</div></div>
        <span className="lead__sla">{lead.slaLeft}</span>
      </div>
      {lead.actionNote && <div className="lead__note"><i className="ti ti-file-invoice" /> {lead.actionNote}</div>}
      <div className="lead__icp">
        <span>🎯 Fit</span>
        <div className="lead__bar"><div style={{ width: `${lead.icp}%`, background: barColor(lead.icp) }} /></div>
        <b style={{ color: barColor(lead.icp) }}>{lead.icp}%</b>
      </div>
      <div className="lead__intent"><span>🎯 Lead Intent Score</span><b>{lead.intent}</b></div>

      <Collapsible title="Why this lead fits">
        {lead.icpBreakdown.map((b) => (
          <div key={b.label} className="lead__sub">
            <div className="lead__subrow"><span>{b.label}</span><b style={{ color: barColor(b.pct) }}>{b.pct}%</b></div>
            <div className="lead__bar thin"><div style={{ width: `${b.pct}%`, background: barColor(b.pct) }} /></div>
          </div>
        ))}
      </Collapsible>

      <Collapsible title="How we got here" icon="ti-route" tone="purple">
        <ol className="timeline">
          {lead.journey.map((j) => (
            <li key={j.date + j.channel}>
              <span className="timeline__dot">{j.icon}</span>
              <div className="timeline__meta">{j.date} · {j.channel}</div>
              <div className="timeline__text">{j.text}</div>
            </li>
          ))}
        </ol>
      </Collapsible>

      <Collapsible title="Where we picked up signals" icon="ti-clipboard-list" tone="amber" defaultOpen>
        {lead.signals.map((s) => (
          <div key={s.category} className="signal">
            <div className="signal__cat"><i className={`ti ${signalIcon[s.category] || 'ti-tag'}`} /> {s.category}</div>
            <div className="signal__quote">{s.quote}</div>
          </div>
        ))}
      </Collapsible>

      <div className="lead__reach">
        <div className="label-caps">Before you reach out</div>
        <ul>{lead.notes.map((n) => <li key={n}>{n}</li>)}</ul>
      </div>

      <div className="lead__actions">
        <button onClick={() => openSheet('nointerest', lead)}>No Interest</button>
        <button className="wa" onClick={() => openSheet('whatsapp', lead)}><i className="ti ti-brand-whatsapp" /> WhatsApp</button>
        <button onClick={call}><i className="ti ti-phone" /> On-ground Call</button>
        <button className="outline" onClick={() => openSheet('cameback', lead)}>Came Back ✓</button>
      </div>
    </article>
  );
}
