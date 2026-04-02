import React, { useState } from 'react';
import styles from './TaskCard.module.css';

const PRIORITY_LABEL = { low: 'Low', medium: 'Medium', high: 'High' };
const PRIORITY_COLOR = { low: '#b5ccb8', medium: '#f7d4b5', high: '#f5c6d0' };

export default function TaskCard({ task, isDragging, onEdit, onDelete, course }) {
  const [showMenu, setShowMenu] = useState(false);

  const dueLabel = task.due_date
    ? new Date(task.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : null;

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.column_id;

  return (
    <div
      className={`${styles.card} ${isDragging ? styles.dragging : ''}`}
      style={{ borderLeft: `4px solid ${task.color_label || '#c9b8e8'}` }}
    >
      {/* Color dot + title row */}
      <div className={styles.top}>
        <span className={styles.title}>{task.title}</span>
        <div className={styles.menuWrap}>
          <button className={styles.menuBtn} onClick={() => setShowMenu(!showMenu)}>⋯</button>
          {showMenu && (
            <div className={styles.menu} onMouseLeave={() => setShowMenu(false)}>
              <button onClick={() => { setShowMenu(false); onEdit(); }}>Edit</button>
              <button className={styles.del} onClick={() => { setShowMenu(false); onDelete(); }}>Delete</button>
            </div>
          )}
        </div>
      </div>

      {task.description && (
        <p className={styles.desc}>{task.description}</p>
      )}

      <div className={styles.meta}>
        {course && (
          <span className={styles.course} style={{ background: course.color }}>
            {course.name}
          </span>
        )}
        {dueLabel && (
          <span className={`${styles.due} ${isOverdue ? styles.overdue : ''}`}>
            {dueLabel}
          </span>
        )}
        <span
          className={styles.priority}
          style={{ background: PRIORITY_COLOR[task.priority] || '#eee' }}
        >
          {PRIORITY_LABEL[task.priority] || task.priority}
        </span>
      </div>
    </div>
  );
}
