// Practice sessions (calls with the AI customer). Kept on this device only, never mixed with real calls.
import { useSyncExternalStore } from 'react';

const KEY = 'og_practice_sessions';
const subs = new Set();
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
let list = load();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, 60))); } catch { /* ignore */ } subs.forEach((f) => f()); };

export function addSession({ persona, lines, seconds, review, ...extra }) {
  const id = `ps-${Date.now()}`;
  list = [{ id, ts: new Date().toISOString(), persona, lines, seconds, review, ...extra }, ...list].slice(0, 60);
  save();
  return id;
}
export function updateSession(id, patch) { list = list.map((s) => (s.id === id ? { ...s, ...patch } : s)); save(); }
export function removeSession(id) { list = list.filter((s) => s.id !== id); save(); }
export const usePracticeSessions = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => list);
