window.RufflePlayer = window.RufflePlayer || {};
window.addEventListener("load", () => {
  const ruffle = window.RufflePlayer.newest();
  ruffle.config = {
    autoplay: "on",
    unmuteOverlay: "visible"
  };
  const elements = document.querySelectorAll("object[type='application/x-shockwave-flash']");
  for (const el of elements) {
    ruffle.createPlayer().load(el);
  }
});