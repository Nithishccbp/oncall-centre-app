// Top bar: logo, bell, score ring + rank, avatar and a user dropdown.
import { useEffect, useRef, useState } from 'react';
import { user } from '../../data/dashboard.js';
import { useUi } from '../../context/UiContext.jsx';
import './TopBar.css';

function ScoreRing({ score }) {
  const r = 11, c = 2 * Math.PI * r;
  return (
    <svg className="ring" width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
      <circle cx="14" cy="14" r={r} fill="#0a1a14" stroke="rgba(255,255,255,.18)" strokeWidth="3" />
      <circle cx="14" cy="14" r={r} fill="none" stroke="#5dcaa5" strokeWidth="3" strokeLinecap="round"
        strokeDasharray={`${(score / 100) * c} ${c}`} transform="rotate(-90 14 14)" />
      <text x="14" y="17.5" textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff">{score}</text>
    </svg>
  );
}

export default function TopBar() {
  const [open, setOpen] = useState(false);
  const { openOverlay, avatar, showToast } = useUi();
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <header className="topbar">
      <div className="topbar__brand">
        <span className="topbar__logo">OG</span>
        <span className="topbar__name">On-Ground.ai</span>
      </div>
      <div className="topbar__right" ref={ref}>
        <button className="bell" aria-label="Notifications" onClick={() => openOverlay('notifications')}><i className="ti ti-bell" /><span className="bell__dot" /></button>
        <div className="scorepill" title="OG score and store rank">
          <button className="scorepill__btn" aria-label="OG score details" onClick={() => openOverlay('ogscore')}><ScoreRing score={user.ogScore} /></button>
          <button className="scorepill__rank" aria-label="Rank details" onClick={() => openOverlay('rank')}>⭐#{user.rank}</button>
        </div>
        <button className="avatar" aria-label="Avatar" onClick={() => openOverlay('avatar')}>
          <div className="avatar__inner"><span className="avatar__emoji">{avatar.emoji}</span><span className="avatar__ini">{user.initials}</span></div>
        </button>
        <button className="burger" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(!open)}>
          <span /><span /><span />
        </button>
        {open && (
          <div className="dropdown" role="menu">
            <div className="dropdown__head">
              <span className="dropdown__av">{user.initials}</span>
              <div><div className="dropdown__name">{user.name}</div><div className="dropdown__sub">{user.location} · {user.store}</div></div>
            </div>
            <button className="dropdown__item" role="menuitem" onClick={() => { setOpen(false); openOverlay('avatar'); }}><i className="ti ti-user-circle" /> Avatar</button>
            <button className="dropdown__item" role="menuitem" onClick={() => { setOpen(false); openOverlay('settings'); }}><i className="ti ti-settings" /> Settings</button>
            <button className="dropdown__item danger" role="menuitem" onClick={() => { setOpen(false); showToast('Logged out (demo — there is no login in this prototype)'); }}><i className="ti ti-logout" /> Logout</button>
          </div>
        )}
      </div>
    </header>
  );
}
