// Derived data: nothing here is hard-coded twice.
import { leads, leadByFirstName } from './leads.js';

/** Leads to call today, best score first. */
export const getOutgoingPlan = () => [...leads].sort((a, b) => b.score - a.score);

/** Missed calls joined to leads, ranked by expected value (Incoming screen). */
export function getMissedCallsWithValue(calls) {
  return calls
    .filter((c) => c.dir === 'missed' && !c.handled)
    .map((call) => {
      const lead = leadByFirstName(call.name) || null;
      return { call, lead, value: lead ? lead.expectedValue : 0 };
    })
    .sort((a, b) => b.value - a.value);
}

/** Label describing how warm a lead is, from its ICP score. */
export const signalFor = (lead) => {
  if (!lead) return 'No prior record';
  if (lead.icp >= 80) return 'Visited experience centre / in CRM';
  return lead.icp >= 55 ? 'Warm lead' : 'Cold lead';
};

export const formatINR = (n) => {
  const v = Number(n);
  if (v >= 1e7) return '₹' + (v / 1e7).toFixed(2).replace(/\.?0+$/, '') + ' Cr';
  if (v >= 1e5) return '₹' + (v / 1e5).toFixed(v % 1e5 ? 1 : 0).replace(/\.0$/, '') + ' L';
  return '₹' + v.toLocaleString('en-IN');
};
