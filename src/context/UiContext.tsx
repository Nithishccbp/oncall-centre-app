// App-wide UI state: toast, which top-bar overlay is open, chosen avatar and dashboard date range.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { avatars } from '../data/calling';

const Ctx = createContext<UiCtx | null>(null);

const load = (key: any, fallback: any) => {
  try { return localStorage.getItem(key) || fallback; } catch { return fallback; }
};
const save = (key: any, value: any) => {
  try { localStorage.setItem(key, value); } catch { /* storage can be blocked — ignore */ }
};

const startOf = (d: any) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const endOf = (d: any) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
/** The date window a range label stands for (This Week = Monday to today). */
export function spanFor(label: any, from: any, to: any) {
  const now = new Date();
  if (from && to) return { from: startOf(from), to: endOf(to) };
  const s = startOf(now);
  if (label === 'Today') return { from: s, to: endOf(now) };
  if (label === 'This Month') return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOf(now) };
  if (label === 'Last 30 Days') { s.setDate(s.getDate() - 29); return { from: s, to: endOf(now) }; }
  s.setDate(s.getDate() - ((s.getDay() + 6) % 7)); // Monday
  return { from: s, to: endOf(now) };
}

function useUiValue() {
  const [toast, setToast] = useState<any>(null);
  const [overlay, setOverlay] = useState<any>(null); // 'notifications' | 'ogscore' | 'rank' | 'avatar' | 'settings' | 'daterange' | 'rights' | 'consentlog' | null
  const [sheet, setSheet] = useState<any>(null); // { type: 'whatsapp' | 'nointerest' | 'cameback', lead }
  const [avatarId, setAvatarId] = useState(() => load('og_avatar', 'captain'));
  const [rangeState, setRangeState] = useState<any>({ label: 'This Week', from: null, to: null });
  const range = rangeState.label;
  const span = useMemo(() => spanFor(rangeState.label, rangeState.from, rangeState.to), [rangeState]);
  const setRange = useCallback((label: any, from: any, to: any) => setRangeState({ label, from: label === 'Custom' ? from : null, to: label === 'Custom' ? to : null }), []);
  const timer = useRef<any>(null);

  const showToast = useCallback((text: any) => {
    clearTimeout(timer.current);
    setToast({ text, id: Date.now() });
    timer.current = setTimeout(() => setToast(null), 3200);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);

  const chooseAvatar = useCallback((id: any) => { setAvatarId(id); save('og_avatar', id); }, []);
  const avatar = avatars.find((a) => a.id === avatarId) || avatars[0];

  const value = useMemo(() => ({
    sheet, openSheet: (type: any, lead: any) => setSheet({ type, lead }), closeSheet: () => setSheet(null),
    toast, showToast, overlay, openOverlay: setOverlay, closeOverlay: () => setOverlay(null),
    avatar, chooseAvatar, range, setRange, span,
  }), [sheet, toast, showToast, overlay, avatar, chooseAvatar, range, setRange, span]);

  return value;
}

export type UiCtx = ReturnType<typeof useUiValue>;
export function UiProvider({ children }: { children: ReactNode }) {
  const value = useUiValue();
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useUi = (): UiCtx => useContext(Ctx) as UiCtx;
