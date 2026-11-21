/* Turns "Coming soon" placeholders into real buy links for products whose URL is set in config.js. */
(function () {
  function init() {
    var cfg = window.QUOTELOOM_CONFIG || {}, products = cfg.products || {};
    var els = document.querySelectorAll("[data-buy]");
    for (var i = els.length - 1; i >= 0; i--) {
      var key = els[i].getAttribute("data-buy") || "pressure-washing";
      var url = (products[key] || (key === "pressure-washing" ? cfg.gumroadUrl : "") || "").trim();
      if (!/^https:\/\/[^\s"<>]+$/.test(url)) continue; // keep disabled "Coming soon"
      var a = document.createElement("a");
      a.className = "cta"; a.href = url; a.textContent = els[i].getAttribute("data-buy-label");
      els[i].parentNode.replaceChild(a, els[i]);
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
