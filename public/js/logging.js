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

// Logging function (reusable globally)
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

// Log initial page load
logAction("page_loaded", {});

document.addEventListener('DOMContentLoaded', () => {
  const pathname = window.location.pathname;

  // Log every page load again here for DOM-based analysis
  logAction('page_load', {});

  // Homepage-specific logic
  if (pathname === '/') {
    document.querySelectorAll('.game-tile').forEach(tile => {
      tile.addEventListener('click', () => {
        const title = tile.querySelector('.tile-title')?.textContent || 'unknown';
        logAction('click_game_tile', { title });
      });
    });

    const uploadLink = document.querySelector('.upload-link');
    if (uploadLink) {
      uploadLink.addEventListener('click', () => {
        logAction('click_upload_button', {});
      });
    }

    const aboutSummary = document.querySelector('.about-collapse summary');
    if (aboutSummary) {
      aboutSummary.addEventListener('click', () => {
        logAction('toggle_about_section', {});
      });
    }
  }

  // Universal logging for buttons
  document.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => {
      logAction("click_button", {
        label: btn.textContent.trim(),
        id: btn.id || null,
        class: btn.className || null
      });
    });
  });

  // Universal logging for links
  document.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      logAction("click_link", {
        label: link.textContent.trim(),
        href: link.getAttribute("href"),
        id: link.id || null,
        class: link.className || null
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
