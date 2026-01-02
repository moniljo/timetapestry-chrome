// Content script for detecting video playback state
// This script runs on YouTube pages to detect if video is playing

let isVideoPlaying = false;
let checkInterval = null;
let observedVideos = new Set();

// Function to check if video is playing
function checkVideoPlaying() {
  // Find all video elements (YouTube Shorts may have multiple)
  const videos = document.querySelectorAll('video');

  if (videos.length === 0) {
    updateVideoState(false);
    return;
  }

  // For YouTube Shorts and regular videos, find the active/visible one
  let activeVideo = null;

  // First, try to find a video that's actually visible and playing
  for (const video of videos) {
    // Check if video is in viewport (rough check for Shorts player)
    const rect = video.getBoundingClientRect();
    const isVisible = rect.height > 100 && rect.width > 100;

    if (isVisible && !video.paused && !video.ended && video.duration > 0) {
      activeVideo = video;
      break;
    }
  }

  // If no playing video found, check the first visible video
  if (!activeVideo) {
    for (const video of videos) {
      const rect = video.getBoundingClientRect();
      const isVisible = rect.height > 100 && rect.width > 100;

      if (isVisible) {
        activeVideo = video;
        break;
      }
    }
  }

  // Fall back to first video if no visible video found
  if (!activeVideo && videos.length > 0) {
    activeVideo = videos[0];
  }

  if (!activeVideo) {
    updateVideoState(false);
    return;
  }

  // Video is playing if:
  // 1. Not paused
  // 2. Not ended
  // 3. Duration > 0 (video is loaded)
  const playing = !activeVideo.paused &&
                  !activeVideo.ended &&
                  activeVideo.duration > 0;

  updateVideoState(playing);
}

// Update background script with video state
function updateVideoState(playing) {
  if (isVideoPlaying !== playing) {
    isVideoPlaying = playing;
    console.log('[TimeTapestry] Video state:', playing ? 'playing' : 'paused/not playing');
    // Send message to background script
    chrome.runtime.sendMessage({
      type: 'videoStateChange',
      isPlaying: playing
    }).catch((error) => {
      // Background script might not be ready, ignore error
      console.log('[TimeTapestry] Error sending message:', error);
    });
  }
}

// Attach event listeners to a video element
function attachVideoListeners(video) {
  if (observedVideos.has(video)) return;

  video.addEventListener('play', () => {
    console.log('[TimeTapestry] Video play event');
    updateVideoState(true);
  });

  video.addEventListener('pause', () => {
    console.log('[TimeTapestry] Video pause event');
    updateVideoState(false);
  });

  video.addEventListener('ended', () => {
    console.log('[TimeTapestry] Video ended event');
    updateVideoState(false);
  });

  // Also check for seeking (might indicate user interaction)
  video.addEventListener('seeking', () => {
    console.log('[TimeTapestry] Video seeking');
    checkVideoPlaying();
  });

  video.addEventListener('seeked', () => {
    console.log('[TimeTapestry] Video seeked');
    checkVideoPlaying();
  });

  observedVideos.add(video);
  console.log('[TimeTapestry] Attached listeners to video, total videos:', observedVideos.size);
}

// Start monitoring video playback
function startMonitoring() {
  console.log('[TimeTapestry] Starting video monitoring');

  // Check immediately
  checkVideoPlaying();

  // Check every second
  if (checkInterval) clearInterval(checkInterval);
  checkInterval = setInterval(checkVideoPlaying, 1000);

  // Attach listeners to all existing videos
  const videos = document.querySelectorAll('video');
  videos.forEach(attachVideoListeners);
}

// Stop monitoring
function stopMonitoring() {
  console.log('[TimeTapestry] Stopping video monitoring');
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
  updateVideoState(false);
}

// Observer for video element changes (SPA navigation and Shorts)
function observeVideoChanges() {
  console.log('[TimeTapestry] Setting up video observer');

  const observer = new MutationObserver((mutations) => {
    // Check if any video elements were added
    let videoAdded = false;
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            if (node.tagName === 'VIDEO') {
              videoAdded = true;
            } else if (node.querySelectorAll) {
              const videos = node.querySelectorAll('video');
              if (videos.length > 0) {
                videoAdded = true;
                break;
              }
            }
          }
        }
      }
      if (videoAdded) break;
    }

    if (videoAdded) {
      console.log('[TimeTapestry] New video(s) detected, re-initializing');
      const videos = document.querySelectorAll('video');
      videos.forEach(attachVideoListeners);
      checkVideoPlaying();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  console.log('[TimeTapestry] Video observer active');
}

// Initialize
function init() {
  console.log('[TimeTapestry] Initializing content script for:',
    window.location.href);

  // Check if we're on a YouTube page
  if (!window.location.hostname.includes('youtube.com')) {
    console.log('[TimeTapestry] Not on YouTube, skipping');
    return;
  }

  console.log('[TimeTapestry] On YouTube, starting monitoring');
  startMonitoring();
  observeVideoChanges();

  // Also check periodically in case we miss something
  setTimeout(() => {
    console.log('[TimeTapestry] Re-check after 2 seconds');
    checkVideoPlaying();
  }, 2000);
}

// Start when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Cleanup when page unloads
window.addEventListener('beforeunload', () => {
  console.log('[TimeTapestry] Page unloading');
  stopMonitoring();
});

// Re-initialize on YouTube SPA navigation
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    console.log('[TimeTapestry] URL changed to:', url);
    // Small delay to let page load
    setTimeout(() => {
      observedVideos.clear();
      init();
    }, 500);
  }
}).observe(document, { subtree: true, childList: true });
