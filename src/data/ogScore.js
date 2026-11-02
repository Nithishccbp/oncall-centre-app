// Live OG Score from this device's real data: practice reviews (skill scores) and customer CSAT stars on real calls.
// Score = average of everything scored inside the selected date range. Prior = the same-length range just before it.
import { useMemo } from 'react';
import { usePracticeSessions } from './practiceLog.js';
import { useAppCalls } from './callLog.js';
import { useIngest } from '../context/IngestContext.jsx';
import { useUi } from '../context/UiContext.jsx';
import { DEMO } from './demo.js';

export const SKILL_LABELS = { greeting: 'Greeting', discovery: 'Asking questions', objections: 'Handling concerns', closing: 'Closing', tone: 'Tone and clarity', empathy: 'Empathy and calm' };
export const SKILL_TIPS = {
  greeting: 'Open with your name, the project and a warm hello',
  discovery: 'Ask budget, timeline and who decides before pitching',
  objections: 'Acknowledge the worry, then answer with one fact',
  closing: 'Ask for the site visit or booking before the call ends',
  tone: 'Speak slower and use short, clear sentences',
  empathy: 'Stay calm and repeat their concern before answering',
};
const DAY = 864e5;
const startOf = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
const avg = (a) => (a.length ? Math.round(a.reduce((n, x) => n + x, 0) / a.length) : null);

export function useOgScore() {
  const sessions = usePracticeSessions();
  const app = useAppCalls();
  const ing = useIngest();
  const { span, range } = useUi();
  return useMemo(() => {
    const items = [];
    sessions.forEach((s) => { if (s.review && typeof s.review.score === 'number') items.push({ t: new Date(s.ts).getTime(), v: s.review.score, skills: s.review.skills || null }); });
    app.forEach((c) => { if (c.csat) items.push({ t: new Date(c.ts).getTime(), v: c.csat * 20, skills: null }); });
    (ing?.callsAll || []).forEach((c) => { if (c.csat) items.push({ t: new Date(c.ts).getTime(), v: Math.round(c.csat <= 5 ? c.csat * 20 : c.csat), skills: null }); });
    const from = span.from.getTime(); const to = span.to.getTime();
    const days = Math.max(1, Math.round((startOf(to) - startOf(from)) / DAY) + 1);
    const pFrom = from - days * DAY; const pTo = from - 1;
    const inW = (a, b) => items.filter((i) => i.t >= a && i.t <= b);
    const cur = inW(from, to); const prv = inW(pFrom, pTo);
    const score = avg(cur.map((i) => i.v)) ?? 0;
    const prev = avg(prv.map((i) => i.v));
    const delta = prev == null || !cur.length ? null : score - prev;
    // Trend: one point per day of the chosen range (at least 5, at most 7 days, ending on the last day of the range).
    const n = Math.min(7, Math.max(5, days)); const last = startOf(to);
    const labels = []; const trend = []; const prior = [];
    for (let k = n - 1; k >= 0; k -= 1) {
      const d = last - k * DAY;
      labels.push(new Date(d).toLocaleDateString('en-US', { weekday: 'short', ...(days > 7 ? { day: 'numeric' } : {}) }));
      trend.push(avg(inW(d, d + DAY - 1).map((i) => i.v)) ?? 0);
      prior.push(avg(inW(d - days * DAY, d - days * DAY + DAY - 1).map((i) => i.v)) ?? 0);
    }
    const bucket = (list) => { const m = {}; list.forEach((i) => { if (i.skills) Object.entries(i.skills).forEach(([k, v]) => { (m[k] = m[k] || []).push(v); }); }); return m; };
    const nowB = bucket(cur); const prevB = bucket(prv);
    const skills = Object.keys(SKILL_LABELS).filter((k) => nowB[k]).map((k) => {
      const sc = avg(nowB[k]); const pv = prevB[k] ? avg(prevB[k]) : null;
      return { key: k, skill: SKILL_LABELS[k], score: sc, vs: pv == null ? null : sc - pv, next: sc >= 80 ? 'Keep it up' : SKILL_TIPS[k] };
    });
    return { live: !DEMO, score, delta, labels, trend, prior, skills, scored: cur.length, hasData: cur.length > 0, range };
  }, [sessions, app, ing?.callsAll, ing?.version, span, range]);
}
