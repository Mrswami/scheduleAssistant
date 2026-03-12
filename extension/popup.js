document.addEventListener('DOMContentLoaded', async () => {
    const statusText = document.getElementById('status-text');
    const icalPreview = document.getElementById('ical-preview');
    const syncBtn = document.getElementById('sync-btn');
    const rescanLink = document.getElementById('rescan-link');

    const LOCAL_URL = 'http://localhost:3000';
    const PROD_URL = 'https://scheduleassistant-735d8.web.app';

    async function updateStatus() {
        const data = await chrome.storage.local.get(['lastFoundIcal', 'lastFoundShifts']);

        if (data.lastFoundIcal) {
            statusText.innerText = "✅ Schedule Feed Link Found!";
            icalPreview.innerText = data.lastFoundIcal;
            icalPreview.style.display = 'block';
            syncBtn.disabled = false;
        } else if (data.lastFoundShifts && data.lastFoundShifts.length > 0) {
            statusText.innerHTML = `✅ Found <strong>${data.lastFoundShifts.length}</strong> shifts on this page!<br><span style="font-size:11px; color:#FDBB2D">Ready for dashboard sync.</span>`;
            icalPreview.innerText = data.lastFoundShifts.slice(0, 2).map(s => `• ${s.time}: ${s.fullText.substring(0, 30)}...`).join('\n');
            icalPreview.style.display = 'block';
            syncBtn.disabled = false;
        } else {
            statusText.innerText = "🔍 No shifts found. Try navigating to your Schedule tab.";
            icalPreview.style.display = 'none';
            syncBtn.disabled = true;
        }
    }

    updateStatus();

    rescanLink.onclick = async (e) => {
        e.preventDefault();
        statusText.innerText = "Scanning...";
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
            await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
            setTimeout(updateStatus, 500);
        }
    };

    syncBtn.onclick = async () => {
        const data = await chrome.storage.local.get(['lastFoundIcal', 'lastFoundShifts']);
        syncBtn.innerText = "Syncing...";
        syncBtn.disabled = true;

        let baseUrl = LOCAL_URL;

        // Quick check if local is running
        try {
            const check = await fetch(LOCAL_URL + '/auth/status', { signal: AbortSignal.timeout(1000) });
            if (!check.ok) throw new Error();
        } catch (e) {
            baseUrl = PROD_URL;
        }

        try {
            let endpoint = '/api/schedules/save-url';
            let body = { url: data.lastFoundIcal };
            if (data.lastFoundShifts) {
                endpoint = '/api/schedules/save-raw';
                body = { shifts: data.lastFoundShifts };
            }

            const response = await fetch(baseUrl + endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(body)
            });

            if (response.ok) {
                syncBtn.innerText = "✅ Sent! Opening Dashboard...";
                syncBtn.style.background = "#22c55e";
                await chrome.storage.local.remove(['lastFoundShifts']);
                chrome.tabs.create({ url: baseUrl });
                setTimeout(() => window.close(), 2000);
            } else {
                throw new Error("Dashboard Error");
            }
        } catch (err) {
            statusText.innerText = "❌ Connection Failed. Check if dashboard is running.";
            syncBtn.innerText = "Retry";
            syncBtn.disabled = false;
        }
    };
});
