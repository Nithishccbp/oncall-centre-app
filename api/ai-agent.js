// Vercel serverless function: the AI voice agent's "brain".
// The browser sends the conversation so far; we ask Gemini for the next spoken reply.
// The API key lives ONLY in the Vercel environment variable GEMINI_API_KEY (never in front-end code).
// If the key is missing or Gemini fails, we answer { reply: null } and the browser uses its built-in fallback.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  const { messages = [], lead = {} } = req.body || {};
  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(200).json({ reply: null, source: 'no-key' });

  const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';
  const system = [
    'You are Avani, a friendly voice agent calling on behalf of The Sleep Company (mattresses, chairs, pillows) in India.',
    `You are phoning ${lead.name || 'a customer'} who showed interest in: ${lead.product || 'our products'}${lead.price ? ` (₹${lead.price})` : ''}.`,
    'Rules: speak in 1-2 short sentences, plain spoken English, no markdown, no emojis, never read out long lists.',
    'Goals in order: confirm it is a good time, understand their need, pitch the product briefly, mention the no-cost EMI and the 10-year warranty / 100-night trial when relevant, then offer to send a quote on WhatsApp and book a callback.',
    'If the customer says they are not interested, thank them politely and end the call. If they ask something you do not know, offer to have a human colleague follow up.',
  ].join(' ');
  const contents = messages.slice(-12).map((m) => ({ role: m.role === 'ai' ? 'model' : 'user', parts: [{ text: String(m.text).slice(0, 500) }] }));
  if (!contents.length || contents[0].role !== 'user') contents.unshift({ role: 'user', parts: [{ text: '(the customer picked up the phone)' }] });

  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents, generationConfig: { maxOutputTokens: 120, temperature: 0.7 } }),
    });
    const data = await r.json();
    const reply = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join(' ').trim();
    if (!reply) return res.status(200).json({ reply: null, source: 'empty', detail: data?.error?.message });
    return res.status(200).json({ reply, source: 'gemini' });
  } catch (e) {
    return res.status(200).json({ reply: null, source: 'error' });
  }
}
