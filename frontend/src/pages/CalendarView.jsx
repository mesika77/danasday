import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getCalendarEvents } from '../api';
import EventModal from '../components/EventModal';
import styles from './CalendarView.module.css';

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function getWeekStart(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

export default function CalendarView() {
  const { user } = useAuth();
  const today = new Date();
  const todayStr = toDateStr(today);

  // Month view
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  // Week view
  const [weekStart, setWeekStart] = useState(() => getWeekStart(today));

  // View mode — default week on mobile
  const [view, setView] = useState(() => window.innerWidth <= 640 ? 'week' : 'month');

  const [events, setEvents]       = useState([]);
  const [editEvent, setEditEvent] = useState(null);
  const [addDate, setAddDate]     = useState(null);

  const loadEvents = () => {
    if (!user) return;
    const timeMin = view === 'week'
      ? weekStart.toISOString()
      : new Date(year, month, 1).toISOString();
    const timeMax = view === 'week'
      ? addDays(weekStart, 7).toISOString()
      : new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    getCalendarEvents(timeMin, timeMax)
      .then(({ data }) => setEvents(data))
      .catch(() => {});
  };

  useEffect(loadEvents, [user, year, month, view, weekStart]);

  // Map events → date string
  const eventsByDate = {};
  events.forEach((ev) => {
    const d = (ev.start.date || ev.start.dateTime || '').slice(0, 10);
    if (!eventsByDate[d]) eventsByDate[d] = [];
    eventsByDate[d].push(ev);
  });

  // Navigation
  const prevMonth = () => { if (month === 0) { setYear(y => y-1); setMonth(11); } else setMonth(m => m-1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y+1); setMonth(0); } else setMonth(m => m+1); };
  const prevWeek  = () => setWeekStart(d => addDays(d, -7));
  const nextWeek  = () => setWeekStart(d => addDays(d, 7));
  const goToday   = () => {
    setYear(today.getFullYear()); setMonth(today.getMonth());
    setWeekStart(getWeekStart(today));
  };

  const weekEnd = addDays(weekStart, 6);
  const weekLabel = weekStart.getMonth() === weekEnd.getMonth()
    ? `${MONTHS_SHORT[weekStart.getMonth()]} ${weekStart.getDate()}–${weekEnd.getDate()}, ${weekEnd.getFullYear()}`
    : `${MONTHS_SHORT[weekStart.getMonth()]} ${weekStart.getDate()} – ${MONTHS_SHORT[weekEnd.getMonth()]} ${weekEnd.getDate()}, ${weekEnd.getFullYear()}`;

  const onClose = () => { setEditEvent(null); setAddDate(null); };
  const onSaved = () => { onClose(); loadEvents(); };

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div className={styles.nav}>
          <button onClick={view === 'week' ? prevWeek : prevMonth}>‹</button>
          <h2>{view === 'week' ? weekLabel : `${MONTHS[month]} ${year}`}</h2>
          <button onClick={view === 'week' ? nextWeek : nextMonth}>›</button>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.todayBtn} onClick={goToday}>Today</button>
          <button
            className={styles.viewToggle}
            onClick={() => setView(v => v === 'week' ? 'month' : 'week')}
          >
            {view === 'week' ? 'Month' : 'Week'}
          </button>
        </div>
      </div>

      {view === 'month' ? (
        <div className={styles.grid}>
          {DAYS_SHORT.map((d) => <div key={d} className={styles.dayLabel}>{d}</div>)}
          {(() => {
            const firstDay = new Date(year, month, 1).getDay();
            const totalDays = new Date(year, month + 1, 0).getDate();
            const cells = [];
            for (let i = 0; i < firstDay; i++) cells.push(null);
            for (let d = 1; d <= totalDays; d++) cells.push(d);
            return cells.map((day, i) => {
              if (!day) return <div key={`e-${i}`} className={styles.emptyCell} />;
              const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
              const dayEvents = eventsByDate[dateStr] || [];
              const isToday = dateStr === todayStr;
              return (
                <div key={dateStr} className={`${styles.cell} ${isToday ? styles.today : ''}`}
                  onClick={() => setAddDate(dateStr)}>
                  <span className={styles.dayNum}>{day}</span>
                  <div className={styles.eventList}>
                    {dayEvents.slice(0, 3).map((ev) => (
                      <div key={ev.id} className={styles.eventChip}
                        onClick={(e) => { e.stopPropagation(); setEditEvent(ev); }}
                        title={ev.summary}>{ev.summary}</div>
                    ))}
                    {dayEvents.length > 3 && <div className={styles.more}>+{dayEvents.length - 3} more</div>}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      ) : (
        <div className={styles.weekList}>
          {Array.from({ length: 7 }, (_, i) => {
            const date = addDays(weekStart, i);
            const dateStr = toDateStr(date);
            const dayEvents = eventsByDate[dateStr] || [];
            const isToday = dateStr === todayStr;
            const dayName = DAYS_SHORT[date.getDay()];
            const label = `${dayName}, ${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
            return (
              <div key={dateStr} className={`${styles.weekRow} ${isToday ? styles.todayRow : ''}`}
                onClick={() => setAddDate(dateStr)}>
                <div className={`${styles.weekDayLabel} ${isToday ? styles.todayDayLabel : ''}`}>
                  {label}
                </div>
                <div className={styles.weekEvents}>
                  {dayEvents.length === 0
                    ? <span className={styles.noEvents}>No events</span>
                    : dayEvents.map((ev) => (
                      <div key={ev.id} className={styles.weekEventChip}
                        onClick={(e) => { e.stopPropagation(); setEditEvent(ev); }}>
                        <span className={styles.weekEventTime}>
                          {ev.start.dateTime
                            ? new Date(ev.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : 'All day'}
                        </span>
                        <span className={styles.weekEventTitle}>{ev.summary}</span>
                      </div>
                    ))
                  }
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(editEvent || addDate) && (
        <EventModal
          event={editEvent || null}
          defaultDate={addDate}
          onClose={onClose}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
