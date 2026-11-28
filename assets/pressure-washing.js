/* Quoteloom free pressure-washing pricing calculator. Pure function exported for Node tests.
   Core logic matches the workbook model, simplified: equipment wear and allocated overhead
   are optional via fixedCost (the live page leaves this at 0 and says so). */
(function () {
  var SERVICES = [
    { name: "House wash (siding)", unit: "sq ft", ppu: 0.2, min: 250, rate: 1500, cpu: 0.02 },
    { name: "Driveway / concrete", unit: "sq ft", ppu: 0.18, min: 150, rate: 800, cpu: 0.01 },
    { name: "Deck cleaning", unit: "sq ft", ppu: 0.75, min: 200, rate: 300, cpu: 0.05 },
    { name: "Roof soft wash", unit: "sq ft", ppu: 0.4, min: 400, rate: 1000, cpu: 0.04 },
    { name: "Gutter cleaning", unit: "linear ft", ppu: 1.5, min: 125, rate: 100, cpu: 0.03 }
  ];

  function pressureWash(v) {
    var services = v.services || SERVICES;
    var qty = v.qty || [0, 0, 0, 0, 0];
    var discount = Math.min(Math.max((+v.discountPct || 0) / 100, 0), 1);
    var miles = +v.miles || 0, cpm = +v.cpm || 0, setup = +v.setupHours || 0;
    var laborRate = +v.laborRate || 0, crew = +v.crew || 0;
    var target = Math.min(Math.max((+v.targetPct || 0) / 100, 0), 0.99);
    var fixed = +v.fixedCost || 0;
    var price = 0, hours = 0, chem = 0, i, q, s;
    for (i = 0; i < services.length; i++) {
      q = +qty[i] || 0;
      s = services[i];
      if (q > 0) {
        price += Math.max(q * s.ppu, s.min);
        hours += q / s.rate;
      }
      chem += q * s.cpu;
    }
    var quoted = price * (1 - discount);
    var crewHours = hours > 0 ? hours + setup : 0;
    var labor = crewHours * laborRate * crew;
    var travel = miles * cpm;
    var cost = labor + chem + travel + (quoted > 0 ? fixed : 0);
    var profit = quoted - cost;
    return {
      subtotal: price,
      quoted: quoted,
      crewHours: crewHours,
      labor: labor,
      chem: chem,
      travel: travel,
      cost: cost,
      profit: profit,
      margin: quoted > 0 ? profit / quoted : 0,
      minPrice: target < 1 ? cost / (1 - target) : null,
      meetsTarget: quoted > 0 && profit / quoted >= target
    };
  }

  function isEs() {
    return typeof document !== "undefined" &&
      ((document.documentElement.getAttribute("lang") || "").toLowerCase().indexOf("es") === 0);
  }
  function fmtNum(x, d) {
    var n = Number(x).toFixed(d);
    if (isEs()) {
      var neg = n.charAt(0) === "-", p = (neg ? n.slice(1) : n).split(".");
      p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      n = (neg ? "-" : "") + p.join(".");
    }
    return n;
  }
  function money(x) {
    // ES pages: thousands separators; currency label from <html data-currency>, else "US$".
    var cur = isEs() ? (document.documentElement.getAttribute("data-currency") || "US$") : "$";
    return (x < 0 ? "-" : "") + cur + fmtNum(Math.abs(x), 2);
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { pressureWash: pressureWash, SERVICES: SERVICES, isEs: isEs, fmtNum: fmtNum, money: money };
  }
  if (typeof window !== "undefined") {
    window.QuoteloomCalc = window.QuoteloomCalc || {};
    var api = { pressureWash: pressureWash, PW_SERVICES: SERVICES };
    for (var k in api) window.QuoteloomCalc[k] = api[k];
  }
  if (typeof document === "undefined") return;

  var ids = ["house", "driveway", "deck", "roof", "gutters", "discountPct", "miles", "cpm", "setupHours", "laborRate", "crew", "targetPct"];


  function scaled(el) {    // Optional data-scale converts a localized unit (m², km, per km) to the unit the model uses.
    var s = parseFloat(el.getAttribute("data-scale"));
    return parseFloat(el.value) * (isFinite(s) ? s : 1);
  }
  function t(key) {
    var es = {
      enterJob: "Ingresa un trabajo",
      enterSize: "Ingresa el tamaño del trabajo",
      meets: "Cumple el margen objetivo",
      below: "Por debajo del margen objetivo",
      na: "no aplica",
      unreachable: "No alcanzable"
    };
    var en = {
      enterJob: "Enter a job",
      enterSize: "Enter a job size",
      meets: "Meets target margin",
      below: "Below target margin",
      na: "n/a",
      unreachable: "Not reachable"
    };
    return (isEs() ? es : en)[key];
  }
  function num(id) { return scaled(document.getElementById(id)); }

  function run() {
    var r = pressureWash({
      qty: [num("house"), num("driveway"), num("deck"), num("roof"), num("gutters")],
      discountPct: num("discountPct"), miles: num("miles"), cpm: num("cpm"),
      setupHours: num("setupHours"), laborRate: num("laborRate"), crew: num("crew"),
      targetPct: num("targetPct"), fixedCost: 0
    });
    document.getElementById("o-quoted").textContent = money(r.quoted);
    document.getElementById("o-hours").textContent = fmtNum(r.crewHours, 2);
    document.getElementById("o-labor").textContent = money(r.labor);
    document.getElementById("o-chem").textContent = money(r.chem);
    document.getElementById("o-travel").textContent = money(r.travel);
    document.getElementById("o-cost").textContent = money(r.cost);
    document.getElementById("o-profit").textContent = money(r.profit);
    document.getElementById("o-margin").textContent = fmtNum(r.margin * 100, 1) + "%";
    document.getElementById("o-min").textContent = r.minPrice === null ? t("na") : money(r.minPrice);
    document.getElementById("o-status").textContent = r.quoted <= 0 ? t("enterSize") : (r.meetsTarget ? t("meets") : t("below"));
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!document.getElementById("house")) return; // calculator form not on this page (e.g. the quote maker)
    ids.forEach(function (id) { document.getElementById(id).addEventListener("input", run); });
    run();
  });
})();
