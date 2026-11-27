/* Quoteloom free house-flip deal calculator. Pure function exported for Node tests.
   Same core math as the House Flip Deal Analyzer workbook, with rehab, holding costs
   and selling costs entered as totals. Interest during the hold is interest-only. */
(function () {
  function flip(v) {
    var price = +v.price || 0, closing = +v.closing || 0, rehab = +v.rehab || 0,
        months = +v.months || 0, holding = +v.holding || 0,
        down = Math.min(Math.max((+v.down || 0) / 100, 0), 1),
        rate = (+v.rate || 0) / 100,
        pointsPct = Math.min(Math.max((+v.points || 0) / 100, 0), 1),
        arv = +v.arv || 0, selling = +v.selling || 0;
    var loan = price * (1 - down);
    var points = loan * pointsPct;
    var interest = loan * rate * months / 12;
    var proceeds = arv - selling;
    var cost = price + closing + points + rehab + holding + interest;
    var profit = proceeds - cost;
    var invested = price * down + closing + points + rehab + holding + interest;
    var roi = invested > 0 ? profit / invested : null;
    var ann = (months > 0 && invested > 0 && roi !== null && roi > -1)
      ? Math.pow(1 + roi, 12 / months) - 1 : null;
    var mao = arv * 0.7 - rehab;
    return {
      loan: loan, points: points, interest: interest, proceeds: proceeds, cost: cost,
      profit: profit, invested: invested, roi: roi, ann: ann, mao: mao,
      meets: price <= mao
    };
  }
  if (typeof module !== "undefined" && module.exports) { module.exports = { flip: flip }; }
  if (typeof document === "undefined") return;
  var ids = ["price", "closing", "rehab", "months", "holding", "down", "rate", "points", "arv", "selling"];
  function money(x) { return (x < 0 ? "-$" : "$") + Math.abs(x).toFixed(2); }
  function pct(x) { return x === null ? "n/a" : (x * 100).toFixed(2) + "%"; }
  function run() {
    var v = {}; ids.forEach(function (id) { v[id] = parseFloat(document.getElementById(id).value); });
    var o = flip(v);
    document.getElementById("o-mao").textContent = money(o.mao);
    document.getElementById("o-meets").textContent = o.meets ? "Yes" : "No";
    document.getElementById("o-profit").textContent = money(o.profit);
    document.getElementById("o-invested").textContent = money(o.invested);
    document.getElementById("o-roi").textContent = pct(o.roi);
    document.getElementById("o-ann").textContent = pct(o.ann);
  }
  document.addEventListener("DOMContentLoaded", function () {
    ids.forEach(function (id) { document.getElementById(id).addEventListener("input", run); }); run();
  });
})();
