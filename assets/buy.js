/* Turns "Coming soon" placeholders into real buy links once config.gumroadUrl is set. */
(function () {
  function init() {
    var url = (window.QUOTELOOM_CONFIG && window.QUOTELOOM_CONFIG.gumroadUrl || "").trim();
    if (!/^https:\/\/[^\s"<>]+$/.test(url)) return; // keep disabled state
    var els = document.querySelectorAll("[data-buy]");
    for (var i = 0; i < els.length; i++) {
      var a = document.createElement("a");
      a.className = "cta"; a.href = url; a.textContent = els[i].getAttribute("data-buy-label");
      els[i].parentNode.replaceChild(a, els[i]);
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
