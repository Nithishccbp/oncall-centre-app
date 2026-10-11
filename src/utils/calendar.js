// Month maths for the calendar (no library). Weeks start on Sunday.
export function buildMonthCells(year, month) {
  const first = new Date(year, month, 1).getDay(); // 0 = Sunday
  const days = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: first }, () => ({ date: null }));
  for (let d = 1; d <= days; d++) cells.push({ date: new Date(year, month, d) });
  return cells;
}

export const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export const toKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const monthLabel = (year, month) =>
  new Date(year, month, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

// Sanity checks (run in the browser console / tests): Oct 2026 starts on Thursday and has 31 days.
// buildMonthCells(2026, 9).findIndex(c => c.date) === 4; buildMonthCells(2026, 9).filter(c => c.date).length === 31
