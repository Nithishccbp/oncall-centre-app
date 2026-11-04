// One place that works out the dashboard numbers, so tiles and popups always agree and update when data changes.
import { useMemo } from 'react';
import { leads, useLeadsVersion } from './leads.js';
import { useAppCalls } from './callLog.js';
import { useIngest } from '../context/IngestContext.jsx';
import { DEMO } from './demo.js';
import { useUi } from '../context/UiContext.jsx';

const sameDay = (iso, d = new Date()) => new Date(iso).toDateString() === d.toDateString();
const first = (s) => String(s || '').toLowerCase().split(' ')[0];
const hh = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

export function useKpiData() {
  const ing = useIngest();
  const app = useAppCalls();
  const lv = useLeadsVersion();
  const { span } = useUi();

  return useMemo(() => {
    const inR = (iso) => { const t = new Date(iso).getTime(); return t >= span.from.getTime() && t <= span.to.getTime(); };
    const todayInR = Date.now() >= span.from.getTime() && Date.now() <= span.to.getTime();

    // Leads the agent created in the chosen dates: backend-ingested + added by hand (+ the 3 sample ones in demo mode).
    const mine = leads.filter((l) => (l.ingested || l.manual) && (l.createdAt ? inR(l.createdAt) : todayInR));
    const created = DEMO ? [...leads.filter((l) => !l.ingested && !l.manual).slice(0, 3), ...mine] : mine;

    // Calls: backend calls + local ones that the backend does not have yet.
    const backendAll = (ing.convs || []).filter((c) => c.type === 'call' && c.direction !== 'missed');
    const dup = (c) => backendAll.some((b) => first(b.customer?.name) === first(c.name) && Math.abs(new Date(b.started_at) - new Date(c.ts)) < 10 * 60 * 1000);
    const local = app.filter((c) => !dup(c));
    const localR = local.filter((c) => inR(c.ts)).map((c) => {
      const d = new Date(c.ts);
      return { ts: c.ts, time: hh(d), hour: d.getHours() + d.getMinutes() / 60, name: c.name, dir: 'out', dur: c.dur, outcome: c.outcome, quote: c.quote, leadId: c.leadId, summary: c.summary || '', stars: c.csat || 0, comment: c.comment || '', topic: `${c.outcome || 'Call'} · ${Math.floor(c.dur / 60)}m ${String(c.dur % 60).padStart(2, '0')}s` };
    });
    const backendR = (ing.callsAll || []).filter((c) => inR(c.ts));
    const all = [...localR, ...backendR];
    const calledToday = all.filter((c) => c.dir === 'out').sort((a, b) => (a.ts < b.ts ? -1 : 1));

    // Week table for Avg Handle Time (always the last 7 days): backend week + local calls merged into the right day.
    const week = (ing.week || Array.from({ length: 7 }, () => ({ day: '', calls: 0, aht: 0 }))).map((w, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      const extra = local.filter((c) => sameDay(c.ts, d));
      if (!extra.length) return w;
      const calls = w.calls + extra.length;
      return { ...w, calls, aht: Math.round((w.aht * w.calls + extra.reduce((n, c) => n + c.dur, 0)) / calls) };
    });
    // CSAT in the chosen dates: customer ratings entered at wrap-up (local) + backend ratings.
    const stars = (list) => (list.length ? Math.round((list.reduce((n, c) => n + c.stars, 0) / list.length) * 20) : null);
    const ratedToday = all.filter((c) => c.stars).map((c) => ({ time: c.time, name: c.name, stars: c.stars, comment: c.comment || '' }));
    const csatToday = stars(ratedToday);
    const weekC = week.map((w, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      const ex = local.filter((c) => c.csat && sameDay(c.ts, d));
      if (!ex.length) return w;
      const bk = (ing.week || [])[i];
      if (bk && bk.csat) return { ...w, csat: Math.round((bk.csat + (ex.reduce((n, c) => n + c.csat, 0) / ex.length) * 20) / 2) };
      return { ...w, csat: Math.round((ex.reduce((n, c) => n + c.csat, 0) / ex.length) * 20) };
    });
    const calledLeads = new Set(calledToday.map((c) => c.leadId || first(c.name))).size;
    const handled = all.length;
    const aht = handled ? Math.round(all.reduce((n, c) => n + (c.dur || 0), 0) / handled) : 0;
    const todaysList = [...all].sort((a, b) => (a.ts < b.ts ? 1 : -1)).map((c) => ({ ts: c.ts, time: c.time, name: c.name, topic: c.topic, stars: c.stars || 0, dur: c.dur || 0, outcome: c.outcome || '', summary: c.summary || '', comment: c.comment || '' }));
    return { created, calledToday, calledLeads, week: weekC, ratedToday, csatToday, todaysList, handled, aht, lv };
  }, [ing.callsAll, ing.convs, ing.week, ing.version, app, lv, span]);
}

// ---- Shared by the KPI popups: honest date labels and a chart that matches the chosen range ----
const DAY_MS = 864e5;
const day0 = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
/** "Today 18:28", "Yesterday 18:28" or "2 Nov, 18:28": the real day a call or lead happened. */
export function whenLabel(ts) {
  const d = new Date(ts); if (Number.isNaN(d.getTime())) return '';
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const diff = Math.round((day0(Date.now()) - day0(d)) / DAY_MS);
  if (diff === 0) return `Today ${hm}`;
  if (diff === 1) return `Yesterday ${hm}`;
  return `${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' })}, ${hm}`;
}
/** Cumulative count per bucket: by time of day for a single day, by day for longer ranges. */
export function trendBuckets(span, items, tsOf) {
  const ts = items.map(tsOf).filter(Boolean).map((x) => new Date(x).getTime());
  const from = day0(span.from.getTime()); const to = Math.min(day0(span.to.getTime()), day0(Date.now()));
  const days = Math.round((to - from) / DAY_MS) + 1;
  if (days <= 1) {
    const cuts = [9, 12, 15, 17];
    const hr = (t) => { const d = new Date(t); return d.getHours() + d.getMinutes() / 60; };
    return { labels: ['9am', '12pm', '3pm', '5pm', 'Now'], line: [...cuts.map((c) => ts.filter((t) => hr(t) < c).length), ts.length] };
  }
  const n = Math.min(days, 31); const start = to - (n - 1) * DAY_MS;
  const labels = []; const line = [];
  for (let i = 0; i < n; i += 1) {
    const d = start + i * DAY_MS;
    labels.push(n <= 7 ? new Date(d).toLocaleDateString('en-US', { weekday: 'short' }) : `${new Date(d).getDate()} ${new Date(d).toLocaleDateString('en-US', { month: 'short' })}`);
    line.push(ts.filter((t) => t < d + DAY_MS).length);
  }
  return { labels, line };
}
