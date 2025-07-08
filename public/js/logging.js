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

// Log the initial page load
logAction("page_loaded", {});
