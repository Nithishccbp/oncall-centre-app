// Web test line: the customer page asks for Avani's next sentence here. (Phone AI calls use api/ai-voice.js.)
import { avaniReply, customerReply, coachTurn, extractNotes, rateCall, reviewCall, speakText } from './_lib/ai.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });
  const { messages = [], lead = {}, role, persona, mood } = req.body || {};
  if (role === 'customer') return res.status(200).json(await customerReply(Array.isArray(messages) ? messages : [], persona || {}, String(mood || ''))); // call practice: the AI plays the customer
  if (role === 'notes') return res.status(200).json(await extractNotes(Array.isArray(messages) ? messages : [])); // CRM notes pulled from a real call
  if (role === 'coach') return res.status(200).json(await coachTurn(Array.isArray(messages) ? messages : [], persona || {}, String(mood || ''), Number(req.body?.trust) || 50)); // live whisper + trust change
  if (role === 'tts') return res.status(200).json(await speakText(String(req.body?.text || ''), String(req.body?.voice || 'Kore'), String(req.body?.style || ''))); // natural voice for practice calls
  if (role === 'review') return res.status(200).json(await reviewCall(Array.isArray(messages) ? messages : [], persona || {}, String(mood || ''))); // practice review
  if (role === 'csat') return res.status(200).json(await rateCall(Array.isArray(messages) ? messages : [])); // customer satisfaction read from the real call
  const out = await avaniReply(messages, lead);
  return res.status(200).json(out);
}
