// The AI voice agent's brain on the customer's side: asks our /api/ai-agent (Gemini) and falls back to simple rules offline.

export async function nextAiReply(history, lead) {
  try {
    const r = await fetch('/api/ai-agent', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history, lead }),
    });
    const data = await r.json();
    if (data && data.reply) return { text: data.reply, source: data.source || 'gemini' };
  } catch { /* API not reachable (e.g. local dev) — use the fallback below */ }
  return { text: localReply(history, lead), source: 'fallback' };
}

export function localReply(history, lead = {}) {
  const last = [...history].reverse().find((m) => m.role === 'user')?.text || '';
  const turn = history.filter((m) => m.role === 'user').length;
  const product = lead.product || 'the product';
  const t = last.toLowerCase();
  if (/not interested|no thanks|don't call|stop calling|busy/.test(t)) return 'No problem at all, thank you for your time. Have a lovely day!';
  if (/emi|instal|monthly|per month/.test(t)) return `Yes, HDFC, SBI and ICICI pre-approve home loans for ${product}, up to twenty years. Shall I send the monthly EMI on WhatsApp?`;
  if (/possession|rera|handover|move in/.test(t)) return 'Possession is December 2028 and the project is RERA registered, so your booking is protected.';
  if (/price|cost|how much|expensive/.test(t)) return `${product} is ${lead.price ? `₹${Number(lead.price).toLocaleString('en-IN')}` : 'very reasonably priced'} all-in with a home loan available.`;
  if (/visit|site|see the|sample/.test(t)) return 'Possession is December 2028, and I can book a site visit for you this weekend.';
  if (/yes|sure|ok|okay|go ahead|send|interested|sounds good|perfect/.test(t)) return 'Wonderful! I will send the cost sheet on WhatsApp right now, and a colleague will call you tomorrow at six to confirm. Does that work?';
  if (turn <= 1) return `Great. Can you tell me what matters most to you in ${product}, location, budget or timeline?`;
  return 'Understood. I can send the details on WhatsApp, or arrange a callback from a colleague. Which would you prefer?';
}
