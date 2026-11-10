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

const MOODS = {
  angry: 'MOOD: you are ANGRY and frustrated (nobody called you back, you were promised things, you feel ignored). Speak sharply in short sentences, complain, and you may cut in. Stay angry until the agent sincerely apologises, takes ownership and offers a concrete fix; only then cool down slowly. If the agent is defensive, scripted or pushy, get angrier. Never use abusive words or swearing.',
  confused: 'MOOD: you are CONFUSED. You do not follow the jargon (carpet area vs super built-up, EMI vs down payment, RERA). Ask the agent to repeat, say things like "wait, I did not get that", mix terms up. Become clear only when the agent explains simply, one step at a time, and checks that you understood.',
  impatient: 'MOOD: you are IMPATIENT and busy. Cut long answers short ("get to the point"), give very short replies, and threaten to hang up if the agent rambles beyond two sentences. Warm up only when answers are short and useful.',
  worried: 'MOOD: you are WORRIED and anxious about money, the loan, builder delays and making a mistake. Sound hesitant. Need facts and reassurance; calm down only when the agent is empathetic and specific, not when they just say "do not worry".',
  friendly: 'MOOD: you are warm, friendly and curious.',
};
const LANGS = { hi: 'LANGUAGE: speak in natural Hinglish (Hindi mixed with English, written in Roman letters), the way people talk in Hyderabad and Bengaluru.', te: 'LANGUAGE: speak in Telugu (written in Roman letters, with a few English words like "site visit", "EMI", "loan"), the way a Hyderabad buyer would.', en: '' };
const customerSystem = (p = {}, mood = '') => [
  LANGS[p.lang] || '',
  p.scenario ? `SCENARIO (a real past call you are recreating, stay true to it): ${String(p.scenario).slice(0, 600)}` : '',
  p.boss ? `BOSS RULE: ${String(p.boss).slice(0, 400)}` : '',
  MOODS[mood] ? `${MOODS[mood]} If this mood is different from how you sounded earlier in the call, shift naturally, the way a real person's mood turns (for example "hmm, wait, that does not sound right").` : '',
  `You are ${p.name || 'a customer'}, a real person phoning Godrej Properties about apartments at Lakeside Towers, Whitefield, Bengaluru, India. You are talking to a presales agent who is practising their call skills.`,
  `You are interested in: ${p.product || 'a 2 BHK'}. Your budget: ${p.budget || 'about 95 lakh'}. Your personality: ${p.trait || 'practical'}.`,
  `Your concerns, to raise one at a time and not all at once: ${(p.concerns || []).join('; ')}.`,
  'Rules: reply in 1 or 2 short spoken sentences of casual, natural Indian English, the way people really talk on the phone (contractions, an occasional "hmm", "see", "acha" or "okay", never formal or scripted). No markdown, no emojis, no lists. Do not volunteer everything. Push back politely if the agent is vague or pushy, and become warmer when they answer well.',
  'Never say you are an AI, never coach the agent, never break character. When your concerns are handled and you agree a next step, or the agent says goodbye, say a short goodbye and end your sentence with the word [END].',
].join(' ');

/** The AI plays the CUSTOMER for call practice. messages: [{role:'agent'|'cust', text}] -> { reply, source } */
export async function customerReply(messages, persona = {}, mood = '') {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { reply: null, source: 'no-key' };
  const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';
  const contents = messages.slice(-14).map((m) => ({ role: m.role === 'cust' ? 'model' : 'user', parts: [{ text: String(m.text).slice(0, 500) }] }));
  if (!contents.length || contents[0].role !== 'user') contents.unshift({ role: 'user', parts: [{ text: '(the agent just picked up the phone)' }] });
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: customerSystem(persona, mood) }] }, contents, generationConfig: { maxOutputTokens: 160, temperature: 0.85, thinkingConfig: { thinkingBudget: 0 } } }),
    });
    const data = await r.json();
    const reply = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join(' ').trim();
    return reply ? { reply, source: 'gemini' } : { reply: null, source: 'empty' };
  } catch { return { reply: null, source: 'error' }; }
}

/** Live coach: judges the agent's LAST reply. Returns { delta: -20..20, whisper } where delta moves the customer's trust. */
export async function coachTurn(messages, persona = {}, mood = '', trust = 50) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { coach: null, source: 'no-key' };
  const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';
  const transcript = messages.slice(-10).map((m) => `${m.role === 'agent' ? 'AGENT' : 'CUSTOMER'}: ${String(m.text).slice(0, 300)}`).join('\n');
  const prompt = `You are a live sales coach whispering to a real-estate presales agent (Godrej, Lakeside Towers) during a practice call. The customer (${persona.name || 'a buyer'}) feels ${mood || 'neutral'} and their trust in the agent is ${trust} out of 100. Judge ONLY the agent's last reply. Raise trust (+5 to +18) for empathy, a direct specific answer, a smart question, or a concrete next step. Lower trust (-5 to -20) for rambling, vagueness, pushiness, ignoring the concern, arguing or a wrong claim. 0 to +3 for filler.
Return JSON: {"delta":-20..20,"whisper":"one short tip for the agent's NEXT sentence, max 12 words, imperative, no quotes"}.

${transcript}`;
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 120, temperature: 0.2, responseMimeType: 'application/json', thinkingConfig: { thinkingBudget: 0 } } }),
    });
    const data = await r.json();
    const v = JSON.parse(data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '{}');
    const d = Math.round(Number(v.delta));
    if (!Number.isFinite(d)) return { coach: null, source: 'empty' };
    return { coach: { delta: Math.max(-20, Math.min(20, d)), whisper: String(v.whisper || '').slice(0, 110) }, source: 'gemini' };
  } catch { return { coach: null, source: 'error' }; }
}

/** Natural speaking voice for the AI customer (Gemini text-to-speech). Returns raw 16-bit PCM, 24 kHz mono, base64. */
export async function speakText(text, voice = 'Kore', style = '') {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { audio: null, source: 'no-key' };
  const model = process.env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts';
  const say = `Speak like a real person on a phone call in India, relaxed and natural, with a slight Indian English accent and small natural pauses. Do not sound like a presenter or a robot.${style ? ` The speaker is ${style}.` : ''} Say exactly this: ${String(text).slice(0, 400)}`;
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: say }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } } }),
    });
    const data = await r.json();
    const audio = data?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData?.data;
    return audio ? { audio, rate: 24000, source: 'gemini-tts' } : { audio: null, source: 'empty' };
  } catch { return { audio: null, source: 'error' }; }
}

/** AI coach: reviews a practice call. messages: [{role:'agent'|'cust', text}] -> { review } or { review: null } */
export async function reviewCall(messages, persona = {}, mood = '') {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { review: null, source: 'no-key' };
  const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';
  const transcript = messages.slice(-60).map((m) => `${m.role === 'agent' ? 'AGENT' : 'CUSTOMER'}: ${String(m.text).slice(0, 400)}`).join('\n');
  const prompt = `You coach real-estate presales agents (Godrej Properties, Lakeside Towers). Review this PRACTICE call where the agent spoke to an AI customer (${persona.name || 'a buyer'}, interested in ${persona.product || 'a flat'}${mood ? `, customer mood: ${mood === 'mixed' ? 'changing mood (friendly, then confused or angry)' : mood}` : ''}). Score the AGENT only.
Return JSON: {"score":0-100,"summary":"one or two friendly sentences","skills":{"greeting":0-100,"discovery":0-100,"objections":0-100,"closing":0-100,"tone":0-100,"empathy":0-100},"strengths":["up to 3 short points"],"improve":["up to 3 short, specific, actionable tips, quoting what the agent said where useful"]}.
BE STRICT, like a tough sales coach. A typical decent call scores 50 to 65. Score above 80 only for an excellent call that opens with name and company, asks several relevant discovery questions, answers each concern specifically (not vaguely), shows real empathy when the customer is upset or confused, and ends with a concrete next step (what, and when). Penalise heavily: vague or scripted answers, ignoring the customer's feelings, defensiveness, talking over a confused customer with jargon, long speeches, promises that cannot be kept, and no clear next step. For an angry, confused or worried customer, the empathy score must reflect whether the agent acknowledged the feeling, apologised or reassured sincerely, and calmed the customer. A very short or empty call scores under 30. Give improve tips that quote the agent's actual words and say what to say instead.

${transcript}`;
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 700, temperature: 0.3, responseMimeType: 'application/json', thinkingConfig: { thinkingBudget: 0 } } }),
    });
    const data = await r.json();
    const txt = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
    const v = JSON.parse(txt);
    const n = (x) => Math.max(0, Math.min(100, Math.round(Number(x) || 0)));
    const sk = v.skills || {};
    return { review: { score: n(v.score), summary: String(v.summary || '').slice(0, 300), skills: { greeting: n(sk.greeting), discovery: n(sk.discovery), objections: n(sk.objections), closing: n(sk.closing), tone: n(sk.tone), empathy: n(sk.empathy) }, strengths: (v.strengths || []).slice(0, 3).map((x) => String(x).slice(0, 200)), improve: (v.improve || []).slice(0, 3).map((x) => String(x).slice(0, 220)) }, source: 'gemini' };
  } catch { return { review: null, source: 'error' }; }
}

/** Reads a real call and estimates how satisfied the customer was (1-5 stars) plus a one-line reason. */
export async function rateCall(messages) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { csat: null, source: 'no-key' };
  const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';
  const transcript = messages.slice(-80).map((m) => `${m.role === 'agent' ? 'AGENT' : 'CUSTOMER'}: ${String(m.text).slice(0, 400)}`).join('\n');
  const prompt = `You judge how satisfied a real-estate customer was after a presales phone call (Godrej Properties). Read the conversation (it may mix English, Hindi, Telugu) and estimate the customer's satisfaction as a 1 to 5 star CSAT, judging only what the CUSTOMER said and how they reacted: were their questions answered, did they sound happy, annoyed, confused or rushed, did they agree to a next step. Do not reward the agent for talking a lot. 5 = clearly delighted or committed to a next step, 4 = positive, 3 = neutral or unclear, 2 = frustrated or unanswered concerns, 1 = angry or ended badly. If the customer barely spoke, return null.
Return JSON: {"stars":1-5 or null,"mood":"happy|neutral|confused|annoyed|angry","comment":"one short sentence (max 14 words) saying why, written like a customer remark summary"}.

${transcript}`;
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 200, temperature: 0.2, responseMimeType: 'application/json', thinkingConfig: { thinkingBudget: 0 } } }),
    });
    const data = await r.json();
    const v = JSON.parse(data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '{}');
    const st = Math.round(Number(v.stars));
    if (!(st >= 1 && st <= 5)) return { csat: null, source: 'gemini' };
    return { csat: { stars: st, mood: String(v.mood || '').slice(0, 20), comment: String(v.comment || '').slice(0, 160) }, source: 'gemini' };
  } catch { return { csat: null, source: 'error' }; }
}

/** Reads a real call and pulls out the CRM facts an agent would otherwise type by hand. */
export async function extractNotes(messages) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { notes: null, source: 'no-key' };
  const model = process.env.GEMINI_MODEL || 'gemini-flash-latest';
  const transcript = messages.slice(-80).map((m) => `${m.role === 'agent' ? 'AGENT' : 'CUSTOMER'}: ${String(m.text).slice(0, 400)}`).join('\n');
  const prompt = `You fill in CRM notes for a real-estate presales call (Godrej Properties). The conversation may mix English, Hindi, Telugu. Use ONLY facts said in the call; leave a field empty when it was not mentioned.
Return JSON: {"summary":"max 2 short sentences","budget":"e.g. ₹95 lakh or empty","timeline":"when they plan to buy or visit, or empty","objection":"price|loan|possession|location|family|competitor|time|trust|none","nextStep":"the agreed next step in under 10 words, or empty","siteVisit":true or false (a site visit was agreed or clearly planned),"interest":"hot|warm|cold"}.

${transcript}`;
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 400, temperature: 0.1, responseMimeType: 'application/json', thinkingConfig: { thinkingBudget: 0 } } }),
    });
    const data = await r.json();
    const v = JSON.parse(data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '{}');
    const ob = ['price', 'loan', 'possession', 'location', 'family', 'competitor', 'time', 'trust', 'none'];
    return { notes: { summary: String(v.summary || '').slice(0, 300), budget: String(v.budget || '').slice(0, 40), timeline: String(v.timeline || '').slice(0, 60), objection: ob.includes(v.objection) ? v.objection : 'none', nextStep: String(v.nextStep || '').slice(0, 80), siteVisit: v.siteVisit === true, interest: ['hot', 'warm', 'cold'].includes(v.interest) ? v.interest : 'warm' }, source: 'gemini' };
  } catch { return { notes: null, source: 'error' }; }
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
