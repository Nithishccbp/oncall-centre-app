// Top-bar overlays: Notifications, OG Score, Rank, Avatar, Settings and the Date-range sheet.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TelephonyCard from './TelephonyCard.jsx';
import Modal from '../Modal/Modal.jsx';
import { useUi } from '../../context/UiContext.jsx';
import { useNotifications } from '../../data/notifications.js';
import { avatars, languages, rankBreakdown } from '../../data/calling.js';
import { user } from '../../data/dashboard.js';
import { DEMO } from '../../data/demo.js';
import { useKpiData } from '../../data/kpiStats.js';
import { TODAY } from '../../data/calendar.js';
import LeadsCalledModal from '../KpiDetail/LeadsCalledModal.jsx';
import AhtModal from '../KpiDetail/AhtModal.jsx';
import CsatModal from '../KpiDetail/CsatModal.jsx';
import OgScoreModal from '../KpiDetail/OgScoreModal.jsx';
import LeadsCreatedModal from '../KpiDetail/LeadsCreatedModal.jsx';
import './Overlays.css';

function Panel({ title, sub, onBack, children }) {
  return (
    <div className="panel" role="dialog" aria-modal="true" aria-label={title}>
      <header className="panel__head">
        <button onClick={onBack} aria-label="Back"><i className="ti ti-arrow-left" /></button>
        <div><b>{title}</b>{sub && <small>{sub}</small>}</div>
      </header>
      <div className="panel__body">{children}</div>
    </div>
  );
}

function Notifications({ close }) {
  const notifications = useNotifications();
  const navigate = useNavigate();
  const [tab, setTab] = useState('all');
  const [more, setMore] = useState(false);
  const list = notifications.filter((n) => tab === 'all' || n.kind === tab).filter((n, i) => more || i < 6 || tab !== 'all');
  const actionCount = notifications.filter((n) => n.kind === 'action').length;
  return (
    <Panel title="Notifications" sub={`${actionCount} need action · ${notifications.length - actionCount} alerts`} onBack={close}>
      <div className="seg" role="tablist">
        {[['all', 'All'], ['action', 'Needs action'], ['alert', 'Alerts']].map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {list.map((n) => (
        <div key={n.id} className={`notif ${n.kind}`}>
          <span className="notif__ic">{n.icon}</span>
          <div>
            <div className="notif__meta"><em>{n.kind === 'action' ? 'ACTION NEEDED' : 'ALERT'}</em> <small>{n.time}</small></div>
            <p>{n.text}</p>
            {n.link && <button onClick={() => { close(); navigate(n.link.to); }}>{n.link.label}</button>}
          </div>
        </div>
      ))}
      {list.length === 0 && <div className="empty" style={{ padding: '28px 8px', textAlign: 'center' }}>{notifications.length ? 'Nothing here' : "You're all caught up. Missed calls, follow-ups and new leads will show up here."}</div>}
      {tab === 'all' && !more && <button className="loadmore" onClick={() => setMore(true)}>Load more ↓</button>}
    </Panel>
  );
}

function OgScore({ close }) {
  const navigate = useNavigate();
  return (
    <Modal open onClose={close} width={380} label="OG Score">
      <div className="og">
        <small>OG SCORE™</small>
        <div className="og__ring"><b>76</b><span>/ 100</span></div>
        <div className="og__up">▲ +13 since period start</div>
        <div className="muted">72nd percentile across all staff</div>
        <div className="og__box amber"><b>Top 28% on OG Score™ · +5pts unlocks +4% earning potential</b>
          <div className="og__scale"><span style={{ left: '72%' }} /></div>
          <p>This is why OG Score™ matters — it's the single number most closely tied to your earning potential. Keep an eye on it every week.</p></div>
        <div className="og__box red"><b>Your biggest lever right now</b>
          <p>🔴 <b>Closing (58)</b> — great rapport, but the ask for the sale often doesn't happen.</p>
          <p>🟠 <b>Objections (65)</b> — home-loan EMI/price pushback stalls more than it resolves.</p></div>
        <button className="og__cta" onClick={() => { close(); navigate('/pulse/avani-coaching'); }}>🎓 Practise these 2 skills →</button>
        <button className="og__link" onClick={close}>Announce this on LinkedIn</button>
      </div>
    </Modal>
  );
}

function Rank({ close }) {
  return (
    <Modal open onClose={close} width={400} label="Your rank">
      <div className="rk">
        <small>YOUR RANK</small>
        <div className="rk__n">#{user.rank}</div>
        <div className="muted">within RT Nagar · 6 staff ranked</div>
        <p className="rk__intro">Your rank is a weighted blend of the same numbers in My Progress above — not just one metric. Here's exactly how it adds up this period.</p>
        {rankBreakdown.map((r) => (
          <div key={r.label} className="rk__row">
            <div><span>{r.icon} {r.label}</span><span className="muted">{r.value} · {r.weight}% weight</span></div>
            <div className="rk__bar"><span style={{ width: `${r.pct}%` }} /></div>
          </div>
        ))}
        <div className="rk__comp"><span>Composite score</span><b>66.9 / 100</b></div>
        <div className="rk__tip">💡 Closing 1 more lead this week would add ~4 points — enough to pass #2. Leads Called is your fastest lever right now.</div>
        <small className="muted rk__foot">Weights are project defaults, set by your manager under Settings → Customer Interaction preferences.</small>
      </div>
    </Modal>
  );
}

function AvatarPanel({ close }) {
  const { avatar, chooseAvatar, showToast } = useUi();
  const [pick, setPick] = useState(avatar.id);
  const current = avatars.find((a) => a.id === pick);
  return (
    <Panel title="Avatar" onBack={close}>
      <div className="label-caps">Your selling persona</div>
      <div className="card av__card">
        <div className="av__cur"><span className="av__big">{current.emoji}</span><div><b>{current.name}</b><small>Pick the persona shown on your profile badge</small></div></div>
        <div className="av__grid">
          {avatars.map((a) => (
            <button key={a.id} className={pick === a.id ? 'on' : ''} aria-pressed={pick === a.id} onClick={() => setPick(a.id)}><span>{a.emoji}</span><small>{a.name}</small></button>
          ))}
        </div>
      </div>
      <button className="btn-primary av__save" onClick={() => { chooseAvatar(pick); showToast(`Avatar saved · ${current.name}`); close(); }}>Save Avatar</button>
    </Panel>
  );
}

function SettingsPanel({ close }) {
  // Read-only: everything here comes from the login profile / backend / code. Nothing can be edited in the app.
  const dash = (v) => v || '—';
  const Info = ({ k, v }) => <div className="card set__row" style={{ cursor: 'default' }}><span><b>{v}</b><small>{k}</small></span></div>;
  return (
    <Panel title="Settings" onBack={close} sub="Managed in code and by your admin">
      <div className="label-caps">Employee profile</div>
      <Info k="Full name" v={dash(user.name)} />
      <Info k="Employee ID" v={dash(user.employeeId)} />
      <Info k="Email" v={dash(user.email)} />
      <Info k="Phone number" v={dash(user.phone)} />
      <div className="label-caps">Experience centre</div>
      <Info k="Base experience centre" v={dash(user.location)} />
      {user.allocated && <div className="set__alloc">Allocated: {user.allocated}</div>}
      <div className="label-caps">Telephony</div>
      <TelephonyCard />
      <div className="label-caps">Role &amp; designation</div>
      <Info k="Designation" v={dash(user.role)} />
      <div className="label-caps">Your customer channel</div>
      <Info k="Channel" v={dash(user.channel)} />
      <p className="muted" style={{ padding: '10px 4px' }}>These settings cannot be changed here. They are set in code and pulled from the backend.</p>
    </Panel>
  );
}

const ranges = ['Today', 'This Week', 'This Month', 'Last 30 Days', 'Custom'];
function DateRange({ close }) {
  const { range, setRange, showToast } = useUi();
  const [pick, setPick] = useState(range);
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate());
  const span = { Today: 0, 'This Week': 6, 'This Month': 30, 'Last 30 Days': 30 };
  const start = (r) => { const d = new Date(today); d.setDate(d.getDate() - (span[r] ?? 6)); return iso(d); };
  const [from, setFrom] = useState(start(range));
  const [to, setTo] = useState(iso(today));
  const choose = (r) => { setPick(r); if (r !== 'Custom') { setFrom(start(r)); setTo(iso(today)); } };
  return (
    <Modal open onClose={close} width={460} label="Select date range">
      <div className="dr__title">Select Date Range</div>
      <div className="dr__tabs">{ranges.map((r) => <button key={r} className={pick === r ? 'on' : ''} aria-pressed={pick === r} onClick={() => choose(r)}>{r}</button>)}</div>
      <div className="dr__dates">
        <label>FROM<input type="date" value={from} max={to} onChange={(e) => { setFrom(e.target.value); setPick('Custom'); }} /></label>
        <label>TO<input type="date" value={to} min={from} onChange={(e) => { setTo(e.target.value); setPick('Custom'); }} /></label>
      </div>
      <button className="btn-primary dr__apply" disabled={!from || !to || from > to} onClick={() => { setRange(pick); showToast(`Showing ${pick === 'Custom' ? `${from} → ${to}` : pick}`); close(); }}>Apply Range</button>
    </Modal>
  );
}

export default function Overlays() {
  const { overlay, closeOverlay } = useUi();
  if (overlay === 'kpi-called') return <LeadsCalledModal close={closeOverlay} />;
  if (overlay === 'kpi-aht') return <AhtModal close={closeOverlay} />;
  if (overlay === 'kpi-csat') return <CsatModal close={closeOverlay} />;
  if (overlay === 'kpi-og') return <OgScoreModal close={closeOverlay} />;
  if (overlay === 'kpi-leads') return <LeadsCreatedModal close={closeOverlay} />;
  if (overlay === 'notifications') return <Notifications close={closeOverlay} />;
  if (overlay === 'ogscore') return <OgScore close={closeOverlay} />;
  if (overlay === 'rank') return <Rank close={closeOverlay} />;
  if (overlay === 'avatar') return <AvatarPanel close={closeOverlay} />;
  if (overlay === 'settings') return <SettingsPanel close={closeOverlay} />;
  if (overlay === 'daterange') return <DateRange close={closeOverlay} />;
  return null;
}
