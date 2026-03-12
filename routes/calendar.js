const express = require('express');
const router = express.Router();
const {
  listCalendars,
  listUpcomingEvents,
  createCalendarEvent,
  deleteCalendarEvent,
  checkEventExists,
} = require('../services/googleCalendar');
const { parseSocialSchedulesFeed, scheduleToCalendarEvent } = require('../services/icalParser');
const { recordSync, saveUserSettings } = require('../services/firebase');
const { sendMessage } = require('../services/groupme');

function requireAuth(req, res, next) {
  if (!req.session.tokens) {
    return res.status(401).json({ error: 'Not authenticated. Please sign in with Google.' });
  }
  next();
}

// GET /api/calendar/list — list all user's writable Google Calendars
router.get('/list', requireAuth, async (req, res) => {
  try {
    const calendars = await listCalendars(req.session.tokens);
    res.json({ calendars });
  } catch (err) {
    console.error('Calendar list error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/calendar/events — list upcoming events in a calendar
router.get('/events', requireAuth, async (req, res) => {
  try {
    const events = await listUpcomingEvents(req.session.tokens);
    res.json({ events });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/calendar/sync
// Body: { icalUrl, calendarId, timeZone, notifySelf, selectedIds }
router.post('/sync', requireAuth, async (req, res) => {
  const {
    icalUrl,
    calendarId = 'primary',
    timeZone = 'America/New_York',
    notifySelf = false,
    selectedIds = null,
  } = req.body;

  const urlToUse = icalUrl || req.session.icalUrl;
  if (!urlToUse) {
    return res.status(400).json({ error: 'No iCal URL provided.' });
  }

  try {
    const schedules = await parseSocialSchedulesFeed(urlToUse);
    const toSync = selectedIds
      ? schedules.filter((s) => selectedIds.includes(s.id))
      : schedules;

    const results = { synced: [], skipped: [], failed: [] };

    for (const schedule of toSync) {
      try {
        const exists = await checkEventExists(req.session.tokens, schedule.title, schedule.start);
        if (exists) {
          results.skipped.push({ id: schedule.id, title: schedule.title, reason: 'Already exists' });
          continue;
        }

        const eventPayload = scheduleToCalendarEvent(schedule, timeZone);
        const created = await createCalendarEvent(
          req.session.tokens,
          eventPayload,
          notifySelf,
          calendarId
        );

        results.synced.push({
          id: schedule.id,
          title: schedule.title,
          gcalId: created.id,
          gcalLink: created.htmlLink,
        });
      } catch (eventErr) {
        results.failed.push({ id: schedule.id, title: schedule.title, error: eventErr.message });
      }
    }

    const summary = {
      total: toSync.length,
      synced: results.synced.length,
      skipped: results.skipped.length,
      failed: results.failed.length,
      calendarId,
      details: results,
    };

    // Persist sync record to Firestore if user profile exists
    if (req.session.uid) {
      await recordSync(req.session.uid, summary).catch(() => { });
    }

    // Proactive GroupMe Notification
    const gmToken = process.env.GROUPME_ACCESS_TOKEN || req.session.groupmeToken;
    const gmGroupId = process.env.GROUPME_DEFAULT_GROUP_ID; // Optional env for auto-notify

    if (gmToken && gmGroupId && summary.synced > 0) {
      const msg = `🐝 Schedule Assistant: just synced ${summary.synced} shifts to my Google Calendar!`;
      await sendMessage(gmToken, gmGroupId, msg).catch(e => console.error('GM Notify Error:', e.message));
    }

    res.json({ success: true, ...summary });
  } catch (err) {
    console.error('Sync error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/calendar/events/:id
router.delete('/events/:id', requireAuth, async (req, res) => {
  try {
    await deleteCalendarEvent(req.session.tokens, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
