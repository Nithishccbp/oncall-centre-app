// Data for the Today family of screens (Today, Calls to make, Incoming, Recent) — duplicate data from the product mock.
// Replace `fetchB2B()` with a real call later: GET {VITE_API_BASE}/today must return B2BData (see docs/TODAY_API.md).
export type Journey = 'c' | 'l' | 'o' | 't' | 'x';
export interface MakeRow { g: string; n: string; sc: number; st: string; v: string; why: string; op?: string; path: string[]; lt: [string, string]; bt: [string, string]; brief?: [Journey, string, string, string][]; say?: string[]; ho?: string }
export interface IncomingRow { k: 'call' | 'chat'; n: string; st: string; v?: string; w?: string; mood?: string; ho?: string; path?: string[]; op?: string; tag?: string }
/** [time, customer, journey stage, what happened, stars 1-5, SOP %, next step, call length (mins)] */
export type RecentRow = [string, string, string, string, number, number, string, number];
export interface B2BData {
  in: string; out: string;
  kpis: { done: number; plan: number; note: string; csat: string; csatD: string; team: string; sop: string; sopD: string; booked: string; bookedV: string; aht: string; ahtD: string };
  plan: [number, 'm' | 'c', string][]; now: number; peak: [number, number];
  make: MakeRow[]; inc: IncomingRow[]; rec: RecentRow[];
  csat: [string, number, number][]; habit: [string, string, string];
  spark: { csat: number[]; sop: number[]; aht: number[]; booked: number[] };
  hours: [string, number, number][]; hourNow: number;
}
export interface CallScript { brand: string; product: string; comp: string; place: string; need: string; priceLine: string; book: string; bookShort: string; slots: string; val: string; staff: string[]; before: string[] }
export const b2bData: B2BData = {
 "in": "Atlas",
 "out": "Pace",
 "kpis": {
  "done": 14,
  "plan": 40,
  "note": "6 to make · ~20 inbound",
  "csat": "94%",
  "csatD": "▲2",
  "team": "88%",
  "sop": "84",
  "sopD": "▲6",
  "booked": "3",
  "bookedV": "₹9.3L",
  "aht": "4m 12s",
  "ahtD": "▼8%"
 },
 "plan": [
  [
   16,
   "m",
   "4:00 Ar. Mehra"
  ],
  [
   16.5,
   "m",
   "4:30 Design Den"
  ],
  [
   17,
   "m",
   "5:00 Sharma"
  ],
  [
   17.5,
   "c",
   "5:30 chats"
  ],
  [
   19,
   "m",
   "7:00 Pace batch"
  ]
 ],
 "now": 15.75,
 "peak": [
  18,
  20
 ],
 "make": [
  {
   "g": "Due now",
   "n": "Ar. Mehra",
   "sc": 85,
   "st": "Quote",
   "v": "₹6.2L",
   "why": "Promised 4 pm. Hotel project, 800 sheets.",
   "op": "Shall I lock the project price for 30 days?",
   "path": [
    "Catalogue",
    "Sample meeting",
    "Quote"
   ],
   "lt": [
    "You · 13:00",
    "Quote walk-through, 7m"
   ],
   "bt": [
    "4:00 pm",
    "promised"
   ],
   "brief": [
    [
     "c",
     "WEB CHAT · ATLAS · 5 NOV",
     "Asked for fire-rated matte",
     "Booked a sample meeting"
    ],
    [
     "l",
     "STUDIO VISIT · AVANI LISTEN · 11 NOV",
     "Saw samples with Kiran D.",
     "Picked walnut and ash. Hotel project."
    ],
    [
     "o",
     "PACE · 15 NOV",
     "Follow-up call, CSAT 92%",
     "Asked for project pricing"
    ],
    [
     "t",
     "YOU · TODAY 13:00",
     "Quote sent, ₹6.2L",
     "Call at 4"
    ],
    [
     "x",
     "NEXT",
     "Lock project price",
     ""
    ]
   ],
   "say": [
    "Open with the hotel project, not price.",
    "Confirm stock for 800 sheets.",
    "Offer a 30-day price lock."
   ]
  },
  {
   "g": "Due now",
   "n": "Sharma Traders",
   "sc": 62,
   "st": "Quote",
   "v": "₹3.1L",
   "why": "Wants a 500-sheet scheme. Quote ends tomorrow.",
   "op": "The scheme holds till tomorrow. Shall I book the order?",
   "path": [
    "Dealer portal",
    "Quote"
   ],
   "lt": [
    "Pace · Sat",
    "Shared scheme, CSAT 88%"
   ],
   "bt": [
    "5:00 pm",
    "after shop hours"
   ]
  },
  {
   "g": "Pace tried, needs you",
   "n": "Design Den",
   "sc": 53,
   "st": "Sample meeting",
   "v": "₹2.4L",
   "why": "Wants 60-day credit. Above Pace's scope.",
   "ho": "No answer twice. Asked for credit terms on WhatsApp. Call after 4:30.",
   "op": "We can do 45 days on the first order. Shall I send the form?",
   "path": [
    "LinkedIn",
    "Atlas chat"
   ],
   "lt": [
    "Pace · 11:25",
    "No answer twice"
   ],
   "bt": [
    "After 4:30",
    "said on WhatsApp"
   ]
  },
  {
   "g": "Later today",
   "n": "Studio Nine",
   "sc": 46,
   "st": "Enquiry",
   "v": "₹1.6L",
   "why": "Browsed the new range twice.",
   "path": [
    "Web chat"
   ],
   "lt": [
    "Atlas · chat",
    "Asked samples"
   ],
   "bt": [
    "6:30 pm",
    ""
   ]
  },
  {
   "g": "Later today",
   "n": "Gupta Ply",
   "sc": 42,
   "st": "Repeat orders",
   "v": "₹1.2L",
   "why": "Due for reorder this week.",
   "path": [
    "Dealer"
   ],
   "lt": [
    "Pace · Mon",
    "Reorder nudge"
   ],
   "bt": [
    "7:00 pm",
    ""
   ]
  },
  {
   "g": "Later today",
   "n": "Urban Nest",
   "sc": 36,
   "st": "Enquiry",
   "v": "₹2.0L",
   "why": "Met at the trade fair.",
   "path": [
    "Trade fair"
   ],
   "lt": [
    "Farhan A. · Sun",
    "Avani Listen note"
   ],
   "bt": [
    "7:30 pm",
    ""
   ]
  }
 ],
 "inc": [
  {
   "k": "call",
   "n": "Krishna Interiors",
   "st": "Help or grievance",
   "w": "3m 55s",
   "mood": "Wrong shade delivered",
   "ho": "Ordered walnut, got teak. Invoice verified. Said a person will fix it.",
   "path": [
    "Order",
    "Dispatch",
    "Wrong shade"
   ],
   "op": "I have your invoice open. Let's get the right sheets out."
  },
  {
   "k": "call",
   "n": "Gupta Ply",
   "st": "Dispatch",
   "w": "1m 25s",
   "mood": "Truck ETA",
   "tag": "Top dealer"
  },
  {
   "k": "chat",
   "n": "Sharma Traders",
   "st": "Quote",
   "v": "₹3.1L",
   "ho": "Wants an extra 2% on 500 sheets. Over to you."
  },
  {
   "k": "chat",
   "n": "Bhatia Décor",
   "st": "Help or grievance",
   "mood": "Edge chipping on 10 sheets"
  },
  {
   "k": "chat",
   "n": "Guest 3310",
   "st": "Enquiry",
   "mood": "Fire-rated range?"
  }
 ],
 "rec": [
  [
   "15:10",
   "Gupta Ply",
   "Dispatch",
   "ETA shared",
   5,
   85,
   "",
   45
  ],
  [
   "14:30",
   "Studio Nine",
   "Enquiry",
   "Samples Thu",
   5,
   83,
   "",
   50
  ],
  [
   "13:45",
   "Patel Plywood",
   "Quote",
   "Scheme · callback Fri",
   4,
   70,
   "no next project asked",
   13
  ],
  [
   "13:00",
   "Ar. Mehra",
   "Quote",
   "Quote sent",
   5,
   84,
   "",
   50
  ],
  [
   "12:15",
   "Bhatia Décor",
   "Help or grievance",
   "Chipping · logged",
   3,
   67,
   "",
   -23
  ]
 ],
 "csat": [
  [
   "Enquiry",
   95,
   12
  ],
  [
   "Sample meeting",
   93,
   14
  ],
  [
   "Quote",
   88,
   11
  ],
  [
   "Repeat orders",
   92,
   9
  ],
  [
   "Grievance",
   69,
   5
  ]
 ],
 "habit": [
  "Next project asked",
  "44% · target 75%",
  "Ask about the next project before you close."
 ],
 "spark": {
  "csat": [
   89,
   90,
   92,
   91,
   93,
   92,
   94
  ],
  "sop": [
   72,
   74,
   76,
   75,
   79,
   78,
   84
  ],
  "aht": [
   5.1,
   4.9,
   4.8,
   4.7,
   4.5,
   4.4,
   4.2
  ],
  "booked": [
   1,
   2,
   1,
   3,
   2,
   2,
   3
  ]
 },
 "hours": [
  [
   "10",
   4,
   4
  ],
  [
   "11",
   3,
   4
  ],
  [
   "12",
   2,
   3
  ],
  [
   "1",
   2,
   3
  ],
  [
   "2",
   2,
   3
  ],
  [
   "3",
   1,
   3
  ],
  [
   "4",
   0,
   5
  ],
  [
   "5",
   0,
   5
  ],
  [
   "6",
   0,
   5
  ],
  [
   "7",
   0,
   5
  ]
 ],
 "hourNow": 6
};

export const callScript: CallScript = {
 "brand": "Apex Laminates",
 "product": "new laminate range",
 "comp": "a cheaper supplier",
 "place": "sample studio",
 "need": "matching finishes for a 40-flat project",
 "priceLine": "For 40 flats the order comes to about ₹6.2 lakh, with project pricing and 60-day credit terms. Samples go out the same day.",
 "book": "Sample meeting booked",
 "bookShort": "sample meeting",
 "slots": "Tuesday 11 am or Thursday 4 pm",
 "val": "₹6.2L",
 "staff": [
  "Kiran D. · sample studio",
  "Farhan A. · field, architects"
 ],
 "before": [
  "Ask about the project first",
  "Confirm stock and lead time",
  "Offer samples or a meeting slot"
 ]
};

export const agent = { name: 'Sunita Rao', company: 'Apex Laminates', team: 'Call Centre', short: 'Sunita R.' };

const BASE: string | undefined = import.meta.env.VITE_API_BASE;
export async function fetchB2B(): Promise<B2BData> {
  if (!BASE) return b2bData;
  const token = (() => { try { return localStorage.getItem('og_token'); } catch { return null; } })();
  const res = await fetch(`${BASE}/today`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error(`GET /today failed (${res.status})`);
  return res.json();
}
