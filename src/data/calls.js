// Call history and SOP review sample data.
export const recentCalls = [
  { id: 'c1', dir: 'in', name: 'Mukunda R.', time: '10:42 AM', duration: '4m 12s' },
  { id: 'c2', dir: 'out', name: 'Kavitha R.', time: 'Yesterday', duration: '2m 05s' },
  { id: 'c3', dir: 'missed', name: 'Unknown', time: 'Yesterday', duration: '—' },
  { id: 'c4', dir: 'missed', name: 'Ritu S.', time: 'Today 11:20 AM', duration: '—' },
  { id: 'c5', dir: 'missed', name: 'Faizan A.', time: 'Today 10:05 AM', duration: '—' },
  { id: 'c6', dir: 'missed', name: 'Kavitha R.', time: 'Yesterday 4:40 PM', duration: '—' },
  { id: 'c7', dir: 'missed', name: 'Divya P.', time: 'Yesterday 2:15 PM', duration: '—' },
  { id: 'c8', dir: 'out', name: 'Faizan A.', time: 'Mon', duration: '6m 40s' },
];

export const sopChecklist = [
  'Opening & Intent Confirm', 'Needs Discovery', 'Product Pitch',
  'EMI / Financing Mention', 'Warranty Mention', 'Closing / Callback Booking',
];

const q = (label, passed, quote) => ({ label, passed, quote });

export const sopReviews = {
  c1: {
    score: 83,
    items: [
      q(sopChecklist[0], true, '"This is Aditi calling from The Sleep Company, is now an okay time?"'),
      q(sopChecklist[1], true, '"Can I ask what matters most to you — firmness or price?"'),
      q(sopChecklist[2], true, '"The GRID layer gives pressure relief exactly where you need it."'),
      q(sopChecklist[3], true, '"We do have a 6-month no-cost EMI plan if that helps."'),
      q(sopChecklist[4], false, 'No mention of the warranty period anywhere in the call.'),
      q(sopChecklist[5], true, '"I\'ll send the quote over and follow up Thursday, does that work?"'),
    ],
  },
  c2: {
    score: 67,
    items: [
      q(sopChecklist[0], true, '"Hi Kavitha, I\'m calling about your SmartGRID enquiry."'),
      q(sopChecklist[1], true, '"Is the mattress for you or for guests?"'),
      q(sopChecklist[2], true, '"The hybrid layer keeps it cool through the night."'),
      q(sopChecklist[3], false, 'EMI was not mentioned even though she raised budget.'),
      q(sopChecklist[4], false, 'No mention of the warranty period anywhere in the call.'),
      q(sopChecklist[5], true, '"I\'ll message you the quote this evening."'),
    ],
  },
  c8: {
    score: 83,
    items: [
      q(sopChecklist[0], true, '"Good morning Faizan, is this a good time to talk?"'),
      q(sopChecklist[1], true, '"What size room will the chair go into?"'),
      q(sopChecklist[2], true, '"Tranquo has five massage modes and a zero-gravity recline."'),
      q(sopChecklist[3], true, '"The 6-month no-cost EMI is about ₹4,165 a month."'),
      q(sopChecklist[4], false, 'No mention of the warranty period anywhere in the call.'),
      q(sopChecklist[5], true, '"I\'ll book your store trial for Saturday."'),
    ],
  },
};
