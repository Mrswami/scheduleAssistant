const ical = require('node-ical');

/**
 * Fetch and parse a WhenToWork (or SocialSchedules) iCal feed URL.
 * Returns an array of confirmed shift/schedule objects.
 */
async function parseShiftFeed(icalUrl) {
  // webcal:// is semantically identical to https:// — normalize it
  if (icalUrl) icalUrl = icalUrl.replace(/^webcals?:\/\//i, 'https://');

  if (!icalUrl || !icalUrl.startsWith('http')) {
    throw new Error('Invalid iCal URL. Paste your WhenToWork iCal link from the Calendar Sync section.');
  }

  let rawEvents;
  try {
    rawEvents = await ical.async.fromURL(icalUrl);
  } catch (err) {
    throw new Error(`Could not fetch iCal feed: ${err.message}`);
  }

  const now = new Date();
  const schedules = [];

  for (const key of Object.keys(rawEvents)) {
    const event = rawEvents[key];

    if (event.type !== 'VEVENT') continue;

    const start = event.start ? new Date(event.start) : null;
    const end = event.end ? new Date(event.end) : null;

    if (!start || !end) continue;

    // Only include future events (confirmed upcoming shifts)
    if (end < now) continue;

    // WhenToWork usually uses "Assign:" prefix or specific status codes
    const status = (event.status || '').toUpperCase();
    const isConfirmed = !status || status === 'CONFIRMED' || status === 'TENTATIVE';
    if (!isConfirmed) continue;

    // Filter out blockages/availability if they appear in the same feed
    if (event.summary && (event.summary.includes('Block') || event.summary.includes('Unavailable'))) continue;

    schedules.push({
      id: event.uid || key,
      title: cleanTitle(event.summary || 'Work Shift'),
      description: event.description || '',
      location: event.location || '',
      start: start.toISOString(),
      end: end.toISOString(),
      status: status || 'CONFIRMED',
      rawStart: event.start,
      rawEnd: event.end,
    });
  }

  // Sort by start time ascending
  schedules.sort((a, b) => new Date(a.start) - new Date(b.start));

  return schedules;
}

function cleanTitle(title) {
  // WhenToWork often prefixes with "Assign: "
  return title.replace(/^Assign:\s*/i, '').trim().replace(/\s+/g, ' ');
}

/**
 * Convert a parsed schedule into a Google Calendar event payload.
 */
function scheduleToCalendarEvent(schedule, timeZone = 'America/New_York') {
  return {
    title: schedule.title,
    description: schedule.description
      ? `${schedule.description}\n\n[Auto-synced from WhenToWork]`
      : '[Auto-synced from WhenToWork]',
    location: schedule.location,
    start: schedule.start,
    end: schedule.end,
    timeZone,
  };
}

module.exports = {
  parseShiftFeed,
  scheduleToCalendarEvent,
};
