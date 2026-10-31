// The AI agent's brain (Gemini). Used by the phone AI call and by the web test line.
// The key lives ONLY in the Vercel environment variable GEMINI_API_KEY.
const system = (lead) => [
  'You are Avani, a friendly voice agent calling on behalf of Godrej Properties (apartments at Lakeside Towers, Whitefield, Bengaluru) in India.',
  `You are phoning ${lead.name || 'a customer'} who showed interest in: ${lead.product || 'our products'}${lead.price ? ` (₹${lead.price})` : ''}.`,
  'Rules: speak in 1-2 short sentences, plain spoken English, no markdown, no emojis, never read out long lists.',
  'Goals in order: confirm it is a good time, understand their need, pitch the product briefly, mention the home-loan EMI with bank pre-approval, the payment plan, and the December 2028 possession date with RERA registration when relevant, then offer to send a cost sheet on WhatsApp and book a callback.',
  'If the customer says they are not interested or says goodbye, thank them politely and end your sentence with the word [END]. If they ask something you do not know, offer to have a human colleague follow up.',
].join(' ');

/** messages: [{role:'ai'|'cust', text}] -> { reply, source }  (reply is null if Gemini is unavailable) */
export async function avaniReply(messages, lead = {}) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { reply: null, source: 'no-key' };
  const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';
  const contents = messages.slice(-12).map((m) => ({ role: m.role === 'ai' ? 'model' : 'user', parts: [{ text: String(m.text).slice(0, 500) }] }));
  if (!contents.length || contents[0].role !== 'user') contents.unshift({ role: 'user', parts: [{ text: '(the customer picked up the phone)' }] });
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: system(lead) }] }, contents, generationConfig: { maxOutputTokens: 200, temperature: 0.7, thinkingConfig: { thinkingBudget: 0 } } }),
    });
    const data = await r.json();
    const reply = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join(' ').trim();
    return reply ? { reply, source: 'gemini' } : { reply: null, source: 'empty' };
  } catch { return { reply: null, source: 'error' }; }
}

const customerSystem = (p = {}) => [
  `You are ${p.name || 'a customer'}, a real person phoning Godrej Properties about apartments at Lakeside Towers, Whitefield, Bengaluru, India. You are talking to a presales agent who is practising their call skills.`,
  `You are interested in: ${p.product || 'a 2 BHK'}. Your budget: ${p.budget || 'about 95 lakh'}. Your personality: ${p.trait || 'practical'}.`,
  `Your concerns, to raise one at a time and not all at once: ${(p.concerns || []).join('; ')}.`,
  'Rules: reply in 1 or 2 short spoken sentences of natural Indian English. No markdown, no emojis, no lists. Do not volunteer everything. Push back politely if the agent is vague or pushy, and become warmer when they answer well.',
  'Never say you are an AI, never coach the agent, never break character. When your concerns are handled and you agree a next step, or the agent says goodbye, say a short goodbye and end your sentence with the word [END].',
].join(' ');

/** The AI plays the CUSTOMER for call practice. messages: [{role:'agent'|'cust', text}] -> { reply, source } */
export async function customerReply(messages, persona = {}) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { reply: null, source: 'no-key' };
  const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';
  const contents = messages.slice(-14).map((m) => ({ role: m.role === 'cust' ? 'model' : 'user', parts: [{ text: String(m.text).slice(0, 500) }] }));
  if (!contents.length || contents[0].role !== 'user') contents.unshift({ role: 'user', parts: [{ text: '(the agent just picked up the phone)' }] });
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: customerSystem(persona) }] }, contents, generationConfig: { maxOutputTokens: 160, temperature: 0.85, thinkingConfig: { thinkingBudget: 0 } } }),
    });
    const data = await r.json();
    const reply = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join(' ').trim();
    return reply ? { reply, source: 'gemini' } : { reply: null, source: 'empty' };
  } catch { return { reply: null, source: 'error' }; }
}

/** Offline rulebook so the call never goes silent if Gemini is down. */
export function fallbackReply(heard, turn, lead = {}) {
  const t = String(heard || '').toLowerCase();
  if (/(not interested|no thanks|stop|don'?t call|bye|goodbye)/.test(t)) return 'No problem at all, thank you for your time. Have a lovely day! [END]';
  if (/(price|cost|expensive|how much)/.test(t)) return `It is ₹${lead.price || 'a fair price'} and a home loan with bank pre-approval keeps the monthly EMI comfortable.`;
  if (/(possession|rera|handover|when can i move)/.test(t)) return 'Possession is December 2028 and the project is RERA registered, so your booking is protected.';
  if (/(emi|instal)/.test(t)) return 'Yes, HDFC, SBI and ICICI pre-approve loans for Lakeside Towers, with up to twenty years tenure.';
  if (/(whatsapp|cost sheet|send)/.test(t)) return 'Sure, I will send the cost sheet on WhatsApp right after this call. Anything else I can help with?';
  const set = ['Great. What matters most to you in a home, location, budget or possession date?', `Our ${lead.product || 'range'} is very popular for that. Would you like me to send a cost sheet on WhatsApp?`, 'Shall I book a callback with a colleague who can answer everything in detail?'];
  return set[Math.min(turn, set.length - 1)];
}
