// Conversation ingest: validate, normalise, derive missing fields (SOP, signals, outcome, tags) and say where it lands.
const STEPS = [
  ['opening', 'Opening & Intent Confirm', /(this is|calling from|calling about|following up|speaking|good time|am i speaking|namaste|hello)/i],
  ['needs', 'Needs Discovery', /(what matters|looking for|budget|need|prefer|size|bhk|who is it for|tell me|timeline)/i],
  ['walkthrough', 'Project Walkthrough', /(tower|bhk|unit|flat|project|floor|amenit|clubhouse|layout|parking|school|park)/i],
  ['loan', 'Loan / Payment Plan', /(\bemi\b|loan|payment plan|per month|monthly|hdfc|sbi|icici|finance|construction[- ]linked)/i],
  ['possession', 'Possession & RERA', /(possession|rera|handover|2028|registered)/i],
  ['visit', 'Site Visit Booking', /(site visit|visit|saturday|sunday|book you|slot|come and see|sample flat)/i],
];
const SIGNALS = [
  ['Financing Related', /(\bemi\b|loan|finance|budget|payment plan|hdfc|sbi|icici)/i],
  ['Quotation Demanded', /(cost sheet|quote|quotation|total cost|all-in|price list)/i],
  ['Project Related', /(tower|bhk|unit|floor|layout|facing|amenit|school)/i],
  ['Warranty Related', /(possession|rera|handover|delay)/i],
  ['In-Store Experience Needed', /(site visit|visit|sample flat|come and see|revisit)/i],
];
const OUTCOMES = ['interested', 'followup', 'callback', 'resolved', 'notinterested'];

export const digits = (p) => String(p || '').replace(/\D/g, '').slice(-10);
const clean = (v, n = 4000) => (v == null ? undefined : String(v).slice(0, n));
const num = (v) => (v === undefined || v === null || v === '' || Number.isNaN(Number(v)) ? undefined : Number(v));

export function validate(b) {
  const errs = [];
  if (!b || typeof b !== 'object') return ['body must be a JSON object'];
  if (!b.conversation_id || !/^[\w.:-]{6,80}$/.test(String(b.conversation_id))) errs.push('conversation_id is required (6-80 chars: letters, digits . _ : -)');
  if (!b.source) errs.push('source is required');
  if (!['call', 'walkin', 'field_visit', 'whatsapp'].includes(b.type)) errs.push('type must be call | walkin | field_visit | whatsapp');
  if (b.type === 'call' && !['in', 'out', 'missed'].includes(b.direction)) errs.push('direction must be in | out | missed for calls');
  if (!b.agent || !(b.agent.employee_id || b.agent.email)) errs.push('agent.employee_id or agent.email is required');
  if (!b.customer || !(b.customer.phone || b.customer.crm_id || b.customer.name)) errs.push('customer.phone (preferred), customer.crm_id or customer.name is required');
  if (b.customer?.phone && digits(b.customer.phone).length < 10) errs.push('customer.phone looks too short');
  if (!b.started_at || Number.isNaN(Date.parse(b.started_at))) errs.push('started_at must be an ISO-8601 timestamp');
  if (Array.isArray(b.transcript) && b.transcript.some((t) => !t || !t.text)) errs.push('every transcript item needs text');
  return errs;
}

export function normalise(b, now = new Date()) {
  const transcript = (Array.isArray(b.transcript) ? b.transcript : []).slice(0, 2000).map((t) => ({ speaker: t.speaker === 'customer' ? 'customer' : 'agent', text: clean(t.text, 1500), t: num(t.t) }));
  const text = transcript.map((t) => t.text).join(' ');
  const agentText = transcript.filter((t) => t.speaker === 'agent').map((t) => t.text).join(' ') || text;
  const consent = b.consent?.status || (transcript.length ? 'recorded' : 'none');
  const usable = consent !== 'declined' && consent !== 'withdrawn';

  // SOP: use what the backend sent, else detect from the agent's words (only when consent allows)
  let sop = Array.isArray(b.sop) && b.sop.length
    ? STEPS.map(([id, label]) => { const r = b.sop.find((x) => x.step === id); return { step: id, label, passed: !!r?.passed, quote: clean(r?.quote, 300) || (r?.passed ? 'Covered.' : 'Not covered.') }; })
    : STEPS.map(([id, label, re]) => {
      const hit = usable && transcript.find((t) => t.speaker === 'agent' && re.test(t.text));
      return { step: id, label, passed: !!hit, quote: hit ? `"${hit.text.slice(0, 140)}"` : 'Not covered on this call.' };
    });
  if (b.type === 'whatsapp' || b.direction === 'missed') sop = [];
  const sopScore = sop.length ? Math.round((sop.filter((s) => s.passed).length / sop.length) * 100) : undefined;

  const signals = Array.isArray(b.signals) && b.signals.length
    ? b.signals.slice(0, 8).map((s) => ({ category: clean(s.category, 60), quote: clean(s.quote, 300) }))
    : (usable ? SIGNALS.map(([c, re]) => { const t = transcript.find((x) => x.speaker === 'customer' && re.test(x.text)); return t && { category: c, quote: t.text.slice(0, 200) }; }).filter(Boolean) : []);

  let outcome = OUTCOMES.includes(b.outcome) ? b.outcome : undefined;
  if (!outcome && b.direction === 'missed') outcome = 'callback';
  if (!outcome && b.follow_up) outcome = b.follow_up.type === 'callback' ? 'callback' : 'followup';
  if (!outcome && /not interested|stop calling|no thanks/i.test(text)) outcome = 'notinterested';
  if (!outcome && usable && /(go ahead|works for me|book|hold it|sounds good)/i.test(text)) outcome = 'interested';

  const durationSec = num(b.duration_sec) ?? (b.ended_at ? Math.max(0, Math.round((Date.parse(b.ended_at) - Date.parse(b.started_at)) / 1000)) : 0);
  const conv = {
    conversation_id: String(b.conversation_id), source: clean(b.source, 60), type: b.type, direction: b.direction,
    vertical: clean(b.vertical, 40) || 'real-estate', tenant: clean(b.tenant, 60), project_code: clean(b.project_code, 60),
    started_at: new Date(b.started_at).toISOString(), ended_at: b.ended_at ? new Date(b.ended_at).toISOString() : undefined, duration_sec: durationSec,
    language: clean(b.language, 12),
    agent: { employee_id: clean(b.agent.employee_id, 40), name: clean(b.agent.name, 80), email: clean(b.agent.email, 120) },
    customer: { phone: clean(b.customer.phone, 20), name: clean(b.customer.name, 80), crm_id: clean(b.customer.crm_id, 40), lead_id: clean(b.customer.lead_id, 40) },
    consent: { status: consent, captured_at: clean(b.consent?.captured_at, 40), proof_ref: clean(b.consent?.proof_ref, 200) },
    transcript: usable ? transcript : [], audio_url: usable ? clean(b.audio_url, 500) : undefined,
    summary: clean(b.summary, 1500) || (usable && agentText ? agentText.slice(0, 220) : ''),
    outcome, csat: num(b.csat) >= 1 && num(b.csat) <= 5 ? Math.round(num(b.csat)) : undefined,
    sop, sop_score: sopScore, signals,
    interest: b.interest ? { product: clean(b.interest.product, 120), price: num(b.interest.price), cross_sell: clean(b.interest.cross_sell, 120) } : undefined,
    scores: b.scores ? { icp: num(b.scores.icp), intent: num(b.scores.intent) } : undefined,
    follow_up: b.follow_up?.at && !Number.isNaN(Date.parse(b.follow_up.at)) ? { type: b.follow_up.type === 'callback' ? 'callback' : 'site_visit', at: new Date(b.follow_up.at).toISOString(), title: clean(b.follow_up.title, 120) } : undefined,
    received_at: now.toISOString(),
  };
  const { tags, landed } = route(conv, Array.isArray(b.tags) ? b.tags.map((t) => clean(t, 60)).filter(Boolean) : []);
  conv.tags = tags; conv.landed = landed;
  return conv;
}

/** Tags drive where a conversation shows up. The backend may send its own tags; we add the derived ones. */
export function route(c, given = []) {
  const v = (c.vertical || 'real-estate').replace(/[^a-z]/gi, '');
  const tags = new Set(given);
  tags.add(`og.vertical.${v}`); tags.add(`og.channel.${c.type === 'call' ? `call-${c.direction}` : c.type}`);
  tags.add(`og.consent.${c.consent.status}`);
  if (c.outcome) tags.add(`og.outcome.${c.outcome}`);
  c.signals.forEach((s) => tags.add(`og.signal.${s.category.toLowerCase().replace(/ related| demanded| needed/g, '').replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '')}`));
  c.sop.filter((s) => !s.passed).forEach((s) => tags.add(`og.sop-missed.${s.step}`));
  if (c.follow_up) tags.add(`og.followup.${c.follow_up.type}`);
  const landed = [];
  const hasPerson = c.customer.phone || c.customer.crm_id || c.customer.name;
  if (hasPerson) { tags.add(`og.lead.${v}`); landed.push({ surface: 'leads', where: 'Leads modal and Plan > Calls to make', action: c.customer.lead_id ? 'update' : 'create-or-update' }); }
  if (c.type === 'call') landed.push({ surface: c.direction === 'missed' ? 'incoming' : 'recent_calls', where: c.direction === 'missed' ? 'Plan > Incoming (missed calls ranked by value)' : 'Plan > Recent, with SOP review popup' });
  if (c.type === 'call' && c.direction !== 'missed') landed.push({ surface: 'dashboard', where: "Today's calls, calls handled, CSAT, leads called" });
  if (c.sop.length) landed.push({ surface: 'sop_agent', where: 'Pulse > #sop-agent (adherence) and Avani > Assess "weak areas"' });
  if (c.follow_up) landed.push({ surface: 'calendar', where: 'Calendar > Upcoming' });
  if (c.type === 'whatsapp') landed.push({ surface: 'customer_discussions', where: 'Pulse > #customer-discussions' });
  if (c.interest?.cross_sell || c.signals.some((s) => /Quotation/.test(s.category))) landed.push({ surface: 'cross_sell_agent', where: 'Pulse > #cross-sell-agent' });
  return { tags: [...tags], landed };
}
