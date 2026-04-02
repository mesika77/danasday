import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getCalendarEvents } from '../api';
import EventModal from '../components/EventModal';
import styles from './CalendarView.module.css';

const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

function startOfMonth(y, m) { return new Date(y, m, 1); }
function daysInMonth(y, m)  { return new Date(y, m + 1, 0).getDate(); }

export default function CalendarView() {
  const { user } = useAuth();
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents]       = useState([]);
  const [editEvent, setEditEvent] = useState(null);  // event to edit
  const [addDate, setAddDate]     = useState(null);  // date string for new event

  const loadEvents = () => {
    if (!user) return;
    const timeMin = new Date(year, month, 1).toISOString();
    const timeMax = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
    getCalendarEvents(timeMin, timeMax)
      .then(({ data }) => setEvents(data))
      .catch(() => {});
  };

  useEffect(loadEvents, [user, year, month]);

  const prevMonth = () => { if (month === 0) { setYear(y => y-1); setMonth(11); } else setMonth(m => m-1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y+1); setMonth(0); } else setMonth(m => m+1); };

  // Build calendar grid
  const firstDay = startOfMonth(year, month).getDay();
  const totalDays = daysInMonth(year, month);
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  // Map events to date strings
  const eventsByDate = {};
  events.forEach((ev) => {
    const dateStr = (ev.start.date || ev.start.dateTime || '').slice(0, 10);
    if (!eventsByDate[dateStr]) eventsByDate[dateStr] = [];
    eventsByDate[dateStr].push(ev);
  });

  const todayStr = today.toISOString().slice(0, 10);

  return (
    <div className={styles.wrap}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.nav}>
          <button onClick={prevMonth}>‹</button>
          <h2>{MONTHS[month]} {year}</h2>
          <button onClick={nextMonth}>›</button>
        </div>
        <button className={styles.todayBtn} onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }}>
          Today
        </button>
      </div>

      {/* Day labels */}
      <div className={styles.grid}>
        {DAYS.map((d) => <div key={d} className={styles.dayLabel}>{d}</div>)}

        {/* Calendar cells */}
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} className={styles.emptyCell} />;
          const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const dayEvents = eventsByDate[dateStr] || [];
          const isToday = dateStr === todayStr;

          return (
            <div
              key={dateStr}
              className={`${styles.cell} ${isToday ? styles.today : ''}`}
              onClick={() => setAddDate(dateStr)}
            >
              <span className={styles.dayNum}>{day}</span>
              <div className={styles.eventList}>
                {dayEvents.slice(0, 3).map((ev) => (
                  <div
                    key={ev.id}
                    className={styles.eventChip}
                    onClick={(e) => { e.stopPropagation(); setEditEvent(ev); }}
                    title={ev.summary}
                  >
                    {ev.summary}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className={styles.more}>+{dayEvents.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {(editEvent || addDate) && (
        <EventModal
          event={editEvent || null}
          defaultDate={addDate}
          onClose={() => { setEditEvent(null); setAddDate(null); }}
          onSaved={() => { setEditEvent(null); setAddDate(null); loadEvents(); }}
        />
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" style={{ marginRight: 8 }}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}
