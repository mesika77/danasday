const router      = require('express').Router();
const { google }  = require('googleapis');
const { pool }    = require('../db/pool');
const requireAuth = require('../middleware/requireAuth');

// Build an authenticated Google Calendar client for the requesting user
async function getCalendarClient(userId) {
  const { rows } = await pool.query(
    'SELECT access_token, refresh_token, token_expiry FROM users WHERE id = $1',
    [userId]
  );
  if (!rows.length) throw new Error('User not found');

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_CALLBACK_URL
  );

  oauth2.setCredentials({
    access_token:  rows[0].access_token,
    refresh_token: rows[0].refresh_token,
    expiry_date:   new Date(rows[0].token_expiry).getTime(),
  });

  // Auto-save refreshed tokens
  oauth2.on('tokens', async (tokens) => {
    await pool.query(
      `UPDATE users SET access_token = $1, token_expiry = $2 WHERE id = $3`,
      [tokens.access_token, new Date(tokens.expiry_date), userId]
    );
  });

  return google.calendar({ version: 'v3', auth: oauth2 });
}

// GET /api/calendar/events?timeMin=...&timeMax=...
router.get('/events', requireAuth, async (req, res) => {
  try {
    const cal = await getCalendarClient(req.user.id);
    const { timeMin, timeMax } = req.query;

    // Fetch all the user's calendars
    const calList = await cal.calendarList.list();
    const calendars = calList.data.items || [];

    // Fetch events from every calendar in parallel (ignore failures for individual ones)
    const results = await Promise.allSettled(
      calendars.map((c) =>
        cal.events.list({
          calendarId:   c.id,
          timeMin:      timeMin || new Date().toISOString(),
          timeMax:      timeMax,
          singleEvents: true,
          orderBy:      'startTime',
          maxResults:   250,
        })
      )
    );

    // Merge, tagging each event with its source calendarId
    const allEvents = [];
    results.forEach((result, i) => {
      if (result.status !== 'fulfilled') return;
      (result.value.data.items || []).forEach((ev) => {
        ev._calendarId = calendars[i].id;
        allEvents.push(ev);
      });
    });

    // Sort by start time
    allEvents.sort((a, b) => {
      const at = a.start.dateTime || a.start.date || '';
      const bt = b.start.dateTime || b.start.date || '';
      return at.localeCompare(bt);
    });

    res.json(allEvents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/calendar/events — create event
router.post('/events', requireAuth, async (req, res) => {
  try {
    const cal = await getCalendarClient(req.user.id);
    const { summary, description, start, end, allDay } = req.body;

    const event = {
      summary,
      description,
      start: allDay ? { date: start } : { dateTime: start, timeZone: req.body.timeZone || 'UTC' },
      end:   allDay ? { date: end   } : { dateTime: end,   timeZone: req.body.timeZone || 'UTC' },
    };

    const response = await cal.events.insert({ calendarId: 'primary', resource: event });
    res.status(201).json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/calendar/events/:eventId — update event
router.patch('/events/:eventId', requireAuth, async (req, res) => {
  try {
    const cal = await getCalendarClient(req.user.id);
    const { summary, description, start, end, allDay } = req.body;

    const event = {
      summary,
      description,
      start: allDay ? { date: start } : { dateTime: start, timeZone: req.body.timeZone || 'UTC' },
      end:   allDay ? { date: end   } : { dateTime: end,   timeZone: req.body.timeZone || 'UTC' },
    };

    const response = await cal.events.patch({
      calendarId: req.body.calendarId || 'primary',
      eventId:    req.params.eventId,
      resource:   event,
    });
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/calendar/events/:eventId
router.delete('/events/:eventId', requireAuth, async (req, res) => {
  try {
    const cal = await getCalendarClient(req.user.id);
    const calendarId = req.query.calendarId || 'primary';
    await cal.events.delete({ calendarId, eventId: req.params.eventId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
