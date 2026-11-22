/* Quoteloom free trucking cost-per-mile and load-profit calculator.
   Annual model with one load. Factoring, percent-of-revenue pay, salary and
   trip-specific tolls are in the spreadsheet. Pure function exported for Node tests. */
(function () {
  function trucking(v) {
    var miles = +v.miles || 0,
        truck = +v.truck || 0,
        insurance = +v.insurance || 0,
        permits = +v.permits || 0,
        eld = +v.eld || 0,
        otherFixed = +v.otherFixed || 0,
        fuelPrice = +v.fuelPrice || 0,
        mpg = +v.mpg || 0,
        maint = +v.maint || 0,
        tires = +v.tires || 0,
        tolls = +v.tolls || 0,
        driver = +v.driver || 0,
        loadedPct = Math.min(Math.max((+v.loadedPct || 0) / 100, 0), 1),
        rate = +v.rate || 0,
        loaded = +v.loaded || 0,
        deadhead = +v.deadhead || 0;
    var fixedAnnual = 12 * (truck + eld + otherFixed) + insurance + permits;
    var fuelCpm = mpg > 0 ? fuelPrice / mpg : 0;
    var variableCpm = fuelCpm + maint + tires + tolls;
    var fixedCpm = miles > 0 ? fixedAnnual / miles : null;
    var totalCpm = fixedCpm === null ? null : fixedCpm + variableCpm + driver;
    var beTotal = totalCpm;
    var beLoaded = (totalCpm === null || loadedPct <= 0) ? null : totalCpm / loadedPct;
    var trip = loaded + deadhead;
    var revenue = rate * loaded;
    var loadCost = totalCpm === null ? null : totalCpm * trip;
    var loadProfit = loadCost === null ? null : revenue - loadCost;
    var loadBe = (loadCost === null || loaded <= 0) ? null : loadCost / loaded;
    return {
      fixedAnnual: fixedAnnual, fuelCpm: fuelCpm, variableCpm: variableCpm,
      fixedCpm: fixedCpm, driverCpm: driver, totalCpm: totalCpm,
      beTotal: beTotal, beLoaded: beLoaded,
      trip: trip, revenue: revenue, loadCost: loadCost, loadProfit: loadProfit, loadBe: loadBe
    };
  }
  if (typeof module !== "undefined" && module.exports) { module.exports = { trucking: trucking }; }
  if (typeof document === "undefined") return;
  var ids = ["miles", "truck", "insurance", "permits", "eld", "otherFixed", "fuelPrice", "mpg",
             "maint", "tires", "tolls", "driver", "loadedPct", "rate", "loaded", "deadhead"];
  function money(x) { return (x < 0 ? "-$" : "$") + Math.abs(x).toFixed(2); }
  function cpm(x) { return (x < 0 ? "-$" : "$") + Math.abs(x).toFixed(4); }
  function run() {
    var v = {}; ids.forEach(function (id) { v[id] = parseFloat(document.getElementById(id).value); });
    var o = trucking(v);
    function set(id, text) { document.getElementById(id).textContent = text; }
    set("o-fixed-annual", money(o.fixedAnnual));
    set("o-fuel", o.fuelCpm === null ? "n/a" : cpm(o.fuelCpm));
    set("o-variable", cpm(o.variableCpm));
    set("o-fixed", o.fixedCpm === null ? "n/a" : cpm(o.fixedCpm));
    set("o-driver", cpm(o.driverCpm));
    set("o-total", o.totalCpm === null ? "n/a" : cpm(o.totalCpm));
    set("o-be-total", o.beTotal === null ? "n/a" : cpm(o.beTotal));
    set("o-be-loaded", o.beLoaded === null ? "Not reachable" : cpm(o.beLoaded));
    set("o-trip", o.trip.toFixed(1));
    set("o-revenue", money(o.revenue));
    set("o-load-cost", o.loadCost === null ? "n/a" : money(o.loadCost));
    set("o-profit", o.loadProfit === null ? "n/a" : money(o.loadProfit));
    set("o-load-be", o.loadBe === null ? "Not reachable" : cpm(o.loadBe));
  }
  document.addEventListener("DOMContentLoaded", function () {
    ids.forEach(function (id) { document.getElementById(id).addEventListener("input", run); }); run();
  });
})();
