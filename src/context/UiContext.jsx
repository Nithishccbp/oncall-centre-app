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

export function UiProvider({ children }) {
  const [toast, setToast] = useState(null);
  const [overlay, setOverlay] = useState(null); // 'notifications' | 'ogscore' | 'rank' | 'avatar' | 'settings' | 'daterange' | 'rights' | 'consentlog' | null
  const [sheet, setSheet] = useState(null); // { type: 'whatsapp' | 'nointerest' | 'cameback', lead }
  const [avatarId, setAvatarId] = useState(() => load('og_avatar', 'captain'));
  const [range, setRange] = useState('This Week');
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
    avatar, chooseAvatar, range, setRange,
  }), [sheet, toast, showToast, overlay, avatar, chooseAvatar, range]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useUi = () => useContext(Ctx);
