// Calls made from this app (phone / web / simulated), kept locally so the dashboard updates the moment a call is logged.
// Backend-ingested calls (IngestContext) are the source of truth; a local call is dropped when the backend has the same call.
import { useSyncExternalStore } from 'react';

const KEY = 'og_app_calls';
const subs = new Set();
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
// Practice calls from earlier versions were logged here by mistake: drop them.
const PRACTICE_NAMES = ['Anil Kumar', 'Priya Nair', 'Suresh Reddy', 'Meera Joshi', 'Farhan Sheikh'];
let list = load().filter((c) => !PRACTICE_NAMES.includes(c.name)).filter((c) => Date.now() - new Date(c.ts).getTime() < 35 * 864e5);

export function logAppCall({ name, leadId, dur, outcome, summary, csat, comment }) {
  const ts = new Date().toISOString();
  list = [{ id: `app-${Date.now()}`, ts, name: name || 'Lead', leadId: leadId || null, dur: dur || 0, outcome: outcome || 'Called', quote: /cost sheet|quote/i.test(summary || ''), csat: csat || 0, comment: comment || '' }, ...list].slice(0, 300);
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* ignore */ }
  subs.forEach((f) => f());
}

export const useAppCalls = () => useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => list);
