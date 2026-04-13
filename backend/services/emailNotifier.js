const { Resend } = require('resend');
const { pool }   = require('../db/pool');

const PRIORITY_LABEL = { low: 'Low', medium: 'Medium', high: 'High' };
const TYPE_LABEL = {
  general:    'General',
  homework:   'Homework',
  lab_report: 'Lab Report',
  work:       'Work',
  practice:   'Practice',
};

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function buildTaskRow(t) {
  const typeLabel = TYPE_LABEL[t.task_type] || t.task_type;
  const course    = t.course_name ? ` &bull; ${esc(t.course_name)}` : '';
  const desc      = t.description ? `<p style="margin:4px 0 0;color:#6b5e5e;font-size:13px;">${esc(t.description)}</p>` : '';
  return `
    <div style="background:#faf8f5;border-left:4px solid #c8b49a;border-radius:8px;padding:12px 14px;margin-bottom:10px;">
      <strong style="font-size:15px;color:#3d3535;">${esc(t.title)}</strong>${desc}
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
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { rows } = await pool.query(`
      SELECT
        t.id, t.title, t.description, t.due_date::text AS due_date, t.priority, t.task_type,
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

    const { rows: dateRows } = await pool.query(
      `SELECT (CURRENT_DATE + 1)::text AS tomorrow`
    );
    const todayPlus1 = dateRows[0].tomorrow;
    const byUser = {};
    for (const row of rows) {
      if (!byUser[row.user_id]) {
        byUser[row.user_id] = { email: row.email, name: row.user_name, tomorrow: [], inTwoDays: [] };
      }
      if (row.due_date === todayPlus1) {
        byUser[row.user_id].tomorrow.push(row);
      } else {
        byUser[row.user_id].inTwoDays.push(row);
      }
    }

    const notifiedUserIds = [];

    for (const [userId, { email, name, tomorrow, inTwoDays }] of Object.entries(byUser)) {
      const firstName = name?.split(' ')[0] || 'there';
      if (!email) {
        console.warn(`Skipping reminder: user ${userId} has no email address.`);
        continue;
      }
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
