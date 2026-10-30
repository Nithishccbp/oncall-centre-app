// Top-bar overlays: Notifications, OG Score, Rank, Avatar, Settings and the Date-range sheet.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TelephonyCard from './TelephonyCard.jsx';
import Modal from '../Modal/Modal.jsx';
import { useUi } from '../../context/UiContext.jsx';
import { avatars, languages, notifications, rankBreakdown } from '../../data/calling.js';
import { user } from '../../data/dashboard.js';
import { TODAY } from '../../data/calendar.js';
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
  const { showToast } = useUi();
  const [lang, setLang] = useState('English');
  const [dev, setDev] = useState(false);
  const [industry, setIndustry] = useState('realestate');
  const [li, setLi] = useState('');
  return (
    <Panel title="Settings" onBack={close}>
      <div className="label-caps">Employee profile</div>
      <div className="card set__grid">
        <label>FULL NAME<input defaultValue="Meghna Rao" /></label>
        <label>EMPLOYEE ID<input defaultValue="OG-EMP-07734" disabled /></label>
        <label>EMAIL<input defaultValue="meghna.r@godrejproperties.in" /></label>
        <label>PHONE NUMBER<input defaultValue="+91 98450 11223" /></label>
      </div>
      <div className="label-caps">Security</div>
      <button className="card set__row" onClick={() => showToast('PIN change is a demo — not connected')}><i className="ti ti-lock" /><span><b>Change App Password</b><small>Update your 4-digit login PIN</small></span><i className="ti ti-chevron-right" /></button>
      <div className="label-caps">Experience centre</div>
      <div className="card set__row"><i className="ti ti-building-store" /><span><b>Base Experience centre</b><small>Whitefield · Godrej Properties</small></span></div>
      <div className="set__alloc">Allocated: Lakeside Towers · HSR Layout · Indiranagar</div>
      <div className="label-caps">Telephony</div>
      <TelephonyCard toast={showToast} />
      <div className="label-caps">Role &amp; designation</div>
      <div className="card set__row"><span className="set__badge">M0</span><span><b>M0 · Presales Staff</b><small>Staff tier — sits below Manager designations (M1 Experience centre Manager, M2 Ops Manager) shown in Settings on the Manager app.</small></span></div>
      <div className="label-caps">Your customer channel</div>
      <div className="card set__row on"><span>☎️</span><span><b>Presales Staff</b><small>I mostly handle customers over the phone</small></span><i className="ti ti-circle-check ok" /></div>
      <div className="label-caps">Language</div>
      <div className="set__langs">
        {languages.map(([native, en]) => (
          <button key={en} className={lang === en ? 'on' : ''} aria-pressed={lang === en} onClick={() => { setLang(en); showToast(`Language: ${en} (labels stay English in this demo)`); }}><b>{native}</b><small>{en}</small></button>
        ))}
      </div>
      <div className="label-caps">Dev mode</div>
      <label className="card set__row"><span>🛠️</span><span><b>Override inherited industry</b><small>For building/demoing — unlocks manual vertical switching below.</small></span>
        <input type="checkbox" checked={dev} onChange={(e) => setDev(e.target.checked)} /></label>
      <div className="label-caps">Industry</div>
      {[['realestate', '🏢', 'Real estate — Presales', 'Godrej Properties — Presales Staff'], ['retail', '🛏️', 'Retail — Premium Brands', 'Home / furniture retail — Call Centre Staff'], ['health', '🏥', 'Healthcare — Hospital', 'Patient helpline — Helpline Staff']].map(([id, ic, t, s]) => (
        <button key={id} disabled={!dev && industry !== id} className={`card set__row ${industry === id ? 'on' : ''}`} onClick={() => setIndustry(id)}><span>{ic}</span><span><b>{t}</b><small>{s}</small></span></button>
      ))}
      <div className="label-caps">OG Score™ on LinkedIn</div>
      <div className="card set__li">
        <p className="muted">Link once — whenever you're ready to announce a milestone, push a ready-made OG Score™ story to LinkedIn in one tap.</p>
        <label>LINKEDIN PROFILE URL<input value={li} onChange={(e) => setLi(e.target.value)} placeholder="https://www.linkedin.com/in/…" /></label>
        <button className="btn-primary" disabled={!li.trim()} onClick={() => showToast('LinkedIn linked (demo)')}>Save &amp; Connect LinkedIn</button>
      </div>
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
