// Notifications built from live data (missed calls, follow-ups, ratings, new leads), so the list fills itself as data arrives.
import { useMemo } from 'react';
import { useIngest } from '../context/IngestContext.jsx';
import { useKpiData } from './kpiStats.js';
import { notifications as demoList } from './calling.js';
import { DEMO } from './demo.js';

const first = (s) => String(s || '').toLowerCase().split(' ')[0];
const clock = (iso) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(' ', '').toLowerCase();
const sameDay = (iso, d = new Date()) => new Date(iso).toDateString() === d.toDateString();
const when = (iso) => (sameDay(iso) ? clock(iso) : sameDay(iso, new Date(Date.now() - 864e5)) ? 'Yesterday' : new Date(iso).toLocaleDateString('en-IN', { weekday: 'short' }));

export function useNotifications() {
  const ing = useIngest();
  const { created, calledToday } = useKpiData();
  return useMemo(() => {
    const out = [];
    const convs = ing.convs || [];
    const now = Date.now();
    convs.filter((c) => c.type === 'call' && c.direction === 'missed' && now - new Date(c.started_at) < 2 * 864e5).forEach((c) => {
      const n = c.customer?.name || c.customer?.phone || 'a customer';
      out.push({ id: `m-${c.conversation_id}`, ts: c.started_at, icon: '📞', kind: 'action', time: when(c.started_at), text: `Missed call from ${n}, call them back`, link: { label: 'Open Incoming →', to: '/plan/incoming' } });
    });
    convs.filter((c) => c.follow_up && new Date(c.follow_up.at) > now - 36e5).forEach((c) => {
      const n = c.customer?.name || 'customer';
      out.push({ id: `f-${c.conversation_id}`, ts: c.follow_up.at, icon: '📅', kind: 'action', time: `${sameDay(c.follow_up.at) ? 'Today' : new Date(c.follow_up.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} ${clock(c.follow_up.at)}`, text: c.follow_up.title || `${c.follow_up.type === 'callback' ? 'Callback' : 'Site visit'} with ${n}`, link: { label: 'Open Calendar →', to: '/calendar' } });
    });
    const waiting = created.filter((l) => !calledToday.some((c) => (c.leadId && c.leadId === l.id) || first(c.name) === first(l.name)));
    if (waiting.length) out.push({ id: 'w', ts: new Date().toISOString(), icon: '🎯', kind: 'action', time: 'Today', text: `${waiting.length} new lead${waiting.length > 1 ? 's' : ''} still waiting for a first call`, link: { label: 'Open Calls to make →', to: '/plan/outgoing' } });
    (ing.ratedToday || []).filter((r) => r.stars <= 2).forEach((r, i) => out.push({ id: `lc-${i}-${r.time}`, ts: new Date().toISOString(), icon: '⚠️', kind: 'alert', time: r.time, text: `${r.name} rated the call ${r.stars}★${r.comment ? ` · “${r.comment}”` : ''}` }));
    (ing.ratedToday || []).filter((r) => r.stars === 5).slice(0, 1).forEach((r) => out.push({ id: `l5-${r.time}`, ts: new Date().toISOString(), icon: '🌟', kind: 'alert', time: r.time, text: `${r.name} gave you 5★. Nice work` }));
    out.sort((a, b) => (a.kind === b.kind ? new Date(b.ts) - new Date(a.ts) : a.kind === 'action' ? -1 : 1));
    return DEMO ? [...out, ...demoList] : out;
  }, [ing.convs, ing.ratedToday, created, calledToday]);
}
