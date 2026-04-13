import React, { useRef } from 'react';
import styles from './TaskCard.module.css';

const PRIORITY_LABEL = { low: 'Low', medium: 'Medium', high: 'High' };
const PRIORITY_COLOR = { low: '#b5ccb8', medium: '#f7d4b5', high: '#f5c6d0' };
const TYPE_LABEL = {
  homework:   'Homework',
  lab_report: 'Lab Report',
  work:       'Work',
  practice:   'Practice',
};

export default function TaskCard({ task, isDragging, onEdit, course, urgent }) {
  // Track pointer-down position so we can tell drag from click
  const pointerStart = useRef(null);

  const dueLabel = task.due_date
    ? new Date(task.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : null;

  const isOverdue = task.due_date && new Date(task.due_date) < new Date();

  const handlePointerDown = (e) => {
    pointerStart.current = { x: e.clientX, y: e.clientY };
  };

  const handleClick = (e) => {
    if (!pointerStart.current) return;
    const dx = Math.abs(e.clientX - pointerStart.current.x);
    const dy = Math.abs(e.clientY - pointerStart.current.y);
    // If moved more than 5px it was a drag — don't open modal
    if (dx > 5 || dy > 5) return;
    onEdit();
  };

  return (
    <div
      className={`${styles.card} ${isDragging ? styles.dragging : ''} ${urgent ? styles.urgent : ''}`}
      style={{ borderLeft: `4px solid ${task.color_label || '#c9b8e8'}` }}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
    >
      <div className={styles.top}>
        <span className={styles.title}>{task.title}</span>
      </div>

      {task.description && (
        <p className={styles.desc}>{task.description}</p>
      )}

      <div className={styles.meta}>
        {task.task_type && task.task_type !== 'general' && (
          <span className={styles.taskType}>
            {TYPE_LABEL[task.task_type] || task.task_type}
          </span>
        )}
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
