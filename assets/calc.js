/* Quoteloom mini job-profit calculator. Pure function is exported for Node tests. */
(function (root) {
  function jobProfit(v) {
    var price = +v.price || 0, hours = +v.hours || 0, crew = +v.crew || 0, rate = +v.rate || 0,
        other = +v.other || 0, target = (+v.targetPct || 0) / 100;
    var labor = hours * crew * rate;
    var cost = labor + other;
    var profit = price - cost;
    var margin = price > 0 ? profit / price : 0;
    var minPrice = target < 1 ? cost / (1 - target) : null;
    return { labor: labor, cost: cost, profit: profit, margin: margin, minPrice: minPrice };
  }
  if (typeof module !== "undefined" && module.exports) { module.exports = { jobProfit: jobProfit }; }
  if (typeof document === "undefined") return;
  var ids = ["price", "hours", "crew", "rate", "other", "targetPct"];
  function money(x) { return (x < 0 ? "-$" : "$") + Math.abs(x).toFixed(2); }
  function run() {
    var v = {};
    ids.forEach(function (id) { v[id] = parseFloat(document.getElementById(id).value); });
    var r = jobProfit(v);
    document.getElementById("o-labor").textContent = money(r.labor);
    document.getElementById("o-cost").textContent = money(r.cost);
    document.getElementById("o-profit").textContent = money(r.profit);
    document.getElementById("o-margin").textContent = (r.margin * 100).toFixed(1) + "%";
    document.getElementById("o-min").textContent = r.minPrice === null ? "n/a" : money(r.minPrice);
  }
  document.addEventListener("DOMContentLoaded", function () {
    ids.forEach(function (id) { document.getElementById(id).addEventListener("input", run); });
    run();
  });
})(this);
