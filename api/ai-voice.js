// The AI phone call itself. Twilio fetches this every time Avani has to speak:
//   intro   -> she says hello and asks for recording consent out loud
//   consent -> we read the yes/no, remember it, then start the sales conversation
//   talk    -> we take what the customer said, ask Gemini for Avani's next sentence, and speak it
// The conversation so far travels inside the URL (parameter "s"), so no database is needed for the call to work.
import { avaniReply, fallbackReply } from './_lib/ai.js';
import { baseUrl, xmlEscape } from './_lib/twilio.js';
import { pushEvent } from './_lib/store.js';

const VOICE = 'Polly.Aditi';
const dec = (s) => { try { return JSON.parse(Buffer.from(String(s), 'base64url').toString('utf8')); } catch { return null; } };
const enc = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const YES = /\b(yes|yeah|yep|yup|ok|okay|sure|fine|haan|ha|theek|go ahead|alright|please do)\b|no problem|not a problem/i;
const NO = /\b(no|nope|nahi|nah|don'?t|do not|not)\b/i;

export default async function handler(req, res) {
  const body = req.body || {};
  const sid = body.CallSid || '';
  const st = dec(req.query.s) || { p: 'intro', n: 0, sil: 0, c: 0, h: [], l: {} };
  const heard = String(body.SpeechResult || '').trim();
  const name = (st.l?.name || '').split(' ')[0] || 'there';
  const url = (next) => `${baseUrl(req)}/api/ai-voice?s=${enc(next)}`;
  const say = (t) => `<Say voice="${VOICE}" language="en-IN">${xmlEscape(t)}</Say>`;
  const listen = (t, next) => `<Gather input="speech" language="en-IN" speechTimeout="auto" timeout="6" actionOnEmptyResult="true" method="POST" action="${xmlEscape(url(next))}">${say(t)}</Gather>`;
  const out = (inner) => { res.setHeader('Content-Type', 'text/xml'); return res.status(200).send(`<Response>${inner}</Response>`); };
  // the transcript is only kept if the customer said yes to recording
  const log = (ev) => (st.c ? pushEvent(sid, ev) : Promise.resolve());

  if (st.p === 'intro') {
    const t = `Hello ${name}, this is Avani, calling from Godrej Properties. This call may be recorded and transcribed to improve our service. Is that okay with you? Please say yes or no.`;
    return out(listen(t, { ...st, p: 'consent' }));
  }

  if (st.p === 'consent') {
    const ok = YES.test(heard) && !(NO.test(heard) && !/no problem|not a problem/i.test(heard));
    await pushEvent(sid, { t: 'consent', v: ok ? 'yes' : 'no', said: heard || '(no answer)' });
    const next = { ...st, p: 'talk', c: ok ? 1 : 0 };
    const opener = `${ok ? 'Thank you.' : 'No problem, I will not record this call.'} I saw you were looking at the ${st.l?.product || 'Sleep Company range'}. Is this a good time to talk for a minute?`;
    next.h = [['ai', opener]];
    if (ok) await pushEvent(sid, { t: 'line', who: 'ai', text: opener });
    return out(listen(opener, next));
  }

  // talk
  if (!heard) {
    const sil = (st.sil || 0) + 1;
    if (sil >= 2) return out(`${say('Sorry, I could not hear you. I will try again another time. Goodbye!')}<Hangup/>`);
    return out(listen('Sorry, I did not catch that. Are you still there?', { ...st, sil }));
  }
  await log({ t: 'line', who: 'cust', text: heard });
  const history = [...(st.h || []), ['cust', heard]];
  const turn = (st.n || 0) + 1;
  const ai = await avaniReply(history.map(([role, text]) => ({ role, text })), st.l || {});
  let reply = ai.reply || fallbackReply(heard, turn, st.l || {});
  const ending = /\[END\]/i.test(reply) || turn >= 10;
  reply = reply.replace(/\[END\]/gi, '').trim() || 'Thank you for your time. Goodbye!';
  await log({ t: 'line', who: 'ai', text: reply, src: ai.reply ? 'gemini' : 'fallback' });
  if (ending) return out(`${say(reply)}<Hangup/>`);
  const trimmed = [...history, ['ai', reply]].slice(-8).map(([r, t]) => [r, String(t).slice(0, 220)]);
  return out(listen(reply, { ...st, n: turn, sil: 0, h: trimmed }));
}
