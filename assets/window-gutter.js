/* Quoteloom free window cleaning and gutter cleaning pricing calculators. Pure functions exported for Node tests.
   Core logic matches the Window & Gutter workbook model, simplified: fixed production times (stated on each page),
   one supplies figure per job, and equipment wear / allocated overhead optional via fixedCost (the live pages leave it at 0). */
(function () {
  // Example production times in worker-minutes (from the Quoteloom workbook's example Inputs; not market data).
  var WIN_TIMES = { ext: 5, upperTimeMult: 1.6, int: 4, screen: 2, track: 3, hard: 15 };
  // Example gutter production in linear ft per worker-hour for 1, 2 and 3+ stories, and minutes per downspout.
  var GUT_TIMES = { ftPerHour: [80, 50, 35], downspoutMin: 5 };

  function n(x) { x = +x; return isFinite(x) && x > 0 ? x : 0; }
  function pct(x, max) { return Math.min(Math.max((+x || 0) / 100, 0), max); }

  function finish(lines, minimum, v, minutes, supplies) {
    var price = lines > 0 ? Math.max(lines, n(minimum)) : 0;
    var quoted = price * (1 - pct(v.discountPct, 1));
    var target = pct(v.targetPct, 0.99);
    var crew = n(v.crew) || 1;
    var workerHours = lines > 0 ? (minutes + n(v.setupMin)) / 60 : 0;
    var labor = workerHours * n(v.laborRate);
    var sup = lines > 0 ? n(supplies) : 0;
    var travel = n(v.miles) * n(v.cpm);
    var cost = labor + sup + travel + (quoted > 0 ? n(v.fixedCost) : 0);
    var profit = quoted - cost;
    return {
      lines: lines, minimumApplied: price > lines, price: price, quoted: quoted,
      workerHours: workerHours, onSite: workerHours / crew, labor: labor, supplies: sup, travel: travel,
      cost: cost, profit: profit, margin: quoted > 0 ? profit / quoted : 0,
      minPrice: cost / (1 - target), meetsTarget: quoted > 0 && profit / quoted >= target
    };
  }

  function windowClean(v) {
    var t = v.times || WIN_TIMES;
    var g = n(v.ground), u = n(v.upper), ins = v.interior === true || v.interior === "yes";
    var intl = ins ? g + u : 0, mult = n(v.upperMult) || 1;
    var lines = g * n(v.extPrice) + u * n(v.extPrice) * mult + intl * n(v.intPrice) +
      n(v.screens) * n(v.screenPrice) + n(v.tracks) * n(v.trackPrice) + n(v.hard) * n(v.hardPrice);
    var minutes = g * t.ext + u * t.ext * t.upperTimeMult + intl * t.int + n(v.screens) * t.screen + n(v.tracks) * t.track + n(v.hard) * t.hard;
    var r = finish(lines, v.minimum, v, minutes, v.supplies);
    r.interiorCount = intl;
    return r;
  }

  function gutterClean(v) {
    var t = v.times || GUT_TIMES;
    var ft = [n(v.ft1), n(v.ft2), n(v.ft3)], rate = [n(v.rate1), n(v.rate2), n(v.rate3)];
    var sur = pct(v.conditionPct, 10);
    var base = 0, hours = 0, i;
    for (i = 0; i < 3; i++) { base += ft[i] * rate[i]; hours += ft[i] / t.ftPerHour[i]; }
    var condAmt = base * sur, ds = n(v.downspouts) * n(v.downspoutPrice);
    var lines = base + condAmt + ds;
    var minutes = hours * (1 + sur) * 60 + n(v.downspouts) * t.downspoutMin;
    var r = finish(lines, v.minimum, v, minutes, v.supplies);
    r.base = base; r.conditionAmt = condAmt; r.downspoutAmt = ds;
    return r;
  }

  var api = { windowClean: windowClean, gutterClean: gutterClean, WIN_TIMES: WIN_TIMES, GUT_TIMES: GUT_TIMES };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") {
    window.QuoteloomCalc = window.QuoteloomCalc || {};
    for (var k in api) window.QuoteloomCalc[k] = api[k];
  }
  if (typeof document === "undefined") return;

  function money(x) { return (x < 0 ? "-$" : "$") + Math.abs(x).toFixed(2); }
  function num(id) { return parseFloat(document.getElementById(id).value); }
  function set(id, s) { var e = document.getElementById(id); if (e) e.textContent = s; }
  function common() {
    return { discountPct: num("discountPct"), miles: num("miles"), cpm: num("cpm"), supplies: num("supplies"), crew: num("crew"),
      laborRate: num("laborRate"), setupMin: num("setupMin"), targetPct: num("targetPct"), minimum: num("minimum"), fixedCost: 0 };
  }
  function show(r) {
    set("o-lines", money(r.lines) + (r.minimumApplied ? " (minimum applies)" : ""));
    set("o-quoted", money(r.quoted)); set("o-hours", r.workerHours.toFixed(2)); set("o-onsite", r.onSite.toFixed(2));
    set("o-labor", money(r.labor)); set("o-supplies", money(r.supplies)); set("o-travel", money(r.travel));
    set("o-cost", money(r.cost)); set("o-profit", money(r.profit)); set("o-margin", (r.margin * 100).toFixed(1) + "%");
    set("o-min", money(r.minPrice));
    set("o-status", r.quoted <= 0 ? "Enter a job size" : (r.meetsTarget ? "Meets target margin" : "Below target margin"));
  }
  function runWindow() {
    var v = common();
    ["ground", "upper", "screens", "tracks", "hard", "extPrice", "intPrice", "screenPrice", "trackPrice", "hardPrice", "upperMult"].forEach(function (id) { v[id] = num(id); });
    v.interior = document.getElementById("interior").value;
    show(windowClean(v));
  }
  function runGutter() {
    var v = common();
    ["ft1", "ft2", "ft3", "rate1", "rate2", "rate3", "conditionPct", "downspouts", "downspoutPrice"].forEach(function (id) { v[id] = num(id); });
    show(gutterClean(v));
  }
  document.addEventListener("DOMContentLoaded", function () {
    var form = document.querySelector("[data-calc]");
    if (!form) return;
    var run = form.getAttribute("data-calc") === "window" ? runWindow : runGutter;
    var els = form.querySelectorAll("input, select");
    for (var i = 0; i < els.length; i++) { els[i].addEventListener("input", run); els[i].addEventListener("change", run); }
    run();
  });
})();
