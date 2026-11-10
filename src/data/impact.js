// Impact: turns real calls, leads and practice sessions into money, time and conversion numbers. Nothing here is invented:
// every figure is computed from what the app has stored, and the ROI maths uses assumptions the user can edit.
import { useMemo, useState, useCallback } from 'react';
import { leads, leadAddedAt, useLeadsVersion } from './leads.js';
import { useAppCalls } from './callLog.js';
import { usePracticeSessions } from './practiceLog.js';

const KEY = 'og_roi_assump';
export const DEFAULTS = { toolCost: 25000, hourCost: 300, minSaved: 3, baselineVisit: 8, visitToBooking: 12, margin: 2 };
const load = () => { try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { ...DEFAULTS }; } };

export function useAssumptions() {
  const [a, setA] = useState(load);
  const set = useCallback((k, v) => setA((o) => { const n = { ...o, [k]: v }; try { localStorage.setItem(KEY, JSON.stringify(n)); } catch { /* ignore */ } return n; }), []);
  const reset = useCallback(() => { try { localStorage.removeItem(KEY); } catch { /* ignore */ } setA({ ...DEFAULTS }); }, []);
  return [a, set, reset];
}

export const inr = (n) => {
  const v = Math.abs(n || 0);
  const s = v >= 1e7 ? `${(v / 1e7).toFixed(v >= 1e8 ? 0 : 2).replace(/\.?0+$/, '')} Cr` : v >= 1e5 ? `${(v / 1e5).toFixed(v >= 1e6 ? 1 : 2).replace(/\.?0+$/, '')} L` : v >= 1e3 ? `${(v / 1e3).toFixed(1).replace(/\.0$/, '')}K` : String(Math.round(v));
  return `${n < 0 ? '-' : ''}₹${s}`;
};
export const ageText = (ms) => { const m = Math.round(ms / 60000); return m < 60 ? `${Math.max(m, 1)} min` : m < 1440 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} d`; };
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const first = (n) => String(n || '').split(' ')[0].toLowerCase();

export function useImpact(days, A) {
  const lver = useLeadsVersion();
  const appCalls = useAppCalls();
  const sessions = usePracticeSessions();
  return useMemo(() => {
    const now = Date.now(); const from = now - days * 864e5;
    const calls = appCalls.filter((c) => new Date(c.ts).getTime() >= from);
    const withNotes = calls.filter((c) => c.notes);

    // Per lead: when it arrived, when we first called, what the calls said.
    const rows = leads.map((l) => {
      const mine = appCalls.filter((c) => (c.leadId && c.leadId === l.id) || (!c.leadId && first(c.name) === first(l.name))).sort((a, b) => new Date(a.ts) - new Date(b.ts));
      const added = leadAddedAt(l);
      const firstCall = mine.length ? new Date(mine[0].ts).getTime() : null;
      const notes = mine.map((c) => c.notes).filter(Boolean);
      const last = notes[notes.length - 1];
      return { lead: l, value: l.expectedValue || l.price || 0, added, age: now - added, calls: mine.length, firstCall, speed: firstCall ? Math.max(0, firstCall - added) : null,
        interest: last?.interest || null, siteVisit: notes.some((n) => n.siteVisit), nextStep: last?.nextStep || '' };
    });
    const waiting = rows.filter((r) => !r.calls).sort((a, b) => b.value - a.value);
    const atRisk = waiting.filter((r) => r.age >= 864e5);
    const contacted = rows.filter((r) => r.calls);
    const speeds = contacted.map((r) => r.speed / 60000);
    const SLA = 60; // minutes to first call
    const interested = contacted.filter((r) => r.interest === 'hot' || r.interest === 'warm');
    const hot = contacted.filter((r) => r.interest === 'hot');
    const visits = contacted.filter((r) => r.siteVisit);
    const sum = (a) => a.reduce((n, r) => n + r.value, 0);

    const obj = {}; withNotes.forEach((c) => { const k = c.notes.objection; if (k && k !== 'none') obj[k] = (obj[k] || 0) + 1; });
    const objections = Object.entries(obj).sort((a, b) => b[1] - a[1]);
    const stepRate = withNotes.length ? withNotes.filter((c) => c.notes.nextStep).length / withNotes.length : null;

    const rated = calls.filter((c) => c.csat > 0);
    const csat = rated.length ? Math.round((mean(rated.map((c) => c.csat)) / 5) * 100) : null;

    // Practice: score movement, and whether calls placed soon after practising were liked more.
    const ps = sessions.filter((s) => new Date(s.ts).getTime() >= from);
    const chrono = [...sessions].sort((a, b) => new Date(a.ts) - new Date(b.ts));
    const pDelta = chrono.length >= 6 ? Math.round(mean(chrono.slice(-3).map((s) => s.review.score)) - mean(chrono.slice(0, 3).map((s) => s.review.score))) : null;
    const after = []; const other = [];
    rated.forEach((c) => { const t = new Date(c.ts).getTime(); (sessions.some((s) => { const d = t - new Date(s.ts).getTime(); return d > 0 && d < 864e5; }) ? after : other).push(c.csat * 20); });
    const lift = after.length >= 3 && other.length >= 3 ? Math.round(mean(after) - mean(other)) : null;

    // Money
    const hours = (withNotes.length * A.minSaved) / 60;
    const saved = hours * A.hourCost;
    const avgDeal = rows.length ? sum(rows) / rows.length : 0;
    const revPerBooking = avgDeal * (A.margin / 100);
    const baseline = contacted.length * (A.baselineVisit / 100);
    const extraVisits = Math.max(0, visits.length - baseline);
    const extraRevenue = extraVisits * (A.visitToBooking / 100) * revPerBooking;
    const cost = A.toolCost * (days / 30);
    const gain = saved + extraRevenue;
    const roi = cost > 0 && (calls.length || sessions.length) ? gain / cost : null;

    return { days, calls: calls.length, callRows: calls, notesRows: withNotes, ratedRows: rated, sessionRows: ps, withNotes: withNotes.length, rows, waiting, atRisk, contacted, interested, hot, visits,
      valueAll: sum(rows), valueWaiting: sum(waiting), valueAtRisk: sum(atRisk), valueContacted: sum(contacted), valueInterested: sum(interested), valueHot: sum(hot), valueVisits: sum(visits),
      avgSpeed: mean(speeds), medSpeed: median(speeds), slaPct: speeds.length ? Math.round((speeds.filter((m) => m <= SLA).length / speeds.length) * 100) : null, SLA,
      objections, stepRate, csat, ratedCount: rated.length, practice: { n: ps.length, avg: ps.length ? Math.round(mean(ps.map((s) => s.review.score))) : null, delta: pDelta, lift, afterN: after.length, otherN: other.length },
      hours, saved, avgDeal, revPerBooking, baseline, extraVisits, extraRevenue, cost, gain, roi };
  }, [appCalls, sessions, days, A, lver]); // eslint-disable-line react-hooks/exhaustive-deps
}
