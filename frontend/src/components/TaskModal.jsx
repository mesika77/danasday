import React, { useState } from 'react';
import { createTask, updateTask, deleteTask } from '../api';
import ColorPicker, { PALETTE } from './ColorPicker';
import styles from './TaskModal.module.css';

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
  const [confirming, setConfirming] = useState(false);

  const handleDelete = async () => {
    await deleteTask(task.id);
    onSaved();
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // When course changes, auto-set color_label to the course color
  const setCourse = (id) => {
    const course = courses?.find((c) => String(c.id) === String(id));
    setForm((f) => ({
      ...f,
      course_id: id,
      color_label: course ? course.color : f.color_label,
    }));
  };

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
              <select value={form.course_id} onChange={(e) => setCourse(e.target.value)}>
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

          {/* Color picker — only shown when no course is selected */}
          {!form.course_id && (
            <div>
              <span className={styles.colorLabel}>Label colour</span>
              <ColorPicker
                value={form.color_label}
                onChange={(v) => set('color_label', v)}
              />
            </div>
          )}

          <div className={styles.actions}>
            {isEdit && !confirming && (
              <button type="button" className={styles.delete} onClick={() => setConfirming(true)}>
                Delete
              </button>
            )}
            {confirming && (
              <>
                <span className={styles.confirmText}>Sure?</span>
                <button type="button" className={styles.delete} onClick={handleDelete}>Yes, delete</button>
                <button type="button" className={styles.cancel} onClick={() => setConfirming(false)}>No</button>
              </>
            )}
            {!confirming && (
              <>
                <button type="button" className={styles.cancel} onClick={onClose}>Cancel</button>
                <button type="submit" className={styles.save} disabled={saving}>
                  {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add task'}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
