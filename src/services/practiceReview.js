// Review of a practice call: an instant on-device review, upgraded by the AI coach when the server answers.
const has = (t, re) => re.test(t.toLowerCase());
const words = (t) => t.trim().split(/\s+/).filter(Boolean).length;

export const SKILLS = [['greeting', 'Greeting', 15], ['discovery', 'Asking questions', 25], ['objections', 'Handling concerns', 25], ['closing', 'Closing', 25], ['tone', 'Tone and clarity', 10]];

export function localReview(lines, seconds = 0) {
  const agent = lines.filter((l) => l.who === 'agent').map((l) => l.text);
  const all = agent.join(' ');
  const lastTwo = agent.slice(-2).join(' ');
  const g1 = has(agent[0] || '', /\b(hello|hi|namaste|good (morning|afternoon|evening))\b/);
  const g2 = has(agent[0] || '', /(godrej|lakeside|this is|speaking|calling from|my name)/);
  const greeting = g1 && g2 ? 100 : g1 || g2 ? 60 : 20;
  const qs = agent.filter((t) => t.includes('?') || has(t, /\b(what|which|when|how|would you|are you|do you)\b/)).length;
  const discovery = Math.min(100, qs * 30);
  const topics = ['emi|loan', 'price|cost|budget', 'possession|handover', 'rera', 'parking', 'discount|offer', 'metro|distance|location', 'site visit|visit'].filter((p) => has(all, new RegExp(p))).length;
  const objections = Math.min(100, topics * 25);
  const closing = has(lastTwo, /(site visit|visit|cost sheet|whatsapp|callback|call back|book|token|send you|schedule|appointment)/) ? 100 : has(lastTwo, /thank/) ? 45 : 15;
  const polite = (all.toLowerCase().match(/\b(please|thank|sure|sir|ma'?am|happy to|of course|sorry|certainly)\b/g) || []).length;
  const longTurns = agent.filter((t) => words(t) > 45).length;
  const tone = Math.max(10, Math.min(100, 50 + polite * 15 - longTurns * 20));
  const skills = { greeting, discovery, objections, closing, tone };
  let score = Math.round(SKILLS.reduce((n, [k, , w]) => n + (skills[k] * w) / 100, 0));
  if (agent.length < 3) score = Math.min(score, 35);
  const strengths = []; const improve = [];
  (greeting >= 80 ? strengths : improve).push(greeting >= 80 ? 'You opened well: a friendly hello and who you are.' : 'Start with a warm hello and say your name and Godrej Lakeside Towers.');
  (discovery >= 60 ? strengths : improve).push(discovery >= 60 ? 'You asked good questions to understand what the customer needs.' : 'Ask more questions early: budget, BHK, family size and when they want to move.');
  (objections >= 50 ? strengths : improve).push(objections >= 50 ? 'You spoke to the customer\'s concerns (price, EMI, possession and so on).' : 'Answer worries directly: mention EMI help, RERA, possession date or parking when asked.');
  (closing >= 80 ? strengths : improve).push(closing >= 80 ? 'You ended with a clear next step.' : 'End with one clear next step: send the cost sheet on WhatsApp or book a site visit.');
  if (tone < 60) improve.push('Keep answers short and polite. Aim for two sentences at a time.'); else strengths.push('Your tone was polite and easy to follow.');
  const summary = agent.length < 3 ? 'The call was very short, so there is not much to review. Try a longer conversation.'
    : score >= 75 ? 'Strong call. You sounded confident and moved the customer towards a next step.'
      : score >= 50 ? 'A decent call with a few easy wins. Work on the points below.' : 'This call needs work, and that is what practice is for. Start with the first tip below.';
  return { score, stars: Math.max(1, Math.min(5, Math.round(score / 20))), skills, strengths: strengths.slice(0, 3), improve: improve.slice(0, 3), summary, source: 'on-device', seconds };
}

export async function aiReview(lines, persona) {
  try {
    const r = await fetch('/api/ai-agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'review', messages: lines.map((l) => ({ role: l.who === 'agent' ? 'agent' : 'cust', text: l.text })), persona }) });
    if (!r.ok) return null;
    const j = await r.json();
    const v = j?.review;
    if (!v || typeof v.score !== 'number' || !v.skills) return null;
    return { ...v, stars: Math.max(1, Math.min(5, Math.round(v.score / 20))), source: 'ai' };
  } catch { return null; }
}
