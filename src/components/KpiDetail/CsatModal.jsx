// "CSAT" KPI detail: today's score vs weekly average, ratings split, weekly trend and today's rated calls.
import { useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { CategoryScale, Chart as ChartJS, Filler, LinearScale, LineElement, PointElement, Tooltip } from 'chart.js';
import Modal from '../Modal/Modal.jsx';
import { useUi } from '../../context/UiContext.jsx';
import { useIngest } from '../../context/IngestContext.jsx';
import { DEMO } from '../../data/demo.js';
import { csatLast7 } from '../../data/dashboard.js';
import './KpiDetail.css';

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Filler, Tooltip);

const PAGE = 8;
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'];
const PRIOR = DEMO ? [90, 90, 89, 91, 90, 90, 91] : [0, 0, 0, 0, 0, 0, 0];
const DEMO_CALLS = [
  ['09:00', 'Priya I.', 4, 'Clear on EMI'], ['09:17', 'Suresh N.', 5, 'Quick resolution'], ['10:34', 'Meera K.', 5, 'Patient and polite'],
  ['10:51', 'Anil P.', 5, 'Explained RERA possession date well'], ['11:08', 'Divya R.', 4, 'Fixed possession date'], ['12:25', 'Karthik S.', 5, 'Good product advice'],
  ['12:42', 'Leena M.', 5, 'Fast callback'], ['13:16', 'Sneha B.', 4, 'Friendly'], ['13:40', 'Ravi T.', 5, 'Helpful with the cost sheet'],
  ['14:05', 'Nisha G.', 4, 'Listened well'], ['14:30', 'Arjun V.', 5, 'Sorted my loan doubt'], ['15:02', 'Pooja D.', 5, 'Polite'],
  ['15:20', 'Manoj K.', 3, 'Long wait before pick-up'], ['15:48', 'Hema L.', 5, 'Excellent'],
].map(([time, name, stars, comment]) => ({ time, name, stars, comment }));

const Stars = ({ n }) => <span className="kd__stars" aria-label={`${n} stars`}>{'★'.repeat(n)}<i>{'★'.repeat(5 - n)}</i></span>;

export default function CsatModal({ close }) {
  const { showToast } = useUi();
  const { ratedToday, csatToday } = useIngest();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState({ k: 'time', asc: true });
  const [page, setPage] = useState(0);

  const calls = DEMO ? DEMO_CALLS : ratedToday || [];
  const total = calls.length;
  const pct = DEMO ? 94 : (csatToday || 0);
  const five = calls.filter((c) => c.stars === 5).length;
  const split = [5, 4, 3, 2, 1].map((n) => [n, calls.filter((c) => c.stars === n).length]).filter(([n, c]) => c || n >= 3);
  const lowest = total ? Math.min(...calls.map((c) => c.stars)) : 0;
  const lowCall = calls.find((c) => c.stars === lowest);
  const thisLine = DEMO ? csatLast7.map((x) => x.v) : [0, 0, 0, 0, 0, 0, pct];

  const rows = useMemo(() => calls.filter((c) => `${c.name} ${c.comment}`.toLowerCase().includes(q.toLowerCase()))
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
    const body = [['Time', 'Caller', 'Rating', 'Comment'], ...rows.map((r) => [r.time, r.name, r.stars, r.comment])].map((r) => r.map(esc).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([body], { type: 'text/csv' }));
    a.download = 'csat-rated-calls.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const data = {
    labels: DAYS,
    datasets: [
      { label: 'This period', data: thisLine, borderColor: '#1a56c4', backgroundColor: 'rgba(26,86,196,.12)', fill: true, tension: 0, pointRadius: [0, 0, 0, 0, 0, 0, 5], pointHoverRadius: 5, pointBackgroundColor: '#1a56c4' },
      { label: 'Prior', data: PRIOR, borderColor: '#9db8ea', borderDash: [5, 5], fill: false, tension: 0.3, pointRadius: 0 },
    ],
  };
  const opts = {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${c.parsed.y}%${c.datasetIndex ? ' prior' : ''}` } } },
    scales: {
      y: DEMO ? { min: 85, max: 94, ticks: { stepSize: 4.5, callback: (v) => `${Math.round(v)}%`, font: { size: 11 } }, grid: { color: '#eee' } }
        : { min: 0, max: 100, ticks: { callback: (v) => `${v}%`, font: { size: 11 } }, grid: { color: '#eee' } },
      x: { ticks: { font: { size: 11 } }, grid: { display: false } },
    },
  };
  const th = (k, label) => (
    <th key={k} className="kd__sort" onClick={() => setSort((s) => ({ k, asc: s.k === k ? !s.asc : true }))}>
      {label} <i className={`ti ti-${sort.k === k ? (sort.asc ? 'arrow-up' : 'arrow-down') : 'arrows-sort'}`} />
    </th>
  );

  return (
    <Modal open onClose={close} width={880} flush label="CSAT">
      <div className="kd kd--blue">
        <div className="kd__banner">
          <div><div className="kd__eyebrow">TODAY · VS YOUR WEEKLY AVERAGE</div><div className="kd__bt">CSAT</div></div>
          <button className="kd__pdf" onClick={() => showToast('PDF to WhatsApp will work once the backend is connected')}>
            <i className="ti ti-brand-whatsapp" /> Send PDF
          </button>
        </div>
        <div className="kd__pad">
          <div className="kd__stats kd__stats--4">
            <div>
              <div className="kd__num">{pct}%</div>
              {DEMO && <span className="kd__delta kd__delta--good">▲ +2pts</span>}
              <div className="kd__muted">vs similar prior period</div>
            </div>
            <div className="kd__stat"><div className="kd__sl">RATED CALLS</div><div className="kd__sv">{total}</div></div>
            <div className="kd__stat"><div className="kd__sl">5-STAR</div><div className="kd__sv">{five}</div><div className="kd__muted">{total ? Math.round((five / total) * 100) : 0}%</div></div>
            <div className="kd__stat"><div className="kd__sl">LOWEST</div><div className="kd__sv">{total ? `${lowest}★` : '—'}</div><div className="kd__muted">{lowCall?.comment ? lowCall.comment.split(/\s+/).slice(0, 2).join(' ').toLowerCase() : ' '}</div></div>
          </div>

          <div className="kd__insight kd__insight--blue">
            <i className="ti ti-bulb" />
            <span>{!total ? 'No rated calls yet. Customer ratings will appear here after each call.'
              : lowest >= 5 ? 'Every rated call today got 5 stars. Keep it up.'
                : DEMO ? <>The only 3-star call mentions the <b>wait</b>, not the answer. Pick up queued callers first.</>
                  : <>Your lowest rating today is {lowest}★{lowCall?.comment ? <> — “{lowCall.comment}”</> : ''}. Review that call first.</>}</span>
          </div>

          <div className="kd__two">
            <div className="kd__card">
              <div className="kd__sec kd__sec--tight">TREND · LAST 7 DAYS
                <span className="kd__legend"><i className="kd__ln" /> This period <i className="kd__ln kd__ln--dash kd__ln--bluel" /> Prior</span>
              </div>
              <div className="kd__chart"><Line data={data} options={opts} /></div>
            </div>
            <div className="kd__card">
              <div className="kd__sec kd__sec--tight">RATINGS</div>
              {split.map(([n, c]) => (
                <div className="kd__rate" key={n}>
                  <span>{n}★</span>
                  <span className="kd__rbar"><i style={{ width: `${total ? (c / total) * 100 : 0}%` }} /></span>
                  <b>{c}</b>
                </div>
              ))}
            </div>
          </div>

          <div className="kd__sec kd__sec--row">
            <div>TODAY&apos;S RATED CALLS<div className="kd__sub">{total} rated call{total === 1 ? '' : 's'}</div></div>
            <div className="kd__tools kd__tools--inline">
              <div className="kd__search"><i className="ti ti-search" /><input placeholder="Search" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} /></div>
              <button className="kd__icon" onClick={csv} aria-label="Download CSV" title="Download CSV"><i className="ti ti-download" /></button>
            </div>
          </div>
          <div className="kd__scroll kd__box">
            <table className="kd__table">
              <thead><tr>{th('time', 'TIME')}{th('name', 'CALLER')}{th('stars', 'RATING')}{th('comment', 'COMMENT')}</tr></thead>
              <tbody>
                {slice.map((r, i) => (
                  <tr key={`${r.time}-${i}`}>
                    <td>{r.time}</td><td>{r.name}</td><td><Stars n={r.stars} /></td><td>{r.comment}</td>
                  </tr>
                ))}
                {!slice.length && <tr><td colSpan="4" className="kd__empty">No rated calls yet</td></tr>}
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
