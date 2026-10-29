// One function for telephony (Vercel Hobby allows 12). vercel.json maps /api/config and /api/telephony/:op here.
//  config (GET)  save (POST: connect brand / numbers / caller ID)  disconnect (POST)  call (POST)  status (GET)  hangup (POST)  answer (Vobiz answer_url, XML)
import { phoneReady, phoneMode, aiPhoneReady, env, allowed, baseUrl } from './_lib/twilio.js';
import { vonageReady } from './_lib/vonage.js';
import { storeReady } from './_lib/store.js';
import { loadCfg, saveCfg, clearCfg, telConfig, adapterFor, answerXml, toE164, cidOf, logEvent, getCtx, setCtx } from './_lib/telephony.js';
import crypto from 'node:crypto';

const clean = (v, n = 200) => String(v ?? '').trim().slice(0, n);

export default async function handler(req, res) {
  const op = String(req.query?.op || 'config');
  const ref = String(req.query?.ref || '').replace(/[^a-f0-9]/g, '').slice(0, 32);
  if (op === 'answer') {
    const ctx = ref ? await getCtx(ref) : null;
    const to = toE164(ctx?.to); const cid = toE164(ctx?.cid);
    if (ref) await logEvent(ref, 'answer', JSON.stringify(req.body || req.query || {}).slice(0, 300));
    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send(to && cid ? answerXml(to, cid, baseUrl(req), ref) : '<?xml version="1.0"?><Response><Speak>Sorry, this call could not be connected.</Speak><Hangup/></Response>');
  }
  if (op === 'hook') {
    const ev = String(req.query?.ev || 'event').replace(/[^a-z]/g, '').slice(0, 20);
    if (ref) await logEvent(ref, ev, JSON.stringify(typeof req.body === 'string' ? req.body : { ...(req.body || {}), ...(ev === 'dial' || ev === 'dialresult' ? {} : {}) }).slice(0, 400));
    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  }
  const cfg = await loadCfg(); const tel = telConfig(cfg);
  if (op === 'config') {
    const vonage = vonageReady();
    return res.status(200).json({
      phone: phoneReady(), phoneMode: phoneMode(), aiPhone: vonage || aiPhoneReady(),
      provider: vonage ? 'vonage' : (aiPhoneReady() ? 'twilio' : 'none'),
      vonageVariablesFound: !!(process.env.VONAGE_APPLICATION_ID || process.env.VONAGE_PRIVATE_KEY),
      transcripts: storeReady(), gemini: !!process.env.GEMINI_API_KEY, passcode: !!env().passcode,
      telephony: { ...tel, canSave: storeReady() }, staffPhone: tel.ready,
    });
  }
  if (!allowed(req)) return res.status(401).json({ error: 'passcode' });
  if (op === 'status' || req.method !== 'POST') {
    if (op !== 'status') return res.status(405).json({ error: 'Use POST' });
    const a = adapterFor(cfg); if (!a || !tel.ready) return res.status(503).json({ error: 'Telephony is not connected.' });
    return res.status(200).json(await a.status(cfg, String(req.query?.id || '')).catch((e) => ({ status: 'unknown', detail: e.message })));
  }
  const b = req.body || {};
  if (op === 'disconnect') { await clearCfg(); return res.status(200).json({ ok: true }); }
  if (op === 'save') {
    const patch = {};
    if (b.provider) { if (!['vobiz', 'exotel', 'ozonetel'].includes(b.provider)) return res.status(400).json({ error: 'Choose Vobiz, Exotel or Ozonetel.' }); patch.provider = b.provider; }
    for (const p of ['vobiz', 'exotel', 'ozonetel']) if (b[p]) patch[p] = Object.fromEntries(Object.entries(b[p]).filter(([, v]) => String(v || '').trim()).map(([k, v]) => [k, clean(v)]));
    if (Array.isArray(b.dids)) patch.dids = [...new Set(b.dids.map((d) => toE164(d)).filter(Boolean))].slice(0, 20);
    if (b.callerId !== undefined) { const c = b.callerId ? toE164(b.callerId) : ''; if (b.callerId && !c) return res.status(400).json({ error: 'That caller ID number does not look right (use +91…).' }); patch.callerId = c; }
    try {
      const cand = { ...cfg, ...patch, vobiz: { ...cfg.vobiz, ...patch.vobiz }, exotel: { ...cfg.exotel, ...patch.exotel }, ozonetel: { ...cfg.ozonetel, ...patch.ozonetel } };
      if (patch.provider || patch.vobiz || patch.exotel || patch.ozonetel) {
        const a = adapterFor(cand);
        const t = telConfig(cand); if (t.missing.some((m) => m !== 'Caller ID number')) return res.status(400).json({ error: `Fill in: ${t.missing.join(', ')}.` });
        const bad = await a.verify(cand).catch(() => ''); if (bad) return res.status(422).json({ error: bad });
      }
      const saved = await saveCfg(patch);
      return res.status(200).json({ ok: true, telephony: { ...telConfig({ ...saved, saved: true }), canSave: true } });
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }
  const a = adapterFor(cfg);
  if (!a || !tel.ready) return res.status(503).json({ error: `Calling provider is not connected yet (missing: ${tel.missing.join(', ')}). Open Settings > Telephony and connect it.`, telephony: tel });
  if (op === 'hangup') { await a.hangup(cfg, String(b.id || '')).catch(() => {}); return res.status(200).json({ ok: true }); }
  if (op === 'call') {
    const to = toE164(b.to); const agentPhone = toE164(b.agentPhone);
    if (!to) return res.status(400).json({ error: 'The customer phone number does not look right.' });
    if (agentPhone && agentPhone === to) return res.status(400).json({ error: 'The customer number is the same as YOUR number. The provider rings you first, so the second call finds your phone busy and the call ends. Use a different phone for the customer.' });
    if (agentPhone && agentPhone === toE164(cfg.callerId)) return res.status(400).json({ error: 'Your phone number is the same as the brand caller ID number. Enter your own mobile number.' });
    if (!agentPhone && cfg.provider !== 'ozonetel') return res.status(400).json({ error: 'Enter YOUR phone number first (the provider rings you, then connects the customer).' });
    if (cfg.provider === 'vobiz' && !storeReady()) return res.status(503).json({ error: 'Vobiz calling needs the Upstash storage connected in Vercel (Storage tab).' });
    const base = baseUrl(req); const callRef = crypto.randomBytes(8).toString('hex');
    if (cfg.provider === 'vobiz') await setCtx(callRef, { to, cid: cidOf(cfg), agentPhone });
    const urls = { answer: `${base}/api/telephony/answer/${callRef}`, ring: `${base}/api/telephony/hook/${callRef}/ring`, hangup: `${base}/api/telephony/hook/${callRef}/hangup` };
    const r = await a.start(cfg, { agentPhone, to, urls, ref: callRef, agentId: clean(b.agentId, 40) }).catch((e) => ({ ok: false, error: e.message }));
    return r.ok ? res.status(200).json({ id: r.id, provider: cfg.provider }) : res.status(502).json({ error: `${cfg.provider}: ${r.error}` });
  }
  return res.status(404).json({ error: 'unknown op' });
}
