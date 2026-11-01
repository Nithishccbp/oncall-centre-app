// Review of a practice call: an instant on-device review, upgraded by the AI coach when the server answers.
const has = (t, re) => re.test(t.toLowerCase());
const words = (t) => t.trim().split(/\s+/).filter(Boolean).length;

export const SKILLS = [['greeting', 'Greeting', 10], ['discovery', 'Asking questions', 20], ['objections', 'Handling concerns', 20], ['closing', 'Closing', 20], ['tone', 'Tone and clarity', 15], ['empathy', 'Empathy and calm', 15]];

/** Strict on-device review. A typical decent call lands around 50 to 65. */
export function localReview(lines, seconds = 0, mood = '') {
  const agent = lines.filter((l) => l.who === 'agent').map((l) => l.text);
  const all = agent.join(' ');
  const lastTwo = agent.slice(-2).join(' ');
  const g1 = has(agent[0] || '', /\b(hello|hi|namaste|good (morning|afternoon|evening))\b/);
  const g2 = has(agent[0] || '', /(godrej|lakeside|this is|speaking|calling from|my name)/);
  const g3 = has(agent[0] || '', /(how can i help|how may i help|how are you|is this a good time)/);
  const greeting = g1 && g2 && g3 ? 100 : g1 && g2 ? 75 : g1 || g2 ? 40 : 10;
  const qs = agent.filter((t) => t.includes('?')).length;
  const specific = ['budget', 'bhk|bedroom', 'family|kids|children', 'move|possession date|when are you', 'loan|emi', 'location|office|work'].filter((p) => has(all, new RegExp(p))).length;
  const discovery = Math.min(100, qs * 15 + specific * 14);
  const topics = ['emi|loan', 'price|cost|budget', 'possession|handover', 'rera', 'parking', 'discount|offer', 'metro|distance|location', 'site visit|visit'].filter((p) => has(all, new RegExp(p))).length;
  const objections = Math.min(100, topics * 18);
  const concrete = has(lastTwo, /(site visit|cost sheet|whatsapp|callback|call back|book|token|schedule|appointment)/);
  const when = has(lastTwo, /(today|tomorrow|saturday|sunday|monday|tuesday|wednesday|thursday|friday|weekend|\bam\b|\bpm\b|o'?clock|\d\s?(am|pm)|this week|next week)/);
  const closing = concrete && when ? 100 : concrete ? 65 : has(lastTwo, /thank/) ? 25 : 8;
  const polite = (all.toLowerCase().match(/\b(please|thank|sure|sir|ma'?am|happy to|of course|certainly)\b/g) || []).length;
  const longTurns = agent.filter((t) => words(t) > 40).length;
  const rude = (all.toLowerCase().match(/(calm down|as i (already )?said|that'?s not possible|you should have|it'?s not my|not my problem|i told you)/g) || []).length;
  const tone = Math.max(5, Math.min(100, 35 + polite * 12 - longTurns * 18 - rude * 25));
  const emp = (all.toLowerCase().match(/(i understand|i('m| am) (really )?sorry|i apologi[sz]e|my apologies|i can (see|understand|imagine)|i hear you|that must be|i appreciate|let me (help|sort|fix|make sure|explain)|no worries|don'?t worry|i will (personally|make sure|take care)|thank you for (your patience|waiting|bearing))/g) || []).length;
  const hard = mood && mood !== 'friendly';
  const empathy = Math.max(0, Math.min(100, emp * 30 + (hard ? 0 : 25) - rude * 30));
  const skills = { greeting, discovery, objections, closing, tone, empathy };
  let score = Math.round(SKILLS.reduce((n, [k, , w]) => n + (skills[k] * w) / 100, 0) * 0.92);
  const cap = (c) => { score = Math.min(score, c); };
  if (agent.length < 4) cap(agent.length < 3 ? 30 : 45);
  if (hard && emp === 0) cap(50);
  if (closing < 60) cap(70);
  if (rude) cap(55);
  const strengths = []; const improve = [];
  (greeting >= 75 ? strengths : improve).push(greeting >= 75 ? 'You opened well: a friendly hello and who you are.' : 'Open with a warm hello, your name, Godrej Lakeside Towers, and "how can I help you?".');
  (discovery >= 60 ? strengths : improve).push(discovery >= 60 ? 'You asked good questions to understand what the customer needs.' : 'Ask more questions early: budget, BHK, family size, loan and when they want to move.');
  (objections >= 55 ? strengths : improve).push(objections >= 55 ? 'You answered the customer\'s concerns with specifics (price, EMI, possession and so on).' : 'Answer each worry with a specific fact: EMI figure, RERA number, possession date, parking.');
  (closing >= 80 ? strengths : improve).push(closing >= 80 ? 'You ended with a clear next step and a time.' : 'End with one clear next step and a time, for example "I will send the cost sheet now and book your site visit for Saturday 11 am".');
  (empathy >= 60 ? strengths : improve).push(empathy >= 60 ? 'You acknowledged how the customer felt before answering.' : 'Acknowledge the feeling first ("I understand, I am sorry about the wait") before giving facts.');
  if (rude) improve.unshift('Avoid phrases like "calm down" or "as I said". They make an upset customer angrier.');
  if (tone < 55 && !rude) improve.push('Keep answers short and polite. Two sentences at a time.'); else if (tone >= 70) strengths.push('Your tone was polite and easy to follow.');
  const summary = agent.length < 3 ? 'The call was very short, so there is not much to review. Try a longer conversation.'
    : score >= 80 ? 'Excellent call. You handled the customer well and closed with a clear next step.'
      : score >= 60 ? 'A solid call, but a few gaps are holding the score back. Fix the first tip below.'
        : score >= 40 ? 'An average call. Work on the tips below before the next practice.' : 'This call needs work, and that is what practice is for. Start with the first tip below.';
  return { score, stars: Math.max(1, Math.min(5, Math.round(score / 20))), skills, strengths: strengths.slice(0, 3), improve: improve.slice(0, 3), summary, source: 'on-device', seconds };
}

export async function aiReview(lines, persona, mood = '') {
  try {
    const r = await fetch('/api/ai-agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'review', messages: lines.map((l) => ({ role: l.who === 'agent' ? 'agent' : 'cust', text: l.text })), persona, mood }) });
    if (!r.ok) return null;
    const j = await r.json();
    const v = j?.review;
    if (!v || typeof v.score !== 'number' || !v.skills) return null;
    return { ...v, stars: Math.max(1, Math.min(5, Math.round(v.score / 20))), source: 'ai' };
  } catch { return null; }
}
