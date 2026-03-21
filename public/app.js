let schedules = [];
let isAuthenticated = false;
let currentGroupId = null;
let groupMeToken = null;

// ─── Initialization ──────────────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', async () => {
  console.log('📅 Schedule Assistant: Dashboard Loaded');
  window.parent.postMessage('SCHEDULE_ASSISTANT_LOADED', '*');
  await checkAuth();

  // Auto-fetch shifts if URL is already there
  const urlEl = document.getElementById('ical-url');
  if (urlEl && urlEl.value.trim().length > 10 && isAuthenticated) {
    saveAndFetch();
  }
});

function showSection(name) {
  // Update nav UI
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.innerText.toLowerCase().includes(name));
  });

  // Hide all sections
  document.querySelectorAll('section').forEach(sec => sec.classList.add('hidden'));

  // Show target
  const target = document.getElementById('section-' + name);
  if (target) {
    target.classList.remove('hidden');

    // Header updates
    const titles = {
      shifts: 'My Work Shifts',
      groupme: 'Team Chat',
      invites: 'Marketplace',
      availability: 'Availability Bridge',
      settings: 'App Settings',
      synccheck: 'Sync Check'
    };
    const subs = {
      shifts: 'Manage your WhenToWork shifts and sync to Google Calendar.',
      groupme: 'Stay in touch with your coworkers.',
      invites: 'Open coverage and swap requests from your coworkers.',
      availability: 'Mirror your WhenToWork preferences seamlessly.',
      settings: 'Manage your preferences and platform connections.',
      synccheck: 'Compare WhenToWork, Google Calendar, and your app.'
    };
    document.getElementById('main-title').innerText = titles[name] || 'Schedule Assistant';
    document.getElementById('main-subtitle').innerText = subs[name] || '';

    // Specific logic per section
    if (name === 'groupme') loadGroupMe();
    if (name === 'invites') loadInvites();
    if (name === 'synccheck') runSyncCheck();
    if (name === 'availability') renderAvailability();
  }
}

// ─── Availability ──────────────────────────────────────────────────────────

const MY_AVAILABILITY = [
  { day: 'Mon', start: '15:15', end: '22:15' },
  { day: 'Tue', start: '15:15', end: '22:15' },
  { day: 'Wed', start: '15:15', end: '22:15' },
  { day: 'Thu', start: '15:15', end: '22:15' },
  { day: 'Fri', start: '16:45', end: '22:15' },
  { day: 'Sat', start: '16:45', end: '22:15' },
  { day: 'Sun', start: '17:45', end: '22:15' }
];

function renderAvailability() {
  const container = document.getElementById('availability-grid-container');
  const helper = document.getElementById('w2w-helper-grid');

  container.innerHTML = MY_AVAILABILITY.map(a => `
    <div style="display:flex; align-items:center; justify-content:space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--glass-border);">
      <div style="font-weight:600; width: 50px;">${a.day}</div>
      <div class="badge" style="background: rgba(99,102,241,0.1); color: var(--primary); font-family: monospace;">
        ${formatTime(a.start)} - ${formatTime(a.end)}
      </div>
    </div>
  `).join('');

  helper.innerHTML = MY_AVAILABILITY.map(a => {
    const startHour = parseInt(a.start.split(':')[0]);
    const endHour = parseInt(a.end.split(':')[0]);

    let hoursHtml = '';
    for (let h = 0; h < 24; h++) {
      const isAvailable = h >= startHour && h < endHour;
      const color = isAvailable ? '#10b981' : 'transparent';
      const border = isAvailable ? 'none' : '1px solid var(--glass-border)';
      hoursHtml += `<div style="height: 12px; background: ${color}; border: ${border}; border-radius: 2px; margin-bottom: 2px;" title="${h}:00"></div>`;
    }

    return `
      <div>
        <div style="text-align:center; font-size: 0.7rem; color: var(--text-muted); margin-bottom: 0.5rem;">${a.day}</div>
        <div style="background: rgba(0,0,0,0.2); border-radius: 4px; padding: 4px;">
          ${hoursHtml}
        </div>
      </div>
    `;
  }).join('');
}

function formatTime(t24) {
  const [h, m] = t24.split(':');
  const hh = parseInt(h);
  const ampm = hh >= 12 ? 'p' : 'a';
  const displayH = hh % 12 || 12;
  return `${displayH}:${m}${ampm}`;
}

// ─── Authentication ──────────────────────────────────────────────────────────

async function checkAuth() {
  try {
    const res = await fetch('/auth/status');
    const data = await res.json();
    isAuthenticated = data.authenticated;

    if (isAuthenticated && data.user) {
      updateSidebarUserInfo(data.user);
      await loadCalendars();
      await loadSavedUrl();
      await loadHistory();
    } else {
      document.getElementById('btn-login-sidebar').classList.remove('hidden');
      document.getElementById('user-info-sidebar').classList.add('hidden');
    }
  } catch (err) {
    console.error('Auth check error:', err);
  }
}

function updateSidebarUserInfo(user) {
  document.getElementById('btn-login-sidebar').classList.add('hidden');
  const info = document.getElementById('user-info-sidebar');
  info.classList.remove('hidden');

  if (user.picture) document.getElementById('user-avatar-sidebar').src = user.picture;
  document.getElementById('user-name-sidebar').textContent = user.name || 'User';
  document.getElementById('user-email-sidebar').textContent = user.email || '';
}

function loginWithGoogle() { window.location.href = '/auth/google'; }

async function logout() {
  await fetch('/auth/logout', { method: 'POST' });
  window.location.reload();
}

// ─── Shifts & Schedules ──────────────────────────────────────────────────────

async function loadSavedUrl() {
  try {
    const res = await fetch('/api/schedules/saved-url');
    const data = await res.json();
    if (data.url) document.getElementById('ical-url').value = data.url;
  } catch (err) { }
}

async function saveAndFetch() {
  if (!isAuthenticated) { showToast('Please sign in first!', 'error'); return; }

  const url = document.getElementById('ical-url').value.trim();
  if (!url) {
    showSection('settings');
    showToast('Add your iCal URL in settings', 'error');
    return;
  }

  showLoading('Fetching your schedules...');
  try {
    // Save URL
    await fetch('/api/schedules/save-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    // Fetch shifts
    const res = await fetch(`/api/schedules?url=${encodeURIComponent(url)}`);
    const data = await res.json();

    if (res.ok) {
      schedules = data.schedules;
      renderSchedules(schedules);
      showSection('shifts');
      showToast(`Loaded ${schedules.length} shifts!`, 'success');
    } else {
      throw new Error(data.error || 'Failed to fetch schedules');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoading();
  }
}

function renderSchedules(items) {
  const container = document.getElementById('schedules-list');

  if (!items.length) {
    container.innerHTML = '<div class="card" style="grid-column: 1/-1; text-align:center; padding: 3rem;">No upcoming shifts found.</div>';
    document.getElementById('sync-action-container').classList.add('hidden');
    return;
  }

  document.getElementById('sync-action-container').classList.remove('hidden');

  // Always start from today, show 7 days forward
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });

  // Index shifts by date string YYYY-MM-DD
  const byDate = {};
  for (const s of items) {
    const key = new Date(s.start).toISOString().slice(0, 10);
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(s);
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayKey = today.toISOString().slice(0, 10);

  const cols = days.map(day => {
    const key = day.toISOString().slice(0, 10);
    const isToday = key === todayKey;
    const shifts = byDate[key] || [];

    const shiftHtml = shifts.length
      ? shifts.map(s => {
        const start = new Date(s.start);
        const timeStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `
            <div class="shift-card animate-in selected" id="shift-${s.id}" onclick="toggleShiftSelection('${s.id}')" style="margin-bottom: 0.5rem; padding: 0.6rem 0.75rem;">
              <div class="shift-title" style="font-size: 0.8rem;">${s.title}</div>
              <div class="shift-time" style="font-size: 0.7rem;">${timeStr}${s.location ? ' · ' + s.location : ''}</div>
            </div>`;
      }).join('')
      : `<div style="height: 3rem; border: 1px dashed var(--glass-border); border-radius: 10px; opacity: 0.3;"></div>`;

    return `
      <div style="min-width: 0;">
        <div style="text-align:center; margin-bottom: 0.5rem;">
          <div style="font-size: 0.7rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">${dayNames[day.getDay()]}</div>
          <div style="font-size: 1.25rem; font-weight: ${isToday ? '800' : '400'};
            color: ${isToday ? 'var(--primary)' : 'inherit'};
            background: ${isToday ? 'rgba(99,102,241,0.15)' : 'transparent'};
            border-radius: 50%; width: 2rem; height: 2rem; display: flex; align-items: center; justify-content: center; margin: 0 auto;">
            ${day.getDate()}
          </div>
        </div>
        ${shiftHtml}
      </div>`;
  }).join('');

  container.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.75rem; grid-column: 1 / -1;">
      ${cols}
    </div>`;
}

function toggleShiftSelection(id) {
  const el = document.getElementById('shift-' + id);
  el.classList.toggle('selected');
}

async function runSync() {
  if (!isAuthenticated) { showToast('Please sign in with Google', 'error'); return; }

  // Get selected IDs
  const selectedIds = Array.from(document.querySelectorAll('.shift-card.selected'))
    .map(el => el.id.replace('shift-', ''));

  if (selectedIds.length === 0) { showToast('Select at least one shift', 'error'); return; }

  const icalUrl = document.getElementById('ical-url').value.trim();
  const calendarId = document.getElementById('cal-picker').value || 'primary';
  const timeZone = document.getElementById('timezone').value;

  showLoading(`Syncing ${selectedIds.length} shift(s)...`);
  try {
    const res = await fetch('/api/calendar/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ icalUrl, calendarId, timeZone, selectedIds })
    });
    const data = await res.json();

    if (res.ok) {
      showToast(`Successfully synced ${data.synced} shifts!`, 'success');
      // Mark as synced in UI
      (data.details?.synced || []).forEach(s => {
        const el = document.getElementById('shift-' + s.id);
        if (el) {
          el.classList.add('synced');
          el.classList.remove('selected');
        }
      });
      await loadHistory();
    } else {
      throw new Error(data.error || 'Sync failed');
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoading();
  }
}

async function saveSettings() {
  // Handle saving URL and Timezone...
  const url = document.getElementById('ical-url').value.trim();
  const tz = document.getElementById('timezone').value;
  const gmToken = document.getElementById('gm-token').value;

  showLoading('Saving settings...');
  try {
    await fetch('/api/user/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ icalUrl: url, timeZone: tz })
    });

    if (gmToken) {
      await fetch('/api/groupme/save-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: gmToken })
      });
    }

    showToast('Settings updated!', 'success');
    saveAndFetch(); // Immediate update
  } catch (err) {
    showToast('Failed to save settings', 'error');
  } finally {
    hideLoading();
  }
}

// ─── GroupMe ─────────────────────────────────────────────────────────────────

async function loadGroupMe() {
  const list = document.getElementById('gm-groups');
  list.innerHTML = '<div style="padding:2rem; text-align:center;">Loading groups...</div>';

  try {
    const res = await fetch('/api/groupme/groups');
    const groups = await res.json();

    if (!res.ok) throw new Error(groups.error || 'Failed to load GroupMe');

    list.innerHTML = groups.map(g => `
            <div class="gm-group-item" onclick="loadMessages('${g.id}')" id="gm-group-btn-${g.id}">
                <div style="font-weight:600; font-size: 0.875rem;">${g.name}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${g.messages.last_message_preview || ''}</div>
            </div>
        `).join('');
  } catch (err) {
    list.innerHTML = `<div style="padding:2rem; text-align:center; color: var(--danger)">${err.message}</div>`;
  }
}

async function loadMessages(groupId) {
  currentGroupId = groupId;
  document.querySelectorAll('.gm-group-item').forEach(i => i.classList.remove('active'));
  document.getElementById('gm-group-btn-' + groupId).classList.add('active');

  const container = document.getElementById('gm-messages');
  container.innerHTML = '<div style="margin:auto;">Loading messages...</div>';

  // Load chat in parallel
  // loadSwapBoard(groupId); // Moved to invites section

  try {
    const res = await fetch(`/api/groupme/messages/${groupId}`);
    const messages = await res.json();

    container.innerHTML = messages.map(m => `
            <div class="gm-message animate-in">
                <div class="gm-message-user">${m.name}</div>
                <div class="gm-message-bubble">${m.text || ''}</div>
            </div>
        `).join('');
  } catch (err) {
    showToast('Failed to load messages', 'error');
  }
}

async function loadInvites(groupId = null) {
  const selector = document.getElementById('invites-group-selector');
  const grid = document.getElementById('invites-grid');

  if (!selector || !grid) return;

  // 1. Load groups if selector is empty
  if (selector.children.length <= 1) {
    try {
      const res = await fetch('/api/groupme/groups');
      const groups = await res.json();
      if (!res.ok) throw new Error();

      selector.innerHTML = groups.map(g => `
          <div class="invite-group-pill ${currentGroupId === g.id ? 'active' : ''}" 
               onclick="loadInvites('${g.id}')" id="invite-pill-${g.id}">
            ${g.name}
          </div>
      `).join('');

      // Auto-load first group if none selected
      if (!groupId && !currentGroupId && groups.length > 0) {
        return loadInvites(groups[0].id);
      }
    } catch (e) {
      selector.innerHTML = '<p class="text-muted">Connect Team Chat in Settings to see invites.</p>';
      return;
    }
  }

  const tid = groupId || currentGroupId;
  if (!tid) return;

  // Update selection UI
  currentGroupId = tid;
  document.querySelectorAll('.invite-group-pill').forEach(p => p.classList.remove('active'));
  const activePill = document.getElementById('invite-pill-' + tid);
  if (activePill) activePill.classList.add('active');

  grid.innerHTML = `
    <div style="grid-column: 1/-1; text-align:center; padding: 4rem;">
        <div style="width: 40px; height: 40px; border: 3px solid var(--primary); border-top-color: transparent; border-radius:50%; animation: spin 1s linear infinite; margin: 0 auto 1rem;"></div>
        <p class="text-muted">Sifting through messages for ${activePill ? activePill.innerText : 'group'}...</p>
    </div>
  `;

  try {
    const res = await fetch(`/api/groupme/swaps/${tid}`);
    const data = await res.json();

    if (!res.ok) throw new Error(data.error);

    if (data.swaps.length === 0) {
      grid.innerHTML = `
        <div class="card" style="grid-column: 1/-1; text-align:center; padding: 4rem;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">🏝️</div>
            <h3>All Quiet!</h3>
            <p class="text-muted">No open shift requests found in this group lately.</p>
        </div>`;
      return;
    }

    grid.innerHTML = data.swaps.map(s => {
      const timeAgo = formatTimeAgo(s.createdAt);
      const defaultAvatar = 'https://img.icons8.com/clouds/100/user.png';
      const avatar = s.avatarUrl || defaultAvatar;

      return `
        <div class="invite-card animate-in">
          <div class="invite-header">
            <img src="${avatar}" class="invite-avatar" onerror="this.src='${defaultAvatar}'">
            <div class="invite-user-info">
              <div class="invite-name">${s.name}</div>
              <div class="invite-meta">${timeAgo}</div>
            </div>
          </div>
          <div class="invite-body">
            "${s.text}"
          </div>
          <div class="invite-footer">
            <div class="invite-date-badge">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                ${s.shiftDateStr || 'Upcoming'}
            </div>
            <button class="btn btn-secondary" style="padding: 0.4rem 0.8rem; font-size: 0.75rem;" onclick="viewInChat('${tid}')">
                View Chat
            </button>
          </div>
        </div>`;
    }).join('');
  } catch (err) {
    grid.innerHTML = `<div class="card" style="grid-column: 1/-1; text-align:center; padding: 2rem; color: var(--danger)">${err.message}</div>`;
  }
}

function viewInChat(groupId) {
  showSection('groupme');
  loadMessages(groupId);
}

function formatTimeAgo(unixSec) {
  const diff = Math.floor(Date.now() / 1000) - unixSec;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

async function sendGMMessage() {
  if (!currentGroupId) return;
  const input = document.getElementById('gm-input');
  const text = input.value.trim();
  if (!text) return;

  try {
    await fetch(`/api/groupme/send/${currentGroupId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    input.value = '';
    loadMessages(currentGroupId);
  } catch (err) {
    showToast('Failed to send', 'error');
  }
}

// ─── Calendars & History ─────────────────────────────────────────────────────

async function loadCalendars() {
  try {
    const res = await fetch('/api/calendar/list');
    const data = await res.json();
    const picker = document.getElementById('cal-picker');
    if (data.calendars) {
      picker.innerHTML = data.calendars.map(c => `<option value="${c.id}" ${c.primary ? 'selected' : ''}>${c.name}</option>`).join('');
      picker.disabled = false;
    }
  } catch (err) { }
}

async function loadHistory() {
  try {
    const res = await fetch('/api/user/history');
    const data = await res.json();
    if (data.history) {
      const list = document.getElementById('history-list');
      list.innerHTML = data.history.map(h => `
            <div style="padding:0.75rem 0; border-bottom: 1px solid var(--glass-border); font-size: 0.875rem;">
                <strong>Sync on ${new Date(h.createdAt?.seconds * 1000).toLocaleDateString()}</strong>: 
                ${h.synced} added, ${h.skipped} skipped
            </div>
        `).join('');
    }
  } catch (err) { }
}

// ─── Sync Check ──────────────────────────────────────────────────────────────

let lastSyncCheckData = null;

async function runSyncCheck() {
  if (!isAuthenticated) { showToast('Please sign in first!', 'error'); return; }

  document.getElementById('sync-check-list').innerHTML = '<p class="text-muted">Checking sync status...</p>';
  document.getElementById('count-synced').textContent = '…';
  document.getElementById('count-missing').textContent = '…';
  document.getElementById('count-orphaned').textContent = '…';

  try {
    const res = await fetch('/api/sync/check');
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Sync check failed');

    lastSyncCheckData = data;
    renderSyncCheck(data);
  } catch (err) {
    document.getElementById('sync-check-list').innerHTML = `<p style="color: var(--danger)">${err.message}</p>`;
    showToast(err.message, 'error');
  }
}

function renderSyncCheck(data) {
  document.getElementById('count-synced').textContent = data.total.synced;
  document.getElementById('count-missing').textContent = data.total.missing;
  document.getElementById('count-orphaned').textContent = data.total.orphaned;

  const checkedAt = document.getElementById('sync-checked-at');
  checkedAt.textContent = `Last checked: ${new Date(data.checkedAt).toLocaleTimeString()}`;

  const fixBtn = document.getElementById('fix-all-container');
  fixBtn.classList.toggle('hidden', data.total.missing === 0);

  const list = document.getElementById('sync-check-list');

  const rows = [
    ...data.synced.map(s => renderSyncRow('synced', s.shift.title, s.shift.start)),
    ...data.missing.map(s => renderSyncRow('missing', s.title, s.start)),
    ...data.orphaned.map(e => renderSyncRow('orphaned', e.title, e.start)),
  ];

  if (rows.length === 0) {
    list.innerHTML = '<p class="text-muted" style="text-align:center; padding: 2rem;">Nothing to show — add your iCal URL in Settings first.</p>';
    return;
  }

  list.innerHTML = rows.join('');
}

function renderSyncRow(status, title, startStr) {
  const d = new Date(startStr);
  const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const badge = {
    synced: { text: '✅ Synced', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    missing: { text: '⚠️ Missing from GCal', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    orphaned: { text: '🗑️ Orphaned in GCal', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  }[status];

  return `
    <div style="display:flex; align-items:center; gap: 1rem; padding: 0.75rem 0; border-bottom: 1px solid var(--glass-border);">
      <span style="padding: 0.25rem 0.6rem; border-radius: 6px; font-size: 0.75rem; font-weight: 600;
        color: ${badge.color}; background: ${badge.bg}; white-space: nowrap;">${badge.text}</span>
      <div style="flex:1; min-width:0;">
        <div style="font-weight: 600; font-size: 0.875rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${title}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">${dateStr} at ${timeStr}</div>
      </div>
    </div>
  `;
}

async function fixMissing() {
  if (!lastSyncCheckData || lastSyncCheckData.missing.length === 0) return;

  const icalUrl = document.getElementById('ical-url').value.trim();
  const calendarId = document.getElementById('cal-picker').value || 'primary';
  const timeZone = document.getElementById('timezone').value;
  const selectedIds = lastSyncCheckData.missing.map(s => s.id);

  showLoading(`Adding ${selectedIds.length} missing shift(s) to Google Calendar...`);
  try {
    const res = await fetch('/api/calendar/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ icalUrl, calendarId, timeZone, selectedIds })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showToast(`Added ${data.synced} shift(s)!`, 'success');
    runSyncCheck(); // Re-check after fix
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    hideLoading();
  }
}

// ─── UI Helpers ──────────────────────────────────────────────────────────────

function showLoading(msg) {
  document.getElementById('loading-text').innerText = msg;
  document.getElementById('loading').classList.remove('hidden');
}
function hideLoading() { document.getElementById('loading').classList.add('hidden'); }

function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast');
  toast.innerText = msg;
  toast.className = 'toast show ' + type;
  setTimeout(() => toast.classList.remove('show'), 3000);
}
