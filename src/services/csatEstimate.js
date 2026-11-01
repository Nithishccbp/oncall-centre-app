// Estimates customer satisfaction (CSAT) from what the customer said on the call. The agent never has to ask for a rating.
import { moodOf } from '../data/calling.js';

const local = (lines) => {
  const cust = lines.filter((l) => l.who === 'cust');
  if (cust.length < 2) return null;
  const m = cust.map((l) => moodOf(l.text));
  const avg = m.reduce((n, x) => n + x, 0) / m.length;
  const last = m[m.length - 1];
  const mix = avg * 0.6 + last * 0.4;
  const stars = mix >= 80 ? 5 : mix >= 68 ? 4 : mix >= 55 ? 3 : mix >= 42 ? 2 : 1;
  const comment = stars >= 4 ? 'Customer sounded positive and open to next steps' : stars === 3 ? 'Customer stayed neutral, no clear signal' : 'Customer raised concerns or sounded unhappy';
  return { stars, comment, source: 'on-device' };
};

export async function estimateCsat(lines) {
  const fallback = local(lines);
  if (!fallback) return null; // the customer hardly spoke, so there is nothing to judge
  try {
    const r = await fetch('/api/ai-agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'csat', messages: lines.map((l) => ({ role: l.who === 'agent' ? 'agent' : 'cust', text: l.text })) }) });
    if (r.ok) { const j = await r.json(); if (j?.csat?.stars) return { stars: j.csat.stars, comment: j.csat.comment || fallback.comment, source: 'ai' }; }
  } catch { /* use the on-device estimate */ }
  return fallback;
}
