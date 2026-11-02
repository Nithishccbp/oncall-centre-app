// AI "customers" for Practise a call. Each rings the agent, then talks like a real buyer (Gemini on the server, with an offline fallback).
export const personas = [
  { name: 'Anil Kumar', voice: 'Achird', pitch: 0.85, product: 'Tower A · 2 BHK', budget: '₹95 lakh', trait: 'practical and a little sceptical, compares every price with a competitor project in Varthur',
    concerns: ['the price feels higher than the Varthur project', 'what the monthly home-loan EMI would be', 'whether possession in December 2028 is really safe'],
    opener: 'Hello? Yes, I saw your ad for Lakeside Towers. Is this the sales team?' },
  { name: 'Priya Nair', voice: 'Kore', pitch: 1.15, product: 'Tower B · 3 BHK', budget: '₹1.4 crore', trait: 'polite, busy, wants quick clear answers and gets impatient with long speeches',
    concerns: ['how many minutes the site is from Whitefield metro', 'whether parking is included in the price', 'if a site visit can be fixed this weekend'],
    opener: 'Hi, I have only two minutes. I enquired about a three BHK at Lakeside Towers yesterday.' },
  { name: 'Suresh Reddy', voice: 'Umbriel', pitch: 0.8, product: 'Tower A · 2 BHK', budget: '₹90 lakh', trait: 'first-time buyer, nervous about loans and paperwork, asks simple questions',
    concerns: ['whether he will get a bank loan on a salary of one lakh a month', 'what extra charges apply besides the base price', 'if the builder is RERA registered'],
    opener: 'Hello, namaste. I am looking to buy my first flat. Someone said I should call you.' },
  { name: 'Meera Joshi', voice: 'Aoede', pitch: 1.2, product: 'Tower B · 2 BHK', budget: '₹92 lakh', trait: 'interested but undecided, keeps saying she will think about it, needs a reason to act now',
    concerns: ['she wants to wait for interest rates to fall', 'her husband has not seen the flat yet', 'she heard the price may go up next month'],
    opener: 'Hi, I visited your sample flat last week. I just wanted to check one or two things.' },
  { name: 'Farhan Sheikh', voice: 'Orus', pitch: 0.9, product: 'Tower B · 3 BHK', budget: '₹1.5 crore', trait: 'investor type, direct, asks about returns and resale, dislikes sales talk',
    concerns: ['expected rental yield and appreciation', 'whether there is a discount for a quick booking', 'how to pay the token amount'],
    opener: 'Hello. I want some quick numbers on Lakeside Towers. Do you have a minute?' },
];
export const pickPersona = () => personas[Math.floor(Math.random() * personas.length)];

// How the AI customer feels. "mixed" starts friendly, then changes mood during the call.
export const moods = [
  { id: 'angry', label: 'Angry', emoji: '😠', desc: 'Frustrated, nobody called back. Needs a real apology and a fix.',
    opener: 'Hello? Finally! I have been waiting two days for somebody from your team to call me back. This is not how you treat customers.' },
  { id: 'confused', label: 'Confused', emoji: '😕', desc: 'Does not follow the terms. Needs simple, step by step answers.',
    opener: 'Hello? Um, yes, someone called me from this number? I am not very sure what this is about.' },
  { id: 'impatient', label: 'Impatient', emoji: '⏱️', desc: 'In a hurry. Wants the point in two sentences.',
    opener: 'Yes, who is this? I am in the middle of something, so please be quick.' },
  { id: 'worried', label: 'Worried', emoji: '😟', desc: 'Anxious about money, loan and delays. Needs reassurance.',
    opener: 'Hello... yes, I enquired about a flat, but honestly I am quite worried about the whole thing.' },
  { id: 'mixed', label: 'Surprise mix', emoji: '🎭', desc: 'Starts friendly, then turns confused or angry as the call goes on.', opener: null },
];
const PLANS = [['friendly', 'confused', 'angry'], ['impatient', 'friendly', 'angry'], ['worried', 'confused', 'angry'], ['friendly', 'worried', 'impatient']];
export const moodPlan = () => PLANS[Math.floor(Math.random() * PLANS.length)];
export const moodOpener = (mood, persona) => moods.find((m) => m.id === mood)?.opener || persona.opener;
