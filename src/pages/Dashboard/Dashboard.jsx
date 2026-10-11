// Dashboard screen: hero + KPIs, progress/waiting, earnings/tasks, 7-day charts.
import { useNavigate } from 'react-router-dom';
import HeroHeader from './HeroHeader.jsx';
import { EarningsCard, ProgressCard, TasksCard, WhosWaiting } from './DashboardCards.jsx';
import BarChart from '../../components/BarChart/BarChart.jsx';
import { callsLast7, csatLast7 } from '../../data/dashboard.js';
import { useLeadsModal } from '../../context/LeadsModalContext.jsx';
import './Dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const { openLeads } = useLeadsModal();

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
          <div className="dash__col"><ProgressCard /><WhosWaiting /></div>
          <div className="dash__col"><EarningsCard /><TasksCard onTaskClick={onTaskClick} /></div>
        </div>
        <h2 className="label-caps dash__h">Calls handled · last 7 days</h2>
        <BarChart data={callsLast7} color="green" unit=" calls" />
        <h2 className="label-caps dash__h">CSAT trend · last 7 days</h2>
        <BarChart data={csatLast7} color="blue" suffix="%" />
      </div>
    </>
  );
}
