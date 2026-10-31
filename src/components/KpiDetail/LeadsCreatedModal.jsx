// "Leads Created" KPI detail: stats, insight, trend chart and the table of leads the agent created.
import { useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, Filler, LinearScale, LineElement, PointElement, Tooltip } from 'chart.js';
import Modal from '../Modal/Modal.jsx';
import { useUi } from '../../context/UiContext.jsx';
import { DEMO } from '../../data/demo.js';
import { useKpiData } from '../../data/kpiStats.js';
import { formatINR } from '../../data/selectors.js';
import './KpiDetail.css';

ChartJS.register(LinearScale, LineElement, PointElement, Filler, Tooltip);

const PAGE = 5;
const LABELS = ['9am', '12pm', '3pm', '5pm', 'Now'];
const CUTS = [9, 12, 15, 17, 99];
const first = (x) => String(x || '').toLowerCase().split(' ')[0];
const hourOf = (iso) => { const d = new Date(iso); return d.getHours() + d.getMinutes() / 60; };
const fit = (n) => (n >= 80 ? ['Strong fit', 'good'] : n >= 55 ? ['Partial fit', 'warn'] : ['Weak fit', 'bad']);
const tone = (n) => (n >= 80 ? 'good' : n >= 55 ? 'warn' : 'bad');

// Sample rows (DEMO build only), exactly as in the design.
const DEMO_ROWS = [
  { id: 'd1', name: 'Mukunda R.', score: 91, icp: 87, expectedValue: 11200000, called: true, next: 'Called · cost sheet sent' },
  { id: 'd2', name: 'Kavitha R.', score: 63, icp: 74, expectedValue: 9800000, called: true, next: 'Called · price hold' },
  { id: 'd3', name: 'Faizan A.', score: 58, icp: 62, expectedValue: 14200000, called: false, next: 'Call due 4:30pm', due: '4:30pm' },
];
const COLS = [['name', 'LEAD', ''], ['score', 'ATTRACTIVENESS', 'kd__r'], ['icp', 'ICP RATING', 'kd__r'], ['expectedValue', 'VALUE', 'kd__r'], ['next', 'NEXT STEP', '']];

export default function LeadsCreatedModal({ close }) {
  const { showToast } = useUi();
  const { created, calledToday } = useKpiData();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState({ k: 'score', asc: false });
  const [page, setPage] = useState(0);

  const rows = useMemo(() => {
    const real = created.filter((l) => !DEMO || l.ingested || l.manual).map((l) => {
      const called = calledToday.some((c) => (c.leadId && c.leadId === l.id) || first(c.name) === first(l.name));
      return { id: l.id, name: l.name, score: l.score || 0, icp: l.icp || 0, expectedValue: l.expectedValue || 0, createdAt: l.createdAt, called, next: called ? `Called · ${l.actionNote || 'follow-up noted'}` : `Call due ${l.callDue || 'today'}`, due: l.callDue };
    });
    return DEMO ? [...DEMO_ROWS, ...real] : real;
  }, [created, calledToday]);

  const total = rows.length;
  const calledN = rows.filter((r) => r.called).length;
  const pipeline = rows.reduce((s, r) => s + (Number(r.expectedValue) || 0), 0);
  const avg = total ? Math.round(rows.reduce((s, r) => s + (r.score || 0), 0) / total) : 0;
  const pending = rows.find((r) => !r.called);
  const prior = DEMO ? Math.max(total - 1, 0) : 0;
  const diff = total - prior;

  const shown = rows.filter((r) => r.name.toLowerCase().includes(q.toLowerCase())).sort((a, b) => {
    const x = a[sort.k]; const y = b[sort.k];
    const c = typeof x === 'string' ? x.localeCompare(y) : x - y;
    return sort.asc ? c : -c;
  });
  const pages = Math.max(1, Math.ceil(shown.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const slice = shown.slice(cur * PAGE, cur * PAGE + PAGE);

  const csv = () => {
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const body = [['Lead', 'Attractiveness', 'ICP rating', 'Value', 'Next step'],
      ...shown.map((r) => [r.name, r.score, `${fit(r.icp)[0]} · ${r.icp}`, formatINR(r.expectedValue || 0), r.next])]
      .map((r) => r.map(esc).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([body], { type: 'text/csv' }));
    a.download = 'leads-created.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // Trend: x = 0..4 (9am, 12pm, 3pm, 5pm, Now). Sample data follows the design; real data counts leads created by each hour.
  const thisPts = DEMO
    ? [[0, 0], [0.5, 1], [1, 1], [1.5, 2], [2.5, 2], [3, 3], [4, 3]]
    : CUTS.map((cut, i) => [i, i === 4 ? total : rows.filter((r) => r.createdAt && hourOf(r.createdAt) < cut).length]);
  const priorPts = DEMO ? [[0, 0], [0.5, 0], [1, 1], [2, 1], [2.5, 2], [4, 2]] : CUTS.map((_, i) => [i, 0]);
  const ymax = DEMO ? 3.2 : Math.max(3, total);
  const data = {
    datasets: [
      { label: 'This period', data: thisPts.map(([x, y]) => ({ x, y })), borderColor: '#0f6e56', backgroundColor: 'rgba(15,110,86,.13)', fill: true, tension: 0, pointRadius: (c) => (c.dataIndex === thisPts.length - 1 ? 5 : 0), pointHoverRadius: 5, pointBackgroundColor: '#0f6e56', borderWidth: 2.5 },
      { label: 'Prior', data: priorPts.map(([x, y]) => ({ x, y })), borderColor: '#8fd0b8', borderDash: [6, 5], fill: false, tension: 0, pointRadius: 0, borderWidth: 2 },
    ],
  };
  const opts = {
    responsive: true, maintainAspectRatio: false, parsing: false,
    interaction: { mode: 'nearest', intersect: false },
    plugins: { legend: { display: false }, tooltip: { callbacks: { title: () => '', label: (c) => `${c.parsed.y}${c.datasetIndex ? ' prior' : ''}` } } },
    scales: {
      x: { type: 'linear', min: 0, max: 4, ticks: { stepSize: 1, callback: (v) => LABELS[v] || '', font: { size: 11 } }, grid: { display: false } },
      y: { min: 0, max: ymax, afterBuildTicks: (a) => { a.ticks = (DEMO ? [0.4, 1.8, 3.2] : [...Array(Math.ceil(ymax) + 1).keys()]).map((value) => ({ value })); },
        ticks: { precision: DEMO ? 1 : 0, font: { size: 11 } }, grid: { color: '#e9e9ef', borderDash: [2, 3] } },
    },
  };
  const th = ([k, label, cls]) => (
    <th key={k} className={`kd__sort ${cls}`} onClick={() => setSort((s) => ({ k, asc: s.k === k ? !s.asc : k === 'name' || k === 'next' }))}>
      {label} <i className={`ti ti-${sort.k === k ? (sort.asc ? 'arrow-up' : 'arrow-down') : 'arrows-sort'}`} />
    </th>
  );

  return (
    <Modal open onClose={close} width={880} flush label="Leads created">
      <div className="kd kd--green">
        <div className="kd__banner">
          <div><div className="kd__eyebrow">MY PROGRESS · VS SIMILAR PRIOR PERIOD</div><div className="kd__bt">Leads Created</div></div>
          <button className="kd__pdf" onClick={() => showToast('PDF to WhatsApp will work once the backend is connected')}>
            <i className="ti ti-brand-whatsapp" /> Send PDF
          </button>
        </div>
        <div className="kd__pad">
          <div className="kd__stats kd__stats--4">
            <div>
              <div className="kd__num">{total}</div>
              {DEMO && <span className={`kd__delta kd__delta--${diff >= 0 ? 'good' : 'bad'}`}>{diff >= 0 ? '▲ +' : '▼ '}{diff}</span>}
              <div className="kd__muted">vs similar prior period</div>
            </div>
            <div className="kd__stat"><div className="kd__sl">PIPELINE</div><div className="kd__sv">{formatINR(pipeline)}</div></div>
            <div className="kd__stat"><div className="kd__sl">AVG ATTRACTIVENESS</div><div className="kd__sv">{avg}</div></div>
            <div className="kd__stat"><div className="kd__sl">CALLED</div><div className="kd__sv">{calledN} <small>of {total}</small></div></div>
          </div>

          <div className="kd__insight kd__insight--green">
            <i className="ti ti-bulb" />
            <span>
              {!total ? 'No leads created yet. Leads you add will show up here.'
                : pending ? <><b>{pending.name}</b> is still to be called. {pending.due || DEMO ? <>His call is due at {pending.due || '4:30pm'}, and the lead cools after 24 hours.</> : 'The lead cools after 24 hours.'}</>
                  : 'Every lead you created has been called. Nice work.'}
            </span>
          </div>

          <div className="kd__card">
            <div className="kd__sec kd__sec--tight">TREND · TODAY
              <span className="kd__legend"><i className="kd__sw kd__sw--green" /> This period <i className="kd__ln kd__ln--dash kd__ln--greenl" /> Prior</span>
            </div>
            <div className="kd__chart kd__chart--tall"><Line data={data} options={opts} /></div>
          </div>

          <div className="kd__sec kd__sec--row">
            <div>LEADS YOU CREATED</div>
            <div className="kd__tools kd__tools--inline">
              <div className="kd__search"><i className="ti ti-search" /><input placeholder="Search" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} /></div>
              <button className="kd__icon" onClick={csv} aria-label="Download CSV" title="Download CSV"><i className="ti ti-download" /></button>
            </div>
          </div>
          <div className="kd__scroll kd__box">
            <table className="kd__table">
              <thead><tr>{COLS.map(th)}</tr></thead>
              <tbody>
                {slice.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td className="kd__r"><span className={`kd__pill kd__pill--${tone(r.score)}`}>{r.score}</span></td>
                    <td className="kd__r"><span className={`kd__pill kd__pill--${fit(r.icp)[1]}`}>{fit(r.icp)[0]} · {r.icp}</span></td>
                    <td className="kd__r kd__nw">{formatINR(r.expectedValue || 0)}</td>
                    <td>{r.next}</td>
                  </tr>
                ))}
                {!slice.length && <tr><td colSpan="5" className="kd__empty">No leads to show</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="kd__foot">
            <span>{shown.length ? `${cur * PAGE + 1}–${cur * PAGE + slice.length} of ${shown.length}` : '0 of 0'}</span>
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
