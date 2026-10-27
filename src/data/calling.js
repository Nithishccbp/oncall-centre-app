// Sample data + small helpers for the calling experience (consent, transcript, AI Assist, wrap-up).
import { formatINR } from './selectors.js';
import { sopChecklist } from './calls.js';

export const leadMeta = (lead) => {
  if (!lead) return { phone: '+91 98000 00000', mrp: 0, idealEmi: 0 };
  // 80% home loan, 20 years at 8.5% -> about Rs 868 per lakh per month
  return { phone: lead.phone || '+91 98000 00000', mrp: lead.price + 350000, idealEmi: Math.round((lead.price * 0.8 / 100000) * 868) };
};

export const pitchFor = (lead) => {
  const first = lead.name.split(' ')[0];
  return `"${first}, based on what you told us, the ${lead.product} is the right fit — possession is December 2028 and the project is RERA registered, so there is no risk. If budget matters, we can line up a home-loan EMI with HDFC pre-approval."`;
};

export const sopCheckpoints = ['Quotation Demanded', 'Financing Related', 'Project Related', 'Warranty Related', 'In-Store Experience Needed'];
const idleNote = {
  'Quotation Demanded': 'No cost sheet requested yet',
  'Financing Related': 'No finance questions so far',
  'Project Related': 'No open questions on unit or layout',
  'Warranty Related': 'Mention possession date and RERA proactively',
  'In-Store Experience Needed': 'Has not asked for a site visit yet',
};
export const checkpointsFor = (lead) => sopCheckpoints.map((c) => {
  const s = lead?.signals.find((x) => x.category === c);
  return { category: c, relevant: !!s, text: s ? s.quote : idleNote[c] };
});

/* ---------- Consent (DPDP-style) ---------- */
export const consentLanguages = [
  { id: 'kn', label: 'ಕನ್ನಡ', text: 'ನಾವು ಇದನ್ನು ರೆಕಾರ್ಡ್ ಮಾಡಬಹುದೇ? ನಿಮ್ಮ ಸೇವೆ ಮತ್ತು ಫಾಲೋ-ಅಪ್‌ಗಾಗಿ ಮಾತ್ರ. ನೀವು ಬೇಡ ಎನ್ನಬಹುದು, ಅಥವಾ ಯಾವಾಗ ಬೇಕಾದರೂ ಅಳಿಸಲು ಹೇಳಬಹುದು.' },
  { id: 'hi', label: 'हिन्दी', text: 'क्या हम इसे रिकॉर्ड कर सकते हैं? सिर्फ़ आपकी सेवा और फ़ॉलो-अप के लिए। आप मना कर सकते हैं, या कभी भी इसे मिटाने को कह सकते हैं।' },
  { id: 'en', label: 'English', text: 'Can we record this? Only for your service and follow-up. You can say no, or ask us to delete it any time.' },
];

export const rightsActions = [
  { id: 'see', title: 'See my data', sec: 'Sec 11', icon: 'ti-eye', tone: 'blue' },
  { id: 'fix', title: 'Correct or delete my data', sec: 'Sec 12', icon: 'ti-edit', tone: 'blue' },
  { id: 'complaint', title: 'Make a complaint', sec: 'Sec 13', icon: 'ti-alert-circle', tone: 'orange' },
  { id: 'nominee', title: 'Name someone for me', sec: 'Sec 14', icon: 'ti-user-plus', tone: 'blue' },
  { id: 'withdraw', title: 'Withdraw consent', sec: 'Sec 6', icon: 'ti-hand-stop', tone: 'red' },
];

/* ---------- Live transcript ---------- */
/** Builds a scripted conversation from the lead so every lead gets a believable call. */
export function buildScript(lead, agent = 'Aditi') {
  const first = (lead?.name || 'there').split(' ')[0];
  const product = lead?.product || 'the product';
  const price = lead ? formatINR(lead.price) : '';
  return [
    { who: 'agent', text: `Hi ${first}, this is ${agent} — following up after your enquiry about the ${product}.`, sop: 0 },
    { who: 'cust', text: 'Yes! I liked the sample flat, was just checking when I could move in.', mood: 80, tip: 'possession' },
    { who: 'agent', text: 'Possession is December 2028, RERA registered. Can I confirm you are still looking at the same unit?', sop: 1 },
    { who: 'cust', text: 'Yes, the same one. What is the total cost with parking?', mood: 75 },
    { who: 'agent', text: `For the ${product} it comes to ${price} all-in, including covered parking.`, sop: 2 },
    { who: 'cust', text: 'That works for me, how do I hold it?', mood: 85, drift: true },
    { who: 'agent', text: 'Great! We have a payment plan with HDFC home-loan pre-approval, so the EMI stays comfortable. Possession is December 2028 and the project is RERA registered.', sop: 3 },
    { who: 'cust', text: 'Oh nice, that helps. Please send me the details.', mood: 90 },
    { who: 'agent', text: "I'll send the cost sheet on WhatsApp now and book your site visit for Saturday — does that work?", sop: 5 },
    { who: 'cust', text: 'Yes, Saturday morning is perfect. Thank you!', mood: 92 },
  ];
}

export const sentimentLabel = (v) => (v >= 65 ? 'Positive' : v >= 40 ? 'Neutral' : 'Negative');

/* ---------- Nudges triggered from the DEMO strip ---------- */
export const nudges = {
  unsure: {
    customer: "Hmm, I'm not sure about the recording…",
    title: 'Customer sounds unsure about recording',
    body: 'Reassure them: it is only for service and follow-up, they can say no at any time, and nothing is shared. Offer to turn recording off if they prefer.',
    action: null,
  },
  mydata: {
    customer: 'Can I see what data you have stored about me?',
    title: 'Customer is asking about their data',
    body: 'They have the right to see their data (Sec 11). Open the Rights panel and send the request to the DPO — do not read data out from memory.',
    action: 'rights',
  },
  stop: {
    customer: 'Please stop recording this call.',
    title: 'Customer wants recording to stop',
    body: 'Withdraw consent right now (Sec 6). Recording stops and the withdrawal is logged. You can continue the call without recording.',
    action: 'withdraw',
  },
};

/* ---------- Ask AI knowledge base ---------- */
const kb = [
  { k: ['rera', 'registration'], a: 'Lakeside Towers is RERA registered (PRM/KA/RERA/1251/308/PR/2026). Always quote the number when asked.' },
  { k: ['possession', 'handover', 'move in'], a: 'Possession is December 2028 for Tower A and B. Delay clause: interest as per RERA.' },
  { k: ['emi', 'loan', 'finance', 'monthly'], a: 'HDFC, SBI and ICICI pre-approve for Lakeside. A 20-year loan on ₹98 L is about ₹62,000 a month at 8.5%.' },
  { k: ['payment', 'plan', 'booking', 'token'], a: 'Payment plan: 10% booking, 80% construction-linked, 10% on possession. EOI amount is ₹2 lakh.' },
  { k: ['discount', 'offer', 'price', 'cheaper'], a: 'Festive offer: free covered parking on 2 BHK. Anything beyond that needs sales-head approval.' },
  { k: ['parking', 'kitchen', 'clubhouse', 'cross'], a: 'Best add-ons: covered parking (₹3.5 L), modular kitchen (₹2.8 L), clubhouse membership (₹1.5 L).' },
  { k: ['visit', 'site', 'sample'], a: 'Offer a site visit slot, Saturday and Sunday 10-5 at the Lakeside experience centre.' },
];
export function askAi(question, lead) {
  const q = question.toLowerCase();
  const hit = kb.find((e) => e.k.some((w) => q.includes(w)));
  if (hit) return hit.a;
  return `I couldn't find that in the knowledge base. For ${lead?.name || 'this customer'}, stay on the SOP and offer to confirm by WhatsApp after the call.`;
}

export const quickReplies = [
  { id: 'price', label: 'Send cost sheet on WhatsApp' },
  { id: 'callback', label: 'Offer callback slot', agent: 'Would tomorrow at 6 PM be a good time for me to call you back?', sop: 5 },
  { id: 'rera', label: 'Explain possession & RERA', agent: 'Possession is December 2028 and the project is RERA registered, so you are fully covered.', sop: 4 },
  { id: 'escalate', label: 'Escalate to manager' },
];

/* ---------- Wrap-up ---------- */
export const outcomes = [
  { id: 'interested', label: 'Interested', icon: 'ti-thumb-up', chance: 72 },
  { id: 'followup', label: 'Follow-up needed', icon: 'ti-calendar-event', chance: 55 },
  { id: 'callback', label: 'Requested callback', icon: 'ti-phone-call', chance: 60 },
  { id: 'resolved', label: 'Resolved', icon: 'ti-circle-check', chance: 90 },
  { id: 'notint', label: 'Not interested', icon: 'ti-mood-sad', chance: 8 },
];

export const draftSummary = (lead, lines, sopDone) => {
  const first = (lead?.name || 'the customer').split(' ')[0];
  const covered = sopChecklist.filter((_, i) => sopDone.includes(i)).map((s) => s.toLowerCase());
  const missed = sopChecklist.filter((_, i) => !sopDone.includes(i)).map((s) => s.toLowerCase());
  let t = `Spoke with ${first} about the ${lead?.product || 'product'}. `;
  t += lines.some((l) => l.who === 'cust' && /go ahead|works for me/i.test(l.text)) ? 'Customer was positive and ready to proceed. ' : 'Customer asked a few questions. ';
  if (covered.length) t += `Covered: ${covered.join(', ')}. `;
  if (missed.length) t += `Not covered: ${missed.join(', ')}. `;
  t += 'Next step: send the cost sheet on WhatsApp and follow up.';
  return t;
};

/* ---------- Notifications / overlays ---------- */
export const notifications = [
  { id: 'n1', icon: '☎️', kind: 'action', time: '2:05pm', text: 'Sunita Rao is checking greeting-QA scores Friday — reply in #callcentre-team', link: { label: 'Open #callcentre-team →', to: '/pulse/callcentre-team' } },
  { id: 'n2', icon: '🎯', kind: 'action', time: 'Today', text: 'Skill Improvement Coach is waiting on you to pick a skill to practice', link: { label: 'Open Skill Improvement Coach →', to: '/pulse/avani-coaching' } },
  { id: 'n3', icon: '🌟', kind: 'alert', time: '1:05pm', text: 'Your EMI-pitch rate hit 55% this shift — target met, nice work' },
  { id: 'n4', icon: '🏆', kind: 'alert', time: 'Yesterday', text: 'You hit a 7-day SOP streak — kudos sent automatically' },
  { id: 'n5', icon: '📞', kind: 'action', time: '11:40am', text: "1 callback still open from this morning's queue", link: { label: 'Open queue →', to: '/plan/incoming' } },
  { id: 'n6', icon: '📈', kind: 'alert', time: 'Mon 8:00am', text: 'Weekly call-quality summary was sent to your registered number' },
  { id: 'n7', icon: '📦', kind: 'alert', time: 'Sun', text: 'Tower A shipment for RT Nagar is ready for possession', link: { label: 'Open #manage-shipment →', to: '/pulse/manage-shipment' } },
  { id: 'n8', icon: '🎫', kind: 'action', time: 'Sat', text: 'Cost sheet approval for Mukunda R. is still awaiting approval', link: { label: 'Open #quotation-tickets →', to: '/pulse/quotation-tickets' } },
];

export const rankBreakdown = [
  { icon: '🏆', label: 'OG Score™', value: '76', weight: 40, pct: 76 },
  { icon: '📞', label: 'Leads Called', value: '2', weight: 20, pct: 40 },
  { icon: '🎯', label: 'Leads Created', value: '3', weight: 15, pct: 60 },
  { icon: '⏱️', label: 'Conversation Time', value: '62m', weight: 15, pct: 78 },
  { icon: '🚚', label: 'On-time Possession', value: '92%', weight: 10, pct: 92 },
];

export const avatars = [
  { id: 'captain', emoji: '🦸‍♂️', name: 'Captain' },
  { id: 'valkyrie', emoji: '🦸‍♀️', name: 'Valkyrie' },
  { id: 'vortex', emoji: '🦹‍♀️', name: 'Vortex' },
  { id: 'blaze', emoji: '🦹‍♂️', name: 'Blaze' },
  { id: 'shadow', emoji: '🥷', name: 'Shadow' },
];

export const languages = [
  ['English', 'English'], ['हिन्दी', 'Hindi'], ['বাংলা', 'Bengali'], ['मराठी', 'Marathi'], ['తెలుగు', 'Telugu'],
  ['தமிழ்', 'Tamil'], ['ગુજરાતી', 'Gujarati'], ['اردو', 'Urdu'], ['ಕನ್ನಡ', 'Kannada'],
];

export const customerThreads = [
  { id: 'cd-mukunda', name: 'Mukunda', initials: 'MK', wa: true, preview: 'Cost sheet for Tower A 2 BHK sent · awaiting reply', time: '2:40pm', unread: 1, bg: '#e1f5ee', color: '#0f6e56' },
  { id: 'cd-kavitha', name: 'Kavitha R.', initials: 'KR', wa: true, preview: 'When can I come see the hybrid home?', time: '11:15am', unread: 2, bg: '#fff8e1', color: '#c8860a' },
  { id: 'cd-ali', name: 'Ali', initials: 'AL', missed: true, preview: 'Called 9:40am · not returned yet', bg: '#fdecec', color: '#e24b4a' },
];

/* ---------- Real calls: turn live speech into SOP ticks + sentiment ---------- */
const sopPatterns = [
  /(this is|calling from|calling about|following up|speaking|is this a good time|am i speaking)/i,
  /(what matters|looking for|budget|need|prefer|size|room|who is it for|tell me)/i,
  /(tower|bhk|unit|flat|project|floor|amenit|club|feature|recommend|layout|parking)/i,
  /(\bemi\b|instal|no[- ]cost|per month|monthly|finance)/i,
  /(possession|rera|handover|payment plan|guarantee)/i,
  /(call you back|callback|follow up|cost sheet|book|tomorrow|send you|whatsapp|confirm)/i,
];
/** Which SOP step (0-5) does this sentence cover? undefined if none. Returns the first not-yet-done match preference. */
export const detectSopSteps = (text) => sopPatterns.map((re, i) => (re.test(text) ? i : -1)).filter((i) => i >= 0);

export const moodOf = (text) => {
  if (/(thank|great|good|yes|love|perfect|nice|sure|sounds|okay|ok\b|interested|go ahead)/i.test(text)) return 85;
  if (/(no\b|not\b|stop|expensive|bad|angry|problem|cancel|don't|dont|too much)/i.test(text)) return 35;
  return 62;
};
