/**
 * content.js - Scans for schedules on the page
 */

console.log("%c🐝 Schedule Assistant Connector: Script injected into page!", "color: #FDBB2D; font-weight: bold; font-size: 14px;");

function findSchedules() {
    console.log("🐝 Scanning for shifts...");

    // 1. Check for iCal link first
    const links = document.querySelectorAll('input, a');
    for (const el of links) {
        const val = (el.value || el.innerText || el.href || "");
        if (val.includes('socialschedules.com/ical/')) {
            console.log("🐝 Found iCal URL via scanner:", val);
            chrome.storage.local.set({ lastFoundIcal: val.trim(), lastFoundShifts: null });
            return true;
        }
    }

    // 2. Direct Scraper for the "Week" or "Day" view
    // We look for elements that likely contain shift data
    // Patterns: "3:30 pm - 7:30 pm"
    const timeRegex = /(\d{1,2}:\d{2})\s*(am|pm)\s*-\s*(\d{1,2}:\d{2})\s*(am|pm)/i;
    const scraped = [];

    // We'll look at ALL elements that might be a "shift card"
    // On SocialSchedules, shifts are often in divs that have specific styling
    const potentialShiftElements = document.querySelectorAll('div, span, section');

    potentialShiftElements.forEach((el) => {
        // Only look at "leaf" or small containers to avoid grabbing the whole page
        if (el.children.length > 10) return;

        const text = el.innerText;
        const match = text.match(timeRegex);

        if (match) {
            // It has a time! Now let's see if it has a title or location
            // We'll grab the parent container if it's small, to get the full context
            let container = el;
            // If it's a small span inside a div, the div is likely the card
            if (container.tagName === 'SPAN' && container.parentElement.innerText.length < 200) {
                container = container.parentElement;
            }

            const shiftInfo = {
                id: 'scraped-' + Math.random().toString(36).substr(2, 5),
                title: container.querySelector('strong, h3, h4, .title, .name')?.innerText || "Found Shift",
                time: match[0],
                fullText: container.innerText.replace(/\n+/g, ' ').trim()
            };

            // Avoid duplicates by checking the fullText
            if (!scraped.some(s => s.fullText === shiftInfo.fullText)) {
                scraped.push(shiftInfo);
            }
        }
    });

    if (scraped.length > 0) {
        console.log(`%c🐝 Found ${scraped.length} potential shifts!`, "color: #22c55e; font-weight: bold;");
        chrome.storage.local.set({ lastFoundShifts: scraped, lastFoundIcal: null });

        // Notify the sidebar if it's open
        chrome.runtime.sendMessage({ type: 'SHIFTS_FOUND', count: scraped.length }).catch(() => { });

        return true;
    }

    return false;
}

// Run immediately
findSchedules();

// And periodically (for SPAs)
const scanner = setInterval(() => {
    const found = findSchedules();
    if (found) {
        // We found something, but don't stop scanning in case they change weeks
        console.log("🐝 Shift data current.");
    }
}, 5000);

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "ping") {
        sendResponse({ status: "alive" });
    }
});
