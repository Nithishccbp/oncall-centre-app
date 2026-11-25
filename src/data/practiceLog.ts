// Practice sessions (calls with the AI customer). Kept on this device only, never mixed with real calls.
import { useSyncExternalStore } from 'react';
import type { NewPracticeSession, PracticeSession } from '../types/data';

const KEY = 'og_practice_sessions';
const subs = new Set<() => void>();
const load = (): PracticeSession[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]') as PracticeSession[]; } catch { return []; } };
let list: PracticeSession[] = load();
const save = (): void => { try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, 60))); } catch { /* ignore */ } subs.forEach((f) => f()); };

export function addSession({ persona, lines, seconds, review, ...extra }: NewPracticeSession): string {
  const id = `ps-${Date.now()}`;
  list = [{ id, ts: new Date().toISOString(), persona, lines, seconds, review, ...extra }, ...list].slice(0, 60);
  save();
  return id;
}
export function updateSession(id: string, patch: Partial<PracticeSession>): void { list = list.map((s) => (s.id === id ? { ...s, ...patch } : s)); save(); }
export function removeSession(id: string): void { list = list.filter((s) => s.id !== id); save(); }
export const usePracticeSessions = (): PracticeSession[] => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => list);
