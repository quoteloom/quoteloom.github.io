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

  if (typeof module !== "undefined" && module.exports) { module.exports = { airbnb: airbnb, isEs: isEs, fmtNum: fmtNum, money: money }; }
  if (typeof document === "undefined") return;
  var ids = ["rate", "occ", "stay", "cleanFee", "platform", "lodgingTax", "cleanCost", "supplies",
             "mgmt", "housing", "util", "other", "annualFixed", "invested"];

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
  function run() {
    var v = {}; ids.forEach(function (id) { v[id] = scaled(document.getElementById(id)); });
    var o = airbnb(v);
    document.getElementById("o-nights").textContent = fmtNum(o.nights, 1);
    document.getElementById("o-gross").textContent = money(o.gross);
    document.getElementById("o-net").textContent = money(o.net);
    document.getElementById("o-var").textContent = money(o.varContrib);
    document.getElementById("o-fixed").textContent = money(o.fixed);
    document.getElementById("o-cf").textContent = money(o.cf);
    document.getElementById("o-cfm").textContent = money(o.cfm);
    document.getElementById("o-coc").textContent = o.coc === null ? t("na") : fmtNum(o.coc * 100, 2) + "%";
    document.getElementById("o-beo").textContent = o.beo === null ? t("unreachable") : fmtNum(o.beo * 100, 2) + "%";
  }
  document.addEventListener("DOMContentLoaded", function () {
    ids.forEach(function (id) { document.getElementById(id).addEventListener("input", run); }); run();
  });
})();
