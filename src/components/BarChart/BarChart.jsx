// 7-day bar chart built with Chart.js (value labels drawn by a tiny inline plugin).
import { Bar } from 'react-chartjs-2';
import { BarElement, CategoryScale, Chart as ChartJS, LinearScale, Tooltip } from 'chart.js';
import './BarChart.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const palette = {
  green: { base: '#5dcaa5', today: '#0f6e56' },
  blue: { base: '#8fb0f0', today: '#1a5ca8' },
};

const valueLabels = {
  id: 'valueLabels',
  afterDatasetsDraw(chart, _args, opts) {
    const { ctx } = chart;
    chart.getDatasetMeta(0).data.forEach((bar, i) => {
      ctx.save();
      ctx.font = '700 12px Inter, sans-serif';
      ctx.fillStyle = '#555';
      ctx.textAlign = 'center';
      ctx.fillText(`${chart.data.datasets[0].data[i]}${opts.suffix || ''}`, bar.x, bar.y - 6);
      ctx.restore();
    });
  },
};

export default function BarChart({ data, suffix = '', color = 'green', unit = '' }) {
  const c = palette[color];
  const last = data.length - 1;
  const chartData = {
    labels: data.map((d) => d.day),
    datasets: [{
      data: data.map((d) => d.v),
      backgroundColor: data.map((_, i) => (i === last ? c.today : c.base)),
      borderRadius: 8, barPercentage: 0.9, categoryPercentage: 0.95,
    }],
  };
  const options = {
    responsive: true, maintainAspectRatio: false,
    layout: { padding: { top: 22 } },
    scales: {
      x: { grid: { display: false }, border: { display: false }, ticks: { color: '#8e8e93', font: { size: 12.5, weight: '600' } } },
      y: { display: false, beginAtZero: false, suggestedMin: Math.min(...data.map((d) => d.v)) * 0.4, suggestedMax: Math.max(...data.map((d) => d.v)) * 1.02 },
    },
    plugins: {
      legend: { display: false },
      valueLabels: { suffix },
      tooltip: { callbacks: { label: (ctx) => `${data[ctx.dataIndex].day}: ${ctx.parsed.y}${suffix}${unit}` } },
    },
    animation: { duration: 450 },
  };
  return (
    <div className="barchart card" role="img" aria-label={`Chart: ${data.map((d) => `${d.day} ${d.v}${suffix}`).join(', ')}`}>
      <Bar data={chartData} options={options} plugins={[valueLabels]} />
    </div>
  );
}
