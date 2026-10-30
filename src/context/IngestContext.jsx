// Pulls conversations that the recorder app pushed to /api/ingest/* and lands them in Leads, Recent, Dashboard, Calendar and Pulse.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { leads } from '../data/leads.js';
import { customerThreads } from '../data/calling.js';
import { useCall } from './CallContext.jsx';
import { usePulse } from './PulseContext.jsx';

const Ctx = createContext({ version: 0, convs: [], todays: [], handledToday: 0, csatToday: null, followUps: [], weak: [] });
const applied = new Set();
const dig = (p) => String(p || '').replace(/\D/g, '').slice(-10);
const fmtDur = (s) => `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
const hhmm = (iso, sep = ':') => { const d = new Date(iso); return `${String(d.getHours()).padStart(2, '0')}${sep}${String(d.getMinutes()).padStart(2, '0')}`; };
const sameDay = (iso) => new Date(iso).toDateString() === new Date().toDateString();
const when = (iso) => (sameDay(iso) ? `Today ${hhmm(iso)}` : new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }));
const chan = { call: ['Voice call', '📞'], walkin: ['Walk-in', '📍'], field_visit: ['Field visit', '📍'], whatsapp: ['WhatsApp', '💬'] };
const outcomeLabel = { interested: 'Interested', followup: 'Follow-up needed', callback: 'Callback requested', resolved: 'Resolved', notinterested: 'Not interested' };
const shortDate = (iso) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

function findLead(c) {
  const p = dig(c.customer.phone);
  return leads.find((l) => (c.customer.lead_id && l.id === c.customer.lead_id)
    || (p && dig(l.phone) === p) || (!p && c.customer.name && l.name.toLowerCase().startsWith(c.customer.name.toLowerCase().split(' ')[0])));
}

/** Merge one conversation into the lead list (mutates `leads`, which every screen reads). */
function landLead(c) {
  let lead = findLead(c);
  const [channel, icon] = chan[c.type] || chan.call;
  const entry = { date: shortDate(c.started_at), channel, icon, text: c.summary || `${channel} with ${c.customer.name || 'customer'}` };
  if (!lead) {
    const name = c.customer.name || `Lead ${dig(c.customer.phone).slice(-4)}`;
    lead = {
      id: `ing-${dig(c.customer.phone) || c.conversation_id}`, name, initials: name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase(), avatarBg: '#e8f0fe', avatarColor: '#185fa5',
      product: c.interest?.product || 'Project enquiry', price: c.interest?.price || 0, interest: `Interested: ${c.interest?.product || 'Project enquiry'}`,
      crossSell: c.interest?.cross_sell || 'Covered parking', emiNote: 'Not discussed yet, share the payment plan early', story: entry.text,
      status: 'Open', score: c.scores?.intent || 60, icp: c.scores?.icp || 60, intent: c.scores?.intent || 60, expectedValue: c.interest?.price || 0, slaLeft: 'New lead',
      actionNote: 'New from conversation', phone: c.customer.phone || '', icpBreakdown: [{ label: 'Budget Fit', pct: c.scores?.icp || 60 }, { label: 'Need Match', pct: 60 }, { label: 'Decision Stage', pct: 50 }],
      journey: [], signals: [], notes: [], cumulativeMissed: 0, ingested: true,
    };
    leads.unshift(lead);
  }
  lead.journey = [...lead.journey, entry].slice(-8);
  c.signals.forEach((s) => { lead.signals = [...lead.signals.filter((x) => x.category !== s.category), s]; });
  if (c.interest?.product) { lead.product = c.interest.product; lead.interest = `Interested: ${c.interest.product}`; }
  if (c.interest?.price) { lead.price = c.interest.price; lead.expectedValue = c.interest.price; }
  if (c.interest?.cross_sell) lead.crossSell = c.interest.cross_sell;
  if (c.scores?.icp != null) lead.icp = c.scores.icp;
  if (c.scores?.intent != null) { lead.intent = c.scores.intent; lead.score = c.scores.intent; }
  if (c.summary) lead.notes = [c.summary, ...lead.notes.filter((n) => n !== c.summary)].slice(0, 4);
  if (c.outcome === 'notinterested') lead.status = 'Cold';
  lead.slaLeft = c.follow_up ? `${c.follow_up.type === 'callback' ? 'Callback' : 'Visit'} ${shortDate(c.follow_up.at)}` : lead.slaLeft;
}

export function IngestProvider({ children }) {
  const { mergeRecent } = useCall();
  const { upsertThread } = usePulse();
  const [state, setState] = useState({ version: 0, convs: [] });
  const busy = useRef(false);

  const pull = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      const r = await fetch('/api/conversations?limit=100', { cache: 'no-store' });
      if (!r.ok || !(r.headers.get('content-type') || '').includes('json')) return;
      const { conversations = [] } = await r.json();
      const fresh = conversations.filter((c) => !applied.has(c.conversation_id)).sort((a, b) => a.started_at.localeCompare(b.started_at));
      fresh.forEach((c) => {
        applied.add(c.conversation_id);
        landLead(c);
        if (c.type === 'whatsapp') {
          const id = `cd-${dig(c.customer.phone) || c.conversation_id}`;
          const name = c.customer.name || 'Customer';
          if (!customerThreads.some((t) => t.id === id)) customerThreads.unshift({ id, name, initials: name.slice(0, 2).toUpperCase(), wa: true, preview: c.summary || 'New WhatsApp conversation', time: hhmm(c.started_at), unread: 1, bg: '#e8f0fe', color: '#185fa5' });
          upsertThread(id, { title: `${name} · WhatsApp`, dateLabel: 'Today · WhatsApp Business', messages: c.transcript.map((t, i) => ({ id: `${id}-${i}`, who: t.speaker === 'customer' ? `Customer · ${name}` : 'You', initials: t.speaker === 'customer' ? name.slice(0, 2).toUpperCase() : 'AR', mine: t.speaker !== 'customer', bg: '#e8f0fe', color: '#185fa5', text: t.text, time: hhmm(c.started_at) })) });
        }
      });
      if (fresh.length) {
        mergeRecent(conversations.filter((c) => c.type === 'call').map((c) => ({
          id: `ing-${c.conversation_id}`, dir: c.direction, name: c.customer.name || c.customer.phone || 'Unknown', time: when(c.started_at),
          duration: c.direction === 'missed' ? '—' : fmtDur(c.duration_sec || 0), summary: c.summary, ingested: true, handled: c.direction === 'missed' ? false : undefined,
          review: c.sop.length ? { score: c.sop_score, items: c.sop.map((s) => ({ label: s.label, passed: s.passed, quote: s.quote })) } : null,
        })));
      }
      setState((s) => ({ version: s.version + (fresh.length ? 1 : 0), convs: conversations }));
    } catch { /* offline or no /api: the app keeps working with its sample data */ } finally { busy.current = false; }
  }, [mergeRecent, upsertThread]);

  useEffect(() => { pull(); const t = setInterval(pull, 30000); return () => clearInterval(t); }, [pull]);

  const value = useMemo(() => {
    const today = state.convs.filter((c) => c.type === 'call' && c.direction !== 'missed' && sameDay(c.started_at));
    const missedSteps = {};
    state.convs.forEach((c) => c.sop.filter((s) => !s.passed).forEach((s) => { missedSteps[s.label] = (missedSteps[s.label] || 0) + 1; }));
    const rated = today.filter((c) => c.csat);
    return {
      version: state.version, convs: state.convs, refresh: pull,
      todays: today.map((c) => ({ time: hhmm(c.started_at), name: c.customer.name || 'Customer', topic: `${outcomeLabel[c.outcome] || 'Call'} · ${fmtDur(c.duration_sec || 0)}`, stars: c.csat || 4 })).reverse(),
      ratedToday: rated.map((c) => ({ time: hhmm(c.started_at), name: c.customer.name || 'Customer', stars: c.csat, comment: c.csat_comment || '' })),
      week: Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i));
        const list = state.convs.filter((c) => c.type === 'call' && c.direction !== 'missed' && new Date(c.started_at).toDateString() === d.toDateString());
        return { day: i === 6 ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'short' }), calls: list.length, aht: list.length ? Math.round(list.reduce((n, c) => n + (c.duration_sec || 0), 0) / list.length) : 0 };
      }),
      handledToday: today.length, csatToday: rated.length ? Math.round((rated.reduce((n, c) => n + c.csat, 0) / rated.length) * 20) : null,
      followUps: state.convs.filter((c) => c.follow_up).map((c) => ({ id: `ev-${c.conversation_id}`, date: c.follow_up.at.slice(0, 10), time: new Date(c.follow_up.at).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase(), title: c.follow_up.title || (c.follow_up.type === 'callback' ? `Callback · ${c.customer.name}` : `Site visit · ${c.customer.name}`), who: `With ${c.customer.name || 'customer'} · from conversation ${c.conversation_id}` })),
      weak: Object.entries(missedSteps).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([label, n]) => ({ label, n })),
    };
  }, [state, pull]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useIngest = () => useContext(Ctx);
