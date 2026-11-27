/* Quoteloom Invoice Maker: pure invoice math, due dates, quote import and Pro gating.
   Reuses the Quote Maker's line math and Gumroad license rules (QuoteCore), so one Quote Maker Pro key unlocks both.
   No DOM here, so Node tests can require it. In the browser it attaches to window.InvoiceCore. */
(function (root) {
  var Q = (typeof module !== "undefined" && module.exports && typeof require === "function")
    ? require("../quote-maker/quote-core.js") : (root && root.QuoteCore);

  var TERMS = [0, 7, 14, 15, 30, 45, 60, 90];   // net-terms choices offered in the UI (days)
  var KEYS = { biz: "ql.qm.biz", lic: "ql.qm.license", quoteDraft: "ql.qm.draft", draft: "ql.im.draft", seq: "ql.im.seq" };

  function num(x) { var n = parseFloat(x); return isFinite(n) ? n : 0; }
  var round2 = Q.round2;
  function clampPct(p) { return Math.min(Math.max(num(p), 0), 100); }

  /* Whole invoice. Discount comes off the subtotal, tax applies to the discounted amount,
     "already paid" (e.g. a deposit) is a money amount capped at the total; amount due = total - paid. */
  function computeInvoice(v) {
    var items = (v && v.items) || [];
    var lines = [], subtotal = 0;
    for (var i = 0; i < items.length; i++) {
      var lt = Q.lineTotal(items[i]);
      lines.push({ desc: String(items[i].desc || ""), qty: num(items[i].qty), unit: String(items[i].unit || ""),
                   rate: Math.max(num(items[i].rate), 0), min: Math.max(num(items[i].min), 0), total: lt.total, minApplied: lt.minApplied });
      subtotal += lt.total;
    }
    subtotal = round2(subtotal);
    var discount = round2(subtotal * clampPct(v && v.discountPct) / 100);
    var afterDiscount = round2(subtotal - discount);
    var tax = round2(afterDiscount * clampPct(v && v.taxPct) / 100);
    var total = round2(afterDiscount + tax);
    var paid = round2(Math.min(Math.max(num(v && v.paid), 0), total));
    return { lines: lines, subtotal: subtotal, discount: discount, afterDiscount: afterDiscount, tax: tax, total: total,
             paid: paid, due: round2(total - paid), paidInFull: total > 0 && paid >= total };
  }

  /* Due date = invoice date + net days (calendar days, local time; month/year/leap-year rollover handled by Date). */
  function dueDate(d, netDays) { return Q.addDays(d, Math.max(0, Math.floor(num(netDays)))); }
  function termsLabel(netDays) { var n = Math.max(0, Math.floor(num(netDays))); return n === 0 ? "Due on receipt" : "Net " + n; }

  function invoiceNumber(d, seq) {
    var y = d.getFullYear(), m = ("0" + (d.getMonth() + 1)).slice(-2), day = ("0" + d.getDate()).slice(-2);
    return "INV-" + y + m + day + "-" + ("00" + Math.max(1, Math.floor(num(seq)))).slice(-3);
  }

  /* Map the Quote Maker's saved draft (localStorage "ql.qm.draft") to Invoice Maker fields.
     Customer, line items, discount, tax and notes carry over. A quote deposit % becomes the "already paid"
     amount (the deposit the customer paid to book), which the user can edit. Returns null if there is nothing to import. */
  function importFromQuote(qd) {
    if (!qd || typeof qd !== "object") return null;
    var items = Array.isArray(qd.items) ? qd.items.filter(function (x) { return x && (String(x.desc || "").trim() || num(x.qty) > 0 || num(x.rate) > 0); })
      .map(function (x) { return { desc: String(x.desc || ""), qty: x.qty === undefined ? "" : x.qty, unit: String(x.unit || ""), rate: x.rate === undefined ? "" : x.rate, min: x.min || "" }; }) : [];
    var hasCustomer = ["c-name", "c-address", "c-email", "c-phone"].some(function (k) { return String(qd[k] || "").trim(); });
    if (!items.length && !hasCustomer) return null;
    var qt = Q.computeQuote({ items: items, discountPct: qd["t-discount"], taxPct: qd["t-tax"], depositPct: qd["t-deposit"] });
    var out = {
      "c-name": String(qd["c-name"] || ""), "c-phone": String(qd["c-phone"] || ""), "c-email": String(qd["c-email"] || ""),
      "c-address": String(qd["c-address"] || ""), "c-job": String(qd["c-job"] || ""),
      "t-discount": String(qd["t-discount"] || "0"), "t-taxlabel": String(qd["t-taxlabel"] || "Sales tax"), "t-tax": String(qd["t-tax"] || "0"),
      "t-paid": qt.deposit > 0 ? qt.deposit.toFixed(2) : "0",
      "n-notes": String(qd["n-notes"] || ""),
      "m-ref": String(qd["m-number"] || ""),
      "s-page": qd["s-page"] === "a4" ? "a4" : "letter",
      items: items
    };
    if (qd["s-color"]) out["s-color"] = String(qd["s-color"]);
    return out;
  }

  /* Pro gating: same license cache and states as the Quote Maker. */
  function isPro(licCache, now) { var s = Q.licenseState(licCache, now); return s === "pro" || s === "pro-recheck"; }
  function pdfOptions(pro, chosenColor, defaultColor) {
    return { watermark: !pro, brandColor: pro && /^#[0-9a-f]{6}$/i.test(chosenColor || "") ? chosenColor : defaultColor };
  }

  var api = { TERMS: TERMS, KEYS: KEYS, round2: round2, computeInvoice: computeInvoice, dueDate: dueDate, termsLabel: termsLabel,
              invoiceNumber: invoiceNumber, importFromQuote: importFromQuote, isPro: isPro, pdfOptions: pdfOptions };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.InvoiceCore = api;
})(typeof window !== "undefined" ? window : null);
