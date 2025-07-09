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
    const isHandledSpecifically =
      link.classList.contains("game-tile") ||
      link.classList.contains("upload-link") ||
      link.classList.contains("ontology-category-link");

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

// Track during scroll
window.addEventListener("scroll", () => {
  updateScrollDepth();
}, { passive: true });

// Log once when user leaves the page
window.addEventListener("beforeunload", () => {
  if (maxScrollDepth > 0) {
    logAction("scroll_depth", { percent: maxScrollDepth });
  }
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


//dwelltime tracke (time spent on page)
let pageLoadTime = Date.now();

window.addEventListener("beforeunload", () => {
  const timeSpent = Math.round((Date.now() - pageLoadTime) / 1000);
  logAction("Time_On_Page", { timeSpentSeconds: timeSpent });
});
