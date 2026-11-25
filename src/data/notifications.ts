// Notifications built from live data (missed calls, follow-ups, ratings, new leads), so the list fills itself as data arrives.
import { useMemo } from 'react';
import { useIngest } from '../context/IngestContext';
import { useKpiData } from './kpiStats';
import { notifications as demoList } from './calling';
import { DEMO } from './demo';
import { leads, leadAddedAt, useLeadsVersion } from './leads';
import { useAppCalls } from './callLog';
import type { AppNotification, IngestView } from '../types/data';

const first = (s: string | null | undefined): string => String(s || '').toLowerCase().split(' ')[0];
const clock = (iso: string): string => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).replace(' ', '').toLowerCase();
const sameDay = (iso: string, d: Date = new Date()): boolean => new Date(iso).toDateString() === d.toDateString();
const when = (iso: string): string => (sameDay(iso) ? clock(iso) : sameDay(iso, new Date(Date.now() - 864e5)) ? 'Yesterday' : new Date(iso).toLocaleDateString('en-IN', { weekday: 'short' }));

export function useNotifications(): AppNotification[] {
  const ing = useIngest() as unknown as IngestView; // context typed by another layer; shape per IngestView
  const { created, calledToday } = useKpiData();
  const lver = useLeadsVersion();
  const appCalls = useAppCalls();
  return useMemo(() => {
    const out: AppNotification[] = [];
    const convs = ing.convs || [];
    const now = Date.now();
    convs.filter((c) => c.type === 'call' && c.direction === 'missed' && now - new Date(c.started_at).getTime() < 2 * 864e5).forEach((c) => {
      const n = c.customer?.name || c.customer?.phone || 'a customer';
      out.push({ id: `m-${c.conversation_id}`, ts: c.started_at, icon: '📞', kind: 'action', time: when(c.started_at), text: `Missed call from ${n}, call them back`, link: { label: 'Open Incoming →', to: '/plan/incoming' } });
    });
    convs.filter((c) => c.follow_up && new Date(c.follow_up!.at).getTime() > now - 36e5).forEach((c) => {
      const n = c.customer?.name || 'customer';
      const fu = c.follow_up!;
      out.push({ id: `f-${c.conversation_id}`, ts: fu.at, icon: '📅', kind: 'action', time: `${sameDay(fu.at) ? 'Today' : new Date(fu.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} ${clock(fu.at)}`, text: fu.title || `${fu.type === 'callback' ? 'Callback' : 'Site visit'} with ${n}`, link: { label: 'Open Calendar →', to: '/calendar' } });
    });
    const waiting = created.filter((l) => !calledToday.some((c) => (c.leadId && c.leadId === l.id) || first(c.name) === first(l.name)));
    if (waiting.length) out.push({ id: 'w', ts: new Date().toISOString(), icon: '🎯', kind: 'action', time: 'Today', text: `${waiting.length} new lead${waiting.length > 1 ? 's' : ''} still waiting for a first call`, link: { label: 'Open Calls to make →', to: '/plan/outgoing' } });
    (ing.ratedToday || []).filter((r) => r.stars <= 2).forEach((r, i) => out.push({ id: `lc-${i}-${r.time}`, ts: new Date().toISOString(), icon: '⚠️', kind: 'alert', time: r.time, text: `${r.name} rated the call ${r.stars}★${r.comment ? ` · “${r.comment}”` : ''}` }));
    (ing.ratedToday || []).filter((r) => r.stars === 5).slice(0, 1).forEach((r) => out.push({ id: `l5-${r.time}`, ts: new Date().toISOString(), icon: '🌟', kind: 'alert', time: r.time, text: `${r.name} gave you 5★. Nice work` }));
    // Leads 3+ days old with no call at all: alert.
    if (!DEMO) {
      const all: { name?: string; leadId: string | null }[] = [...appCalls, ...convs.filter((c) => c.type === 'call').map((c) => ({ name: c.customer?.name, leadId: null as string | null }))];
      leads.forEach((l) => {
        const days = Math.floor((now - leadAddedAt(l)) / 864e5);
        if (days < 3) return;
        if (all.some((c) => (c.leadId && c.leadId === l.id) || (c.name && first(c.name) === first(l.name)))) return;
        out.push({ id: `old-${l.id}`, ts: new Date(leadAddedAt(l) + 3 * 864e5).toISOString(), icon: '⏰', kind: 'alert', time: `${days} days old`, text: `${l.name} has had no action for ${days} days. Call them before the lead goes cold`, link: { label: 'Open Calls to make →', to: '/plan/outgoing' } });
      });
    }
    out.sort((a, b) => (a.kind === b.kind ? new Date(b.ts!).getTime() - new Date(a.ts!).getTime() : a.kind === 'action' ? -1 : 1));
    return DEMO ? [...out, ...demoList] : out;
  }, [ing.convs, ing.ratedToday, created, calledToday, lver, appCalls]);
}
