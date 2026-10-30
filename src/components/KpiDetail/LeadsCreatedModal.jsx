// "Leads Created" KPI detail: stats, insight, trend chart and the table of leads the agent created.
import { useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { CategoryScale, Chart as ChartJS, Filler, LinearScale, LineElement, PointElement, Tooltip } from 'chart.js';
import Modal from '../Modal/Modal.jsx';
import { useUi } from '../../context/UiContext.jsx';
import { DEMO } from '../../data/demo.js';
import { useKpiData } from '../../data/kpiStats.js';
import { formatINR } from '../../data/selectors.js';
import './KpiDetail.css';

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Filler, Tooltip);

const PAGE = 5;
const HOURS = ['9am', '12pm', '3pm', '5pm', 'Now'];
const fit = (n) => (n >= 80 ? ['Strong fit', 'good'] : n >= 55 ? ['Partial fit', 'warn'] : ['Weak fit', 'bad']);
const tone = (n) => (n >= 80 ? 'good' : n >= 55 ? 'warn' : 'bad');

const first = (x) => String(x || '').toLowerCase().split(' ')[0];
const hourOf = (iso) => { const d = new Date(iso); return d.getHours() + d.getMinutes() / 60; };
const CUTS = [9, 12, 15, 17, 99];

export default function LeadsCreatedModal({ close }) {
  const { showToast } = useUi();
  const [q, setQ] = useState('');
  const [desc, setDesc] = useState(true);
  const [page, setPage] = useState(0);
  const { created, calledToday } = useKpiData();

  const rows = useMemo(() => created.map((l, i) => {
    const called = calledToday.some((c) => (c.leadId && c.leadId === l.id) || first(c.name) === first(l.name)) || (DEMO && !l.ingested && !l.manual && i < 2);
    return { ...l, called, next: called ? `Called · ${l.actionNote || 'follow-up noted'}` : `Call due ${l.callDue || (DEMO ? '4:30pm' : 'today')}` };
  }), [created, calledToday]);

  const total = rows.length;
  const calledN = rows.filter((r) => r.called).length;
  const pipeline = rows.reduce((s, r) => s + (Number(r.expectedValue) || 0), 0);
  const avg = total ? Math.round(rows.reduce((s, r) => s + (r.score || 0), 0) / total) : 0;
  const pending = rows.find((r) => !r.called);
  const prior = DEMO ? Math.max(total - 1, 0) : 0;
  const diff = total - prior;

  const shown = rows.filter((r) => r.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (desc ? b.score - a.score : a.score - b.score));
  const pages = Math.max(1, Math.ceil(shown.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const slice = shown.slice(cur * PAGE, cur * PAGE + PAGE);

  const thisLine = DEMO ? [0, 1, 2, 2, total].map((v) => Math.min(v, total)) : CUTS.map((cut, i) => (i === 4 ? total : rows.filter((r) => r.createdAt && hourOf(r.createdAt) < cut).length));
  const priorLine = DEMO ? [0, 1, 1, 2, 2].map((v) => Math.min(v, prior)) : [0, 0, 0, 0, 0];
  const max = Math.max(3, total, ...priorLine);

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

  const chartData = {
    labels: HOURS,
    datasets: [
      { label: 'This period', data: thisLine, borderColor: '#1a5ca8', backgroundColor: 'rgba(26,92,168,.12)', fill: true, tension: 0.35, pointRadius: [0, 0, 0, 0, 5], pointBackgroundColor: '#1a5ca8' },
      { label: 'Prior', data: priorLine, borderColor: '#9aa0b4', borderDash: [5, 5], fill: false, tension: 0.35, pointRadius: 0 },
    ],
  };
  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { min: 0, max: Math.ceil(max), ticks: { precision: 0, font: { size: 11 } }, grid: { color: '#eee' } },
      x: { ticks: { font: { size: 11 } }, grid: { display: false } },
    },
  };

  return (
    <Modal open onClose={close} width={760} label="Leads created">
      <div className="kd">
        <div className="kd__eyebrow">MY PROGRESS · VS SIMILAR PRIOR PERIOD</div>
        <div className="kd__head">
          <h2 className="kd__title">Leads Created</h2>
          <button className="kd__pdf" onClick={() => showToast('PDF to WhatsApp will work once the backend is connected')}>
            <i className="ti ti-brand-whatsapp" /> Send PDF
          </button>
        </div>
        <div className="kd__big">
          <span className="kd__num">{total}</span>
          {DEMO && <span className={`kd__delta kd__delta--${diff >= 0 ? 'good' : 'bad'}`}>{diff >= 0 ? '▲ +' : '▼ '}{diff}</span>}
          <span className="kd__muted">vs similar prior period</span>
        </div>

        <div className="kd__stats">
          <div className="kd__stat"><div className="kd__sl">PIPELINE</div><div className="kd__sv">{formatINR(pipeline)}</div></div>
          <div className="kd__stat"><div className="kd__sl">AVG ATTRACTIVENESS</div><div className="kd__sv">{avg}</div></div>
          <div className="kd__stat"><div className="kd__sl">CALLED</div><div className="kd__sv">{calledN} <small>of {total}</small></div></div>
        </div>

        <div className="kd__insight">
          <i className="ti ti-bulb" />
          <span>
            {!total ? 'No leads created yet. Leads you add will show up here.'
              : pending ? <><b>{pending.name}</b> is still to be called. His call is due at {pending.callDue || (DEMO ? '4:30pm' : 'today')}, and the lead cools after 24 hours.</>
                : 'Every lead you created has been called. Nice work.'}
          </span>
        </div>

        <div className="kd__sec">TREND · TODAY
          <span className="kd__legend"><i className="kd__ln" /> This period <i className="kd__ln kd__ln--dash" /> Prior</span>
        </div>
        <div className="kd__chart"><Line data={chartData} options={chartOpts} /></div>

        <div className="kd__sec">LEADS YOU CREATED</div>
        <div className="kd__tools">
          <div className="kd__search"><i className="ti ti-search" />
            <input placeholder="Search" value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} />
          </div>
          <button className="kd__icon" onClick={csv} aria-label="Download CSV" title="Download CSV"><i className="ti ti-download" /></button>
        </div>
        <div className="kd__scroll">
          <table className="kd__table">
            <thead><tr>
              <th>LEAD</th>
              <th className="kd__sort" onClick={() => setDesc(!desc)}>ATTRACTIVENESS <i className={`ti ti-arrow-${desc ? 'down' : 'up'}`} /></th>
              <th>ICP RATING</th><th>VALUE</th><th>NEXT STEP</th>
            </tr></thead>
            <tbody>
              {slice.map((r) => (
                <tr key={r.id}>
                  <td><b>{r.name}</b></td>
                  <td><span className={`kd__pill kd__pill--${tone(r.score)}`}>{r.score}</span></td>
                  <td><span className={`kd__pill kd__pill--${fit(r.icp)[1]}`}>{fit(r.icp)[0]} · {r.icp}</span></td>
                  <td>{formatINR(r.expectedValue || 0)}</td>
                  <td className={r.called ? '' : 'kd__due'}>{r.next}</td>
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
    </Modal>
  );
}
