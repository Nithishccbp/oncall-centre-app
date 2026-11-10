// Pulls the CRM facts out of a finished call (budget, timeline, objection, next step, site visit, interest).
// The AI does it when the server is reachable; a rule-based reader covers the rest, so notes are never empty-handed.
export const OBJECTIONS = { price: 'Price', loan: 'Loan / EMI', possession: 'Possession date', location: 'Location', family: 'Family decision', competitor: 'Competitor', time: 'Needs time', trust: 'Trust / builder', none: 'None raised' };
const OB_RE = [['price', /expensive|too much|costly|price|rate is|discount|negotiat|kam kar|thoda zyada/i], ['loan', /\bemi\b|loan|interest rate|down ?payment|bank/i], ['possession', /possession|handover|delay|rera|ready to move|when (will|can) (it|i)/i], ['location', /location|metro|distance|far |traffic|commute|school/i], ['family', /wife|husband|family|parents|father|mother|spouse|discuss at home|ask my/i], ['competitor', /competitor|other project|other builder|varthur|prestige|sobha|brigade|elsewhere/i], ['time', /think about|get back|let me think|not now|next month|few months|wait/i], ['trust', /trust|builder.*(reput|delay)|track record|is it safe|genuine/i]];

const rules = (lines) => {
  const all = lines.map((l) => l.text).join(' . ');
  const cust = lines.filter((l) => l.who === 'cust').map((l) => l.text).join(' . ');
  const b = all.match(/(?:₹|rs\.?|inr)?\s?(\d+(?:\.\d+)?)\s?(lakhs?|lacs?|crores?|cr|l)\b/i);
  const budget = b ? `₹${b[1]} ${/^c/i.test(b[2]) ? 'Cr' : 'L'}` : '';
  const tm = all.match(/(this|next) (week|month|weekend)|tomorrow|today|saturday|sunday|monday|tuesday|wednesday|thursday|friday|diwali|january|february|march|april|december|november/i);
  const sv = /site visit|visit the site|come (and )?(see|visit)|book(ed)? a visit|see the (flat|apartment|sample)/i.test(all) && !/not interested|no visit|don'?t want/i.test(cust);
  const ob = OB_RE.find(([, re]) => re.test(cust)); 
  const step = sv ? 'Site visit' : /cost sheet|quote/i.test(all) ? 'Send cost sheet' : /whatsapp|send (me )?(the )?details/i.test(all) ? 'Share details on WhatsApp' : /call (me )?back|callback|later/i.test(all) ? 'Call back later' : '';
  const cold = /not interested|do not call|don'?t call|stop calling|wrong number/i.test(cust);
  const interest = cold ? 'cold' : sv ? 'hot' : step ? 'warm' : 'warm';
  return { summary: '', budget, timeline: tm ? tm[0] : '', objection: ob ? ob[0] : 'none', nextStep: step, siteVisit: sv, interest, source: 'on-device' };
};

export async function estimateNotes(lines) {
  if (!lines.length) return null;
  const fallback = rules(lines);
  try {
    const r = await fetch('/api/ai-agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'notes', messages: lines.map((l) => ({ role: l.who === 'agent' ? 'agent' : 'cust', text: l.text })) }) });
    if (r.ok) { const j = await r.json(); if (j?.notes) return { ...j.notes, source: 'ai' }; }
  } catch { /* use the on-device reader */ }
  return fallback;
}
