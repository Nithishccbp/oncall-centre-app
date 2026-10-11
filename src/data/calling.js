// Sample data + small helpers for the calling experience (consent, transcript, AI Assist, wrap-up).
import { formatINR } from './selectors.js';
import { sopChecklist } from './calls.js';

/** Extra per-lead details used only by the calling screens. */
const extras = {
  l2: { phone: '98765 43210', mrp: 14490 },
  l4: { phone: '98450 11223', mrp: 29990 },
  l3: { phone: '98860 55012', mrp: 27990 },
  l1: { phone: '98450 61245', mrp: 15990 },
  l5: { phone: '99001 22334', mrp: 20990 },
};

export const leadMeta = (lead) => {
  if (!lead) return { phone: '98000 00000', mrp: 0, idealEmi: 0 };
  const e = extras[lead.id] || { phone: '98000 00000', mrp: lead.price };
  return { ...e, idealEmi: Math.round(lead.price / 12) };
};

export const pitchFor = (lead) => {
  const first = lead.name.split(' ')[0];
  return `"${first}, based on what you told us, the ${lead.product} is the right fit — and it comes with a 10-year warranty and a 100-night trial, so there is no risk. If budget matters, there is a no-cost EMI plan."`;
};

export const sopCheckpoints = ['Quotation Demanded', 'Financing Related', 'Product Related', 'Warranty Related', 'In-Store Experience Needed'];
const idleNote = {
  'Quotation Demanded': 'No quote requested yet',
  'Financing Related': 'No finance questions so far',
  'Product Related': 'No open questions on firmness or fit',
  'Warranty Related': 'Mention the 100-night trial proactively — reduces their risk',
  'In-Store Experience Needed': "Hasn't asked to visit a store yet",
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
    { who: 'cust', text: 'Yes! I loved it, was just checking how soon it could be delivered.', mood: 80, tip: 'delivery' },
    { who: 'agent', text: 'Delivery inside the city is usually 2-3 days — can I check your address is still the one on file?', sop: 1 },
    { who: 'cust', text: 'Yes, same address. What about the total cost with delivery?', mood: 75 },
    { who: 'agent', text: `For the ${product} it comes to ${price} including free delivery and setup.`, sop: 2 },
    { who: 'cust', text: 'That works for me, can we go ahead?', mood: 85, drift: true },
    { who: 'agent', text: 'Great! We also have a 6-month no-cost EMI plan if you would like to spread the payment.', sop: 3 },
    { who: 'cust', text: 'Oh nice, that helps. Please send me the details.', mood: 90 },
    { who: 'agent', text: "I'll send the quote on WhatsApp now and call you back tomorrow to confirm the order — does that work?", sop: 5 },
    { who: 'cust', text: 'Yes, tomorrow evening is perfect. Thank you!', mood: 92 },
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
  { k: ['return', 'refund'], a: '100-night trial: the customer can return the mattress within 100 nights for a full refund — pick-up is free.' },
  { k: ['warranty', 'guarantee'], a: 'All mattresses carry a 10-year warranty against manufacturing defects. Massage chairs: 1-year motor + 3-year frame.' },
  { k: ['emi', 'finance', 'instal', 'monthly'], a: 'No-cost EMI is available for 6 and 12 months on cards from major banks. 12 months works out to price ÷ 12 per month.' },
  { k: ['deliver', 'shipping', 'when'], a: 'Delivery within the city takes 2-3 days; other locations 5-7 days. Setup is free and done by our team.' },
  { k: ['discount', 'offer', 'price', 'cheaper'], a: 'Festive offer: up to 15% off plus a free pillow on mattresses. Anything beyond that needs manager approval.' },
  { k: ['pillow', 'protector', 'cross'], a: 'Best cross-sell: Mattress Protector (₹1,999) or Smart Pillow (₹1,499) — most buyers add one at checkout.' },
  { k: ['store', 'trial', 'visit'], a: 'Customers can try any product in store — offer to book a slot at the nearest experience centre.' },
];
export function askAi(question, lead) {
  const q = question.toLowerCase();
  const hit = kb.find((e) => e.k.some((w) => q.includes(w)));
  if (hit) return hit.a;
  return `I couldn't find that in the knowledge base. For ${lead?.name || 'this customer'}, stay on the SOP and offer to confirm by WhatsApp after the call.`;
}

export const quickReplies = [
  { id: 'price', label: 'Send price on WhatsApp' },
  { id: 'callback', label: 'Offer callback slot', agent: 'Would tomorrow at 6 PM be a good time for me to call you back?', sop: 5 },
  { id: 'warranty', label: 'Explain warranty terms', agent: 'Every mattress comes with a 10-year warranty plus a 100-night trial, so you are fully covered.', sop: 4 },
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
  t += 'Next step: send the quote on WhatsApp and follow up.';
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
  { id: 'n7', icon: '📦', kind: 'alert', time: 'Sun', text: 'Ortho Grid Pro shipment for RT Nagar is ready for delivery', link: { label: 'Open #manage-shipment →', to: '/pulse/manage-shipment' } },
  { id: 'n8', icon: '🎫', kind: 'action', time: 'Sat', text: 'Quotation approval for Mukunda R. is still awaiting approval', link: { label: 'Open #quotation-tickets →', to: '/pulse/quotation-tickets' } },
];

export const rankBreakdown = [
  { icon: '🏆', label: 'OG Score™', value: '76', weight: 40, pct: 76 },
  { icon: '📞', label: 'Leads Called', value: '2', weight: 20, pct: 40 },
  { icon: '🎯', label: 'Leads Created', value: '3', weight: 15, pct: 60 },
  { icon: '⏱️', label: 'Conversation Time', value: '62m', weight: 15, pct: 78 },
  { icon: '🚚', label: 'On-time Delivery', value: '92%', weight: 10, pct: 92 },
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
  { id: 'cd-mukunda', name: 'Mukunda', initials: 'MK', wa: true, preview: 'Quote for Ortho GRID sent · awaiting reply', time: '2:40pm', unread: 1, bg: '#e1f5ee', color: '#0f6e56' },
  { id: 'cd-kavitha', name: 'Kavitha R.', initials: 'KR', wa: true, preview: 'When can I come see the hybrid mattress?', time: '11:15am', unread: 2, bg: '#fff8e1', color: '#c8860a' },
  { id: 'cd-ali', name: 'Ali', initials: 'AL', missed: true, preview: 'Called 9:40am · not returned yet', bg: '#fdecec', color: '#e24b4a' },
];

/* ---------- Real calls: turn live speech into SOP ticks + sentiment ---------- */
const sopPatterns = [
  /(this is|calling from|calling about|following up|speaking|is this a good time|am i speaking)/i,
  /(what matters|looking for|budget|need|prefer|size|room|who is it for|tell me)/i,
  /(mattress|chair|pillow|grid|firm|comfort|feature|recommend|model|layer)/i,
  /(\bemi\b|instal|no[- ]cost|per month|monthly|finance)/i,
  /(warranty|guarantee|trial|100[- ]night|return)/i,
  /(call you back|callback|follow up|quote|book|tomorrow|send you|whatsapp|confirm)/i,
];
/** Which SOP step (0-5) does this sentence cover? undefined if none. Returns the first not-yet-done match preference. */
export const detectSopSteps = (text) => sopPatterns.map((re, i) => (re.test(text) ? i : -1)).filter((i) => i >= 0);

export const moodOf = (text) => {
  if (/(thank|great|good|yes|love|perfect|nice|sure|sounds|okay|ok\b|interested|go ahead)/i.test(text)) return 85;
  if (/(no\b|not\b|stop|expensive|bad|angry|problem|cancel|don't|dont|too much)/i.test(text)) return 35;
  return 62;
};
