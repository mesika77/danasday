# DanasDay — 4 Feature Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add task types, beige default theme, due-date email reminders (Resend), and fix auto-deletion to trigger 1 day after due date instead of 5 days after column move.

**Architecture:** All backend changes are isolated to `server.js`, `routes/tasks.js`, and a new `services/emailNotifier.js`. Frontend changes are isolated to `TaskModal.jsx`, `TaskCard.jsx`, and `ThemePicker.jsx` / `index.css`. DB changes use the existing `IF NOT EXISTS` migration pattern in `schema.sql`.

**Tech Stack:** Node/Express, PostgreSQL (Neon via `pg`), React + Vite, Resend email API

> **Note on testing:** This project has no test runner configured. Each task includes a manual verification step using curl (backend) or browser (frontend) instead of automated tests.

---

## File Map

| File | Action | Reason |
|------|--------|--------|
| `backend/db/schema.sql` | Modify | Add `task_type` column to tasks, `last_reminder_sent` to users |
| `backend/routes/tasks.js` | Modify | Include `task_type` in INSERT and PATCH queries |
| `backend/server.js` | Modify | Fix cleanup query; schedule email notifier |
| `backend/services/emailNotifier.js` | Create | Resend email logic |
| `backend/package.json` | Modify | Add `resend` dependency |
| `backend/.env.example` | Modify | Document `RESEND_API_KEY`, `RESEND_FROM_EMAIL` |
| `frontend/src/index.css` | Modify | Change `--lavender` default to beige `#c8b49a` |
| `frontend/src/components/ThemePicker.jsx` | Modify | Add Beige as first swatch in THEMES |
| `frontend/src/components/TaskModal.jsx` | Modify | Add Type select field |
| `frontend/src/components/TaskCard.jsx` | Modify | Add task type chip in meta row |

---

## Task 1: DB Schema — task_type and last_reminder_sent

**Files:**
- Modify: `backend/db/schema.sql`

- [ ] **Step 1: Add the two migration lines to schema.sql**

Open `backend/db/schema.sql` and append these two lines at the bottom of the file (after the existing `ALTER TABLE` migrations):

```sql
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_type VARCHAR(50) DEFAULT 'general';
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_reminder_sent DATE;
```

- [ ] **Step 2: Verify migrations apply cleanly**

Start the backend locally (`cd backend && npm run dev`), watch the console. You should see:

```
Migrations applied.
DanasDay API running on port 4000
```

No error means both `ALTER TABLE` statements ran without issue. (They're idempotent via `IF NOT EXISTS`, safe to re-run.)

- [ ] **Step 3: Commit**

```bash
cd /path/to/danasday
git add backend/db/schema.sql
git commit -m "feat: add task_type column to tasks and last_reminder_sent to users"
```

---

## Task 2: Backend — task_type in tasks routes

**Files:**
- Modify: `backend/routes/tasks.js`

- [ ] **Step 1: Update the POST (create) route**

In `backend/routes/tasks.js`, replace the `router.post('/', ...)` handler with:

```js
// POST create task
router.post('/', async (req, res) => {
  try {
    const { column_id, title, description, due_date, priority, color_label, position, course_id, task_type } = req.body;
    const result = await pool.query(
      `INSERT INTO tasks (column_id, title, description, due_date, priority, color_label, position, course_id, task_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [column_id, title, description, due_date || null, priority || 'medium', color_label || '#c9b8e8', position ?? 0, course_id || null, task_type || 'general']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

- [ ] **Step 2: Update the PATCH (update single task) route**

Replace the `router.patch('/:id', ...)` handler with:

```js
// PATCH update single task
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, due_date, priority, color_label, position, column_id, course_id, task_type } = req.body;
    const result = await pool.query(
      `UPDATE tasks SET
        title             = COALESCE($1, title),
        description       = COALESCE($2, description),
        due_date          = COALESCE($3, due_date),
        priority          = COALESCE($4, priority),
        color_label       = COALESCE($5, color_label),
        position          = COALESCE($6, position),
        column_id         = COALESCE($7, column_id),
        course_id         = CASE WHEN $9 THEN NULL ELSE COALESCE($8, course_id) END,
        task_type         = COALESCE($10, task_type),
        status_changed_at = CASE WHEN $7 IS NOT NULL AND $7 <> column_id THEN NOW() ELSE status_changed_at END
       WHERE id = $11 RETURNING *`,
      [title, description, due_date, priority, color_label, position, column_id, course_id, course_id === null, task_type, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

- [ ] **Step 3: Verify with curl**

With the dev server running, create a task (replace `VALID_JWT` and `COLUMN_ID` with real values from your browser's devtools → Application → Cookies → `dd_token`):

```bash
curl -s -X POST http://localhost:4000/api/tasks \
  -H "Content-Type: application/json" \
  -H "Cookie: dd_token=VALID_JWT" \
  -d '{"column_id": COLUMN_ID, "title": "Test task type", "task_type": "homework", "position": 0}' \
  | jq '.task_type'
```

Expected output: `"homework"`

Then patch it:

```bash
# Replace TASK_ID with the id returned above
curl -s -X PATCH http://localhost:4000/api/tasks/TASK_ID \
  -H "Content-Type: application/json" \
  -H "Cookie: dd_token=VALID_JWT" \
  -d '{"task_type": "work"}' \
  | jq '.task_type'
```

Expected output: `"work"`

- [ ] **Step 4: Commit**

```bash
git add backend/routes/tasks.js
git commit -m "feat: include task_type in task create and update routes"
```

---

## Task 3: Backend — fix auto-deletion query

**Files:**
- Modify: `backend/server.js`

- [ ] **Step 1: Replace the cleanupStaleTasks function body**

In `backend/server.js`, find `async function cleanupStaleTasks()` and replace its body with:

```js
async function cleanupStaleTasks() {
  try {
    const result = await pool.query(`
      DELETE FROM tasks t
      USING columns c, boards b
      WHERE t.column_id = c.id AND c.board_id = b.id
        AND (
          (b.name = 'University' AND c.title = 'Submitted') OR
          (b.name = 'Personal'   AND c.title = 'Done')
        )
        AND (
          (t.due_date IS NOT NULL AND t.due_date < CURRENT_DATE) OR
          (t.due_date IS NULL     AND t.status_changed_at < NOW() - INTERVAL '5 days')
        )
    `);
    if (result.rowCount > 0) console.log(`Cleanup: removed ${result.rowCount} stale task(s).`);
  } catch (err) {
    console.error('Cleanup error:', err.message);
  }
}
```

Logic:
- Tasks **with** a due date: deleted once `due_date < CURRENT_DATE` (i.e., the day after the due date has arrived)
- Tasks **without** a due date: keep the original 5-day fallback using `status_changed_at`

- [ ] **Step 2: Verify**

Restart the dev server. Check the console for no errors. To manually confirm the logic is right without waiting a day, you can temporarily run in `psql` or your DB client:

```sql
SELECT t.id, t.title, t.due_date, t.status_changed_at, b.name, c.title
FROM tasks t
JOIN columns c ON t.column_id = c.id
JOIN boards b ON c.board_id = b.id
WHERE (
  (b.name = 'University' AND c.title = 'Submitted') OR
  (b.name = 'Personal'   AND c.title = 'Done')
)
AND (
  (t.due_date IS NOT NULL AND t.due_date < CURRENT_DATE) OR
  (t.due_date IS NULL     AND t.status_changed_at < NOW() - INTERVAL '5 days')
);
```

This should return tasks that would be deleted — verify the list looks correct before the server's cleanup job runs.

- [ ] **Step 3: Commit**

```bash
git add backend/server.js
git commit -m "fix: delete tasks 1 day after due date, not 5 days after column move"
```

---

## Task 4: Backend — install Resend and create email notifier

**Files:**
- Modify: `backend/package.json`
- Modify: `backend/.env.example`
- Create: `backend/services/emailNotifier.js`

- [ ] **Step 1: Install resend**

```bash
cd backend
npm install resend
```

Expected: `resend` appears in `node_modules` and `package.json` dependencies.

- [ ] **Step 2: Update .env.example**

Add to the bottom of `backend/.env.example`:

```
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=DanasDay <notifications@yourdomain.com>
```

> **Note:** Sign up at resend.com, create an API key, and verify your sending domain. For testing without a domain, use `onboarding@resend.dev` as `RESEND_FROM_EMAIL` (Resend's sandbox address) — but emails will only arrive at the address registered to your Resend account.

- [ ] **Step 3: Create backend/services/emailNotifier.js**

Create this file at `backend/services/emailNotifier.js`:

```js
const { Resend } = require('resend');
const { pool }   = require('../db/pool');

const resend = new Resend(process.env.RESEND_API_KEY);

const PRIORITY_LABEL = { low: 'Low', medium: 'Medium', high: 'High' };
const TYPE_LABEL = {
  general:    'General',
  homework:   'Homework',
  lab_report: 'Lab Report',
  work:       'Work',
  practice:   'Practice',
};

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function buildTaskRow(t) {
  const typeLabel = TYPE_LABEL[t.task_type] || t.task_type;
  const course    = t.course_name ? ` &bull; ${t.course_name}` : '';
  const desc      = t.description ? `<p style="margin:4px 0 0;color:#6b5e5e;font-size:13px;">${t.description}</p>` : '';
  return `
    <div style="background:#faf8f5;border-left:4px solid #c8b49a;border-radius:8px;padding:12px 14px;margin-bottom:10px;">
      <strong style="font-size:15px;color:#3d3535;">${t.title}</strong>${desc}
      <p style="margin:6px 0 0;font-size:12px;color:#9a8f8f;">
        ${PRIORITY_LABEL[t.priority] || t.priority} priority
        &bull; ${typeLabel}${course}
        &bull; Due ${formatDate(t.due_date)}
      </p>
    </div>`;
}

function buildHtml(userName, tomorrow, inTwoDays) {
  const todaySection = tomorrow.length ? `
    <h2 style="font-size:16px;color:#3d3535;margin:24px 0 10px;">Due Tomorrow</h2>
    ${tomorrow.map(buildTaskRow).join('')}` : '';

  const twoDaySection = inTwoDays.length ? `
    <h2 style="font-size:16px;color:#3d3535;margin:24px 0 10px;">Due in 2 Days</h2>
    ${inTwoDays.map(buildTaskRow).join('')}` : '';

  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family:'DM Sans',Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#3d3535;">
      <h1 style="font-family:Georgia,serif;font-size:22px;margin-bottom:4px;">dana's day</h1>
      <p style="color:#9a8f8f;margin-bottom:20px;">Hi ${userName}, here are your upcoming tasks.</p>
      ${todaySection}
      ${twoDaySection}
      <p style="margin-top:32px;font-size:12px;color:#bbb;">You're receiving this because you have tasks due soon.</p>
    </body>
    </html>`;
}

function buildSubject(hasTomorrow, hasTwoDays) {
  if (hasTomorrow && hasTwoDays) return "Reminder: Upcoming tasks due soon";
  if (hasTomorrow)               return "Reminder: Tasks due tomorrow";
  return                                "Reminder: Tasks due in 2 days";
}

async function sendEmailReminders() {
  if (!process.env.RESEND_API_KEY) {
    console.log('Email reminders skipped: RESEND_API_KEY not set.');
    return;
  }

  try {
    // Fetch all tasks due tomorrow or in 2 days, excluding terminal columns
    // Skip users already notified today
    const { rows } = await pool.query(`
      SELECT
        t.id, t.title, t.description, t.due_date, t.priority, t.task_type,
        u.id   AS user_id,
        u.email,
        u.name AS user_name,
        co.name AS course_name
      FROM tasks t
      JOIN columns  col ON t.column_id = col.id
      JOIN boards   b   ON col.board_id = b.id
      JOIN users    u   ON b.user_id = u.id
      LEFT JOIN courses co ON t.course_id = co.id
      WHERE t.due_date IN (CURRENT_DATE + 1, CURRENT_DATE + 2)
        AND NOT (
          (b.name = 'University' AND col.title = 'Submitted') OR
          (b.name = 'Personal'   AND col.title = 'Done')
        )
        AND (u.last_reminder_sent IS NULL OR u.last_reminder_sent < CURRENT_DATE)
      ORDER BY u.id, t.due_date
    `);

    if (!rows.length) {
      console.log('Email reminders: no upcoming tasks found.');
      return;
    }

    // Group tasks by user
    const todayPlus1 = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const byUser = {};
    for (const row of rows) {
      if (!byUser[row.user_id]) {
        byUser[row.user_id] = { email: row.email, name: row.user_name, tomorrow: [], inTwoDays: [] };
      }
      const dueDate = new Date(row.due_date).toISOString().slice(0, 10);
      if (dueDate === todayPlus1) {
        byUser[row.user_id].tomorrow.push(row);
      } else {
        byUser[row.user_id].inTwoDays.push(row);
      }
    }

    const notifiedUserIds = [];

    for (const [userId, { email, name, tomorrow, inTwoDays }] of Object.entries(byUser)) {
      const firstName = name?.split(' ')[0] || 'there';
      try {
        await resend.emails.send({
          from:    process.env.RESEND_FROM_EMAIL,
          to:      email,
          subject: buildSubject(tomorrow.length > 0, inTwoDays.length > 0),
          html:    buildHtml(firstName, tomorrow, inTwoDays),
        });
        console.log(`Email reminder sent to ${email}`);
        notifiedUserIds.push(Number(userId));
      } catch (err) {
        console.error(`Failed to send reminder to ${email}:`, err.message);
      }
    }

    // Mark users as notified today
    if (notifiedUserIds.length) {
      await pool.query(
        `UPDATE users SET last_reminder_sent = CURRENT_DATE WHERE id = ANY($1)`,
        [notifiedUserIds]
      );
    }
  } catch (err) {
    console.error('Email reminder error:', err.message);
  }
}

module.exports = { sendEmailReminders };
```

- [ ] **Step 4: Commit**

```bash
cd ..  # back to repo root if needed
git add backend/services/emailNotifier.js backend/package.json backend/package-lock.json backend/.env.example
git commit -m "feat: add Resend email reminder service for tasks due in 1-2 days"
```

---

## Task 5: Backend — wire up email notifier in server.js

**Files:**
- Modify: `backend/server.js`

- [ ] **Step 1: Import emailNotifier at the top of server.js**

Add this line after the existing requires at the top of `backend/server.js` (after `const { migrate, pool } = require('./db/pool');`):

```js
const { sendEmailReminders } = require('./services/emailNotifier');
```

- [ ] **Step 2: Schedule the notifier in the migrate().then() block**

In the `migrate().then(...)` block, add the notifier call alongside `cleanupStaleTasks()`:

```js
migrate()
  .then(() => {
    app.listen(PORT, () => console.log(`DanasDay API running on port ${PORT}`));
    cleanupStaleTasks();
    sendEmailReminders();
    setInterval(cleanupStaleTasks,    24 * 60 * 60 * 1000);
    setInterval(sendEmailReminders,   24 * 60 * 60 * 1000);
  })
  .catch((err) => { console.error('Migration failed:', err); process.exit(1); });
```

- [ ] **Step 3: Verify startup**

Restart the dev server. With `RESEND_API_KEY` not set in your local `.env`, you should see:

```
Migrations applied.
DanasDay API running on port 4000
Email reminders skipped: RESEND_API_KEY not set.
```

No crash = wired correctly.

- [ ] **Step 4: Commit**

```bash
git add backend/server.js
git commit -m "feat: schedule daily email reminders on server startup"
```

---

## Task 6: Frontend — beige default theme

**Files:**
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/components/ThemePicker.jsx`

- [ ] **Step 1: Change --lavender default in index.css**

In `frontend/src/index.css`, find:

```css
  --lavender: #c9b8e8;
```

Replace with:

```css
  --lavender: #c8b49a;
```

- [ ] **Step 2: Add Beige swatch to ThemePicker**

In `frontend/src/components/ThemePicker.jsx`, find the `THEMES` array:

```js
const THEMES = [
  { name: 'Lavender', value: '#c9b8e8' },
```

Replace the entire array with:

```js
const THEMES = [
  { name: 'Beige',    value: '#c8b49a' },
  { name: 'Lavender', value: '#c9b8e8' },
  { name: 'Blush',    value: '#e8a0b8' },
  { name: 'Sage',     value: '#94bb94' },
  { name: 'Sky',      value: '#84b8d8' },
  { name: 'Peach',    value: '#e8bc84' },
  { name: 'Coral',    value: '#e09080' },
  { name: 'Mint',     value: '#80ccb0' },
  { name: 'Rose',     value: '#d4889c' },
];
```

- [ ] **Step 3: Also update the initial state fallback in ThemePicker**

In `ThemePicker.jsx`, find the `useState` initial value:

```js
  const [current, setCurrent] = useState(
    () => getComputedStyle(document.documentElement).getPropertyValue('--lavender').trim() || '#c9b8e8'
  );
```

Update the fallback to match:

```js
  const [current, setCurrent] = useState(
    () => getComputedStyle(document.documentElement).getPropertyValue('--lavender').trim() || '#c8b49a'
  );
```

- [ ] **Step 4: Verify in browser**

Run `cd frontend && npm run dev`, open `http://localhost:5173`. The header/accent color should appear as warm beige for a new session (no saved theme in localStorage). Open the theme picker — "Beige" should be the first swatch and shown as active. Pick another color, reload — the saved color should persist.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/index.css frontend/src/components/ThemePicker.jsx
git commit -m "feat: set beige as default theme color, add Beige swatch to picker"
```

---

## Task 7: Frontend — task type field in TaskModal

**Files:**
- Modify: `frontend/src/components/TaskModal.jsx`

- [ ] **Step 1: Add task_type to the form state**

In `TaskModal.jsx`, find the `useState` initializer for `form`. Add `task_type` to it:

```js
  const [form, setForm] = useState({
    title:       task?.title       || '',
    description: task?.description || '',
    due_date:    task?.due_date    ? task.due_date.slice(0, 10) : '',
    priority:    task?.priority    || 'medium',
    color_label: task?.color_label || '#c9b8e8',
    column_id:   task?.column_id   || columnId,
    course_id:   task?.course_id   || '',
    task_type:   task?.task_type   || 'general',
  });
```

- [ ] **Step 2: Add the Type select field in the form JSX**

In the form JSX, find the `<div className={styles.row}>` that contains Due date and Priority. Add the Type select **below** that row, and **above** the Course picker:

```jsx
          <label>
            Type
            <select value={form.task_type} onChange={(e) => set('task_type', e.target.value)}>
              <option value="general">General</option>
              <option value="homework">Homework</option>
              <option value="lab_report">Lab Report</option>
              <option value="work">Work</option>
              <option value="practice">Practice</option>
            </select>
          </label>
```

- [ ] **Step 3: Verify in browser**

Open the dev server. Create or edit a task — a "Type" dropdown should appear between Priority and Course. Select "Homework", save. Reopen the task — "Homework" should be pre-selected. Check the network request in DevTools: the PATCH body should include `task_type: "homework"`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/TaskModal.jsx
git commit -m "feat: add task type selector to task modal"
```

---

## Task 8: Frontend — task type chip on TaskCard

**Files:**
- Modify: `frontend/src/components/TaskCard.jsx`
- Modify: `frontend/src/components/TaskCard.module.css`

- [ ] **Step 1: Add TYPE_LABEL map and chip in TaskCard.jsx**

In `TaskCard.jsx`, add the label map at the top alongside `PRIORITY_LABEL`:

```js
const TYPE_LABEL = {
  homework:   'Homework',
  lab_report: 'Lab Report',
  work:       'Work',
  practice:   'Practice',
};
```

Then in the `<div className={styles.meta}>` section, add the chip **before** the due date span. The chip only renders when type is not `general`:

```jsx
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
```

- [ ] **Step 2: Add taskType style in TaskCard.module.css**

Open `frontend/src/components/TaskCard.module.css` and add this rule at the bottom:

```css
.taskType {
  font-size: 0.68rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted);
  background: var(--border);
  border-radius: 4px;
  padding: 2px 6px;
}
```

- [ ] **Step 3: Verify in browser**

Create a task with type "Lab Report". On the board, the card should show a small grey "LAB REPORT" chip in the meta row. A task with type "General" should show no chip.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/TaskCard.jsx frontend/src/components/TaskCard.module.css
git commit -m "feat: show task type chip on task card for non-general types"
```

---

## Final Verification Checklist

- [ ] Restart backend, confirm `Migrations applied.` and no errors
- [ ] Create a task with type "Lab Report" and due date tomorrow — chip shows on card, type pre-selected on reopen
- [ ] Move a task to Submitted/Done with a past due date — confirm cleanup query logic in DB client
- [ ] Theme defaults to beige on a fresh browser (clear localStorage first: DevTools → Application → Local Storage → delete `dd_theme`)
- [ ] Set `RESEND_API_KEY` in `.env` and run `node -e "require('./services/emailNotifier').sendEmailReminders()"` from `backend/` to trigger a manual test email
