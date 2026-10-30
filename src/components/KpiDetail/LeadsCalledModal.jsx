// "Leads Called" KPI detail: calls made to the agent's leads today, with trend and outcomes.
import { useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { CategoryScale, Chart as ChartJS, Filler, LinearScale, LineElement, PointElement, Tooltip } from 'chart.js';
import Modal from '../Modal/Modal.jsx';
import { useUi } from '../../context/UiContext.jsx';
import { DEMO } from '../../data/demo.js';
import { useKpiData } from '../../data/kpiStats.js';
import './KpiDetail.css';

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Filler, Tooltip);

const PAGE = 8;
const HOURS = ['9am', '12pm', '3pm', '5pm', 'Now'];
const CUTS = [9, 12, 15, 17, 99]; // a call counts toward a bucket when it started before that hour
const DEMO_CALLS = [
  { time: '13:20', hour: 13.3, name: 'Mukunda R.', dur: 400, outcome: 'Cost sheet sent on WhatsApp', quote: true },
  { time: '15:45', hour: 15.75, name: 'Kavitha R.', dur: 252, outcome: 'Price hold, decides in 2 days', quote: false },
];
const fmt = (s) => `${Math.floor(s / 60)}m ${String(Math.round(s % 60)).padStart(2, '0')}s`;

export default function LeadsCalledModal({ close }) {
  const { showToast } = useUi();
  const { calledToday, created } = useKpiData();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState({ k: 'hour', asc: true });
  const [page, setPage] = useState(0);

  const calls = DEMO ? [...DEMO_CALLS, ...calledToday] : calledToday;
  const total = Math.max(created.length, calls.length);
  const n = calls.length;
  const avg = n ? calls.reduce((s, c) => s + c.dur, 0) / n : 0;
  const quotes = calls.filter((c) => c.quote).length;
  const line = CUTS.map((cut, i) => (i === 4 ? n : calls.filter((c) => c.hour < cut).length));

  const rows = useMemo(() => calls.filter((c) => `${c.name} ${c.outcome}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => {
      const x = a[sort.k]; const y = b[sort.k];
      const c = typeof x === 'string' ? x.localeCompare(y) : x - y;
      return sort.asc ? c : -c;
    }), [calls, q, sort]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const slice = rows.slice(cur * PAGE, cur * PAGE + PAGE);

  const csv = () => {
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const body = [['When', 'Lead', 'Duration', 'Outcome'], ...rows.map((r) => [`Today ${r.time}`, r.name, fmt(r.dur), r.outcome])].map((r) => r.map(esc).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([body], { type: 'text/csv' }));
    a.download = 'leads-called.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const data = {
    labels: HOURS,
    datasets: [
      { label: 'This period', data: line, borderColor: '#0f6e56', backgroundColor: 'rgba(15,110,86,.12)', fill: true, tension: 0, pointRadius: [0, 0, 0, 0, 5], pointHoverRadius: 5, pointBackgroundColor: '#0f6e56' },
      { label: 'Prior', data: [0, 0, 0, 0, 0], borderColor: '#5dcaa5', borderDash: [5, 5], fill: false, pointRadius: 0 },
    ],
  };
  const opts = {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { display: false } },
    scales: {
      y: { min: 0, max: Math.max(2, n), ticks: { precision: 0, font: { size: 11 } }, grid: { color: '#eee' } },
      x: { ticks: { font: { size: 11 } }, grid: { display: false } },
    },
  };
  const th = (k, label, cls = '') => (
    <th key={k} className={`kd__sort ${cls}`} onClick={() => setSort((s) => ({ k, asc: s.k === k ? !s.asc : true }))}>
      {label} <i className={`ti ti-${sort.k === k ? (sort.asc ? 'arrow-up' : 'arrow-down') : 'arrows-sort'}`} />
    </th>
  );

  return (
    <Modal open onClose={close} width={880} flush label="Leads Called">
      <div className="kd kd--green">
        <div className="kd__banner">
          <div><div className="kd__eyebrow">MY PROGRESS · VS SIMILAR PRIOR PERIOD</div><div className="kd__bt">Leads Called</div></div>
          <button className="kd__pdf" onClick={() => showToast('PDF to WhatsApp will work once the backend is connected')}>
            <i className="ti ti-brand-whatsapp" /> Send PDF
          </button>
        </div>
        <div className="kd__pad">
          <div className="kd__stats kd__stats--4 kd__stats--3b">
            <div>
              <div className="kd__num">{n}</div>
              {DEMO && <span className="kd__delta kd__delta--good">▲ +2</span>}
              <div className="kd__muted">vs similar prior period</div>
            </div>
            <div className="kd__stat"><div className="kd__sl">CALLED</div><div className="kd__sv">{n} of {total}</div></div>
            <div className="kd__stat"><div className="kd__sl">AVG CALL</div><div className="kd__sv">{n ? fmt(avg) : '—'}</div></div>
            <div className="kd__stat"><div className="kd__sl">QUOTES SENT</div><div className="kd__sv">{quotes}</div></div>
          </div>

          <div className="kd__card">
            <div className="kd__sec kd__sec--tight">TREND · TODAY
              <span className="kd__legend"><i className="kd__ln kd__ln--green" /> This period <i className="kd__ln kd__ln--dash kd__ln--greenl" /> Prior</span>
            </div>
            <div className="kd__chart"><Line data={data} options={opts} /></div>
          </div>

          <div className="kd__sec kd__sec--row">
            <div>CALLS TO YOUR LEADS<div className="kd__sub">{n} of {total} leads called. Confirmed sales appear here once ERP is connected.</div></div>
            <div className="kd__tools kd__tools--inline">
              <div className="kd__search"><i className="ti ti-search" /><input placeholder="Search" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} /></div>
              <button className="kd__icon" onClick={csv} aria-label="Download CSV" title="Download CSV"><i className="ti ti-download" /></button>
            </div>
          </div>
          <div className="kd__scroll kd__box">
            <table className="kd__table">
              <thead><tr>{th('hour', 'WHEN')}{th('name', 'LEAD')}{th('dur', 'DURATION', 'kd__r')}{th('outcome', 'OUTCOME')}</tr></thead>
              <tbody>
                {slice.map((r, i) => (
                  <tr key={`${r.time}-${i}`}>
                    <td>Today {r.time}</td><td>{r.name}</td><td className="kd__r">{fmt(r.dur)}</td>
                    <td><span className="kd__pill kd__pill--good">{r.outcome}</span></td>
                  </tr>
                ))}
                {!slice.length && <tr><td colSpan="4" className="kd__empty">No calls to leads yet</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="kd__foot">
            <span>{rows.length ? `${cur * PAGE + 1}–${cur * PAGE + slice.length} of ${rows.length}` : '0 of 0'}</span>
            <span className="kd__pager">
              <button disabled={cur === 0} onClick={() => setPage(cur - 1)} aria-label="Previous"><i className="ti ti-chevron-left" /></button>
              {cur + 1}/{pages}
              <button disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)} aria-label="Next"><i className="ti ti-chevron-right" /></button>
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
