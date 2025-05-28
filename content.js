// Script that only works on Netflix watch pages
const VERSION = '1.1';
console.log(`Netflix watch page detected. (Jumplix v${VERSION})`);

// Variable to store previous playback time
let lastTime = 0;
let isUserSeeking = false;
let currentObserver = null;
let isObserving = false;
let skipCheckInterval = null;
let isAutoSkipEnabled = false;
let lastUrl = location.href;

// Load saved auto-skip state when the script starts
chrome.storage.local.get(['isAutoSkipEnabled'], function (result) {
  isAutoSkipEnabled = result.isAutoSkipEnabled || false;
  console.log(`[Jumplix v${VERSION}] Loaded auto-skip state: ${isAutoSkipEnabled ? 'enabled' : 'disabled'}`);
});

// Function to find and click the skip intro button
function skipIntro() {
  if (!isAutoSkipEnabled) return;

  const skipButton = document.querySelector('.watch-video--skip-content-button');
  if (skipButton) {
    console.log(`[Jumplix v${VERSION}] Found skip intro button.`);
    skipButton.click();
  }
}

// Function to find and click the next episode button
function skipToNextEpisode() {
  if (!isAutoSkipEnabled) return;

  const nextEpisodeButton = document.querySelector('[data-uia="next-episode-seamless-button"]');
  if (nextEpisodeButton) {
    console.log(`[Jumplix v${VERSION}] Found next episode button.`);
    nextEpisodeButton.click();
  }
}

// Function to start periodic skip checks
function startSkipChecks() {
  // Clear any existing interval
  if (skipCheckInterval) {
    clearInterval(skipCheckInterval);
  }

  // Check for skip buttons every 1 second
  skipCheckInterval = setInterval(() => {
    skipIntro();
    skipToNextEpisode();
  }, 1000);
}

// Time change detection function
function handleTimeUpdate(videoElement) {
  const currentTime = videoElement.currentTime;
  const timeDiff = Math.abs(currentTime - lastTime);

  // Detect time changes faster than normal playback speed (more than 1 second)
  if (timeDiff > 1 && !isUserSeeking) {
    console.log(`[Jumplix v${VERSION}] Time change detected:`, {
      PreviousTime: `${Math.floor(lastTime / 60)}min ${Math.floor(lastTime % 60)}sec`,
      CurrentTime: `${Math.floor(currentTime / 60)}min ${Math.floor(currentTime % 60)}sec`,
      ChangeAmount: `${Math.floor(timeDiff)}sec`
    });
  }

  lastTime = currentTime;
}

// Function to observe video element
function observeVideo() {
  if (isObserving) {
    return; // Prevent duplicate observation
  }

  const videoElement = document.querySelector('video');
  if (videoElement) {
    console.log(`[Jumplix v${VERSION}] Found video element.`);
    isObserving = true;

    // Start periodic skip checks
    startSkipChecks();

    // Time change detection
    videoElement.addEventListener('timeupdate', () => {
      handleTimeUpdate(videoElement);
    });

    // Detect if user is seeking
    videoElement.addEventListener('seeking', () => {
      isUserSeeking = true;
      console.log(`[Jumplix v${VERSION}] User is seeking...`);
    });

    videoElement.addEventListener('seeked', () => {
      isUserSeeking = false;
      console.log(`[Jumplix v${VERSION}] Seeking completed`);
      skipIntro();
      skipToNextEpisode();
    });

    // Reset observation when video is removed
    const videoObserver = new MutationObserver((mutations) => {
      if (!document.contains(videoElement)) {
        console.log(`[Jumplix v${VERSION}] Video element removed, resetting observation.`);
        isObserving = false;
        if (skipCheckInterval) {
          clearInterval(skipCheckInterval);
          skipCheckInterval = null;
        }
        videoObserver.disconnect();
      }
    });

    videoObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

// Function for page change detection
function initializeObserver() {
  console.log(`[Jumplix v${VERSION}] Starting page change detection`);

  // Disconnect previous observer if exists
  if (currentObserver) {
    currentObserver.disconnect();
  }

  observeVideo();

  // MutationObserver setup for DOM change detection
  currentObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
        // Check if video element was added
        const videoElement = document.querySelector('video');
        if (videoElement && !isObserving) {
          console.log(`[Jumplix v${VERSION}] New video element detected.`);
          observeVideo();
        }
      }
    }
  });

  // Start DOM change detection
  currentObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Function to check if we're on a watch page
function isWatchPage() {
  return location.pathname.includes('/watch');
}

// Function to handle page changes
function handlePageChange() {
  if (isWatchPage()) {
    console.log(`[Jumplix v${VERSION}] Watch page detected, initializing...`);
    initializeObserver();
  }
}

// URL 변경 감지를 위한 MutationObserver
const urlObserver = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    handlePageChange();
  }
});

// URL 변경 감지 시작
urlObserver.observe(document, { subtree: true, childList: true });

// Execute on initial load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', handlePageChange);
} else {
  handlePageChange();
}

// Additional event listener for page load
window.addEventListener('load', handlePageChange);

// Cleanup when page is unloaded
window.addEventListener('unload', () => {
  if (currentObserver) {
    currentObserver.disconnect();
  }
  if (skipCheckInterval) {
    clearInterval(skipCheckInterval);
  }
  urlObserver.disconnect();
  isObserving = false;
});

// Listener for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "toggleAutoSkip") {
    isAutoSkipEnabled = request.enabled;
    console.log(`[Jumplix v${VERSION}] Auto Skip ${isAutoSkipEnabled ? 'enabled' : 'disabled'}.`);

    // Get current video playback information
    const videoElement = document.querySelector('video');
    if (videoElement) {
      const currentTime = videoElement.currentTime;
      const duration = videoElement.duration;
      const title = document.querySelector('.title')?.textContent || 'Title not found';

      console.log(`[Jumplix v${VERSION}] Current playback info:`, {
        Title: title,
        CurrentTime: `${Math.floor(currentTime / 60)}min ${Math.floor(currentTime % 60)}sec`,
        TotalDuration: `${Math.floor(duration / 60)}min ${Math.floor(duration % 60)}sec`,
        AutoSkip: isAutoSkipEnabled ? 'ON' : 'OFF'
      });
    }
  }
}); 