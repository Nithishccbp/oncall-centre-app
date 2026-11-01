// Live OG Score from this device's real data: practice reviews (skill scores) and customer CSAT stars on real calls.
// Score for a day = rolling 7-day average of everything scored. Prior = the same window a week earlier.
import { useMemo } from 'react';
import { usePracticeSessions } from './practiceLog.js';
import { useAppCalls } from './callLog.js';
import { useIngest } from '../context/IngestContext.jsx';
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
  return useMemo(() => {
    const items = [];
    sessions.forEach((s) => { if (s.review && typeof s.review.score === 'number') items.push({ t: new Date(s.ts).getTime(), v: s.review.score, skills: s.review.skills || null }); });
    app.forEach((c) => { if (c.csat) items.push({ t: new Date(c.ts).getTime(), v: c.csat * 20, skills: null }); });
    (ing?.callsAll || []).forEach((c) => { if (c.csat) items.push({ t: new Date(c.ts).getTime(), v: Math.round(c.csat <= 5 ? c.csat * 20 : c.csat), skills: null }); });
    const today = startOf(Date.now());
    const win = (endDay, back = 7) => items.filter((i) => i.t >= endDay - (back - 1) * DAY && i.t < endDay + DAY);
    const at = (endDay) => avg(win(endDay).map((i) => i.v));
    const labels = []; const trend = []; const prior = [];
    for (let k = 4; k >= 0; k -= 1) {
      const d = today - k * DAY;
      labels.push(k === 0 ? 'Today' : new Date(d).toLocaleDateString('en-US', { weekday: 'short' }));
      trend.push(at(d) ?? 0); prior.push(at(d - 7 * DAY) ?? 0);
    }
    const score = at(today) ?? 0;
    const prev = at(today - 7 * DAY);
    const delta = prev == null || at(today) == null ? null : score - prev;
    const bucket = (endDay) => { const m = {}; win(endDay).forEach((i) => { if (i.skills) Object.entries(i.skills).forEach(([k, v]) => { (m[k] = m[k] || []).push(v); }); }); return m; };
    const nowB = bucket(today); const prevB = bucket(today - 7 * DAY);
    const skills = Object.keys(SKILL_LABELS).filter((k) => nowB[k]).map((k) => {
      const sc = avg(nowB[k]); const pv = prevB[k] ? avg(prevB[k]) : null;
      return { key: k, skill: SKILL_LABELS[k], score: sc, vs: pv == null ? null : sc - pv, next: sc >= 80 ? 'Keep it up' : SKILL_TIPS[k] };
    });
    return { live: !DEMO, score, delta, labels, trend, prior, skills, scored: win(today).length, hasData: win(today).length > 0 };
  }, [sessions, app, ing?.callsAll, ing?.version]);
}
