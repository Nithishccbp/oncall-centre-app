// Avani AI coach data (real-estate presales): personas, assess answers, learning path and practise steps.
export const personas = [
  { id: 'traditional', name: 'Traditional', emoji: '👩🏽‍💼', bg: '#0f6e56' },
  { id: 'contemporary', name: 'Contemporary', emoji: '👩🏽‍🎓', bg: '#185fa5' },
  { id: 'professional', name: 'Professional', emoji: '🧑🏽‍💼', bg: '#1f2937' },
  { id: 'casual', name: 'Smart Casual', emoji: '👩🏽‍🎤', bg: '#7c3aed' },
];

export const assessChips = [
  { id: 'plan', icon: 'ti-calendar-dollar', label: 'Payment plan', q: 'How do I explain the payment plan?' },
  { id: 'price', icon: 'ti-currency-rupee', label: 'Price objection', q: 'Customer says the price is too high, what do I say?' },
  { id: 'weak', icon: 'ti-chart-bar', label: 'My weak areas', q: 'What are my weak areas this week?' },
  { id: 'quiz', icon: 'ti-shield-check', label: 'Possession date quiz', q: 'Quiz me on the possession date and RERA' },
];

export const assessKb = [
  { m: ['payment plan', 'payment', 'construction'], a: 'Keep it simple: 10% on booking, 80% linked to construction milestones, 10% at possession. Lead with how little they pay today, then mention the HDFC pre-approved loan so the EMI feels comfortable. Want to practise this in the Practise tab?' },
  { m: ['price', 'expensive', 'high', 'discount', 'budget'], a: 'Do not defend the price, reframe it. Acknowledge the budget, compare on all-in cost (parking, clubhouse, floor-rise included) and offer a site visit so they see the value. Then ask: "If the monthly EMI fits, would you be ready to book?"' },
  { m: ['weak', 'improve', 'score'], a: 'Looking at your last 5 logged calls: opening and needs discovery are strong, but possession date and RERA came up in only 2 of 5. Cross-sell (covered parking) was mentioned once. Practise "Possession & RERA" today.' },
  { m: ['possession', 'rera', 'quiz', 'handover'], a: 'Quick quiz: 1) Possession date for Tower A and B? (December 2028) 2) Who must the RERA number be quoted to? (Every buyer, in writing) 3) What if possession is delayed? (Interest as per RERA). Reply with your answers and I will score you.' },
  { m: ['loan', 'emi', 'hdfc'], a: 'A 20-year loan on ₹98 L at about 8.5% is roughly ₹62,000 a month after a 20% down payment. HDFC, SBI and ICICI pre-approve for Lakeside Towers, so offer to connect the customer with the bank desk.' },
  { m: ['site visit', 'visit'], a: 'Always close with a specific slot: "Can I book you for Saturday at 11 at the Lakeside experience centre?" Customers who visit convert about 3x more.' },
  { m: ['cost sheet', 'quote', 'quotation'], a: 'Send the cost sheet on WhatsApp straight after the call, with base price, parking, floor-rise and taxes shown separately. Follow up within 24 hours.' },
];
export const assessAnswer = (text) => {
  const q = text.toLowerCase();
  const hit = assessKb.find((e) => e.m.some((w) => q.includes(w)));
  return hit ? hit.a : 'Good question. Stay on the SOP: confirm intent, discover needs, walk through the project, cover loan and possession, and close with a site visit. Tell me the exact customer line and I will coach you on it.';
};

export const seedSessions = [
  { id: 's1', title: 'How do I explain the payment plan?', history: [
    { role: 'user', content: 'How do I explain the payment plan?' }, { role: 'assistant', content: assessKb[0].a }] },
  { id: 's2', title: 'What are my weak areas this week?', history: [
    { role: 'user', content: 'What are my weak areas this week?' }, { role: 'assistant', content: assessKb[2].a }] },
];

export const modules = [
  { id: 'm1', icon: '🏢', title: 'Project basics', sub: 'Tower A vs Tower B · Floor plans · Unit specs', pct: 100,
    points: ['Tower A: 2 and 3 BHK, park facing. Tower B: 2 and 3 BHK, clubhouse facing.', 'Carpet area vs super built-up area: always quote carpet area first.', 'Lakeside Towers is RERA registered and possession is December 2028.'] },
  { id: 'm2', icon: '🛡️', title: 'Possession date & Payment plans', sub: 'Payment plan · Delay clause · Key scripts', pct: 40,
    points: ['Payment plan: 10% booking, 80% construction-linked, 10% on possession.', 'Delay clause: interest as per RERA. Never promise a date earlier than December 2028.', 'Script: "Possession is December 2028 and the project is RERA registered, so your money is protected."'] },
  { id: 'm3', icon: '🏦', title: 'Home loan & EMI basics', sub: 'Pre-approved banks · EMI maths · Eligibility', pct: 0,
    points: ['HDFC, SBI and ICICI pre-approve for Lakeside.', 'Rule of thumb: about ₹868 EMI per lakh at 8.5% over 20 years.', 'Ask for monthly income early to check eligibility.'] },
  { id: 'm4', icon: '📍', title: 'Booking a site visit', sub: 'Slots · Reminders · Handover to site team', pct: 0,
    points: ['Offer two slots, never an open question.', 'Send a WhatsApp reminder the evening before.', 'Share the visit with the site team so a sales executive is ready.'] },
];

export const steps = [
  { id: 'open', icon: '👋', name: 'Opening & Intent Confirm', tip: 'Say your name, Godrej Properties, the project, and ask if it is a good time.', example: '"Namaste! This is Aditi from Godrej Properties, calling about the 2 BHK at Lakeside Towers you enquired on. Is now a good time?"', watch: ['Did you say your name?', 'Did you name the project?', 'Did you ask if it is a good time?'], kw: ['aditi|name|this is', 'godrej|lakeside|project|tower', 'good time|okay time|now'] },
  { id: 'needs', icon: '🎯', name: 'Needs Discovery', tip: 'Ask open questions on budget, unit size, who will live there and the timeline.', example: '"What matters most to you, location, price or school nearby? And who will be living in the home?"', watch: ['Did you ask an open question?', 'Did you ask about budget or timeline?', 'Did you ask who the home is for?'], kw: ['what|which|how|why', 'budget|price|timeline|when', 'family|who|parents|son|for you'] },
  { id: 'walk', icon: '🏢', name: 'Project Walkthrough', tip: 'Cover at least 3 features: location, amenities, floor plan, clubhouse, school nearby.', example: '"Lakeside is five minutes from Greenwood High, with a clubhouse, a park-facing 2 BHK and 70% open space."', watch: ['Did you mention 3 or more features?', 'Did you tie them to the customer need?'], kw: ['school|metro|location|minutes', 'clubhouse|park|amenit|open space|gym', 'bhk|floor|tower|unit'] },
  { id: 'loan', icon: '🏦', name: 'Loan / Payment Plan', tip: 'Quote the payment plan and an indicative EMI, and mention bank pre-approval.', example: '"Pay 10% to book, 80% as construction progresses, and HDFC pre-approves, so the EMI is about 62,000 a month."', watch: ['Did you explain the payment plan?', 'Did you give an EMI figure?', 'Did you mention the bank?'], kw: ['10%|payment plan|construction', 'emi|per month|monthly|62', 'hdfc|sbi|icici|bank|loan'] },
  { id: 'rera', icon: '🛡️', name: 'Possession & RERA', tip: 'State the possession date and that the project is RERA registered.', example: '"Possession is December 2028 and the project is RERA registered, so your booking is protected."', watch: ['Did you state the possession date?', 'Did you mention RERA?', 'Did it sound confident?'], kw: ['2028|december|possession|handover', 'rera|registered', 'protected|safe|confident|guarantee'] },
  { id: 'price', icon: '₹', name: 'Price Objection', tip: 'Acknowledge, reframe on all-in value, then offer a site visit.', example: '"I understand budget matters. All-in with parking and clubhouse it compares well, and I can show you on a site visit."', watch: ['Did you acknowledge the concern?', 'Did you reframe on value?', 'Did you offer a next step?'], kw: ['understand|agree|sure|makes sense', 'value|all-in|includes|compare|parking', 'visit|show|book|slot'] },
  { id: 'cross', icon: '🅿️', name: 'Cross-Sell (Add-ons)', tip: 'Offer one add-on tied to the need: parking, modular kitchen or clubhouse.', example: '"Most 2 BHK buyers add covered parking for 3.5 lakh. Shall I include it in the cost sheet?"', watch: ['Did you offer one clear add-on?', 'Did you quote a price?', 'Did you ask for a yes or no?'], kw: ['parking|kitchen|clubhouse', 'lakh|₹|price|cost', 'shall|would you|include'] },
  { id: 'visit', icon: '📍', name: 'Site Visit Booking', tip: 'Offer a specific slot and confirm by WhatsApp.', example: '"Can I book you for Saturday at 11 at the Lakeside experience centre? I will WhatsApp the location."', watch: ['Did you offer a specific slot?', 'Did you confirm by WhatsApp?'], kw: ['saturday|sunday|tomorrow|am|pm|slot', 'whatsapp|message|send|confirm'] },
];

/** Score a practise rendition against a step: each "watch" item is ticked if its keyword group appears. */
export function scoreStep(step, text) {
  const t = (text || '').toLowerCase();
  const checks = step.watch.map((w, i) => ({ label: w, ok: new RegExp(step.kw[i] || step.kw[0], 'i').test(t) }));
  const got = checks.filter((c) => c.ok).length;
  const words = t.split(/\s+/).filter(Boolean).length;
  const score = Math.min(100, Math.round((got / checks.length) * 85 + Math.min(words, 30) / 2));
  const note = got === checks.length ? 'Excellent, that sounded natural and complete.' : `Good try. Next time make sure you: ${checks.filter((c) => !c.ok).map((c) => c.label.replace(/^Did you /, '').replace(/\?$/, '')).join('; ')}.`;
  return { checks, score, note, words };
}
