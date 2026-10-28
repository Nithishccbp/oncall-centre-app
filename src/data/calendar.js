import { DEMO } from './demo.js';
// Calendar sample data. TODAY is the real current date (the sample events below are fixed in Oct 2026).
export const TODAY = new Date();

const events_seed = [
  { id: 'e1', date: '2026-10-23', time: '11:00 AM', title: 'SOP coaching session', who: 'With Sunita Rao (Manager) · via #callcentre-team' },
  { id: 'e2', date: '2026-10-26', time: '2:30 PM', title: 'RERA & possession pitch refresher', who: 'With L&D team · flagged from your last 3 calls' },
  { id: 'e3', date: '2026-10-28', time: '10:00 AM', title: 'Weekly team huddle', who: 'With Call Centre team · #callcentre-team' },
];
export const events = DEMO ? events_seed : [];

export const shareOptions = [
  { id: 'manager', label: 'Sunita Rao', sub: 'Manager', icon: '👤' },
  { id: 'team', label: 'Presales Team', sub: 'All members · #callcentre-team', icon: '👥' },
  { id: 'landd', label: 'Fahmy', sub: 'L&D', icon: '🎓' },
];
