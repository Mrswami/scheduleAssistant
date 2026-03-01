let schedules = [];
let isAuthenticated = false;
let currentGroupId = null;
let groupMeToken = null;

// ─── Initialization ──────────────────────────────────────────────────────────

window.addEventListener('DOMContentLoaded', async () => {
  console.log('🐝 adBeeWork: Dashboard Loaded');
  window.parent.postMessage('AD_BEE_LOADED', '*');
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
    const titles = { shifts: 'My Work Shifts', groupme: 'GroupMe Chat', settings: 'App Settings', synccheck: 'Sync Check' };
    const subs = {
      shifts: 'Manage your SocialSchedules and sync to Google Calendar.',
      groupme: 'Stay in touch with your coworkers.',
      settings: 'Manage your preferences and platform connections.',
      synccheck: 'Compare SocialSchedules, Google Calendar, and your app — all in one view.'
    };
    document.getElementById('main-title').innerText = titles[name] || 'adBeeWork';
    document.getElementById('main-subtitle').innerText = subs[name] || '';

    // Specific logic per section
    if (name === 'groupme') loadGroupMe();
    if (name === 'synccheck') runSyncCheck();
  }
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
    container.innerHTML = '<div class="card" style="grid-column: 1/-1; text-align:center;">No upcoming shifts found.</div>';
    document.getElementById('sync-action-container').classList.add('hidden');
    return;
  }

  document.getElementById('sync-action-container').classList.remove('hidden');
  container.innerHTML = items.map(s => {
    const start = new Date(s.start);
    const dateStr = start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const timeStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return `
      <div class="shift-card animate-in selected" id="shift-${s.id}" onclick="toggleShiftSelection('${s.id}')">
        <div class="shift-date">${dateStr}</div>
        <div class="shift-title">${s.title}</div>
        <div class="shift-time">${timeStr} • ${s.location || 'No location'}</div>
      </div>
    `;
  }).join('');
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
