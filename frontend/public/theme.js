// Apply the saved appearance before the first paint, including lazy route loads.
(function () {
  var preference;
  try { preference = localStorage.getItem("edunex-theme"); } catch (_) {}
  var theme = preference === "light" || preference === "dark"
    ? preference
    : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  document.documentElement.dataset.theme = theme;
})();
