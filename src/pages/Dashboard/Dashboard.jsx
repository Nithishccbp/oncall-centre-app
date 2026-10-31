// Dashboard screen: hero + KPIs, progress/waiting, earnings/tasks, 7-day charts.
import { useNavigate } from 'react-router-dom';
import HeroHeader from './HeroHeader.jsx';
import { EarningsCard, TasksCard, WhosWaiting, TodaysCalls, LeadsNext, ThanksVisits } from './DashboardCards.jsx';
import BarChart from '../../components/BarChart/BarChart.jsx';
import { callsLast7 as demoCalls, csatLast7 as demoCsat } from '../../data/dashboard.js';
import { DEMO } from '../../data/demo.js';
import { useKpiData } from '../../data/kpiStats.js';
import { useLeadsModal } from '../../context/LeadsModalContext.jsx';
import './Dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const { openLeads } = useLeadsModal();
  const { week, csatToday } = useKpiData();
  const callsLast7 = DEMO ? demoCalls : week.map((w) => ({ day: w.day, v: w.calls }));
  const csatLast7 = DEMO ? demoCsat : week.map((w, i) => ({ day: w.day, v: i === 6 ? (csatToday ?? 0) : w.csat || 0 }));

  const onTaskClick = (task) => {
    if (task.id === 'hotleads') openLeads(0);
    else if (task.id === 'callbacks') navigate('/pulse/callcentre-team');
    else navigate('/pulse/avanibot');
  };

  return (
    <>
      <HeroHeader />
      <div className="dash page-pad">
        <div className="dash__grid">
          <div className="dash__col"><WhosWaiting /><TodaysCalls /><LeadsNext onOpen={openLeads} /></div>
          <div className="dash__col"><EarningsCard /><ThanksVisits /><TasksCard onTaskClick={onTaskClick} />
            <section className="card dcard"><div className="dcard__head"><b className="label-caps">This week</b><span className="muted">Mon to today</span></div>
              <h3 className="dash__sub">Calls handled · {callsLast7.reduce((n, d) => n + d.v, 0)}</h3><BarChart data={callsLast7} color="green" unit=" calls" />
              <h3 className="dash__sub">CSAT · {csatLast7[csatLast7.length - 1].v}% today</h3><BarChart data={csatLast7} color="blue" suffix="%" /></section></div>
        </div>
      </div>
    </>
  );
}
