const { google } = require('googleapis');

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

function getAuthUrl() {
  const client = createOAuthClient();
  return client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
}

async function getTokensFromCode(code) {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  return tokens;
}

function getAuthorizedClient(tokens) {
  const client = createOAuthClient();
  client.setCredentials(tokens);
  return client;
}

async function listCalendars(tokens) {
  const auth = getAuthorizedClient(tokens);
  const calendar = google.calendar({ version: 'v3', auth });

  const res = await calendar.calendarList.list();
  const items = res.data.items || [];

  return items.map((cal) => ({
    id: cal.id,
    name: cal.summary,
    description: cal.description || '',
    isPrimary: cal.primary || false,
    color: cal.backgroundColor || '#4a90e2',
    accessRole: cal.accessRole,
  })).filter((cal) => ['owner', 'writer'].includes(cal.accessRole));
}

async function listUpcomingEvents(tokens, maxResults = 20) {
  const auth = getAuthorizedClient(tokens);
  const calendar = google.calendar({ version: 'v3', auth });

  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date().toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: 'startTime',
  });

  return res.data.items || [];
}

/**
 * Create a Google Calendar event without sending any notifications/auto-replies.
 * sendUpdates: 'none' suppresses all email invites and replies.
 * If you want to notify ONLY yourself, pass notifySelf: true.
 */
async function createCalendarEvent(tokens, eventData, notifySelf = false, calendarId = 'primary') {
  const auth = getAuthorizedClient(tokens);
  const calendar = google.calendar({ version: 'v3', auth });

  const event = {
    summary: eventData.title,
    description: `${eventData.description || ''}\n\n---\n🚀 Live YMCA Prototype: https://scheduleassistant-735d8.web.app/prototype/`,
    start: {
      dateTime: eventData.start,
      timeZone: eventData.timeZone || 'America/New_York',
    },
    end: {
      dateTime: eventData.end,
      timeZone: eventData.timeZone || 'America/New_York',
    },
    reminders: {
      useDefault: true,
    },
  };

  if (eventData.location) {
    event.location = eventData.location;
  }

  const res = await calendar.events.insert({
    calendarId,
    requestBody: event,
    sendUpdates: notifySelf ? 'all' : 'none',
  });

  return res.data;
}

async function deleteCalendarEvent(tokens, eventId) {
  const auth = getAuthorizedClient(tokens);
  const calendar = google.calendar({ version: 'v3', auth });

  await calendar.events.delete({
    calendarId: 'primary',
    eventId,
    sendUpdates: 'none',
  });

  return { success: true };
}

async function checkEventExists(tokens, title, startDateTime) {
  const auth = getAuthorizedClient(tokens);
  const calendar = google.calendar({ version: 'v3', auth });

  const timeMin = new Date(startDateTime);
  timeMin.setMinutes(timeMin.getMinutes() - 1);

  const timeMax = new Date(startDateTime);
  timeMax.setMinutes(timeMax.getMinutes() + 1);

  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    q: title,
    singleEvents: true,
  });

  return (res.data.items || []).length > 0;
}

module.exports = {
  createOAuthClient,
  getAuthUrl,
  getTokensFromCode,
  getAuthorizedClient,
  listCalendars,
  listUpcomingEvents,
  createCalendarEvent,
  deleteCalendarEvent,
  checkEventExists,
};
