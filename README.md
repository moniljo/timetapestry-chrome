# ⏱️ TimeTapestry

A gentle Chrome/Edge extension that helps you track time spent on specific websites. No blocking, no restrictions - just awareness.

## Features

- **Real-time badge**: Shows total time spent on tracked websites today
- **Hourly notifications**: Get notified every hour about your total usage
- **30-day history**: View your usage patterns over the last month with a visual chart
- **Easy management**: Add or remove websites to track anytime
- **Privacy-focused**: All data stored locally on your device
- **No blocking**: Websites are never blocked - you always have full access
- **Accurate tracking**: Only counts active usage time (not idle or background tabs)

## How It Works

1. Add websites you want to track (e.g., youtube.com, twitter.com)
2. Browse normally - the extension tracks time in the background
3. See your daily total in the extension badge (toolbar icon)
4. Get hourly notifications: "You've spent 2 hours on tracked websites today"
5. View 30-day history in the popup dashboard with date labels

## Installation for Edge (Developer Mode)

### Step 1: Download the Extension
The extension files should be in a folder called `chrome-webblocker` with this structure:
```
chrome-webblocker/
├── manifest.json
├── background.js
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── debug.html
└── README.md
```

### Step 2: Open Edge Extensions Page
1. Open Microsoft Edge
2. Navigate to `edge://extensions`
   - Or click the three dots (···) → Extensions → Manage Extensions

### Step 3: Enable Developer Mode
1. Toggle the **"Developer mode"** switch in the top-left corner
2. It should turn blue when enabled

### Step 4: Load the Extension
1. Click the **"Load unpacked"** button that appears
2. Navigate to and select the `chrome-webblocker` folder
3. Click "Select Folder"

### Step 5: Verify Installation
You should see **"TimeTapestry"** appear in your extensions list with the stopwatch icon ⏱️

## Usage

### Adding Websites to Track

1. Click the TimeTapestry icon in your toolbar
2. In the popup, enter a website in the input field (e.g., `youtube.com`)
3. Click "Add" or press Enter
4. The website will appear in your tracked list

**Tips:**
- Enter just the domain: `youtube.com` (not `https://www.youtube.com`)
- The extension will automatically match subdomains (e.g., `www.youtube.com` → `youtube.com`)

### Viewing Your Time

- **Badge**: See today's total time in the extension icon
- **Popup**: Click the icon to see:
  - Today's total time
  - Per-website breakdown
  - 30-day history chart with date labels (MM/DD format)

### Removing Websites

1. Click the TimeTapestry icon
2. Find the website in your tracked list
3. Click "Remove" next to it

### Notifications

You'll receive notifications at:
- **1 hour**: "You've spent 1 hour on tracked websites today"
- **2 hours**: "You've spent 2 hours on tracked websites today"
- And so on...

Notifications reset daily at midnight.

## How Time Tracking Works

### Active Time Only
The extension only tracks **active usage time**:
- ✅ Counts when tab is visible and you're actively using it
- ❌ Does NOT count when tab is in background
- ❌ Does NOT count when computer is idle (no mouse/keyboard for 60+ seconds)
- ❌ Does NOT count when you leave tabs open but walk away

This means leaving a tab open for hours won't inflate your time - only your actual active usage is tracked.

### How Time is Saved
1. You actively use a tracked website
2. After 60 seconds of active usage, 1 minute is saved to storage
3. If you go idle, time stops counting
4. When you come back and actively use for another 60 seconds, another minute is saved
5. Badge shows saved time (persisted data only)

**Example:**
```
Scenario 1: Leave tab open for 2 hours (idle)
Result: Badge shows 0m (no active usage)

Scenario 2: Actively use for 10 minutes
Result: Badge shows 10m (accurate active time)
```

## Data & Privacy

- **Local storage only**: All data is stored on your device using Chrome's storage API
- **No tracking**: Nothing is sent to any server
- **No analytics**: Your usage data never leaves your computer
- **30-day history**: Data is retained for 30 days, then automatically pruned

### Data Stored

```javascript
{
  "trackedWebsites": ["youtube.com", "twitter.com"],
  "today": {
    "date": "2025-12-30",
    "totalMinutes": 135,
    "sites": {
      "youtube.com": 90,
      "twitter.com": 45
    },
    "lastNotificationHour": 2
  },
  "history": [
    { "date": "2025-12-29", "totalMinutes": 150 },
    { "date": "2025-12-28", "totalMinutes": 180 },
    // ... up to 30 days
  ]
}
```

## Troubleshooting

### Badge not updating
- Refresh the page or restart Edge
- Check that the extension is enabled in `edge://extensions`
- Open the popup - this will sync the badge

### Websites not showing in list
- Make sure you've added websites in the popup
- Open debug.html (see below) to verify storage

### Time not tracking correctly
- The extension only tracks when the tab is **active** (visible)
- Background tabs are not counted
- Idle time (no mouse/keyboard activity) is not tracked after 60 seconds
- Time updates to storage every 60 seconds of active usage
- Badge shows persisted time only (not current session seconds)

### Graph not displaying
- This is normal for new installations - you need history data
- History is created when a day rolls over at midnight AND you've spent time on tracked websites
- Use the debug page to add test data and verify the chart works

### Notification error: "Unexpected property: 'id'"
This error occurs due to a cached service worker. To fix:
1. Go to `edge://extensions`
2. Find TimeTapestry
3. Click "Remove"
4. Click "Load unpacked" and select the folder again
This clears the cache and loads the fixed code.

## Debug Tools

A debug page is included (`debug.html`) to help troubleshoot:

**To use it:**
1. Open `debug.html` in your browser (File → Open File)
2. Click "Load Storage" to see current data
3. Click "Add 65 minutes" to test tracking
4. Click "Add test history" to populate the chart with 7 days of sample data
5. Click "Simulate day rollover" to test midnight reset logic

**Note:** You'll need to load this file directly in the browser since it's not part of the extension.

### Debug Console Output

The extension logs helpful messages to the browser console:

To view:
1. Open extension popup
2. Right-click → "Inspect" or press F12
3. Go to Console tab
4. Look for messages like:
   - "Rendering chart with history: [...]"
   - "Canvas size: 370 x 150"
   - "Drawing 7 bars"
   - "Chart rendered successfully"

### Reset all data
If you want to start fresh:
1. Go to `edge://extensions`
2. Find TimeTapestry
3. Click "Remove"
4. Reinstall the extension

## Icons

The extension uses professional stopwatch icons (iOS filled style) downloaded from Icons8.com:
- **icon16.png** - 16x16 pixels (toolbar)
- **icon48.png** - 48x48 pixels (extensions page)
- **icon128.png** - 128x128 pixels (Chrome Web Store, notifications)

A stopwatch icon was chosen because it better represents time tracking (measuring duration) rather than just showing time like a clock.

## Architecture

TimeTapestry is built using Chrome Extension Manifest V3, the latest standard for Chrome and Edge extensions. The architecture follows a service worker pattern for efficient background processing.

### Component Overview

The extension consists of three main components:

1. **Background Service Worker** ([background.js](background.js)): Runs continuously in the background, tracking time and managing storage
2. **Popup Interface** ([popup/](popup/)): User interface for viewing stats and managing tracked websites
3. **Data Storage**: Chrome's storage API for persistent local data storage

### Background Service Worker

The service worker is responsible for all time tracking and data management:

#### Tracking Loop
- Runs `trackActiveTab()` every second using `setInterval`
- Queries the currently active tab using `chrome.tabs.query()`
- Extracts hostname from the URL and normalizes it (removes `www.` prefix)
- Checks if the hostname matches any tracked websites
- Verifies user is not idle using `chrome.idle.queryState(60)` (60-second threshold)

#### Session Management
- **Variables**:
  - `currentSessionStart`: Timestamp when current tracking session began
  - `lastActiveTime`: Timestamp of last user activity
  - `lastTrackedUrl`: Hostname being tracked
  - `accumulatedSeconds`: Time accumulated in current session

- **Flow**:
  1. When user switches to a different tracked site, flushes accumulated time for previous site
  2. Updates `lastActiveTime` every second while actively using a tracked site
  3. Only flushes time to storage after 60 seconds of **active** usage
  4. If user goes idle (>60 seconds), stops counting time

#### Time Flushing Mechanism
The `flushAccumulatedTime()` function:
1. Calculates actual active time: `lastActiveTime - currentSessionStart`
2. If less than 60 seconds, resets and waits (no partial minutes)
3. If 60+ seconds, converts to minutes and saves to storage
4. Resets session timer

This ensures only **active, intentional usage** is counted - not idle time or background tabs.

#### Storage Management
The extension maintains three storage objects:

1. **trackedWebsites**: Array of domain strings (e.g., `["youtube.com", "twitter.com"]`)
2. **today**: Current day's tracking data
   - `date`: ISO date string (YYYY-MM-DD)
   - `totalMinutes`: Total minutes tracked today
   - `sites`: Object mapping hostname → minutes spent
   - `lastNotificationHour`: Hour number of last notification sent
3. **history**: Array of daily records (max 30 days)
   - Each entry: `{ date: "2025-12-30", totalMinutes: 150 }`

#### Midnight Reset
The `scheduleMidnightReset()` function:
1. Calculates milliseconds until next midnight
2. Sets timeout to trigger `resetDailyCounter()` at midnight
3. Reschedules itself after reset (for next day)

The `resetDailyCounter()` function:
1. Saves today's data to history (if totalMinutes > 0)
2. Trims history to 30 days maximum
3. Resets today's counter to zero
4. Updates date to new day

#### Event Listeners
- `chrome.tabs.onActivated`: Flushes time when user switches tabs
- `chrome.windows.onFocusChanged`: Flushes time when user switches windows
- `chrome.runtime.onMessage`: Handles messages from popup (e.g., "updateBadge")
- `chrome.runtime.onInstalled`: Initializes extension on install/update
- `chrome.runtime.onStartup`: Starts tracking when browser starts

#### Notifications
The `sendHourlyNotification()` function:
1. Creates notification with unique ID: `hourly-{hours}-{timestamp}`
2. Displays message: "You've spent X hour(s) on tracked websites today"
3. Uses Chrome notifications API (not web notifications)
4. Only triggers when total hours cross integer threshold (1h, 2h, 3h, etc.)

### Popup Interface

The popup provides a dashboard for viewing time data and managing tracked websites.

#### Data Loading Flow
1. `DOMContentLoaded` triggers `loadAndRenderData()`
2. Fetches all data from Chrome storage
3. Initializes if first run (creates empty data structures)
4. Checks if daily reset needed (date changed)
5. Renders UI with current data

#### Storage Change Listener
Listens for `chrome.storage.onChanged` to auto-refresh UI when background script updates data. This ensures popup shows real-time data.

#### Components

**Total Time Display** ([popup.js:108-120](popup/popup.js#L108-L120))
- Shows today's total time in human-readable format
- Format: "Xm" for <60 minutes, "Xh Ym" for ≥60 minutes

**Tracked Websites List** ([popup.js:122-153](popup/popup.js#L122-L153))
- Lists all tracked websites
- Shows per-site time for today (or "No time today")
- Remove button for each website
- Empty state message when no websites tracked

**History Chart** ([popup.js:155-258](popup/popup.js#L155-L258))
- Canvas-based bar chart visualization
- Shows up to 30 days of history
- Each bar represents one day's total time
- Features:
  - Gradient-filled bars (blue)
  - Time labels on top of bars (e.g., "2h30m", "45m")
  - Date labels below bars (MM/DD format)
  - Y-axis labels on left (0 to max value)
  - Responsive sizing with device pixel ratio support
  - "No history yet" message for new installations

#### Add/Remove Websites

**Add Website** ([popup.js:271-296](popup/popup.js#L271-L296))
1. User enters domain in input field
2. Removes protocol, www, and path (normalizes to bare domain)
3. Checks for duplicates
4. Adds to trackedWebsites array
5. Saves to storage
6. Re-renders UI

**Remove Website** ([popup.js:298-305](popup/popup.js#L298-L305))
1. User clicks Remove button
2. Filters website out of trackedWebsites array
3. Saves to storage
4. Re-renders UI

### Technical Specifications

#### Manifest V3
- Uses service worker instead of background pages
- Modern permissions model
- Improved security and performance

#### Permissions
- **storage**: Access Chrome's storage API for persistent data
- **tabs**: Query active tab information
- **notifications**: Display system notifications
- **idle**: Detect user idle state
- **<all_urls>**: Track any website (not just specific domains)

#### Chrome APIs Used
- `chrome.storage.local`: Local data storage
- `chrome.tabs.query`: Get active tab
- `chrome.idle.queryState`: Check if user is idle
- `chrome.notifications.create`: Show notifications
- `chrome.action.setBadgeText`: Update toolbar badge
- `chrome.action.setBadgeBackgroundColor`: Style badge
- `chrome.runtime.onMessage`: Message passing

### Key Algorithms

#### Domain Matching
```javascript
const isTracked = trackedWebsites.some(site => {
  return hostname === site ||
         hostname.endsWith('.' + site) ||
         site.endsWith(hostname);
});
```
This handles:
- Exact matches: `youtube.com` === `youtube.com`
- Subdomains: `www.youtube.com` matches `youtube.com`
- Parent domains: `youtube.com` matches `www.youtube.com`

#### Idle Time Prevention
```javascript
const idleState = await chrome.idle.queryState(60);
const isIdle = idleState === 'idle' || idleState === 'locked';
if (isIdle) {
  await flushAccumulatedTime();
  return; // Stop tracking
}
```
Only tracks when user is actively using the computer.

#### Time Accumulation
```javascript
// Only count time since last active moment
const timeSinceLastActive = Math.floor((lastActiveTime - currentSessionStart) / 1000);
if (timeSinceLastActive < 60) {
  return; // Don't save partial minutes
}
const minutesToAdd = Math.floor(timeSinceLastActive / 60);
await updateTimeTracked(lastTrackedUrl, minutesToAdd);
```
Prevents counting idle time by measuring from `lastActiveTime`, not `currentSessionStart`.

### Canvas Chart Rendering

The chart uses HTML5 Canvas for maximum performance and customization:

1. **Setup**: Adjusts for device pixel ratio (DPR) for sharp rendering on high-DPI displays
2. **Scaling**: Finds maximum value to scale bars appropriately
3. **Drawing**: Iterates through history array, drawing bars with gradient fills
4. **Labels**: Adds time labels above bars and date labels below
5. **Y-Axis**: Draws grid lines and labels on left side

Canvas was chosen over charting libraries for:
- Smaller bundle size (no external dependencies)
- Better performance
- Full control over appearance
- Simpler maintenance

### Debug Tools

The [debug.html](debug.html) file provides a testing interface:

1. **Load Storage**: Displays current data from Chrome storage
2. **Add 65 minutes**: Adds test time to today's total (tests badge and display)
3. **Add test history**: Creates 7 days of sample data (tests chart rendering)
4. **Simulate day rollover**: Tests midnight reset logic
5. **Reset all**: Clears all storage data

This allows testing without waiting for natural usage patterns.

### Performance Considerations

- **Storage updates**: Only every 60 seconds (not every second) to minimize I/O
- **Badge updates**: Every second, but reads from storage (fast)
- **Chart rendering**: Only when popup opens (not continuously)
- **Idle detection**: Uses Chrome's native API (efficient)
- **Tab queries**: Only queries active tab (not all tabs)

### Security & Privacy

- No network requests (except loading extension files)
- No third-party libraries or trackers
- All data stored locally using Chrome storage API
- No data sent to external servers
- No analytics or telemetry
- Open source code (fully inspectable)

## File Structure

```
chrome-webblocker/
├── manifest.json           # Extension configuration
├── background.js           # Service worker (time tracking)
├── popup/
│   ├── popup.html         # Popup UI structure
│   ├── popup.js           # Popup logic and chart rendering
│   └── popup.css          # Popup styling
├── icons/
│   ├── icon16.png         # 16x16 toolbar icon
│   ├── icon48.png         # 48x48 extensions page icon
│   └── icon128.png        # 128x128 notification icon
├── debug.html             # Debug/test tool
├── .gitignore             # Git ignore rules
└── README.md              # This file
```

## Key Code Sections

- **Time tracking logic**: [background.js:74-135](background.js#L74-L135)
- **Idle detection**: [background.js:102-109](background.js#L102-L109)
- **Time flushing**: [background.js:137-153](background.js#L137-L153)
- **Badge updates**: [background.js:202-215](background.js#L202-L215)
- **Chart rendering**: [popup/popup.js:155-258](popup/popup.js#L155-L258)
- **Date labels**: [popup/popup.js:232-244](popup/popup.js#L232-L244)
- **History tracking**: [background.js:224-257](background.js#L224-L257)
- **Notifications**: [background.js:186-200](background.js#L186-L200)
- **Websites list**: [popup/popup.js:122-153](popup/popup.js#L122-L153)
- **Add/remove sites**: [popup/popup.js:271-305](popup/popup.js#L271-L305)

## Development

The codebase is designed to be simple and maintainable:

- No external dependencies or frameworks
- Vanilla JavaScript (ES6+ features)
- Well-commented code
- Clear separation of concerns
- Consistent naming conventions

### Modifying the Extension

**To change tracking behavior**: Edit [background.js](background.js)
- Tracking interval: Line 50 (currently 1000ms)
- Idle threshold: Line 103 (currently 60 seconds)
- Minutes per flush: Line 149 (currently 60 seconds)

**To change appearance**: Edit [popup/popup.css](popup/popup.css)
- Colors, fonts, spacing
- Popup dimensions
- Button styles

**To change chart style**: Edit [popup/popup.js:155-258](popup/popup.js#L155-L258)
- Bar colors: Lines 214-216
- Chart dimensions: Line 200
- Label formats: Lines 223-228

**To add features**: Consider adding to manifest.json permissions if needed
- Always ask for minimum required permissions
- Document new permissions in this README

## Uninstallation

1. Go to `edge://extensions`
2. Find TimeTapestry
3. Click "Remove"

**Note**: This will delete all tracking data. Export any data you want to keep before uninstalling.

## License

Personal use only.

---

Made with care for mindful browsing 🌿
