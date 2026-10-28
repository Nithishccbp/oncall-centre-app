import { DEMO } from './demo.js';
// Sample data for Pulse: agents, channels, DMs, threads and "Needs your input" tasks.
const agents_seed = {
  role: [
    { id: 'post-visit-agent', sub: 'Your Follow-ups on time · 6 members', metric: '95%', trend: '▲2', icon: 'ti-home-check', color: 'orange', pins: 2 },
    { id: 'callcentre-agent', sub: 'Presales Agent', icon: 'ti-headset', color: 'blue', pins: 2 },
  ],
  task: [
    { id: 'cross-sell-agent', sub: 'Your Attach rate · 5 members', metric: '24%', trend: '▲2', icon: 'ti-shopping-cart-plus', color: 'purple', pins: 2 },
    { id: 'sop-agent', sub: 'Your SOP adherence · 5 members', metric: '81%', trend: '▲2', icon: 'ti-checklist', color: 'teal', pins: 2 },
    { id: 'lead-conversion-agent', sub: 'Lead Conversion Agent', icon: 'ti-target', color: 'red', pins: 2 },
    { id: 'capture-agent', sub: 'Your Capture coverage · 5 members', metric: '78%', trend: '▲1', icon: 'ti-microphone', color: 'teal', pins: 2 },
  ],
};
export const agents = DEMO ? agents_seed : { role: agents_seed.role.map(({ metric, trend, pins, ...a }) => ({ ...a, pins: 0 })), task: agents_seed.task.map(({ metric, trend, pins, ...a }) => ({ ...a, pins: 0 })) };

const general_seed = [
  { id: 'customer-discussions', name: 'customer-discussions', sub: 'Relayed via WhatsApp Business', unread: 2 },
];
export const general = DEMO ? general_seed : general_seed.map((g) => ({ ...g, unread: 0 }));

const kudos_seed = {
  newCount: 3, total: 12,
  latest: '"Great work with Mukunda — closed that objection beautifully!" — Sunita Rao',
  feed: [
    { id: 'k1', from: 'Sunita Rao (Manager)', initials: 'SR', icon: '🏆', tone: 'gold', time: '12:40pm · Today', text: '"Great work with Mukunda — closed that RERA possession objection beautifully. Keep it up!"' },
    { id: 'k2', from: 'Raju Kumar', initials: 'RK', icon: '🔥', tone: 'rose', time: 'Yesterday', text: '"Nice cross-sell on the Sky Villa! Impressed by how you read the customer."' },
    { id: 'k3', from: 'Sunita Rao (Manager)', initials: 'SR', icon: '💪', tone: 'mint', time: '2 days ago', text: '"Top SOP score this week — 72/100 on Mukunda\'s conversation. Experience centre leader!"' },
  ],
};
export const kudos = DEMO ? kudos_seed : { newCount: 0, total: 0, latest: 'No kudos yet', feed: [] };

const channels_seed = [
  { id: 'callcentre-team', name: 'callcentre-team', preview: 'Manager: Review call QA scores this week!', unread: 1, mention: true },
  { id: 'all-stores', name: 'all-stores', preview: 'New Tower A campaign from 1 June!', time: '10:22am', unread: 4 },
  { id: 'avani-coaching', name: 'avani-coaching', preview: 'Your RERA possession score dropped 12% this week', time: '9:01am', unread: 1 },
  { id: 'manage-shipment', name: 'manage-shipment', preview: '📦 Tower A — ready for possession ✓', time: '10:05am', unread: 1 },
  { id: 'quotation-tickets', name: 'quotation-tickets', preview: '🎫 Cost sheet approval — awaiting approval', time: '9:12am', unread: 1 },
  { id: 'new-hire-onboarding', name: 'new-hire-onboarding', preview: '🎉 Welcome to the team!', time: '8:30am' },
];
export const channels = DEMO ? channels_seed : channels_seed.map(({ preview, time, unread, mention, ...c }) => ({ ...c, preview: 'No messages yet', unread: 0 }));

const dms_seed = [
  { id: 'sunita-rao', name: 'Sunita Rao', initials: 'SR', badge: 'MGR', preview: '🌟 Great work with Mukunda — keep it up', time: '12:40pm' },
  { id: 'priya-krishnan', name: 'Priya Krishnan', initials: 'PK', preview: 'Can you cover my 3pm slot today?', time: '9:55am' },
  { id: 'raju-kumar', name: 'Raju Kumar', initials: 'RK', preview: 'Nice cross-sell on the Sky Villa! 🔥', time: 'Yesterday' },
];
export const dms = DEMO ? dms_seed : [];

const SR = { who: 'Sunita Rao', initials: 'SR', bg: '#faeeda', color: '#854f0b' };
const BOT = (who, initials, bg, color) => ({ who, initials, bg, color, bot: true });

export const threads = {
  'callcentre-team': {
    title: '#callcentre-team', dateLabel: 'Today · Call Centre Team', reply: { ...SR, text: 'Thanks Meghna 🙌' },
    messages: [
      { id: 'm1', ...SR, text: '👥 **STAKEHOLDERS:** @You (Meghna R.), whole call centre shift', time: '2:05pm' },
      { id: 'm2', ...SR, text: '📋 **ISSUE DEFINITION:** Greeting-in-first-10s QA score is at 71% this week, below our 85% target.', time: '2:05pm' },
      { id: 'm3', ...SR, text: "➡️ **SUGGESTED RESOLUTION:** Let's push that up 💪 — open every call with the greeting script. I'll check back Friday.", time: '2:05pm' },
      { id: 'm4', who: 'You', initials: 'AR', mine: true, text: 'On it! Will make sure I open every call with the greeting script 🙌', time: '2:10pm' },
      { id: 'm5', ...SR, text: 'Great attitude Meghna 🌟', time: '2:14pm' },
    ],
  },
  'all-stores': {
    title: '#all-stores', dateLabel: 'Today · All Stores', reply: { ...BOT('Manager Helper', '📢', '#e8f0fe', '#1d4ed8'), text: 'Noted 👍' },
    messages: [{ id: 'a1', ...BOT('Manager Helper', '📢', '#e8f0fe', '#1d4ed8'), text: 'New Tower A campaign live from 1 June — ask customers about the bundled home-loan EMI offer!', time: '10:22am' }],
  },
  'avani-coaching': {
    title: '#avani-coaching', dateLabel: 'Today · Avani AI Coaching', reply: { ...BOT('Avani', '✨', '#e1f5ee', '#0f6e56'), text: 'Great — I will track that on your next calls.' },
    messages: [{ id: 'v1', ...BOT('Avani', '✨', '#e1f5ee', '#0f6e56'), text: "Your RERA possession score dropped 12% this week — try mentioning the RERA possession before the close.", time: '9:01am' }],
  },
  'manage-shipment': {
    title: '#manage-shipment', dateLabel: 'Today · Manage Shipment',
    messages: [{
      id: 's1', ...BOT('Shipping Agent', '📦', '#e8f0fe', '#185fa5'), time: '10:05am',
      card: { icon: '📦', title: 'Shipping Notifications', badge: 'Ready for possession ✓',
        fields: [['Model', 'Tower A · 3 BHK'], ['Tracking', '4RS4DDF6549B4'], ['Destination', 'RT Nagar, Bengaluru']],
        actions: [{ label: 'View details' }, { label: 'Notify customer', primary: true }] },
    }],
  },
  'quotation-tickets': {
    title: '#quotation-tickets', dateLabel: 'Today · Quotation Tickets',
    messages: [{
      id: 'q1', ...BOT('Ticket Desk Agent', '🎫', '#fdecec', '#e24b4a'), time: '9:12am',
      card: { icon: '📝', title: 'Cost sheet approval — Mukunda R.', badge: 'Awaiting approval',
        fields: [['Product', 'Tower A · 2 BHK'], ['Value', '₹58,000'], ['Raised by', 'You']],
        actions: [{ label: 'View lead', openLeads: true, primary: true }] },
    }],
  },
  'new-hire-onboarding': {
    title: '#new-hire-onboarding', dateLabel: 'Today · New Hire Onboarding',
    messages: [{
      id: 'n1', ...BOT('Onboarding Agent', '👋', '#e1f5ee', '#0a7d4f'), time: '8:30am',
      card: { icon: '🎉', title: 'Welcome to the team!', fields: [['SOP training', 'Starts today, 3:00pm'], ['Buddy manager', 'Sunita Rao']], actions: [] },
    }],
  },
  'customer-discussions': {
    title: '#customer-discussions', dateLabel: 'Today · Relayed via WhatsApp Business', reply: { ...BOT('Relay', '💬', '#e6f9ee', '#128c7e'), text: 'Message relayed to the customer.' },
    messages: [
      { id: 'cd1', ...BOT('Customer · Ritu S.', 'RS', '#fff0e6', '#c2410c'), text: 'Hi, is the Tower B 2 BHK available for possession this week?', time: '10:50am' },
      { id: 'cd2', ...BOT('Customer · Faizan A.', 'FA', '#e8f0fe', '#185fa5'), text: 'Can I see the home-loan EMI schedule for the Sky Villa?', time: '11:05am' },
    ],
  },
  'cd-mukunda': {
    title: 'Mukunda · WhatsApp', dateLabel: 'Today · WhatsApp Business',
    messages: [
      { id: 'cm1', ...BOT('Customer · Mukunda', 'MK', '#e1f5ee', '#0f6e56'), text: 'Hi, can you send me the cost sheet for the Tower A 2 BHK with the pillows?', time: '2:31pm' },
      { id: 'cm2', who: 'You', initials: 'AR', mine: true, text: 'Sure Mukunda — cost sheet for the Tower A 2 BHK sent. Let me know if you have questions!', time: '2:40pm' },
    ],
  },
  'cd-kavitha': {
    title: 'Kavitha R. · WhatsApp', dateLabel: 'Today · WhatsApp Business',
    messages: [
      { id: 'ck1', ...BOT('Customer · Kavitha R.', 'KR', '#fff8e1', '#c8860a'), text: 'Hello! When can I come see the hybrid home in experience centre?', time: '11:10am' },
      { id: 'ck2', ...BOT('Customer · Kavitha R.', 'KR', '#fff8e1', '#c8860a'), text: 'Is Saturday morning okay?', time: '11:15am' },
    ],
  },
  'sunita-rao': { title: 'Sunita Rao', dateLabel: 'Today', reply: { ...SR, text: 'Thanks Meghna 🙌' }, messages: [{ id: 'd1', ...SR, text: '🌟 Great work with Mukunda — keep it up', time: '12:40pm' }] },
  'priya-krishnan': {
    title: 'Priya Krishnan', dateLabel: 'Today', reply: { who: 'Priya Krishnan', initials: 'PK', bg: '#fdecec', color: '#a32d2d', text: 'Thank you!' },
    messages: [{ id: 'd2', who: 'Priya Krishnan', initials: 'PK', bg: '#fdecec', color: '#a32d2d', text: 'Can you cover my 3pm slot today?', time: '9:55am' }],
  },
  'raju-kumar': {
    title: 'Raju Kumar', dateLabel: 'Yesterday', reply: { who: 'Raju Kumar', initials: 'RK', bg: '#e1f5ee', color: '#0f6e56', text: 'Anytime 😄' },
    messages: [{ id: 'd3', who: 'Raju Kumar', initials: 'RK', bg: '#e1f5ee', color: '#0f6e56', text: 'Nice cross-sell on the Sky Villa! 🔥', time: 'Yesterday' }],
  },
  avanibot: {
    title: 'AvaniBot', dateLabel: 'Today · AvaniBot', reply: { ...BOT('AvaniBot', '✨', '#f1e8fb', '#6b2fa0'), text: 'Here is a quick brief: 2 callbacks, 2 hot leads, 1 outcome to log.' },
    messages: [{ id: 'ab1', ...BOT('AvaniBot', '✨', '#f1e8fb', '#6b2fa0'), text: 'Hey! I\'m AvaniBot ✨ Ask me things like **"what are my action items from Sunita"**, or tap the ✨ icon inside any channel to search just that channel.', time: '9:00am' }],
  },
};

// Role / task agent channels get a simple bot thread generated from the agent list.
[...agents.role, ...agents.task].forEach((a) => {
  threads[a.id] = {
    title: `#${a.id}`, dateLabel: `Today · ${a.sub}`, reply: { ...BOT(a.id, '🤖', '#f1e8fb', '#6b2fa0'), text: 'Got it — updating your plan.' },
    messages: [{ id: a.id + '-1', ...BOT(a.id, '🤖', '#f1e8fb', '#6b2fa0'), text: `Daily digest for **${a.sub}**. ${a.metric ? `You are at **${a.metric}** ${a.trend} this week. ` : ''}Two nudges are pinned for you.`, time: '9:00am' }],
  };
});

const needsInput_seed = {
  'callcentre-team': [{ id: 't1', question: 'Confirm the 4:30pm callback', context: 'Priya Iyer · likely billing dispute', options: ['Confirmed', 'Reschedule'] }],
  avanibot: [
    { id: 't2', question: 'Call now or reassign the 2 hot leads', context: 'Untouched for 24h', options: ['Calling now', 'Reassign'] },
    { id: 't3', question: "Log this morning's call outcome", context: 'Suresh Nair · plan upgrade enquiry', options: ['Converted', 'Callback', 'Not interested'] },
  ],
};
export const needsInput = DEMO ? needsInput_seed : {};

/** AvaniBot answers a few known questions by keyword (no backend); anything else gets a polite fallback. */
export function avaniReply(text) {
  const t = text.toLowerCase();
  const bot = { who: 'AvaniBot', initials: '✨', bg: '#f1e8fb', color: '#6b2fa0', bot: true };
  if (/sunita|action item/.test(t)) return { ...bot, text: 'Your action items from **Sunita Rao**: 1) Reply in #callcentre-team about greeting QA (due Friday). 2) Confirm the 4:30pm callback with Priya Iyer.' };
  if (/brief|summary|today/.test(t)) return { ...bot, text: 'Daily brief: **2 callbacks**, **2 hot leads** untouched for 24h, **1 outcome** to log. Your OG Score is **76** (▲13) and you are rank **#3**.' };
  if (/lead|hot/.test(t)) return { ...bot, text: 'Hot leads right now: **Ritu S.** (96), **Mukunda** (90) and **Faizan A.** (88). Ritu needs a callback after her experience centre visit.' };
  if (/kudos|score|rank/.test(t)) return { ...bot, text: 'You have **12 kudos** all-time, 3 new. OG Score **76**, rank **#3** in RT Nagar.' };
  return { ...bot, text: 'I can help with daily briefs, action items, hot leads and kudos. Try: "what are my action items from Sunita".' };
}

// Empty by default: keep only the AvaniBot welcome message; every other thread starts blank and fills from the backend.
if (!DEMO) Object.values(threads).forEach((t) => { if (t.title !== 'AvaniBot') t.messages = []; });
