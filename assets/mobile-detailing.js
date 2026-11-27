/* Quoteloom free mobile car detailing price calculator. Pure function exported for Node tests.
   Core logic matches the Mobile Car Detailing workbook model, simplified: example add-on times (stated on the page),
   one chemicals & supplies figure per job, and equipment wear / allocated overhead optional via fixedCost (the live page leaves it at 0). */
(function () {
  // Example package prices and worker-minutes by vehicle size (the workbook's example Inputs; not market rates).
  var PACKAGES = {
    exterior: { name: "Exterior wash", price: { car: 50, suv: 60, truck: 70, van: 75 }, min: { car: 60, suv: 75, truck: 90, van: 90 } },
    interior: { name: "Interior detail", price: { car: 100, suv: 120, truck: 130, van: 140 }, min: { car: 90, suv: 110, truck: 120, van: 130 } },
    full: { name: "Full detail", price: { car: 160, suv: 190, truck: 210, van: 230 }, min: { car: 150, suv: 180, truck: 200, van: 210 } }
  };
  // Example add-on worker-minutes (workbook example Inputs).
  var ADDON_MIN = { petHair: 30, odor: 20, headlight: 40, engine: 30, ceramic: 45, clay: 45 };
  var ADDONS = ["petHair", "odor", "headlight", "engine", "ceramic", "clay"];

  function n(x) { x = +x; return isFinite(x) && x > 0 ? x : 0; }
  function pct(x, max) { return Math.min(Math.max((+x || 0) / 100, 0), max); }

  function mobileDetail(v) {
    var t = v.addonMin || ADDON_MIN;
    var sur = pct(v.conditionPct, 10);
    var pkg = n(v.pkgPrice) * (1 + sur), pkgMinutes = n(v.pkgMin) * (1 + sur);
    var addons = 0, minutes = pkgMinutes, i, k;
    for (i = 0; i < ADDONS.length; i++) {
      k = ADDONS[i];
      addons += n(v[k]) * n(v[k + "Price"]);
      minutes += n(v[k]) * t[k];
    }
    var lines = pkg + addons, work = lines > 0;
    var services = work ? Math.max(lines, n(v.minimum)) : 0;
    var discount = services * pct(v.memberPct, 1);
    var travelFee = work ? Math.max(0, n(v.miles) - n(v.freeMiles)) * n(v.feePerMile) : 0;
    var quoted = services - discount + travelFee;
    var crew = n(v.crew) || 1;
    var workerHours = work ? (minutes + n(v.setupMin)) / 60 : 0;
    var driveHours = work ? n(v.driveMin) * 2 / 60 * crew : 0;
    var labor = (workerHours + driveHours) * n(v.laborRate);
    var supplies = work ? n(v.chemicals) : 0;
    var vehicle = work ? n(v.miles) * 2 * n(v.cpm) : 0;
    var cost = labor + supplies + vehicle + (quoted > 0 ? n(v.fixedCost) : 0);
    var profit = quoted - cost, target = pct(v.targetPct, 0.99);
    return {
      pkg: pkg, addons: addons, lines: lines, minimumApplied: services > lines, services: services, discount: discount,
      travelFee: travelFee, quoted: quoted, workerHours: workerHours, onSite: workerHours / crew, driveHours: driveHours,
      labor: labor, supplies: supplies, vehicle: vehicle, cost: cost, profit: profit, margin: quoted > 0 ? profit / quoted : 0,
      minPrice: cost / (1 - target), meetsTarget: quoted > 0 && profit / quoted >= target,
      profitPerHour: workerHours + driveHours > 0 ? profit / (workerHours + driveHours) : 0
    };
  }

  var api = { mobileDetail: mobileDetail, PACKAGES: PACKAGES, ADDON_MIN: ADDON_MIN };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") {
    window.QuoteloomCalc = window.QuoteloomCalc || {};
    for (var key in api) window.QuoteloomCalc[key] = api[key];
  }
  if (typeof document === "undefined") return;

  function money(x) { return (x < 0 ? "-$" : "$") + Math.abs(x).toFixed(2); }
  function num(id) { return parseFloat(document.getElementById(id).value); }
  function set(id, s) { var e = document.getElementById(id); if (e) e.textContent = s; }
  function run() {
    var v = {};
    ["pkgPrice", "pkgMin", "conditionPct", "minimum", "memberPct", "miles", "freeMiles", "feePerMile", "driveMin", "cpm", "chemicals",
     "setupMin", "crew", "laborRate", "targetPct"].forEach(function (id) { v[id] = num(id); });
    ADDONS.forEach(function (a) { v[a] = document.getElementById(a).checked ? 1 : 0; v[a + "Price"] = num(a + "Price"); });
    v.fixedCost = 0;
    var r = mobileDetail(v);
    set("o-lines", money(r.lines) + (r.minimumApplied ? " (minimum applies)" : ""));
    set("o-fee", money(r.travelFee)); set("o-quoted", money(r.quoted));
    set("o-hours", r.workerHours.toFixed(2)); set("o-drive", r.driveHours.toFixed(2));
    set("o-labor", money(r.labor)); set("o-supplies", money(r.supplies)); set("o-vehicle", money(r.vehicle));
    set("o-cost", money(r.cost)); set("o-profit", money(r.profit)); set("o-margin", (r.margin * 100).toFixed(1) + "%");
    set("o-pph", money(r.profitPerHour)); set("o-min", money(r.minPrice));
    set("o-status", r.quoted <= 0 ? "Pick a package or add-on" : (r.meetsTarget ? "Meets target margin" : "Below target margin"));
  }
  function fillPackage() {
    var p = PACKAGES[document.getElementById("package").value], s = document.getElementById("size").value;
    if (!p) return;
    document.getElementById("pkgPrice").value = p.price[s]; document.getElementById("pkgMin").value = p.min[s];
  }
  document.addEventListener("DOMContentLoaded", function () {
    var form = document.querySelector('[data-calc="mobile-detailing"]');
    if (!form) return;
    ["size", "package"].forEach(function (id) { document.getElementById(id).addEventListener("change", function () { fillPackage(); run(); }); });
    var els = form.querySelectorAll("input, select");
    for (var i = 0; i < els.length; i++) { els[i].addEventListener("input", run); els[i].addEventListener("change", run); }
    run();
  });
})();
