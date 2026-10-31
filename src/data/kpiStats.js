// One place that works out the dashboard numbers, so tiles and popups always agree and update when data changes.
import { useMemo } from 'react';
import { leads, useLeadsVersion } from './leads.js';
import { useAppCalls } from './callLog.js';
import { useIngest } from '../context/IngestContext.jsx';
import { DEMO } from './demo.js';

const sameDay = (iso, d = new Date()) => new Date(iso).toDateString() === d.toDateString();
const first = (s) => String(s || '').toLowerCase().split(' ')[0];
const hh = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

export function useKpiData() {
  const ing = useIngest();
  const app = useAppCalls();
  const lv = useLeadsVersion();

  return useMemo(() => {
    // Leads the agent created today: backend-ingested + added by hand (+ the 3 sample ones in demo mode).
    const mine = leads.filter((l) => (l.ingested || l.manual) && (!l.createdAt || sameDay(l.createdAt)));
    const created = DEMO ? [...leads.filter((l) => !l.ingested && !l.manual).slice(0, 3), ...mine] : mine;

    // Calls: backend outgoing calls + local ones that the backend does not have yet.
    const backend = ing.calledToday || [];
    const backendAll = (ing.convs || []).filter((c) => c.type === 'call' && c.direction !== 'missed');
    const dup = (c) => backendAll.some((b) => first(b.customer?.name) === first(c.name) && Math.abs(new Date(b.started_at) - new Date(c.ts)) < 10 * 60 * 1000);
    const local = app.filter((c) => !dup(c));
    const localToday = local.filter((c) => sameDay(c.ts)).map((c) => {
      const d = new Date(c.ts);
      return { time: hh(d), hour: d.getHours() + d.getMinutes() / 60, name: c.name, dur: c.dur, outcome: c.outcome, quote: c.quote, leadId: c.leadId };
    });
    const calledToday = [...localToday, ...backend].sort((a, b) => a.hour - b.hour);

    // Week table for Avg Handle Time: backend week + local calls merged into the right day.
    const week = (ing.week || Array.from({ length: 7 }, () => ({ day: '', calls: 0, aht: 0 }))).map((w, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      const extra = local.filter((c) => sameDay(c.ts, d));
      if (!extra.length) return w;
      const calls = w.calls + extra.length;
      return { ...w, calls, aht: Math.round((w.aht * w.calls + extra.reduce((n, c) => n + c.dur, 0)) / calls) };
    });
    // CSAT: customer ratings entered at wrap-up (local) + backend ratings.
    const stars = (list) => (list.length ? Math.round((list.reduce((n, c) => n + c.stars, 0) / list.length) * 20) : null);
    const localRated = local.filter((c) => c.csat && sameDay(c.ts)).map((c) => ({ time: hh(new Date(c.ts)), name: c.name, stars: c.csat, comment: c.comment || '' }));
    const ratedToday = [...localRated, ...(ing.ratedToday || [])];
    const csatToday = stars(ratedToday);
    const weekC = week.map((w, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      const ex = local.filter((c) => c.csat && sameDay(c.ts, d));
      if (!ex.length) return w;
      if (i === 6) return { ...w, csat: csatToday };
      return { ...w, csat: Math.round(ex.reduce((n, c) => n + c.csat, 0) / ex.length * 20) };
    });
    const todaysLocal = local.filter((c) => sameDay(c.ts)).map((c) => ({ time: hh(new Date(c.ts)), name: c.name, topic: `${c.outcome || 'Call'} · ${Math.floor(c.dur / 60)}m ${String(c.dur % 60).padStart(2, '0')}s`, stars: c.csat || 0 })).reverse();
    return { created, calledToday, week: weekC, ratedToday, csatToday, todaysLocal, lv };
  }, [ing.calledToday, ing.convs, ing.week, ing.version, app, lv]);
}
