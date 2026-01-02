// Content script for detecting video playback state
// This script runs on YouTube pages to detect if video is playing

let isVideoPlaying = false;
let checkInterval = null;

// Function to check if video is playing
function checkVideoPlaying() {
  const video = document.querySelector('video');
  if (!video) {
    updateVideoState(false);
    return;
  }

  // Video is playing if:
  // 1. Not paused
  // 2. Not ended
  // 3. Duration > 0 (video is loaded)
  // 4. Current time is advancing (video is actually playing)
  const playing = !video.paused &&
                  !video.ended &&
                  video.duration > 0 &&
                  video.currentTime > 0;

  updateVideoState(playing);
}

// Update background script with video state
function updateVideoState(playing) {
  if (isVideoPlaying !== playing) {
    isVideoPlaying = playing;
    // Send message to background script
    chrome.runtime.sendMessage({
      type: 'videoStateChange',
      isPlaying: playing
    }).catch(() => {
      // Background script might not be ready, ignore error
    });
  }
}

// Start monitoring video playback
function startMonitoring() {
  // Check immediately
  checkVideoPlaying();

  // Check every second
  if (checkInterval) clearInterval(checkInterval);
  checkInterval = setInterval(checkVideoPlaying, 1000);

  // Also listen for video events
  const video = document.querySelector('video');
  if (video) {
    video.addEventListener('play', () => updateVideoState(true));
    video.addEventListener('pause', () => updateVideoState(false));
    video.addEventListener('ended', () => updateVideoState(false));
  }
}

// Stop monitoring
function stopMonitoring() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
  updateVideoState(false);
}

// Observer for video element changes (SPA navigation)
function observeVideoChanges() {
  const observer = new MutationObserver(() => {
    const video = document.querySelector('video');
    if (video) {
      startMonitoring();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Initialize
function init() {
  startMonitoring();
  observeVideoChanges();
}

// Start when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Cleanup when page unloads
window.addEventListener('beforeunload', stopMonitoring);
