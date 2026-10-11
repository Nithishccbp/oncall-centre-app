// Calendar screen: month grid with event dots, month switcher, Today button, upcoming list.
import { useMemo, useState } from 'react';
import { TODAY, events } from '../../data/calendar.js';
import { buildMonthCells, isSameDay, monthLabel, toKey } from '../../utils/calendar.js';
import './Calendar.css';

const WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function CalendarPage() {
  const [view, setView] = useState({ y: TODAY.getFullYear(), m: TODAY.getMonth() });
  const [selected, setSelected] = useState(TODAY);
  const cells = useMemo(() => buildMonthCells(view.y, view.m), [view]);
  const eventDays = useMemo(() => new Set(events.map((e) => e.date)), []);

  const shift = (delta) => {
    const d = new Date(view.y, view.m + delta, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };
  const goToday = () => { setView({ y: TODAY.getFullYear(), m: TODAY.getMonth() }); setSelected(TODAY); };

  const monthEvents = events
    .filter((e) => e.date.startsWith(`${view.y}-${String(view.m + 1).padStart(2, '0')}`))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="cal page-pad">
      <div className="cal__wrap">
        <h1 className="cal__title"><i className="ti ti-calendar" /> Calendar</h1>
        <p className="cal__sub">Mirrored from your mailbox — invites created here land there too</p>
        <div className="cal__banner"><span><i className="ti ti-mail" /></span>
          Store visits, coaching sessions, and meeting invites all show up here — and in your mailbox.</div>

        <div className="cal__card card">
          <div className="cal__nav">
            <button className="cal__arrow" onClick={() => shift(-1)} aria-label="Previous month"><i className="ti ti-chevron-left" /></button>
            <b>{monthLabel(view.y, view.m)}</b>
            <span className="cal__nav-right">
              <button className="cal__today" onClick={goToday}>Today</button>
              <button className="cal__arrow" onClick={() => shift(1)} aria-label="Next month"><i className="ti ti-chevron-right" /></button>
            </span>
          </div>
          <div className="cal__week">{WEEK.map((d, i) => <span key={i}>{d}</span>)}</div>
          <div className="cal__grid">
            {cells.map((c, i) => {
              if (!c.date) return <span key={`b${i}`} />;
              const isToday = isSameDay(c.date, TODAY);
              const isSel = isSameDay(c.date, selected);
              return (
                <button key={i} onClick={() => setSelected(c.date)} aria-label={c.date.toDateString()}
                  className={`cal__day ${isToday ? 'is-today' : ''} ${isSel ? 'is-sel' : ''}`}>
                  {c.date.getDate()}
                  {eventDays.has(toKey(c.date)) && <i className="cal__dot" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="label-caps cal__up">Upcoming</div>
        {monthEvents.length === 0 && <div className="empty">Nothing scheduled</div>}
        {monthEvents.map((e) => {
          const d = new Date(`${e.date}T00:00:00`);
          const [time, ampm] = e.time.split(' ');
          return (
            <div key={e.id} className="cal__event card">
              <div className="cal__time"><b>{time.replace(/^0/, '')}</b><small>{ampm}</small></div>
              <div><div className="cal__etitle">{e.title}</div><div className="muted cal__ewho">{e.who}</div>
                <div className="cal__edate">{d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</div></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
