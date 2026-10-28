// "Before you talk to X" brief (Avani, 20 seconds) and the rich lead brief shown in AI Assist.
import prepData from './prep.json';
import { formatINR } from './selectors.js';
import { leadMeta } from './calling.js';

export function prepFor(lead) {
  if (!lead) return null;
  const p = prepData[lead.name] || prepData[`${lead.name} R.`] || {};
  const last = lead.journey[lead.journey.length - 1];
  return {
    stage: p.stage || `${lead.slaLeft} · ${lead.product}`,
    summary: p.summary || lead.story.split(' → ').slice(-2).join('. '),
    notes: p.notes || lead.notes,
    money: `${formatINR(lead.price)} all-in${lead.emiNote ? ` · ${lead.emiNote}` : ''}`,
    last: p.last || `${last.date} · ${last.channel}, ${last.text}`,
  };
}

export function briefFor(lead) {
  if (!lead) return null;
  const meta = leadMeta(lead);
  const [bud, need] = lead.icpBreakdown;
  return {
    intent: lead.intent,
    intentLabel: lead.intent >= 80 ? 'High' : lead.intent >= 55 ? 'Medium' : 'Low',
    icp: lead.icp,
    fitLine: `${bud.pct}% ${bud.label.toLowerCase()} · ${need.pct}% ${need.label.toLowerCase()}`,
    sell: lead.product, sellLine: `${lead.product} · ${formatINR(lead.price)}`,
    cross: lead.crossSell,
    fin: lead.emiNote, finLine: `${lead.emiNote.split(',')[0]} · ${formatINR(meta.idealEmi)}/mo`,
    cap: lead.notes,
    story: lead.story.split(' → ').join('. ') + '.',
    pts: Math.max(3, Math.round(lead.intent / 13)),
  };
}
