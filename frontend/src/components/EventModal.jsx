import React, { useState } from 'react';
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '../api';
import styles from './EventModal.module.css';

export default function EventModal({ event, defaultDate, onClose, onSaved }) {
  const isEdit = Boolean(event);

  const toLocalDatetime = (isoStr) => {
    if (!isoStr) return '';
    return isoStr.slice(0, 16); // yyyy-MM-ddTHH:mm
  };

  const [form, setForm] = useState({
    summary:     event?.summary     || '',
    description: event?.description || '',
    allDay:      Boolean(event?.start?.date) || false,
    start:       event?.start?.dateTime ? toLocalDatetime(event.start.dateTime)
                 : event?.start?.date   ? event.start.date
                 : defaultDate          ? `${defaultDate}T09:00`
                 : '',
    end:         event?.end?.dateTime ? toLocalDatetime(event.end.dateTime)
                 : event?.end?.date   ? event.end.date
                 : defaultDate        ? `${defaultDate}T10:00`
                 : '',
  });
  const [saving, setSaving]       = useState(false);
  const [confirming, setConfirming] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.summary.trim()) return;
    setSaving(true);
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const payload = {
        summary:     form.summary,
        description: form.description,
        allDay:      form.allDay,
        start:       form.allDay ? form.start.slice(0, 10) : new Date(form.start).toISOString(),
        end:         form.allDay ? form.end.slice(0, 10)   : new Date(form.end).toISOString(),
        timeZone:    tz,
      };
      if (isEdit) await updateCalendarEvent(event.id, { ...payload, calendarId: event._calendarId });
      else        await createCalendarEvent(payload);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    await deleteCalendarEvent(event.id, event._calendarId);
    onSaved();
  };

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>{isEdit ? 'Edit Event' : 'New Event'}</h2>
          <button className={styles.close} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label>
            Title
            <input autoFocus value={form.summary} onChange={(e) => set('summary', e.target.value)} required placeholder="Event title" />
          </label>

          <label>
            Description
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} placeholder="Optional notes" />
          </label>

          <label className={styles.checkRow}>
            <input type="checkbox" checked={form.allDay} onChange={(e) => set('allDay', e.target.checked)} />
            All day
          </label>

          <div className={styles.row}>
            <label>
              {form.allDay ? 'Start date' : 'Start'}
              <input
                type={form.allDay ? 'date' : 'datetime-local'}
                value={form.start}
                onChange={(e) => set('start', e.target.value)}
                required
              />
            </label>
            <label>
              {form.allDay ? 'End date' : 'End'}
              <input
                type={form.allDay ? 'date' : 'datetime-local'}
                value={form.end}
                onChange={(e) => set('end', e.target.value)}
                required
              />
            </label>
          </div>

          <div className={styles.actions}>
            {isEdit && !confirming && (
              <button type="button" className={styles.delete} onClick={() => setConfirming(true)}>Delete</button>
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
                  {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add event'}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
