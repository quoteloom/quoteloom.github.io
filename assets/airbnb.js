/* Quoteloom free Airbnb / short-term rental profit calculator.
   Annual 365-day model (no month-by-month seasonality — that's in the spreadsheet).
   Pure function exported for Node tests. */
(function () {
  function airbnb(v) {
    var rate = +v.rate || 0,
        occ = Math.min(Math.max((+v.occ || 0) / 100, 0), 1),
        stay = +v.stay || 0,
        cleanFee = +v.cleanFee || 0,
        platform = Math.max((+v.platform || 0) / 100, 0),
        lodgingTax = Math.max((+v.lodgingTax || 0) / 100, 0),
        cleanCost = +v.cleanCost || 0,
        supplies = +v.supplies || 0,
        mgmt = Math.max((+v.mgmt || 0) / 100, 0),
        housing = +v.housing || 0,
        util = +v.util || 0,
        other = +v.other || 0,
        annualFixed = +v.annualFixed || 0,
        invested = +v.invested || 0,
        days = 365;
    function layer(nights) {
      var stays = stay > 0 ? nights / stay : 0,
          lodging = nights * rate,
          cleanRev = stays * cleanFee,
          gross = lodging + cleanRev,
          plat = gross * platform,
          ltax = lodging * lodgingTax,
          net = gross - plat - ltax,
          varCost = stays * (cleanCost + supplies) + net * mgmt,
          varContrib = net - varCost;
      return { nights: nights, stays: stays, lodging: lodging, cleanRev: cleanRev, gross: gross,
               plat: plat, ltax: ltax, net: net, varContrib: varContrib };
    }
    var a = layer(days * occ);
    var pot = layer(days);
    var fixed = housing * 12 + util * 12 + other * 12 + annualFixed;
    var cf = a.varContrib - fixed;
    return {
      nights: a.nights, stays: a.stays, lodging: a.lodging, cleanRev: a.cleanRev, gross: a.gross,
      plat: a.plat, ltax: a.ltax, net: a.net, varContrib: a.varContrib, fixed: fixed,
      cf: cf, cfm: cf / 12,
      coc: invested > 0 ? cf / invested : null,
      beo: pot.varContrib > 0 ? fixed / pot.varContrib : null,
      potVar: pot.varContrib
    };
  }
  if (typeof module !== "undefined" && module.exports) { module.exports = { airbnb: airbnb }; }
  if (typeof document === "undefined") return;
  var ids = ["rate", "occ", "stay", "cleanFee", "platform", "lodgingTax", "cleanCost", "supplies",
             "mgmt", "housing", "util", "other", "annualFixed", "invested"];
  function money(x) { return (x < 0 ? "-$" : "$") + Math.abs(x).toFixed(2); }
  function run() {
    var v = {}; ids.forEach(function (id) { v[id] = parseFloat(document.getElementById(id).value); });
    var o = airbnb(v);
    document.getElementById("o-nights").textContent = o.nights.toFixed(1);
    document.getElementById("o-gross").textContent = money(o.gross);
    document.getElementById("o-net").textContent = money(o.net);
    document.getElementById("o-var").textContent = money(o.varContrib);
    document.getElementById("o-fixed").textContent = money(o.fixed);
    document.getElementById("o-cf").textContent = money(o.cf);
    document.getElementById("o-cfm").textContent = money(o.cfm);
    document.getElementById("o-coc").textContent = o.coc === null ? "n/a" : (o.coc * 100).toFixed(2) + "%";
    document.getElementById("o-beo").textContent = o.beo === null ? "Not reachable" : (o.beo * 100).toFixed(2) + "%";
  }
  document.addEventListener("DOMContentLoaded", function () {
    ids.forEach(function (id) { document.getElementById(id).addEventListener("input", run); }); run();
  });
})();
