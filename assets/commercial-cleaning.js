/* Quoteloom free commercial cleaning bid calculator (one blended area). Pure function exported for Node tests.
   Same math as the workbook for a single area; periodic services are in the spreadsheet only. */
(function () {
  function bid(v) {
    var sqft = +v.sqft || 0, rate = +v.rate || 0, cleanings = +v.cleanings || 0;
    var visits = +v.visits || 0, weeks = +v.weeks || 0, crew = +v.crew || 0;
    var driveMin = +v.driveMin || 0, miles = +v.miles || 0, cpm = +v.cpm || 0;
    var wage = +v.wage || 0, burden = (+v.burdenPct || 0) / 100, nonprod = (+v.nonprodPct || 0) / 100;
    var supRate = +v.suppliesPer1000 || 0, equip = +v.equipPerVisit || 0;
    var oh = (+v.overheadPct || 0) / 100, fixedMonth = +v.fixedMonth || 0;
    var target = Math.min(Math.max((+v.targetPct || 0) / 100, 0), 0.99);
    var minMonth = +v.minMonth || 0, step = +v.roundStep || 0;
    var hours = rate > 0 ? sqft / rate * cleanings : 0;
    var allowance = hours * nonprod;
    var driveHours = visits * driveMin / 60 * crew;
    var paid = hours + allowance + driveHours;
    var loaded = wage * (1 + burden);
    var labor = paid * loaded;
    var supplies = sqft / 1000 * supRate * cleanings;
    var equipment = visits * equip, travel = visits * miles * cpm;
    var directWeek = labor + supplies + equipment + travel;
    var direct = directWeek * weeks;
    var overhead = direct * oh, fixed = fixedMonth * 12;
    var cost = direct + overhead + fixed;
    var annualAtTarget = cost / (1 - target);
    var monthlyPre = annualAtTarget / 12;
    var afterMin = Math.max(monthlyPre, minMonth);
    var monthly = step > 0 ? Math.ceil(Math.round(afterMin / step * 1e6) / 1e6) * step : afterMin;
    var annual = monthly * 12, visitsYear = visits * weeks;
    var profit = annual - cost;
    return {
      cleanHours: hours, paidHours: paid, loadedRate: loaded, labor: labor, supplies: supplies, equipment: equipment, travel: travel,
      directWeek: directWeek, direct: direct, overhead: overhead, fixed: fixed, cost: cost, annualAtTarget: annualAtTarget,
      monthlyPre: monthlyPre, monthly: monthly, annual: annual, perVisit: visitsYear > 0 ? annual / visitsYear : 0,
      profit: profit, margin: annual > 0 ? profit / annual : 0, breakEvenMonthly: cost / 12,
      minApplied: minMonth > monthlyPre, cleaningsExceedVisits: cleanings > visits
    };
  }

  if (typeof module !== "undefined" && module.exports) module.exports = { commercialBid: bid };
  if (typeof window !== "undefined") {
    window.QuoteloomCalc = window.QuoteloomCalc || {};
    window.QuoteloomCalc.commercialBid = bid;
  }
  if (typeof document === "undefined") return;

  var ids = ["sqft", "rate", "cleanings", "visits", "weeks", "crew", "driveMin", "miles", "cpm", "wage", "burdenPct", "nonprodPct",
    "suppliesPer1000", "equipPerVisit", "overheadPct", "fixedMonth", "targetPct", "minMonth", "roundStep"];
  function money(x) { return (x < 0 ? "-$" : "$") + Math.abs(x).toFixed(2); }
  function set(id, t) { document.getElementById(id).textContent = t; }

  function run() {
    var v = {};
    ids.forEach(function (id) { v[id] = parseFloat(document.getElementById(id).value); });
    var r = bid(v);
    set("o-monthly", money(r.monthly)); set("o-annual", money(r.annual)); set("o-pervisit", money(r.perVisit));
    set("o-hours", r.paidHours.toFixed(2)); set("o-labor", money(r.labor)); set("o-supplies", money(r.supplies));
    set("o-direct", money(r.direct)); set("o-cost", money(r.cost)); set("o-profit", money(r.profit));
    set("o-margin", (r.margin * 100).toFixed(1) + "%"); set("o-breakeven", money(r.breakEvenMonthly));
    var msg = r.cleaningsExceedVisits ? "Cleanings per week is higher than visits per week: check both fields."
      : (r.cleanHours <= 0 ? "Enter square feet, a production rate and cleanings per week." : (r.minApplied ? "Your minimum monthly charge set this price." : "Priced at your target margin."));
    set("o-status", msg);
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!document.getElementById("sqft")) return;
    ids.forEach(function (id) { document.getElementById(id).addEventListener("input", run); });
    run();
  });
})();
