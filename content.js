// Content script for detecting video playback state
// This script runs on YouTube pages to detect if video is playing

let isVideoPlaying = false;
let checkInterval = null;
let observedVideos = new Set();
let messageRetryInterval = null;

// Function to check if video is playing
function checkVideoPlaying() {
  // Find all video elements (YouTube Shorts may have multiple)
  const videos = document.querySelectorAll('video');

  if (videos.length === 0) {
    updateVideoState(false);
    return;
  }

  console.log('[TimeTapestry] Checking', videos.length, 'video(s)');

  // For YouTube Shorts and regular videos, find the active/visible one
  let activeVideo = null;

  // First, try to find a video that's actually visible and playing
  for (const video of videos) {
    // Check if video is in viewport (rough check for Shorts player)
    const rect = video.getBoundingClientRect();
    const isVisible = rect.height > 100 && rect.width > 100;

    console.log('[TimeTapestry] Video check:', {
      visible: isVisible,
      paused: video.paused,
      ended: video.ended,
      duration: video.duration,
      currentTime: video.currentTime
    });

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

  console.log('[TimeTapestry] Active video state:', {
    paused: activeVideo.paused,
    ended: activeVideo.ended,
    duration: activeVideo.duration,
    playing: playing
  });

  updateVideoState(playing);
}

// Update background script with video state
function updateVideoState(playing) {
  if (isVideoPlaying !== playing) {
    isVideoPlaying = playing;
    console.log('[TimeTapestry] Video state changed to:', playing ? 'PLAYING' : 'PAUSED/NOT PLAYING');
    sendMessageToBackground(playing);
  }
}

// Send message to background script with retry logic
function sendMessageToBackground(isPlaying, retries = 3) {
  const message = {
    type: 'videoStateChange',
    isPlaying: isPlaying
  };

  chrome.runtime.sendMessage(message, (response) => {
    if (chrome.runtime.lastError) {
      console.error('[TimeTapestry] Error sending message:', chrome.runtime.lastError.message);
      // Retry once after a short delay
      if (retries > 0) {
        setTimeout(() => sendMessageToBackground(isPlaying, retries - 1), 1000);
      }
    } else {
      console.log('[TimeTapestry] Message sent successfully, response:', response);
    }
  });
}

// Attach event listeners to a video element
function attachVideoListeners(video) {
  if (observedVideos.has(video)) {
    console.log('[TimeTapestry] Video already has listeners, skipping');
    return;
  }

  console.log('[TimeTapestry] Attaching listeners to video');

  video.addEventListener('play', () => {
    console.log('[TimeTapestry] Video play event fired');
    updateVideoState(true);
  });

  video.addEventListener('pause', () => {
    console.log('[TimeTapestry] Video pause event fired');
    updateVideoState(false);
  });

  video.addEventListener('ended', () => {
    console.log('[TimeTapestry] Video ended event fired');
    updateVideoState(false);
  });

  // Also check for seeking (might indicate user interaction)
  video.addEventListener('seeking', () => {
    console.log('[TimeTapestry] Video seeking event fired');
    checkVideoPlaying();
  });

  video.addEventListener('seeked', () => {
    console.log('[TimeTapestry] Video seeked event fired');
    checkVideoPlaying();
  });

  // Also check for timeupdate (video is progressing)
  video.addEventListener('timeupdate', () => {
    if (!video.paused && !video.ended && video.duration > 0) {
      // Only update if we think it's not playing (to avoid spamming)
      if (!isVideoPlaying) {
        console.log('[TimeTapestry] Video progressing via timeupdate, marking as playing');
        updateVideoState(true);
      }
    }
  });

  observedVideos.add(video);
  console.log('[TimeTapestry] Attached listeners to video, total videos tracked:', observedVideos.size);
}

// Start monitoring video playback
function startMonitoring() {
  console.log('[TimeTapestry] ========== Starting video monitoring ==========');

  // Check immediately
  checkVideoPlaying();

  // Check every second
  if (checkInterval) clearInterval(checkInterval);
  checkInterval = setInterval(() => {
    checkVideoPlaying();
  }, 1000);

  // Attach listeners to all existing videos
  const videos = document.querySelectorAll('video');
  console.log('[TimeTapestry] Found', videos.length, 'video(s) on page load');
  videos.forEach(attachVideoListeners);
}

// Stop monitoring
function stopMonitoring() {
  console.log('[TimeTapestry] ========== Stopping video monitoring ==========');
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
  if (messageRetryInterval) {
    clearTimeout(messageRetryInterval);
    messageRetryInterval = null;
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
              console.log('[TimeTapestry] New VIDEO element added directly');
            } else if (node.querySelectorAll) {
              const videos = node.querySelectorAll('video');
              if (videos.length > 0) {
                videoAdded = true;
                console.log('[TimeTapestry] New VIDEO element(s) added in subtree:', videos.length);
                break;
              }
            }
          }
        }
      }
      if (videoAdded) break;
    }

    if (videoAdded) {
      console.log('[TimeTapestry] ========== New video(s) detected, re-initializing ==========');
      const videos = document.querySelectorAll('video');
      console.log('[TimeTapestry] Total videos on page:', videos.length);
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
  console.log('[TimeTapestry] ========================================');
  console.log('[TimeTapestry] Initializing content script for:', window.location.href);
  console.log('[TimeTapestry] ========================================');

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
    console.log('[TimeTapestry] ========== Re-check after 2 seconds ==========');
    checkVideoPlaying();
  }, 2000);

  // And another check after 5 seconds
  setTimeout(() => {
    console.log('[TimeTapestry] ========== Re-check after 5 seconds ==========');
    checkVideoPlaying();
  }, 5000);
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
    console.log('[TimeTapestry] ========================================');
    console.log('[TimeTapestry] URL changed to:', url);
    console.log('[TimeTapestry] Re-initializing content script');
    console.log('[TimeTapestry] ========================================');
    // Small delay to let page load
    setTimeout(() => {
      observedVideos.clear();
      init();
    }, 500);
  }
}).observe(document, { subtree: true, childList: true });
