// Background service worker for time tracking

let trackingInterval = null;
let currentSessionStart = Date.now();
let lastActiveTime = Date.now();
let lastTrackedUrl = null;
let accumulatedSeconds = 0;

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  console.log('TimeTapestry installed');
  await initializeData();
  startTracking();
  updateBadgeFromStorage();
});

chrome.runtime.onStartup.addListener(async () => {
  console.log('TimeTapestry started');
  await startTracking();
  updateBadgeFromStorage();
});

// Initialize data if not exists
async function initializeData() {
  const data = await chrome.storage.local.get(['trackedWebsites', 'today', 'history']);

  if (!data.trackedWebsites) {
    await chrome.storage.local.set({ trackedWebsites: [] });
  }

  if (!data.today) {
    await chrome.storage.local.set({
      today: {
        date: getDateString(new Date()),
        totalMinutes: 0,
        sites: {},
        lastNotificationHour: 0
      }
    });
  }

  if (!data.history) {
    await chrome.storage.local.set({ history: [] });
  }
}

// Start tracking time
async function startTracking() {
  // Check active tab every second
  trackingInterval = setInterval(trackActiveTab, 1000);

  // Reset daily counter at midnight
  scheduleMidnightReset();

  // Listen for tab changes
  chrome.tabs.onActivated.addListener(handleTabChange);
  chrome.windows.onFocusChanged.addListener(handleWindowFocus);
}

// Handle tab activation changes
async function handleTabChange() {
  await flushAccumulatedTime();
  currentSessionStart = Date.now();
  lastTrackedUrl = null;
}

// Handle window focus changes
async function handleWindowFocus(windowId) {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    await flushAccumulatedTime();
  }
}

// Track active tab time
async function trackActiveTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.url) {
      await flushAccumulatedTime();
      lastTrackedUrl = null;
      return;
    }

    const url = new URL(tab.url);
    const hostname = url.hostname.replace('www.', '');

    const data = await chrome.storage.local.get(['trackedWebsites', 'today']);

    // Ensure we have tracked websites array
    if (!data.trackedWebsites || data.trackedWebsites.length === 0) {
      await flushAccumulatedTime();
      lastTrackedUrl = null;
      return;
    }

    // Check if this hostname or its parent domain is tracked
    const isTracked = data.trackedWebsites.some(site => {
      return hostname === site || hostname.endsWith('.' + site) || site.endsWith(hostname);
    });

    // Check if user is idle
    const idleState = await chrome.idle.queryState(60); // 60 seconds threshold
    const isIdle = idleState === 'idle' || idleState === 'locked';

    if (!isTracked || isIdle) {
      await flushAccumulatedTime();
      lastTrackedUrl = null;
      return;
    }

    // If we switched to a different tracked site, flush previous time
    if (lastTrackedUrl && lastTrackedUrl !== hostname) {
      await flushAccumulatedTime();
      currentSessionStart = Date.now();
    }

    lastTrackedUrl = hostname;
    lastActiveTime = Date.now(); // Update last active time

    // Update badge every second with accumulated time (only active time, not idle)
    const data2 = await chrome.storage.local.get(['today']);
    const totalMinutes = data2.today?.totalMinutes || 0;

    // Only count time since last flush (current session)
    // We don't add current seconds to avoid counting idle time
    // The badge shows saved time, and updates every minute when we save
    updateBadge(totalMinutes);

  } catch (error) {
    // Ignore errors for protected pages
    await flushAccumulatedTime();
    lastTrackedUrl = null;
  }
}

// Flush accumulated time to storage
async function flushAccumulatedTime() {
  if (!lastTrackedUrl) return;

  // Calculate actual active time (time since last active moment)
  const timeSinceLastActive = Math.floor((lastActiveTime - currentSessionStart) / 1000);

  if (timeSinceLastActive < 60) {
    currentSessionStart = Date.now();
    return;
  }

  const minutesToAdd = Math.floor(timeSinceLastActive / 60);
  await updateTimeTracked(lastTrackedUrl, minutesToAdd);

  currentSessionStart = Date.now();
}

// Update time tracked in storage
async function updateTimeTracked(hostname, minutesToAdd) {
  const data = await chrome.storage.local.get(['today']);

  // Check if we need to reset daily counter
  const today = getDateString(new Date());
  if (data.today.date !== today) {
    await resetDailyCounter(data);
  }

  // Update time for this site
  const currentSiteTime = data.today.sites[hostname] || 0;
  data.today.sites[hostname] = currentSiteTime + minutesToAdd;

  // Update total time
  data.today.totalMinutes += minutesToAdd;

  // Check if we need to send notification (every hour)
  const newTotalHours = Math.floor(data.today.totalMinutes / 60);
  if (newTotalHours > data.today.lastNotificationHour && newTotalHours > 0) {
    await sendHourlyNotification(newTotalHours);
    data.today.lastNotificationHour = newTotalHours;
  }

  // Save to storage
  await chrome.storage.local.set({ today: data.today });

  // Update badge
  updateBadge(data.today.totalMinutes);
}

// Send hourly notification
async function sendHourlyNotification(hours) {
  const notificationId = `hourly-${hours}-${Date.now()}`;

  const options = {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'TimeTapestry',
    message: `You've spent ${hours} hour${hours > 1 ? 's' : ''} on tracked websites today.`,
    priority: 1,
    silent: false
  };

  await chrome.notifications.create(notificationId, options);
}

// Update badge text
function updateBadge(totalMinutes) {
  let text = '';
  if (totalMinutes < 60) {
    text = `${totalMinutes}m`;
  } else {
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    text = mins > 0 ? `${hours}h${mins}m` : `${hours}h`;
  }

  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color: '#2196F3' });
}

// Update badge from current storage data
async function updateBadgeFromStorage() {
  const data = await chrome.storage.local.get(['today']);
  const totalMinutes = data.today?.totalMinutes || 0;
  updateBadge(totalMinutes);
}

// Reset daily counter
async function resetDailyCounter(data) {
  const yesterday = data.today.date;

  // Save yesterday's data to history
  if (data.today.totalMinutes > 0) {
    // Fetch existing history from storage
    const storageData = await chrome.storage.local.get(['history']);
    let history = storageData.history || [];

    // Check if an entry for this date already exists
    const existingIndex = history.findIndex(h => h.date === yesterday);

    if (existingIndex >= 0) {
      // Update existing entry
      history[existingIndex].totalMinutes += data.today.totalMinutes;
    } else {
      // Add new entry at the beginning
      history.unshift({
        date: yesterday,
        totalMinutes: data.today.totalMinutes
      });
    }

    // Keep only last 30 days
    if (history.length > 30) {
      history = history.slice(0, 30);
    }

    await chrome.storage.local.set({ history });
  }

  // Reset today's counter
  const today = getDateString(new Date());
  await chrome.storage.local.set({
    today: {
      date: today,
      totalMinutes: 0,
      sites: {},
      lastNotificationHour: 0
    }
  });
}

// Schedule midnight reset
function scheduleMidnightReset() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const msUntilMidnight = tomorrow - now;

  setTimeout(async () => {
    const data = await chrome.storage.local.get(['today', 'history']);
    await resetDailyCounter(data);
    scheduleMidnightReset(); // Schedule next reset
  }, msUntilMidnight);
}

// Get date string in YYYY-MM-DD format
function getDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateBadge') {
    updateBadgeFromStorage();
    sendResponse({ success: true });
  }
  return true;
});
