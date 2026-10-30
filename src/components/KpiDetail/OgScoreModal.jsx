// "OG Score" KPI detail: score, percentile, rank, earnings, insight, weekly trend and score-by-skill table.
import { useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { CategoryScale, Chart as ChartJS, Filler, LinearScale, LineElement, PointElement, Tooltip } from 'chart.js';
import Modal from '../Modal/Modal.jsx';
import { useUi } from '../../context/UiContext.jsx';
import { DEMO } from '../../data/demo.js';
import './KpiDetail.css';

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Filler, Tooltip);

const SKILLS = DEMO ? [
  { skill: 'Closing', score: 58, vs: -3, next: 'Ask for the booking before the demo ends' },
  { skill: 'Objections', score: 65, vs: -1, next: 'Use the EMI line on price push-back' },
  { skill: 'Possession date', score: 71, vs: 2, next: 'Explain the 10-year cover before price' },
  { skill: 'Product Knowledge', score: 78, vs: 3, next: 'Mention the possession date early' },
  { skill: 'Greeting', score: 82, vs: 4, next: 'Keep it up' },
] : [];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Today'];
const THIS = DEMO ? [64, 66, 71, 74, 76] : [0, 0, 0, 0, 0];
const PRIOR = DEMO ? [60, 61, 62, 63, 63] : [0, 0, 0, 0, 0];
const tone = (n) => (n >= 80 ? 'good' : n >= 65 ? 'warn' : 'bad');
const COLS = [['skill', 'SKILL'], ['score', 'SCORE'], ['vs', 'VS PRIOR'], ['next', 'NEXT STEP']];

export default function OgScoreModal({ close }) {
  const { showToast, openOverlay } = useUi();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState({ k: 'score', asc: true });

  const score = THIS[4];
  const delta = DEMO ? 13 : 0; // demo: +13 vs similar prior period
  const low = [...SKILLS].sort((a, b) => a.score - b.score)[0];

  const rows = useMemo(() => SKILLS.filter((r) => r.skill.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => {
      const x = a[sort.k]; const y = b[sort.k];
      const c = typeof x === 'string' ? x.localeCompare(y) : x - y;
      return sort.asc ? c : -c;
    }), [q, sort]);

  const csv = () => {
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const body = [['Skill', 'Score', 'Vs prior', 'Next step'], ...rows.map((r) => [r.skill, r.score, r.vs, r.next])]
      .map((r) => r.map(esc).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([body], { type: 'text/csv' }));
    a.download = 'og-score-by-skill.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const data = {
    labels: DAYS,
    datasets: [
      { label: 'This period', data: THIS, borderColor: '#a8700a', backgroundColor: 'rgba(168,112,10,.14)', fill: true, tension: 0.35, pointRadius: [0, 0, 0, 0, 5], pointHoverRadius: 5, pointBackgroundColor: '#a8700a' },
      { label: 'Prior', data: PRIOR, borderColor: '#e0c690', borderDash: [5, 5], fill: false, tension: 0.35, pointRadius: 0 },
    ],
  };
  const opts = {
    responsive: true, maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${c.parsed.y}${c.datasetIndex ? ' prior' : ''}` } } },
    scales: {
      y: DEMO ? { min: 59, max: 77, ticks: { stepSize: 9, font: { size: 11 } }, grid: { color: '#eee' } } : { min: 0, max: 100, ticks: { font: { size: 11 } }, grid: { color: '#eee' } },
      x: { ticks: { font: { size: 11 } }, grid: { display: false } },
    },
  };

  return (
    <Modal open onClose={close} width={800} flush label="OG Score" >
      <div className="kd kd--gold">
        <div className="kd__banner">
          <div><div className="kd__eyebrow">MY PROGRESS</div><div className="kd__bt">OG Score™</div></div>
          <button className="kd__pdf" onClick={() => showToast('PDF to WhatsApp will work once the backend is connected')}>
            <i className="ti ti-brand-whatsapp" /> Send PDF
          </button>
        </div>
        <div className="kd__pad">
          <div className="kd__stats kd__stats--4">
            <div>
              <div className="kd__num">{score}</div>
              {DEMO && <span className="kd__delta kd__delta--good">▲ +{delta}</span>}
              <div className="kd__muted">vs similar prior period</div>
            </div>
            <div className="kd__stat"><div className="kd__sl">PERCENTILE</div><div className="kd__sv">{DEMO ? '72nd' : '—'}</div><div className="kd__muted">across all staff</div></div>
            <div className="kd__stat kd__tap" onClick={() => openOverlay('rank')} role="button"><div className="kd__sl">EXPERIENCE CENTRE RANK</div><div className="kd__sv">{DEMO ? '#3' : '—'}</div><div className="kd__muted">tap to see why</div></div>
            <div className="kd__stat"><div className="kd__sl">EARNINGS THIS MONTH</div><div className="kd__sv">{DEMO ? '₹5,200' : '₹0'}</div><div className="kd__muted">incl. coached moves</div></div>
          </div>

          <div className="kd__insight kd__insight--gold">
            <i className="ti ti-bulb" />
            <span>{low ? <><b>{low.skill}</b> is your biggest lever. +5 pts there unlocks about <b>+4% earning potential</b>.</> : 'Your skill scores will appear here once calls are scored.'}</span>
          </div>

          <div className="kd__card">
            <div className="kd__sec kd__sec--tight">TREND · THIS WEEK
              <span className="kd__legend"><i className="kd__ln kd__ln--gold" /> This period <i className="kd__ln kd__ln--dash kd__ln--goldl" /> Prior</span>
            </div>
            <div className="kd__chart"><Line data={data} options={opts} /></div>
          </div>

          <div className="kd__sec kd__sec--row">
            <div>SCORE BY SKILL<div className="kd__sub">Lowest first</div></div>
            <div className="kd__tools kd__tools--inline">
              <div className="kd__search"><i className="ti ti-search" /><input placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} /></div>
              <button className="kd__icon" onClick={csv} aria-label="Download CSV" title="Download CSV"><i className="ti ti-download" /></button>
            </div>
          </div>
          <div className="kd__scroll kd__box">
            <table className="kd__table">
              <thead><tr>
                {COLS.map(([k, label]) => (
                  <th key={k} className="kd__sort" onClick={() => setSort((s) => ({ k, asc: s.k === k ? !s.asc : true }))}>
                    {label} <i className={`ti ti-${sort.k === k ? (sort.asc ? 'arrow-up' : 'arrow-down') : 'arrows-sort'}`} />
                  </th>
                ))}
              </tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.skill}>
                    <td>{r.skill}</td>
                    <td><span className="kd__bar"><i style={{ width: `${r.score}%` }} /></span><span className={`kd__pill kd__pill--${tone(r.score)}`}>{r.score}</span></td>
                    <td className={r.vs < 0 ? 'kd__neg' : 'kd__pos'}>{r.vs < 0 ? '▼' : '▲'} {r.vs < 0 ? Math.abs(r.vs) : `+${r.vs}`}</td>
                    <td>{r.next}</td>
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan="4" className="kd__empty">No skill scores yet</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
}
