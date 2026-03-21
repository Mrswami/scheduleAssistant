const express = require('express');
const router = express.Router();
const { parseShiftFeed } = require('../services/icalParser');

function requireAuth(req, res, next) {
  if (!req.session.tokens) {
    return res.status(401).json({ error: 'Not authenticated. Please sign in with Google.' });
  }
  next();
}

// GET /api/schedules?url=<ical_url>
// Fetch and parse SocialSchedules iCal feed
router.get('/', requireAuth, async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({
      error: 'Missing iCal URL. Add ?url=YOUR_ICAL_URL to the request.',
    });
  }

  try {
    const schedules = await parseShiftFeed(decodeURIComponent(url));
    res.json({ schedules, count: schedules.length });
  } catch (err) {
    console.error('Schedule fetch error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/schedules/save-url  — save iCal URL to session
router.post('/save-url', (req, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required.' });
  }
  req.session.icalUrl = url;
  res.json({ success: true });
});

// POST /api/schedules/save-raw — save scraped shifts to session
router.post('/save-raw', (req, res) => {
  const { shifts } = req.body;
  if (!shifts || !Array.isArray(shifts)) {
    return res.status(400).json({ error: 'Array of shifts is required.' });
  }
  req.session.scrapedShifts = shifts;
  res.json({ success: true, count: shifts.length });
});

// GET /api/schedules/saved-url
router.get('/saved-url', requireAuth, (req, res) => {
  res.json({
    url: req.session.icalUrl || null,
    scrapedCount: req.session.scrapedShifts ? req.session.scrapedShifts.length : 0
  });
});

module.exports = router;
