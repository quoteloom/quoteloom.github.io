/* Quoteloom free lawn-care pricing calculator. Pure function exported for Node tests.
   Core logic matches the workbook model; allocated overhead is optional via overheadPerVisit. */
(function () {
  var SQFT_PER_ACRE = 43560;
  var SERVICES = [
    { name: "Mowing", p1k: 6.0, min: 40, rate: 20000, m1k: 0.0, dfee: 0.0 },
    { name: "Edging", p1k: 1.5, min: 10, rate: 40000, m1k: 0.0, dfee: 0.0 },
    { name: "String trimming", p1k: 1.5, min: 10, rate: 30000, m1k: 0.0, dfee: 0.0 },
    { name: "Leaf cleanup", p1k: 14.0, min: 120, rate: 6000, m1k: 0.0, dfee: 25.0 },
    { name: "Fertilizing", p1k: 5.0, min: 45, rate: 40000, m1k: 2.2, dfee: 0.0 },
    { name: "Core aeration", p1k: 9.0, min: 80, rate: 15000, m1k: 0.0, dfee: 0.0 }
  ];

  function lawnCare(v) {
    var size = +v.size || 0;
    var sqft = (v.unit === "Acres") ? size * SQFT_PER_ACRE : size;
    var visits = v.visits || [0, 0, 0, 0, 0, 0];
    var discount = Math.min(Math.max((+v.discountPct || 0) / 100, 0), 1);
    var months = +v.months || 0;
    var wage = +v.wage || 0, crew = +v.crew || 0, equipHr = +v.equipHr || 0;
    var setupMin = +v.setupMin || 0, miles = +v.miles || 0, cpm = +v.cpm || 0;
    var target = Math.min(Math.max((+v.targetPct || 0) / 100, 0), 0.99);
    var ohv = +v.overheadPerVisit || 0;
    var seasonPrice = 0, crewH = 0, mat = 0, disp = 0, i, vis, s, trips = 0;
    for (i = 0; i < SERVICES.length; i++) {
      vis = +visits[i] || 0;
      s = SERVICES[i];
      if (vis > 0) {
        seasonPrice += vis * Math.max(sqft / 1000 * s.p1k, s.min);
        crewH += vis * (s.rate > 0 ? sqft / s.rate : 0);
      }
      mat += vis * sqft / 1000 * s.m1k;
      disp += vis * s.dfee;
      if (vis > trips) trips = vis;
    }
    var contract = seasonPrice * (1 - discount);
    var hours = crewH + trips * setupMin / 60;
    var labor = hours * crew * wage;
    var equip = hours * equipHr;
    var travel = trips * miles * cpm;
    var oh = trips * ohv;
    var cost = labor + equip + travel + mat + disp + oh;
    var profit = contract - cost;
    var minContract = target < 1 ? cost / (1 - target) : null;
    return {
      sqft: sqft,
      trips: trips,
      contract: contract,
      monthly: months > 0 ? contract / months : 0,
      hours: hours,
      labor: labor,
      equip: equip,
      travel: travel,
      materials: mat,
      disposal: disp,
      cost: cost,
      profit: profit,
      margin: contract > 0 ? profit / contract : 0,
      minContract: minContract,
      minMonthly: minContract !== null && months > 0 ? minContract / months : null,
      meetsTarget: contract > 0 && profit / contract >= target
    };
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { lawnCare: lawnCare, SERVICES: SERVICES, SQFT_PER_ACRE: SQFT_PER_ACRE };
  }
  if (typeof window !== "undefined") {
    window.QuoteloomCalc = window.QuoteloomCalc || {};
    var api = { lawnCare: lawnCare, LC_SERVICES: SERVICES, SQFT_PER_ACRE: SQFT_PER_ACRE };
    for (var k in api) window.QuoteloomCalc[k] = api[k];
  }
  if (typeof document === "undefined") return;

  var ids = ["size", "unit", "mow", "edge", "trim", "leaf", "fert", "aerate", "discountPct", "months", "wage", "crew", "equipHr", "setupMin", "miles", "cpm", "targetPct"];

  function money(x) { return (x < 0 ? "-$" : "$") + Math.abs(x).toFixed(2); }
  function val(id) { return document.getElementById(id).value; }
  function num(id) { return parseFloat(val(id)); }

  function run() {
    var r = lawnCare({
      size: num("size"), unit: val("unit"),
      visits: [num("mow"), num("edge"), num("trim"), num("leaf"), num("fert"), num("aerate")],
      discountPct: num("discountPct"), months: num("months"),
      wage: num("wage"), crew: num("crew"), equipHr: num("equipHr"), setupMin: num("setupMin"),
      miles: num("miles"), cpm: num("cpm"), targetPct: num("targetPct"), overheadPerVisit: 0
    });
    document.getElementById("o-contract").textContent = money(r.contract);
    document.getElementById("o-monthly").textContent = money(r.monthly);
    document.getElementById("o-hours").textContent = r.hours.toFixed(2);
    document.getElementById("o-labor").textContent = money(r.labor);
    document.getElementById("o-equip").textContent = money(r.equip);
    document.getElementById("o-travel").textContent = money(r.travel);
    document.getElementById("o-mats").textContent = money(r.materials + r.disposal);
    document.getElementById("o-cost").textContent = money(r.cost);
    document.getElementById("o-profit").textContent = money(r.profit);
    document.getElementById("o-margin").textContent = (r.margin * 100).toFixed(1) + "%";
    document.getElementById("o-min").textContent = r.minContract === null ? "n/a" : money(r.minContract);
    document.getElementById("o-status").textContent = r.contract <= 0 ? "Enter a lot and visits" : (r.meetsTarget ? "Meets target margin" : "Below target margin");
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!document.getElementById("size")) return; // calculator form not on this page (e.g. the quote maker)
    ids.forEach(function (id) {
      var el = document.getElementById(id);
      el.addEventListener("input", run);
      el.addEventListener("change", run);
    });
    run();
  });
})();
