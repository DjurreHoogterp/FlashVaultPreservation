// Extract and store PID and assignment from URL
const urlParams = new URLSearchParams(window.location.search);
const pid = urlParams.get("pid");
const assignment = urlParams.get("assignment");

if (pid) sessionStorage.setItem("pid", pid);
if (assignment) sessionStorage.setItem("assignment", assignment);

// Clean up the visible URL
if (pid || assignment) {
  window.history.replaceState({}, "", window.location.pathname);
}

function logHoverWithDelay(element, logType, dataFn, delay = 500) {
    let timer;
  
    element.addEventListener('mouseenter', () => {
      timer = setTimeout(() => {
        logAction(logType, dataFn());
      }, delay);
    });
  
    element.addEventListener('mouseleave', () => {
      clearTimeout(timer);
    });
  }

// Global logging function
function logAction(action, details = {}) {
  const pid = sessionStorage.getItem("pid");
  const assignment = sessionStorage.getItem("assignment");

  if (!pid) {
    console.warn("logAction skipped — missing PID");
    return;
  }

  const payload = {
    pid,
    assignment,
    action,
    details,
    page: window.location.pathname,
    timestamp: new Date().toISOString()
  };

  console.log("Logging action:", payload);

  fetch("/log-action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

// DOM-based logging setup
document.addEventListener("DOMContentLoaded", () => {
  const pathname = window.location.pathname;

  // Single page load log
  logAction("page_loaded", {});

  // Ontology category clicks
  if (pathname === "/ontology") {
    document.querySelectorAll(".ontology-category-link").forEach(link => {
      link.addEventListener("click", () => {
        const category = link.dataset.category;
        logAction("click_ontology_category", { category });
      });
    });
  }
  //log when user clicks metadata links
    document.querySelectorAll('a[href^="/search?q="]').forEach(link => {
    link.addEventListener('click', () => {
      const url = new URL(link.href, window.location.origin);
      const query = url.searchParams.get('q');
      const field = url.searchParams.get('field');
  
      logAction('click_metadata_link', {
        field,
        value: query,
        href: link.getAttribute('href')
      });
    });
  });

  // Hovering over metadata links (same selector as for click)
document.querySelectorAll('a[href^="/search?q="]').forEach(link => {
    logHoverWithDelay(link, 'hover_metadata_link', () =>{
      const url = new URL(link.href, window.location.origin);
      const query = url.searchParams.get('q');
      const field = url.searchParams.get('field');
  
      logAction('hover_metadata_link', {
        field,
        value: query,
        href: link.getAttribute('href')
      });
    });
  });

// hovering over buttons
  document.querySelectorAll('button').forEach(btn => {
    logHoverWithDelay(btn, 'hover_button', () => {
      logAction('hover_button', {
        label: btn.textContent.trim().slice(0, 100),
        id: btn.id || null,
        class: btn.className || null
      });
    });
  });
  

  //interactions with the ruffle container
const ruffleContainer = document.getElementById("ruffle-container");
if (ruffleContainer) {
  ruffleContainer.addEventListener("click", () => {
    logAction("play_clicked_on_game", {
      gameId: ruffleContainer.dataset.gameId || "unknown"
    });
  });
}

  // Homepage-specific events
  if (pathname === "/") {
    document.querySelectorAll(".game-tile").forEach(tile => {
      tile.addEventListener("click", () => {
        const title = tile.querySelector(".tile-title")?.textContent || "unknown";
        logAction("click_game_tile", { title });
      });
    });

    const uploadBtn = document.querySelector(".upload-link");
    if (uploadBtn) {
      uploadBtn.addEventListener("click", () => {
        logAction("click_upload_button", {});
      });
    }

    const aboutToggle = document.querySelector(".about-collapse summary");
    if (aboutToggle) {
      aboutToggle.addEventListener("click", () => {
        logAction("toggle_about_section", {});
      });
    }
  }

  // Universal link logging (excluding special cases)
  document.querySelectorAll("a").forEach(link => {
    const isMetadataLink = link.getAttribute("href")?.startsWith("/search?q=");
    const isHandledSpecifically =
      link.classList.contains("game-tile") ||
      link.classList.contains("upload-link") ||
      link.classList.contains("ontology-category-link") ||
      isMetadataLink;

    if (!isHandledSpecifically) {
      link.addEventListener("click", () => {
        logAction("click_link", {
          label: link.textContent.trim().slice(0, 100),
          href: link.getAttribute("href"),
          id: link.id || null,
          class: link.className || null
        });
      });
    }
  });

  // Universal button logging
  document.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      logAction("click_button", {
        label: btn.textContent.trim().slice(0, 100),
        id: btn.id || null,
        class: btn.className || null
      });
    });
  });

  // Search logging
  const searchForm = document.getElementById("search-form");
  if (searchForm) {
    searchForm.addEventListener("submit", function () {
      const query = this.q.value;
      logAction("search", { query });
    });
  }
});

  
// Track scroll progress
let maxScrollDepth = 0;
function updateScrollDepth() {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  if (docHeight > 0) {
    const depth = Math.round((scrollTop / docHeight) * 100);
    if (depth > maxScrollDepth) {
      maxScrollDepth = depth;
    }
  }
}
window.addEventListener("scroll", updateScrollDepth, { passive: true });

// Track time spent
let pageLoadTime = Date.now();

// Unified unload logger
window.addEventListener("beforeunload", () => {
  const timeSpent = Math.round((Date.now() - pageLoadTime) / 1000);
  const payload = {
    timeSpentSeconds: timeSpent,
    scrollPercent: maxScrollDepth
  };

  logAction("page_unload", payload);
});

//rage clicks
let clickTimestamps = [];

document.addEventListener("click", (e) => {
  const now = Date.now();
  clickTimestamps.push(now);

  // Keep last 1 second of clicks
  clickTimestamps = clickTimestamps.filter(ts => now - ts < 1000);

  if (clickTimestamps.length >= 3) {
    logAction("rage_click_detected", {
      count: clickTimestamps.length,
      target: {
        tag: e.target.tagName,
        id: e.target.id || null,
        class: e.target.className || null,
        text: e.target.textContent?.trim().slice(0, 100)
      }
    });

    // Reset after logging to avoid duplicates
    clickTimestamps = [];
  }
});

