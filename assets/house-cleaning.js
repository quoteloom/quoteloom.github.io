/* Quoteloom free house-cleaning pricing calculator. Pure function exported for Node tests.
   Core logic matches the workbook model; equipment and allocated overhead are optional via fixedCost. */
(function () {
  var SERVICES = {
    "Standard clean": { ppsf: 0.1, base: 60, pbed: 20, pbath: 25, hourly: 45, minimum: 120, rate: 500, supplies: 8 },
    "Deep clean": { ppsf: 0.18, base: 100, pbed: 30, pbath: 40, hourly: 55, minimum: 220, rate: 300, supplies: 15 },
    "Move-in / move-out": { ppsf: 0.22, base: 120, pbed: 35, pbath: 45, hourly: 55, minimum: 280, rate: 250, supplies: 20 }
  };
  var FREQ = { "One-time": 0, "Weekly": 0.2, "Biweekly": 0.15, "Monthly": 0.1 };
  var ADDONS = [
    { name: "Inside oven", unit: "each", price: 35, minutes: 40, supplies: 2 },
    { name: "Inside fridge", unit: "each", price: 30, minutes: 30, supplies: 1 },
    { name: "Interior windows", unit: "window", price: 5, minutes: 6, supplies: 0.25 },
    { name: "Laundry (wash + fold)", unit: "load", price: 15, minutes: 20, supplies: 0.5 }
  ];

  function houseClean(v) {
    var sv = SERVICES[v.service] || SERVICES["Standard clean"];
    var sqft = +v.sqft || 0, beds = +v.beds || 0, baths = +v.baths || 0;
    var cleanH = sv.rate > 0 ? sqft / sv.rate : 0;
    var p;
    if (v.method === "Sq ft") p = sqft * sv.ppsf;
    else if (v.method === "Rooms") p = sv.base + beds * sv.pbed + baths * sv.pbath;
    else p = cleanH * sv.hourly;
    p = Math.max(p, sv.minimum);
    var fd = FREQ.hasOwnProperty(v.freq) ? FREQ[v.freq] : 0;
    var addons = v.addons || [0, 0, 0, 0];
    var aPrice = 0, aMin = 0, aSup = 0, i, q, a;
    for (i = 0; i < ADDONS.length; i++) {
      q = +addons[i] || 0; a = ADDONS[i];
      aPrice += q * a.price; aMin += q * a.minutes; aSup += q * a.supplies;
    }
    var discount = Math.min(Math.max((+v.discountPct || 0) / 100, 0), 1);
    var quoted = (p * (1 - fd) + aPrice) * (1 - discount);
    var crew = +v.crew || 0;
    var cleanerH = cleanH + aMin / 60;
    var onsite = crew > 0 ? cleanerH / crew : 0;
    var paidH = (onsite + ((+v.driveMin || 0) / 60)) * crew;
    var labor = (+v.wage || 0) * paidH;
    var supplies = sv.supplies + aSup;
    var travel = (+v.miles || 0) * (+v.cpm || 0);
    var fixed = +v.fixedCost || 0;
    var cost = labor + supplies + travel + (quoted > 0 ? fixed : 0);
    var profit = quoted - cost;
    var target = Math.min(Math.max((+v.targetPct || 0) / 100, 0), 0.99);
    return {
      cleanPrice: p,
      freqDisc: fd,
      quoted: quoted,
      onsite: onsite,
      paidHours: paidH,
      labor: labor,
      supplies: supplies,
      travel: travel,
      cost: cost,
      profit: profit,
      margin: quoted > 0 ? profit / quoted : 0,
      minPrice: target < 1 ? cost / (1 - target) : null,
      meetsTarget: quoted > 0 && profit / quoted >= target
    };
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { houseClean: houseClean, SERVICES: SERVICES, FREQ: FREQ, ADDONS: ADDONS };
  }
  if (typeof window !== "undefined") {
    window.QuoteloomCalc = window.QuoteloomCalc || {};
    var api = { houseClean: houseClean, HC_SERVICES: SERVICES, HC_FREQ: FREQ, HC_ADDONS: ADDONS };
    for (var k in api) window.QuoteloomCalc[k] = api[k];
  }
  if (typeof document === "undefined") return;

  var ids = ["service", "method", "freq", "sqft", "beds", "baths", "oven", "fridge", "windows", "laundry", "miles", "discountPct", "wage", "crew", "driveMin", "cpm", "targetPct"];

  function money(x) { return (x < 0 ? "-$" : "$") + Math.abs(x).toFixed(2); }
  function val(id) { return document.getElementById(id).value; }
  function num(id) { return parseFloat(val(id)); }

  function run() {
    var r = houseClean({
      service: val("service"), method: val("method"), freq: val("freq"),
      sqft: num("sqft"), beds: num("beds"), baths: num("baths"),
      addons: [num("oven"), num("fridge"), num("windows"), num("laundry")],
      miles: num("miles"), discountPct: num("discountPct"), wage: num("wage"),
      crew: num("crew"), driveMin: num("driveMin"), cpm: num("cpm"),
      targetPct: num("targetPct"), fixedCost: 0
    });
    document.getElementById("o-quoted").textContent = money(r.quoted);
    document.getElementById("o-onsite").textContent = r.onsite.toFixed(2) + " h";
    document.getElementById("o-labor").textContent = money(r.labor);
    document.getElementById("o-supplies").textContent = money(r.supplies);
    document.getElementById("o-travel").textContent = money(r.travel);
    document.getElementById("o-cost").textContent = money(r.cost);
    document.getElementById("o-profit").textContent = money(r.profit);
    document.getElementById("o-margin").textContent = (r.margin * 100).toFixed(1) + "%";
    document.getElementById("o-min").textContent = r.minPrice === null ? "n/a" : money(r.minPrice);
    document.getElementById("o-status").textContent = r.quoted <= 0 ? "Enter a job" : (r.meetsTarget ? "Meets target margin" : "Below target margin");
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!document.getElementById("service")) return; // calculator form not on this page (e.g. the quote maker)
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      el.addEventListener("input", run);
      el.addEventListener("change", run);
    });
    run();
  });
})();
