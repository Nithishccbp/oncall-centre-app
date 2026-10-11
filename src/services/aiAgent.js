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
  if (/emi|instal|monthly|per month/.test(t)) return `Yes, we have a no-cost EMI for ${product}, six or twelve months, so there is no extra interest. Shall I send the monthly amounts on WhatsApp?`;
  if (/warranty|guarantee|trial|return/.test(t)) return 'Every mattress comes with a ten year warranty and a hundred night trial, so you can return it if you are not happy.';
  if (/price|cost|how much|expensive/.test(t)) return `${product} is ${lead.price ? `₹${Number(lead.price).toLocaleString('en-IN')}` : 'very reasonably priced'} including free delivery and setup, and a no-cost EMI is available.`;
  if (/deliver|when|how soon|ship/.test(t)) return 'Delivery inside the city takes two to three days, and setup is free.';
  if (/yes|sure|ok|okay|go ahead|send|interested|sounds good|perfect/.test(t)) return 'Wonderful! I will send the quote on WhatsApp right now, and a colleague will call you tomorrow at six to confirm. Does that work?';
  if (turn <= 1) return `Great. Can you tell me what matters most to you in ${product}, comfort, firmness or budget?`;
  return 'Understood. I can send the details on WhatsApp, or arrange a callback from a colleague. Which would you prefer?';
}
