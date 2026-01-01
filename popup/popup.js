// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  await loadAndRenderData();
  setupEventListeners();

  // Request background to sync badge
  try {
    await chrome.runtime.sendMessage({ action: 'updateBadge' });
  } catch (e) {
    console.log('Could not sync badge:', e);
  }

  // Listen for storage changes and update UI
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
      loadAndRenderData();
    }
  });
});

// Load data from storage and render UI
async function loadAndRenderData() {
  const data = await getStorageData();

  // Initialize if first time or data is incomplete
  if (!data.today || !data.history) {
    await initializeData();
    const updatedData = await getStorageData();
    await checkAndResetDaily(updatedData);
    renderUI(updatedData);
  } else {
    // Check if we need to reset daily counter
    await checkAndResetDaily(data);
    renderUI(data);
  }
}

// Get all data from chrome.storage
async function getStorageData() {
  return new Promise((resolve) => {
    chrome.storage.local.get(
      ['trackedWebsites', 'today', 'history'],
      (result) => {
        resolve({
          trackedWebsites: result.trackedWebsites || [],
          today: result.today || null,
          history: result.history || []
        });
      }
    );
  });
}

// Initialize data structure
async function initializeData() {
  const initialData = {
    trackedWebsites: [],
    today: {
      date: getDateString(new Date()),
      totalMinutes: 0,
      sites: {},
      lastNotificationHour: 0
    },
    history: []
  };
  await chrome.storage.local.set(initialData);
}

// Check if we need to reset daily counter
async function checkAndResetDaily(data) {
  const today = getDateString(new Date());
  if (data.today.date !== today) {
    // Save yesterday's data to history
    if (data.today.totalMinutes > 0) {
      // Check if an entry for this date already exists
      const existingIndex = data.history.findIndex(h => h.date === data.today.date);

      if (existingIndex >= 0) {
        // Update existing entry
        data.history[existingIndex].totalMinutes += data.today.totalMinutes;
      } else {
        // Add new entry at the beginning
        data.history.unshift({
          date: data.today.date,
          totalMinutes: data.today.totalMinutes
        });
      }

      // Keep only last 30 days
      if (data.history.length > 30) {
        data.history = data.history.slice(0, 30);
      }
    }

    // Reset today's counter
    data.today = {
      date: today,
      totalMinutes: 0,
      sites: {},
      lastNotificationHour: 0
    };

    await chrome.storage.local.set({
      today: data.today,
      history: data.history
    });
  }
}

// Render UI with data
function renderUI(data) {
  renderTotalTime(data.today);
  renderSiteList(data);
  renderHistoryChart(data.history);
}

// Render total time display
function renderTotalTime(today) {
  const totalTimeEl = document.getElementById('totalTime');
  const minutes = today.totalMinutes || 0;

  if (minutes < 60) {
    totalTimeEl.textContent = `${minutes}m`;
  } else {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    totalTimeEl.textContent = `${hours}h ${mins}m`;
  }
}

// Render tracked websites list
function renderSiteList(data) {
  const siteList = document.getElementById('siteList');

  if (data.trackedWebsites.length === 0) {
    siteList.innerHTML = '<li class="empty-state">No websites tracked yet. Add one above!</li>';
    return;
  }

  siteList.innerHTML = data.trackedWebsites.map(site => {
    const siteTime = data.today?.sites?.[site] || 0;
    const timeText = siteTime > 0 ? formatTime(siteTime) : 'No time today';

    return `
      <li class="site-item">
        <div class="site-info">
          <div class="site-name">${site}</div>
          <div class="site-time">${timeText}</div>
        </div>
        <button class="remove-btn" data-site="${site}">Remove</button>
      </li>
    `;
  }).join('');

  // Add remove button listeners
  document.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const site = e.target.dataset.site;
      removeSite(site);
    });
  });
}

// Render history chart
function renderHistoryChart(history) {
  const canvas = document.getElementById('historyChart');
  if (!canvas) {
    console.log('Canvas not found!');
    return;
  }

  console.log('Rendering chart with history:', history);

  const ctx = canvas.getContext('2d');

  // Get actual display size
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  // Set canvas size accounting for device pixel ratio
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = rect.height;

  console.log('Canvas size:', width, 'x', height);

  // Clear canvas
  ctx.clearRect(0, 0, width, height);

  if (!history || history.length === 0) {
    ctx.fillStyle = '#999';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No history yet', width / 2, height / 2);
    console.log('No history to display');
    return;
  }

  console.log('Drawing', history.length, 'bars');

  // Calculate max value for scaling
  const maxValue = Math.max(...history.map(h => h.totalMinutes || 0), 1);
  console.log('Max value:', maxValue);

  // Chart dimensions
  const padding = { top: 10, right: 10, bottom: 20, left: 40 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Draw bars
  const barWidth = Math.min(30, chartWidth / history.length - 4);
  const gap = history.length > 1 ? (chartWidth - barWidth * history.length) / (history.length + 1) : 10;

  history.forEach((day, index) => {
    const x = padding.left + gap + index * (barWidth + gap);
    const barHeight = ((day.totalMinutes || 0) / maxValue) * chartHeight;
    const y = padding.top + chartHeight - barHeight;

    // Draw bar
    const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
    gradient.addColorStop(0, '#2196F3');
    gradient.addColorStop(1, '#64B5F6');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, barWidth, barHeight);

    // Draw value on top of bar (only if bar is wide enough)
    if (barWidth >= 20) {
      ctx.fillStyle = '#333';
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';
      const hours = Math.floor((day.totalMinutes || 0) / 60);
      const mins = (day.totalMinutes || 0) % 60;
      let valueText = mins > 0 ? `${hours}h${mins}m` : `${hours}h`;
      if ((day.totalMinutes || 0) < 60) valueText = `${day.totalMinutes}m`;
      ctx.fillText(valueText, x + barWidth / 2, y - 3);
    }

    // Draw date label below bar
    ctx.fillStyle = '#666';
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';

    // Format date as MM/DD
    const dateObj = new Date(day.date);
    const month = dateObj.getMonth() + 1;
    const date = dateObj.getDate();
    const dateText = `${month}/${date}`;

    ctx.fillText(dateText, x + barWidth / 2, height - 5);
  });

  // Draw Y-axis labels
  ctx.fillStyle = '#666';
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const value = Math.round((maxValue / 4) * i);
    const y = padding.top + chartHeight - (chartHeight / 4) * i;
    const label = value < 60 ? `${value}m` : `${Math.round(value / 60)}h`;
    ctx.fillText(label, padding.left - 5, y + 3);
  }

  console.log('Chart rendered successfully');
}

// Setup event listeners
function setupEventListeners() {
  const addBtn = document.getElementById('addSiteBtn');
  const input = document.getElementById('newSiteInput');

  addBtn.addEventListener('click', addSite);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addSite();
  });
}

// Add new website to track
async function addSite() {
  const input = document.getElementById('newSiteInput');
  let site = input.value.trim().toLowerCase();

  if (!site) return;

  // Remove protocol, www, and paths
  site = site
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0];

  const data = await getStorageData();

  if (data.trackedWebsites.includes(site)) {
    alert('This website is already being tracked!');
    return;
  }

  data.trackedWebsites.push(site);
  await chrome.storage.local.set({ trackedWebsites: data.trackedWebsites });

  input.value = '';
  renderUI(data);
}

// Remove website from tracking
async function removeSite(site) {
  const data = await getStorageData();
  data.trackedWebsites = data.trackedWebsites.filter(s => s !== site);

  await chrome.storage.local.set({ trackedWebsites: data.trackedWebsites });
  renderUI(data);
}

// Format minutes to readable time
function formatTime(minutes) {
  if (minutes < 60) {
    return `${minutes}m`;
  } else {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
}

// Get date string in YYYY-MM-DD format
function getDateString(date) {
  return date.toISOString().split('T')[0];
}
