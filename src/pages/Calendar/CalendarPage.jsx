// Calendar screen: month grid with event dots, month switcher, Today button, upcoming list.
import { useMemo, useState } from 'react';
import { TODAY, events as seedEvents, shareOptions } from '../../data/calendar.js';
import Modal from '../../components/Modal/Modal.jsx';
import { useUi } from '../../context/UiContext.jsx';
import { buildMonthCells, isSameDay, monthLabel, toKey } from '../../utils/calendar.js';
import './Calendar.css';

const WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function CalendarPage() {
  const { showToast } = useUi();
  const [events, setEvents] = useState(seedEvents);
  const [shareFor, setShareFor] = useState(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: '', date: '', time: '10:00 AM' });
  const [view, setView] = useState({ y: TODAY.getFullYear(), m: TODAY.getMonth() });
  const [selected, setSelected] = useState(TODAY);
  const cells = useMemo(() => buildMonthCells(view.y, view.m), [view]);
  const eventDays = useMemo(() => new Set(events.map((e) => e.date)), [events]);

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
          Experience centre visits, coaching sessions, and meeting invites all show up here — and in your mailbox.</div>

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

        <div className="label-caps cal__up">Upcoming <button className="cal__add" onClick={() => setAdding(true)}>+ New invite</button></div>
        {monthEvents.length === 0 && <div className="empty">Nothing scheduled</div>}
        {monthEvents.map((e) => {
          const d = new Date(`${e.date}T00:00:00`);
          const [time, ampm] = e.time.split(' ');
          return (
            <div key={e.id} className="cal__event card">
              <div className="cal__time"><b>{time.replace(/^0/, '')}</b><small>{ampm}</small></div>
              <div><div className="cal__etitle">{e.title}</div><div className="muted cal__ewho">{e.who}</div>
                <div className="cal__edate">{d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</div></div>
              <button className="cal__share" onClick={() => setShareFor(e)} aria-label={`Share ${e.title}`}><i className="ti ti-share" /> Share</button>
            </div>
          );
        })}
      </div>
      <Modal open={!!shareFor} onClose={() => setShareFor(null)} label="Share invite">
        {shareFor && (<div><h3>Share “{shareFor.title}”</h3>
          {shareOptions.map((o) => <button key={o.id} className="cal__opt" onClick={() => { showToast(`Invite shared with ${o.label}`); setShareFor(null); }}><span>{o.icon}</span><span><b>{o.label}</b><small>{o.sub}</small></span></button>)}</div>)}
      </Modal>
      <Modal open={adding} onClose={() => setAdding(false)} label="New invite">
        <h3>New invite</h3>
        <label className="cal__f">Title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
        <label className="cal__f">Date<input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
        <label className="cal__f">Time<input value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} placeholder="10:00 AM" /></label>
        <button className="btn-primary" disabled={!form.title.trim() || !form.date || !/^\d{1,2}:\d{2} (AM|PM)$/i.test(form.time)} onClick={() => { setEvents((l) => [...l, { id: 'e' + Date.now(), date: form.date, time: form.time.toUpperCase(), title: form.title.trim(), who: 'With you · added from Calendar' }]); setAdding(false); setForm({ title: '', date: '', time: '10:00 AM' }); showToast('Invite added to your calendar'); }}>Add invite</button>
      </Modal>
    </div>
  );
}
