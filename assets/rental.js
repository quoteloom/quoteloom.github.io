/* Quoteloom free rental cash-flow calculator. Pure function exported for Node tests. */
(function () {
  function rental(v) {
    var price = +v.price || 0, closing = +v.closing || 0, down = Math.min(Math.max((+v.down || 0) / 100, 0), 1),
        rate = (+v.rate || 0) / 100, term = +v.term || 0, rent = +v.rent || 0, vac = (+v.vac || 0) / 100, opex = +v.opex || 0;
    var loan = price * (1 - down), r = rate / 12, n = term * 12, pmt = 0;
    if (loan > 0 && n > 0) pmt = r === 0 ? loan / n : loan * r / (1 - Math.pow(1 + r, -n));
    var noi = rent * (1 - vac) - opex, cf = noi - pmt, invested = price * down + closing;
    return { pmt: pmt, noi: noi, cf: cf, cap: price > 0 ? noi * 12 / price : 0, coc: invested > 0 ? cf * 12 / invested : 0 };
  }
  if (typeof module !== "undefined" && module.exports) { module.exports = { rental: rental }; }
  if (typeof document === "undefined") return;
  var ids = ["price", "closing", "down", "rate", "term", "rent", "vac", "opex"];
  function money(x) { return (x < 0 ? "-$" : "$") + Math.abs(x).toFixed(2); }
  function run() {
    var v = {}; ids.forEach(function (id) { v[id] = parseFloat(document.getElementById(id).value); });
    var o = rental(v);
    document.getElementById("o-pmt").textContent = money(o.pmt);
    document.getElementById("o-noi").textContent = money(o.noi);
    document.getElementById("o-cf").textContent = money(o.cf);
    document.getElementById("o-cap").textContent = (o.cap * 100).toFixed(2) + "%";
    document.getElementById("o-coc").textContent = (o.coc * 100).toFixed(2) + "%";
  }
  document.addEventListener("DOMContentLoaded", function () {
    ids.forEach(function (id) { document.getElementById(id).addEventListener("input", run); }); run();
  });
})();
