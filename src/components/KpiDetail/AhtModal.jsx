// "Avg Handle Time" KPI detail: today's AHT vs weekly average, calls by day, trend and per-day table.
import { useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { CategoryScale, Chart as ChartJS, Filler, LinearScale, LineElement, PointElement, Tooltip } from 'chart.js';
import Modal from '../Modal/Modal.jsx';
import { useUi } from '../../context/UiContext.jsx';
import { useIngest } from '../../context/IngestContext.jsx';
import { DEMO } from '../../data/demo.js';
import { callsLast7 } from '../../data/dashboard.js';
import './KpiDetail.css';

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Filler, Tooltip);

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'];
const DEMO_AHT = [280, 276, 271, 265, 260, 256, 252];
const DEMO_PRIOR = [302, 299, 300, 301, 294, 292, 290];
const fmt = (s) => `${Math.floor(s / 60)}m ${String(Math.round(s % 60)).padStart(2, '0')}s`;
const short = (s) => `${Math.floor(s / 60)}m ${String(Math.round(s % 60)).padStart(2, '0')}s`;

export default function AhtModal({ close }) {
  const { showToast } = useUi();
  const { week } = useIngest();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState({ k: 'i', asc: true });

  const days = useMemo(() => (DEMO
    ? DAYS.map((day, i) => ({ day, calls: callsLast7[i].v, aht: DEMO_AHT[i], i }))
    : (week || DAYS.map((day) => ({ day, calls: 0, aht: 0 }))).map((d, i) => ({ ...d, i }))), [week]);
  const prior = DEMO ? DEMO_PRIOR : days.map(() => 0);

  const totalCalls = days.reduce((n, d) => n + d.calls, 0);
  const busiest = totalCalls ? [...days].sort((a, b) => b.calls - a.calls)[0] : null;
  const withCalls = days.filter((d) => d.calls);
  const best = withCalls.length ? [...withCalls].sort((a, b) => a.aht - b.aht)[0] : null;
  const today = days[6];
  const maxCalls = Math.max(1, ...days.map((d) => d.calls));

  const rows = days.filter((d) => d.day.toLowerCase().includes(q.toLowerCase())).sort((a, b) => {
    const x = a[sort.k]; const y = b[sort.k];
    const c = typeof x === 'string' ? x.localeCompare(y) : x - y;
    return sort.asc ? c : -c;
  });

  const csv = () => {
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const body = [['Day', 'Calls handled', 'Avg handle time'], ...rows.map((r) => [r.day, r.calls, r.calls ? fmt(r.aht) : '—'])].map((r) => r.map(esc).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([body], { type: 'text/csv' }));
    a.download = 'handle-time-by-day.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const vals = days.map((d) => d.aht);
  const lo = DEMO ? 250 : 0; const hi = DEMO ? 302 : Math.max(60, ...vals);
  const data = {
    labels: DAYS,
    datasets: [
      { label: 'This period', data: vals, borderColor: '#1a3fa8', backgroundColor: 'rgba(26,63,168,.14)', fill: true, tension: 0.25, pointRadius: [0, 0, 0, 0, 0, 0, 5], pointHoverRadius: 5, pointBackgroundColor: '#1a3fa8' },
      { label: 'Prior', data: prior, borderColor: '#9db8ea', borderDash: [5, 5], fill: false, tension: 0.3, pointRadius: 0 },
    ],
  };
  const opts = {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${short(c.parsed.y)}${c.datasetIndex ? ' prior' : ''}` } } },
    scales: {
      y: { min: lo, max: hi, ticks: { stepSize: (hi - lo) / 2, callback: (v) => short(v), font: { size: 11 } }, grid: { color: '#eee' } },
      x: { ticks: { font: { size: 11 } }, grid: { display: false } },
    },
  };
  const th = (k, label, cls = '') => (
    <th key={k} className={`kd__sort ${cls}`} onClick={() => setSort((s) => ({ k, asc: s.k === k ? !s.asc : true }))}>
      {label} <i className={`ti ti-${sort.k === k ? (sort.asc ? 'arrow-up' : 'arrow-down') : 'arrows-sort'}`} />
    </th>
  );

  return (
    <Modal open onClose={close} width={880} flush label="Avg Handle Time">
      <div className="kd kd--blue">
        <div className="kd__banner">
          <div><div className="kd__eyebrow">TODAY · VS YOUR WEEKLY AVERAGE</div><div className="kd__bt">Avg Handle Time</div></div>
          <button className="kd__pdf" onClick={() => showToast('PDF to WhatsApp will work once the backend is connected')}>
            <i className="ti ti-brand-whatsapp" /> Send PDF
          </button>
        </div>
        <div className="kd__pad">
          <div className="kd__stats kd__stats--4">
            <div>
              <div className="kd__num kd__num--md">{today.calls ? fmt(today.aht) : '0m 00s'}</div>
              {DEMO && <span className="kd__delta kd__delta--good">▼ 8%</span>}
              <div className="kd__muted">vs similar prior period</div>
            </div>
            <div className="kd__stat"><div className="kd__sl">CALLS THIS WEEK</div><div className="kd__sv">{totalCalls}</div></div>
            <div className="kd__stat"><div className="kd__sl">BUSIEST DAY</div><div className="kd__sv">{busiest ? busiest.day : '—'}</div><div className="kd__muted">{busiest ? `${busiest.calls} calls` : ' '}</div></div>
            <div className="kd__stat"><div className="kd__sl">BEST AHT</div><div className="kd__sv">{best ? fmt(best.aht) : '—'}</div><div className="kd__muted">{best ? best.day.toLowerCase() : ' '}</div></div>
          </div>

          <div className="kd__insight kd__insight--blue">
            <i className="ti ti-bulb" />
            <span>{!totalCalls ? 'No calls handled yet. Handle time will appear here after your first call.'
              : DEMO ? <>Handle time has fallen every day this week, and CSAT is up 6 pts since Monday. Keep the <b>recap-then-close</b> ending.</>
                : <>Your busiest day was <b>{busiest.day}</b> with {busiest.calls} calls. Best handle time: <b>{fmt(best.aht)}</b> ({best.day.toLowerCase()}).</>}</span>
          </div>

          <div className="kd__two">
            <div className="kd__card">
              <div className="kd__sec kd__sec--tight">TREND · LAST 7 DAYS
                <span className="kd__legend"><i className="kd__ln kd__ln--navy" /> This period <i className="kd__ln kd__ln--dash kd__ln--bluel" /> Prior</span>
              </div>
              <div className="kd__chart"><Line data={data} options={opts} /></div>
            </div>
            <div className="kd__card">
              <div className="kd__sec kd__sec--tight">CALLS BY DAY</div>
              {days.map((d) => (
                <div className="kd__rate kd__rate--day" key={d.day}>
                  <span>{d.day}</span>
                  <span className="kd__rbar"><i style={{ width: `${(d.calls / maxCalls) * 100}%` }} /></span>
                  <b>{d.calls}</b>
                </div>
              ))}
            </div>
          </div>

          <div className="kd__sec kd__sec--row">
            <div>CALLS HANDLED, BY DAY<div className="kd__sub">{totalCalls} calls this week</div></div>
            <div className="kd__tools kd__tools--inline">
              <div className="kd__search"><i className="ti ti-search" /><input placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} /></div>
              <button className="kd__icon" onClick={csv} aria-label="Download CSV" title="Download CSV"><i className="ti ti-download" /></button>
            </div>
          </div>
          <div className="kd__scroll kd__box">
            <table className="kd__table">
              <thead><tr>{th('i', 'DAY')}{th('calls', 'CALLS HANDLED', 'kd__r')}{th('aht', 'AVG HANDLE TIME', 'kd__r')}</tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.day}>
                    <td>{r.day}</td>
                    <td className="kd__r"><span className="kd__bar kd__bar--blue"><i style={{ width: `${(r.calls / maxCalls) * 100}%` }} /></span>{r.calls}</td>
                    <td className="kd__r">{r.calls ? fmt(r.aht) : '—'}</td>
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan="3" className="kd__empty">No days match</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="kd__foot"><span>{rows.length ? `1–${rows.length} of ${rows.length}` : '0 of 0'}</span><span className="kd__pager">1/1</span></div>
        </div>
      </div>
    </Modal>
  );
}
