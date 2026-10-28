import { DEMO } from './demo.js';
// Call history and SOP review sample data.
const recentCalls_seed = [
  { id: 'c1', dir: 'in', name: 'Mukunda R.', time: '10:42 AM', duration: '4m 12s' },
  { id: 'c2', dir: 'out', name: 'Kavitha R.', time: 'Yesterday', duration: '2m 05s' },
  { id: 'c3', dir: 'missed', name: 'Unknown', time: 'Yesterday', duration: '—' },
  { id: 'c4', dir: 'missed', name: 'Ritu S.', time: 'Today 11:20 AM', duration: '—' },
  { id: 'c5', dir: 'missed', name: 'Faizan A.', time: 'Today 10:05 AM', duration: '—' },
  { id: 'c6', dir: 'missed', name: 'Kavitha R.', time: 'Yesterday 4:40 PM', duration: '—' },
  { id: 'c7', dir: 'missed', name: 'Divya P.', time: 'Yesterday 2:15 PM', duration: '—' },
  { id: 'c8', dir: 'out', name: 'Faizan A.', time: 'Mon', duration: '6m 40s' },
];
export const recentCalls = DEMO ? recentCalls_seed : [];

export const sopChecklist = [
  'Opening & Intent Confirm', 'Needs Discovery', 'Project Walkthrough',
  'Loan / Payment Plan', 'Possession & RERA', 'Site Visit Booking',
];

const q = (label, passed, quote) => ({ label, passed, quote });
const rv = (score, rows) => ({ score, items: rows.map((r, i) => q(sopChecklist[i], r[0], r[1])) });

const sopReviews_seed = {
  c1: rv(83, [
    [true, '"This is Aditi from Godrej Properties, is now an okay time?"'],
    [true, '"What matters most in the comparison, location or price?"'],
    [true, '"Lakeside is a five-minute walk from Greenwood High."'],
    [true, '"The HDFC home-loan EMI on this 2 BHK works out to about ₹62,000 a month."'],
    [false, 'No mention of the possession date or RERA number anywhere in the call.'],
    [true, '"Can I book you a site visit this Saturday at 11?"'],
  ]),
  c2: rv(67, [
    [true, '"Hi Kavitha, I\'m calling about your Tower A enquiry."'],
    [true, '"Is the 2 BHK for you or for your parents?"'],
    [true, '"A1003 faces the park and gets morning light."'],
    [false, 'Payment plan was not mentioned even though she raised budget.'],
    [false, 'No mention of possession (December 2028) or RERA.'],
    [true, '"I\'ll message you the cost sheet this evening."'],
  ]),
  c8: rv(83, [
    [true, '"Good morning Faizan, is this a good time to talk?"'],
    [true, '"Are you buying with your parents in mind?"'],
    [true, '"Unit 1204 in Tower B has a clear park view."'],
    [true, '"With HDFC pre-approval, the 20-year EMI is about ₹1.05 L a month."'],
    [false, 'No mention of RERA registration anywhere in the call.'],
    [true, '"I\'ll book your revisit with your parents for Saturday."'],
  ]),
};
export const sopReviews = DEMO ? sopReviews_seed : {};
