import React, { useState } from 'react';
import { hoursUntilDue } from '../utils/urgency';
import styles from './UrgentBanner.module.css';

export default function UrgentBanner({ tasks, courseMap = {}, onTaskClick }) {
  const [collapsed, setCollapsed] = useState(false);
  if (!tasks.length) return null;

  return (
    <div className={styles.banner}>
      <div className={styles.header} onClick={() => setCollapsed(!collapsed)}>
        <span className={styles.pulse} />
        <span className={styles.title}>Urgent — {tasks.length} task{tasks.length > 1 ? 's' : ''} due soon</span>
        <span className={styles.toggle}>{collapsed ? '▾' : '▴'}</span>
      </div>

      {!collapsed && (
        <div className={styles.list}>
          {tasks.map((t) => {
            const h = hoursUntilDue(t.due_date);
            const overdue = h < 0;
            const label = overdue
              ? `Overdue by ${Math.abs(Math.round(h))}h`
              : h < 1
              ? 'Due in less than 1h'
              : `Due in ${Math.round(h)}h`;
            const course = t.course_id ? courseMap[t.course_id] : null;

            return (
              <div
                key={t.id}
                className={`${styles.chip} ${overdue ? styles.overdue : ''}`}
                style={{ borderColor: t.color_label || '#c9b8e8' }}
                onClick={() => onTaskClick(t)}
              >
                {course && (
                  <span className={styles.courseDot} style={{ background: course.color }} />
                )}
                <span className={styles.chipTitle}>{t.title}</span>
                <span className={styles.chipTime}>{label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
