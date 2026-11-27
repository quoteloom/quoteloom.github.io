/* Quoteloom Quote Maker: pure quote math, calculator presets and license-response rules.
   No DOM here, so Node tests can require it. In the browser it attaches to window.QuoteCore
   and reads the calculator functions from window.QuoteloomCalc (set by the calculator scripts). */
(function (root) {
  var FREE_TEMPLATE_LIMIT = 1;          // saved quote templates on the free plan
  var LICENSE_RECHECK_MS = 3 * 864e5;   // re-verify a Pro key with Gumroad every 3 days
  var LICENSE_GRACE_MS = 14 * 864e5;    // keep Pro working offline up to 14 days after the last good check

  function calc() {
    if (typeof module !== "undefined" && module.exports && typeof require === "function") {
      var a = require("../pressure-washing.js"), b = require("../house-cleaning.js"), c = require("../lawn-care.js");
      return {
        pressureWash: a.pressureWash, PW_SERVICES: a.SERVICES,
        houseClean: b.houseClean, HC_SERVICES: b.SERVICES, HC_FREQ: b.FREQ, HC_ADDONS: b.ADDONS,
        lawnCare: c.lawnCare, LC_SERVICES: c.SERVICES, SQFT_PER_ACRE: c.SQFT_PER_ACRE
      };
    }
    return (root && root.QuoteloomCalc) || {};
  }

  function num(x) { var n = parseFloat(x); return isFinite(n) ? n : 0; }
  function round2(x) { return Math.round((num(x) + (x >= 0 ? 1e-9 : -1e-9)) * 100) / 100; }
  function clampPct(p) { return Math.min(Math.max(num(p), 0), 100); }

  /* One line: qty x rate, raised to the line minimum when a minimum is set and qty > 0. */
  function lineTotal(item) {
    var qty = Math.max(num(item.qty), 0), rate = Math.max(num(item.rate), 0), min = Math.max(num(item.min), 0);
    var raw = qty * rate;
    var minApplied = qty > 0 && min > 0 && raw < min;
    return { total: round2(minApplied ? min : raw), minApplied: minApplied };
  }

  /* Whole quote. Discount comes off the subtotal, tax applies to the discounted amount,
     deposit is a share of the final total. All money values are rounded to cents. */
  function computeQuote(q) {
    var items = (q && q.items) || [];
    var lines = [], subtotal = 0, i, lt;
    for (i = 0; i < items.length; i++) {
      lt = lineTotal(items[i]);
      lines.push({ desc: String(items[i].desc || ""), qty: num(items[i].qty), unit: String(items[i].unit || ""),
                   rate: Math.round(Math.max(num(items[i].rate), 0) * 10000) / 10000, min: num(items[i].min), total: lt.total, minApplied: lt.minApplied });
      subtotal += lt.total;
    }
    subtotal = round2(subtotal);
    var discount = round2(subtotal * clampPct(q.discountPct) / 100);
    var afterDiscount = round2(subtotal - discount);
    var tax = round2(afterDiscount * clampPct(q.taxPct) / 100);
    var total = round2(afterDiscount + tax);
    var deposit = round2(total * clampPct(q.depositPct) / 100);
    return { lines: lines, subtotal: subtotal, discount: discount, afterDiscount: afterDiscount,
             tax: tax, total: total, deposit: deposit, balance: round2(total - deposit) };
  }

  function fmtQty(n) { return (Math.round(n * 100) / 100).toLocaleString("en-US"); }

  /* Pressure washing: one line per service with a size, at the calculator's example $/unit and minimum. */
  function pressureWashItems(qty, services) {
    var S = services || calc().PW_SERVICES, out = [], i, q;
    for (i = 0; i < S.length; i++) {
      q = num(qty && qty[i]);
      if (q > 0) out.push({ desc: S[i].name, qty: q, unit: S[i].unit, rate: S[i].ppu, min: S[i].min });
    }
    return out;
  }

  /* House cleaning: the calculator's clean price (after its frequency discount) as one line, plus add-ons. */
  function houseCleanItems(v) {
    var c = calc(), r = c.houseClean(v), out = [];
    var svc = c.HC_SERVICES[v.service] ? v.service : "Standard clean";
    var bits = [];
    if (num(v.sqft) > 0) bits.push(fmtQty(num(v.sqft)) + " sq ft");
    if (num(v.beds) > 0 || num(v.baths) > 0) bits.push(num(v.beds) + " bed / " + num(v.baths) + " bath");
    var freq = c.HC_FREQ.hasOwnProperty(v.freq) ? v.freq : "One-time";
    var desc = svc + (bits.length ? " (" + bits.join(", ") + ")" : "") + (freq !== "One-time" ? ", " + freq.toLowerCase() + " rate" : "");
    out.push({ desc: desc, qty: 1, unit: "visit", rate: round2(r.cleanPrice * (1 - r.freqDisc)), min: 0 });
    var add = v.addons || [];
    for (var i = 0; i < c.HC_ADDONS.length; i++) {
      if (num(add[i]) > 0) out.push({ desc: c.HC_ADDONS[i].name, qty: num(add[i]), unit: c.HC_ADDONS[i].unit, rate: c.HC_ADDONS[i].price, min: 0 });
    }
    return out;
  }

  /* Lawn care: per-visit price for each service from lot size (calculator's $/1,000 sq ft and minimum), qty = visits. */
  function lawnCareItems(v) {
    var c = calc(), sqft = (v.unit === "Acres") ? num(v.size) * c.SQFT_PER_ACRE : num(v.size), out = [];
    var visits = v.visits || [];
    for (var i = 0; i < c.LC_SERVICES.length; i++) {
      var n = num(visits[i]), s = c.LC_SERVICES[i];
      if (n > 0 && sqft > 0) {
        out.push({ desc: s.name + " (" + fmtQty(sqft) + " sq ft lot)", qty: n, unit: "visit",
                   rate: round2(Math.max(sqft / 1000 * s.p1k, s.min)), min: 0 });
      }
    }
    return out;
  }

  function quoteNumber(d, seq) {
    var y = d.getFullYear(), m = ("0" + (d.getMonth() + 1)).slice(-2), day = ("0" + d.getDate()).slice(-2);
    return "Q-" + y + m + day + "-" + ("00" + Math.max(1, Math.floor(num(seq)))).slice(-3);
  }

  function addDays(d, n) { var x = new Date(d.getTime()); x.setDate(x.getDate() + Math.floor(num(n))); return x; }

  function canSaveTemplate(isPro, count) { return !!isPro || num(count) < FREE_TEMPLATE_LIMIT; }

  /* Decide whether a Gumroad /v2/licenses/verify JSON response unlocks Pro.
     Membership rules: refunded, charged back, disputed, ended or failed-payment subscriptions do not.
     A cancelled subscription stays active until Gumroad sets subscription_ended_at at the end of the paid period. */
  function evaluateLicense(json) {
    if (!json || json.success !== true || !json.purchase) {
      return { ok: false, reason: (json && json.message) || "Gumroad did not recognise this license key." };
    }
    var p = json.purchase;
    if (p.refunded) return { ok: false, reason: "This purchase was refunded." };
    if (p.chargebacked || p.disputed) return { ok: false, reason: "This purchase was charged back or disputed." };
    if (p.subscription_ended_at) return { ok: false, reason: "This membership has ended." };
    if (p.subscription_failed_at) return { ok: false, reason: "The latest membership payment failed. Update your card on Gumroad, then verify again." };
    return { ok: true, reason: p.subscription_cancelled_at ? "Active until the end of the paid period (cancelled)." : "Active", email: p.email || "" };
  }

  /* Is a cached verification still good enough? now/at in ms. */
  function licenseState(cache, now) {
    if (!cache || !cache.key) return "none";
    if (cache.ok && now - (cache.checkedAt || 0) < LICENSE_RECHECK_MS) return "pro";
    if (cache.ok && now - (cache.lastOkAt || 0) < LICENSE_GRACE_MS) return "pro-recheck";
    return cache.ok ? "expired-check" : "invalid";
  }

  /* POST to Gumroad. Gumroad's API answers with Access-Control-Allow-Origin: *, so this works from the browser. */
  function verifyLicense(productId, key, fetchImpl) {
    var f = fetchImpl || (typeof fetch !== "undefined" ? fetch : null);
    if (!productId) return Promise.resolve({ ok: false, reason: "Pro is not on sale yet.", network: false });
    var body = "product_id=" + encodeURIComponent(productId) + "&license_key=" + encodeURIComponent(String(key).trim()) + "&increment_uses_count=false";
    return f("https://api.gumroad.com/v2/licenses/verify", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body
    }).then(function (res) { return res.json(); })
      .then(function (json) { var r = evaluateLicense(json); r.network = true; return r; },
            function () { return { ok: false, reason: "Could not reach Gumroad. Check your connection and try again.", network: false, offline: true }; });
  }

  var api = { FREE_TEMPLATE_LIMIT: FREE_TEMPLATE_LIMIT, LICENSE_RECHECK_MS: LICENSE_RECHECK_MS, LICENSE_GRACE_MS: LICENSE_GRACE_MS,
              round2: round2, lineTotal: lineTotal, computeQuote: computeQuote, pressureWashItems: pressureWashItems,
              houseCleanItems: houseCleanItems, lawnCareItems: lawnCareItems, quoteNumber: quoteNumber, addDays: addDays,
              canSaveTemplate: canSaveTemplate, evaluateLicense: evaluateLicense, licenseState: licenseState, verifyLicense: verifyLicense };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.QuoteCore = api;
})(typeof window !== "undefined" ? window : null);
