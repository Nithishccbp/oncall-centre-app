// Sample data for the Dashboard.
export const user = {
  name: 'Arvind Rajan', initials: 'AR', store: 'The Sleep Company', team: 'Call Centre',
  location: 'Koramangala', ogScore: 76, rank: 3, avatarEmoji: '🦸‍♂️',
};

export const kpis = [
  { label: 'OG SCORE™', value: '76', delta: '▲13', tone: 'good' },
  { label: 'AVG HANDLE TIME', value: '4m 12s', delta: '▼8%', tone: 'good' },
  { label: 'CSAT TODAY', value: '94%', delta: '▲2pt', tone: 'good' },
  { label: 'IN QUEUE', value: '2', delta: 'live', tone: 'info' },
];

export const progress = {
  leadsCreated: { value: 3, delta: '+1' },
  leadsCalled: { value: 2, delta: '+2' },
};

export const earnings = { amount: 5200, slabMin: 800, slabMax: 6000, coached: 1700 };

// pulseTaskId links a dashboard task to the "Needs your input" card in Pulse.
export const tasks = [
  { id: 'callbacks', pulseTaskId: 't1', icon: 'ti-phone-call', tone: 'blue', title: '2 callbacks', sub: 'next 4:30pm' },
  { id: 'hotleads', pulseTaskId: 't2', icon: 'ti-users', tone: 'purple', title: '2 hot leads', sub: 'untouched 24h' },
  { id: 'outcome', pulseTaskId: 't3', icon: 'ti-clipboard-check', tone: 'amber', title: '1 outcome', sub: 'to log' },
];

export const waiting = [
  { id: 'w1', name: 'Priya Iyer', note: 'Likely billing dispute — flagged before', wait: '4m 20s', level: 'danger' },
  { id: 'w2', name: 'Suresh Nair', note: 'Plan upgrade enquiry', wait: '1m 50s', level: 'warn' },
];

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'];
export const callsLast7 = days.map((day, i) => ({ day, v: [18, 22, 15, 26, 20, 12, 14][i] }));
export const csatLast7 = days.map((day, i) => ({ day, v: [88, 90, 85, 92, 89, 91, 94][i] }));
