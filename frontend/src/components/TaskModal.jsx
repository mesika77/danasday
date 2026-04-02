import React, { useState } from 'react';
import { createTask, updateTask } from '../api';
import styles from './TaskModal.module.css';

const COLOR_OPTIONS = [
  '#c9b8e8', '#f5c6d0', '#b5ccb8', '#f7d4b5', '#b8d8e8', '#e8e8b5',
];

// courses prop is only passed when on University board
export default function TaskModal({ task, columnId, columns, courses, onClose, onSaved }) {
  const isEdit = Boolean(task);
  const [form, setForm] = useState({
    title:       task?.title       || '',
    description: task?.description || '',
    due_date:    task?.due_date    ? task.due_date.slice(0, 10) : '',
    priority:    task?.priority    || 'medium',
    color_label: task?.color_label || '#c9b8e8',
    column_id:   task?.column_id   || columnId,
    course_id:   task?.course_id   || '',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        course_id: form.course_id ? Number(form.course_id) : null,
      };
      if (isEdit) {
        await updateTask(task.id, payload);
      } else {
        await createTask({ ...payload, position: 9999 });
      }
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>{isEdit ? 'Edit Task' : 'New Task'}</h2>
          <button className={styles.close} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label>
            Title
            <input
              autoFocus
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="What needs to be done?"
              required
            />
          </label>

          <label>
            Description
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Optional notes..."
              rows={3}
            />
          </label>

          <div className={styles.row}>
            <label>
              Due date
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => set('due_date', e.target.value)}
              />
            </label>

            <label>
              Priority
              <select value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
          </div>

          {/* Course picker — only on University board */}
          {courses && (
            <label>
              Course
              <select value={form.course_id} onChange={(e) => set('course_id', e.target.value)}>
                <option value="">— No course —</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
          )}

          {isEdit && (
            <label>
              Column
              <select value={form.column_id} onChange={(e) => set('column_id', Number(e.target.value))}>
                {columns.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </label>
          )}

          <div>
            <span className={styles.colorLabel}>Label colour</span>
            <div className={styles.colors}>
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`${styles.swatch} ${form.color_label === c ? styles.selected : ''}`}
                  style={{ background: c }}
                  onClick={() => set('color_label', c)}
                />
              ))}
            </div>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancel} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.save} disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
