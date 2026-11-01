// App-wide UI state: toast, which top-bar overlay is open, chosen avatar and dashboard date range.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { avatars } from '../data/calling.js';

const Ctx = createContext(null);

const load = (key, fallback) => {
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
};
const save = (key, value) => {
  try { localStorage.setItem(key, value); } catch { /* storage can be blocked — ignore */ }
};

const startOf = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const endOf = (d) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
/** The date window a range label stands for (This Week = Monday to today). */
export function spanFor(label, from, to) {
  const now = new Date();
  if (from && to) return { from: startOf(from), to: endOf(to) };
  const s = startOf(now);
  if (label === 'Today') return { from: s, to: endOf(now) };
  if (label === 'This Month') return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOf(now) };
  if (label === 'Last 30 Days') { s.setDate(s.getDate() - 29); return { from: s, to: endOf(now) }; }
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7)); // Monday
  return { from: s, to: endOf(now) };
}

export function UiProvider({ children }) {
  const [toast, setToast] = useState(null);
  const [overlay, setOverlay] = useState(null); // 'notifications' | 'ogscore' | 'rank' | 'avatar' | 'settings' | 'daterange' | 'rights' | 'consentlog' | null
  const [sheet, setSheet] = useState(null); // { type: 'whatsapp' | 'nointerest' | 'cameback', lead }
  const [avatarId, setAvatarId] = useState(() => load('og_avatar', 'captain'));
  const [rangeState, setRangeState] = useState({ label: 'This Week', from: null, to: null });
  const range = rangeState.label;
  const span = useMemo(() => spanFor(rangeState.label, rangeState.from, rangeState.to), [rangeState]);
  const setRange = useCallback((label, from, to) => setRangeState({ label, from: label === 'Custom' ? from : null, to: label === 'Custom' ? to : null }), []);
  const timer = useRef(null);

  const showToast = useCallback((text) => {
    clearTimeout(timer.current);
    setToast({ text, id: Date.now() });
    timer.current = setTimeout(() => setToast(null), 3200);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);

  const chooseAvatar = useCallback((id) => { setAvatarId(id); save('og_avatar', id); }, []);
  const avatar = avatars.find((a) => a.id === avatarId) || avatars[0];

  const value = useMemo(() => ({
    sheet, openSheet: (type, lead) => setSheet({ type, lead }), closeSheet: () => setSheet(null),
    toast, showToast, overlay, openOverlay: setOverlay, closeOverlay: () => setOverlay(null),
    avatar, chooseAvatar, range, setRange, span,
  }), [sheet, toast, showToast, overlay, avatar, chooseAvatar, range, setRange, span]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useUi = () => useContext(Ctx);
