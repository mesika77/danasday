# DanasDay — Feature Design Spec
**Date:** 2026-04-13

---

## Overview

Four improvements to the DanasDay task management app:

1. Auto-deletion triggers 1 day after due date (not 5 days after column move)
2. Default theme color changes to neutral beige
3. Email reminders via Resend when tasks are approaching their due date
4. Task type field added to categorize tasks

---

## 1. Auto-deletion After Due Date

### Current behavior
`cleanupStaleTasks()` in `server.js` deletes tasks in terminal columns (Submitted/Done) where `status_changed_at < NOW() - INTERVAL '5 days'`.

### New behavior
Delete tasks in terminal columns where `due_date < CURRENT_DATE` — meaning the due date was yesterday or earlier (i.e., at least 1 full day has passed since the due date).

**Fallback for tasks without a due date:** retain the original `status_changed_at < NOW() - INTERVAL '5 days'` logic so undated tasks are still cleaned up.

### SQL change (`server.js` — `cleanupStaleTasks`)
```sql
DELETE FROM tasks t
USING columns c, boards b
WHERE t.column_id = c.id AND c.board_id = b.id
  AND (
    (b.name = 'University' AND c.title = 'Submitted') OR
    (b.name = 'Personal'   AND c.title = 'Done')
  )
  AND (
    (t.due_date IS NOT NULL     AND t.due_date < CURRENT_DATE) OR
    (t.due_date IS NULL         AND t.status_changed_at < NOW() - INTERVAL '5 days')
  )
```

### Files changed
- `backend/server.js` — update `cleanupStaleTasks` query only

---

## 2. Default Theme Color — Neutral Beige

### Current behavior
CSS variable `--lavender` defaults to `#c9b8e8` (lavender/purple). The ThemePicker lets users override it and saves to localStorage.

### New behavior
Default changes to `#c8b49a` (warm neutral beige). Existing users keep their saved theme; new users get beige automatically (ThemePicker reads initial value from `getComputedStyle`).

A "Beige" swatch is added as the first entry in the THEMES array so it's clearly selectable.

### Files changed
- `frontend/src/index.css` — `--lavender: #c9b8e8` → `--lavender: #c8b49a`
- `frontend/src/components/ThemePicker.jsx` — prepend `{ name: 'Beige', value: '#c8b49a' }` to `THEMES`

---

## 3. Email Reminders via Resend

### Overview
A daily job runs on the backend, finds tasks approaching their due date, and emails each user a single digest covering both reminder windows.

### Reminder windows
- **48-hour reminder:** tasks where `due_date = CURRENT_DATE + 2` (due in 2 days)
- **24-hour reminder:** tasks where `due_date = CURRENT_DATE + 1` (due tomorrow)

Tasks already in terminal columns (Submitted/Done) are excluded — no point reminding about completed work.

### Email format
One email per user per day (if they have tasks in either window). Subject line:

- Only 24h tasks: `"Reminder: Tasks due tomorrow"`
- Only 48h tasks: `"Reminder: Tasks due in 2 days"`
- Both: `"Reminder: Upcoming tasks due soon"`

Body lists tasks grouped by window, each showing: title, description (if set), due date, priority, task type, and course (if applicable).

### Deduplication
The daily job runs once per 24 hours (same `setInterval` pattern as cleanup). Since the query matches exact dates (`= CURRENT_DATE + 1`), re-runs on the same calendar day naturally return the same tasks and would re-send. To prevent this, add a `last_reminder_sent DATE` column to the `users` table — the job skips users already notified today.

### New files
- `backend/services/emailNotifier.js` — query + Resend API call logic

### Files changed
- `backend/server.js` — import and schedule `emailNotifier` alongside `cleanupStaleTasks`
- `backend/package.json` — add `resend` dependency
- `backend/.env.example` — add `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- `backend/db/schema.sql` — add `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_reminder_sent DATE`

---

## 4. Task Type Field

### New field
`task_type VARCHAR(50) DEFAULT 'general'`

Allowed values: `general`, `homework`, `lab_report`, `work`, `practice`

### Database
```sql
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_type VARCHAR(50) DEFAULT 'general';
```

Added to `schema.sql` as an `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` migration (consistent with existing migration pattern).

### Backend (`routes/tasks.js`)
- **POST `/`** — include `task_type` in INSERT, defaulting to `'general'`
- **PATCH `/:id`** — include `task_type` in UPDATE via COALESCE

### Frontend — TaskModal
New `<select>` labeled "Type" inserted between Priority and Course fields.

Options (display label → value):
- General → `general`
- Homework → `homework`
- Lab Report → `lab_report`
- Work → `work`
- Practice → `practice`

Default: `general`.

### Frontend — TaskCard
A small chip added to the meta row. The chip is only rendered when `task_type` is **not** `general` — keeps cards uncluttered for the most common case. Display labels: "Lab Report" for `lab_report`, title-cased for others.

---

## Files Summary

| File | Change |
|------|--------|
| `backend/server.js` | Update `cleanupStaleTasks`, schedule `emailNotifier` |
| `backend/services/emailNotifier.js` | New file — Resend email logic |
| `backend/db/schema.sql` | Add `task_type` column migration, `last_reminder_sent` column |
| `backend/routes/tasks.js` | Include `task_type` in INSERT and PATCH |
| `backend/package.json` | Add `resend` dependency |
| `backend/.env.example` | Add `RESEND_API_KEY`, `RESEND_FROM_EMAIL` |
| `frontend/src/index.css` | Change `--lavender` default to `#c8b49a` |
| `frontend/src/components/ThemePicker.jsx` | Prepend Beige swatch to THEMES |
| `frontend/src/components/TaskModal.jsx` | Add Type select field |
| `frontend/src/components/TaskCard.jsx` | Add task type chip to meta row |
