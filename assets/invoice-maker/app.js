/* Quoteloom Invoice Maker UI. All data stays in localStorage on this device.
   Business profile and Pro license are shared with the Quote Maker (same keys). */
(function () {
  var Q = window.QuoteCore, I = window.InvoiceCore, P = window.InvoicePdf;
  var cfg = (window.QUOTELOOM_CONFIG && window.QUOTELOOM_CONFIG.quoteTool) || {};
  var PRODUCT_ID = (cfg.gumroadProductId || "").trim();
  var K = I.KEYS;
  var DEFAULT_COLOR = "#1F4E78";
  var DEFAULT_TERMS = "Payment is due by the date shown above. Please include the invoice number with your payment. Changes to the scope of work may change the amount. This invoice is a billing document only; it is not tax, legal or accounting advice.";

  function $(id) { return document.getElementById(id); }
  function load(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v === null || v === undefined ? d : v; } catch (e) { return d; } }
  function save(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); return true; }
    catch (e) { msg("a-msg", "Could not save in this browser (storage full or blocked). Try a smaller logo.", true); return false; }
  }
  function msg(id, text, err) { var el = $(id); el.textContent = text || ""; el.className = "note" + (err ? " qm-msg-err" : ""); }
  function money(x) { return "$" + (Number(x) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function iso(d) { return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
  function pretty(d) { return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }); }
  function parseISO(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ""); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(); }

  /* ---------- plan / license (shared with Quote Maker) ---------- */
  var lic = load(K.lic, null);
  function isPro() { return I.isPro(lic, Date.now()); }
  function renderPlan() {
    var pro = isPro();
    $("qm-plan").innerHTML = pro
      ? "<b>Pro is active</b> in this browser. Invoice PDFs have no Quoteloom line and brand color is unlocked. The same key also unlocks the <a href=\"/quote-maker/\">Quote Maker</a>."
      : "<b>Free plan.</b> Unlimited PDF invoices with a small \"Made with Quoteloom\" line. <a href=\"#pro\">See Pro</a>.";
    $("s-color").disabled = !pro;
    if (!pro) $("s-color").value = DEFAULT_COLOR;
    $("l-remove").hidden = !(lic && lic.key);
    if (lic && lic.key) $("l-key").value = lic.key;
  }
  function applyVerify(key, r) {
    var now = Date.now();
    if (r.ok) {
      lic = { key: key, ok: true, checkedAt: now, lastOkAt: now };
      msg("l-msg", "Pro activated. " + (r.reason && r.reason !== "Active" ? r.reason : ""));
    } else if (r.offline && lic && lic.key === key && lic.ok) {
      msg("l-msg", r.reason, true);
    } else {
      lic = { key: key, ok: false, checkedAt: now, lastOkAt: lic && lic.key === key ? lic.lastOkAt || 0 : 0 };
      msg("l-msg", r.reason || "That key did not work.", true);
    }
    save(K.lic, lic); renderPlan();
  }
  function verify(key, quiet) {
    if (!PRODUCT_ID) { msg("l-msg", "Pro is not on sale yet, so there are no keys to check. The free version has every invoice feature.", true); return; }
    if (!quiet) msg("l-msg", "Checking with Gumroad…");
    Q.verifyLicense(PRODUCT_ID, key).then(function (r) { if (quiet && r.offline) return; applyVerify(key, r); });
  }

  /* ---------- business profile (shared with Quote Maker) ---------- */
  var BIZ = ["name", "contact", "phone", "email", "website", "license", "address"];
  var biz = load(K.biz, {});
  function fillBiz() {
    BIZ.forEach(function (f) { $("b-" + f).value = biz[f] || ""; });
    var img = $("b-logo-prev");
    if (biz.logo) { img.src = biz.logo; img.hidden = false; $("b-logo-clear").hidden = false; }
    else { img.removeAttribute("src"); img.hidden = true; $("b-logo-clear").hidden = true; }
  }
  function readBiz() { BIZ.forEach(function (f) { biz[f] = $("b-" + f).value.trim(); }); save(K.biz, biz); }
  function onLogo(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!/^image\/(png|jpeg)$/.test(file.type)) { msg("a-msg", "Please choose a PNG or JPG logo.", true); return; }
    var fr = new FileReader();
    fr.onload = function () {
      var im = new Image();
      im.onload = function () {
        var max = 600, s = Math.min(1, max / Math.max(im.width, im.height));
        var c = document.createElement("canvas"); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
        var ctx = c.getContext("2d");
        var png = file.type === "image/png";
        if (!png) { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); }
        ctx.drawImage(im, 0, 0, c.width, c.height);
        biz.logo = png ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", 0.9);
        biz.logoW = c.width; biz.logoH = c.height;
        if (save(K.biz, biz)) fillBiz();
      };
      im.src = fr.result;
    };
    fr.readAsDataURL(file);
  }

  /* ---------- invoice draft ---------- */
  var DRAFT_FIELDS = { "c-name": "", "c-phone": "", "c-email": "", "c-address": "", "c-job": "",
    "m-number": "", "m-date": "", "m-terms": "0", "m-ref": "",
    "t-discount": "0", "t-taxlabel": "Sales tax", "t-tax": "0", "t-paid": "0",
    "n-notes": "", "n-terms": DEFAULT_TERMS, "s-page": "letter", "s-color": DEFAULT_COLOR };
  var items = [];
  function nextNumber() { var seq = (+load(K.seq, 0) || 0) + 1; save(K.seq, seq); return I.invoiceNumber(new Date(), seq); }
  function readDraft() {
    var d = { items: items };
    for (var id in DRAFT_FIELDS) d[id] = $(id).value;
    return d;
  }
  function saveDraft() { save(K.draft, readDraft()); }
  function fillDraft(d) {
    for (var id in DRAFT_FIELDS) $(id).value = d && d[id] !== undefined && d[id] !== "" ? d[id] : (id === "n-terms" && !(d && d[id]) ? DEFAULT_TERMS : (d && d[id] !== undefined ? d[id] : DRAFT_FIELDS[id]));
    if (!$("m-date").value) $("m-date").value = iso(new Date());
    if (!$("m-number").value) $("m-number").value = nextNumber();
    if (!isPro()) $("s-color").value = DEFAULT_COLOR;
    items = (d && d.items) ? d.items.map(function (x) { return { desc: x.desc || "", qty: x.qty, unit: x.unit || "", rate: x.rate, min: x.min || "" }; }) : [];
    renderItems();
  }
  function invoiceInput() {
    return { items: items, discountPct: $("t-discount").value, taxPct: $("t-tax").value, paid: $("t-paid").value };
  }
  function updateDue() {
    var date = parseISO($("m-date").value), net = $("m-terms").value;
    var due = I.dueDate(date, net);
    $("o-duedate").textContent = pretty(due) + " (" + I.termsLabel(net) + ")";
    return due;
  }
  function recalc() {
    var t = I.computeInvoice(invoiceInput());
    $("o-sub").textContent = money(t.subtotal); $("o-disc").textContent = "-" + money(t.discount);
    $("o-tax").textContent = money(t.tax); $("o-total").textContent = money(t.total);
    $("o-paid").textContent = money(t.paid); $("o-due").textContent = t.paidInFull ? "Paid in full" : money(t.due);
    var cells = document.querySelectorAll("#items tbody td.amt");
    t.lines.forEach(function (l, i) { if (cells[i]) cells[i].innerHTML = money(l.total) + (l.minApplied ? "<small>minimum applied</small>" : ""); });
    updateDue();
    saveDraft();
    return t;
  }
  function renderItems() {
    var tb = document.querySelector("#items tbody"); tb.innerHTML = "";
    items.forEach(function (it, i) {
      var tr = document.createElement("tr");
      [["desc", "c-desc", "text"], ["qty", "c-num", "number"], ["unit", "c-unit", "text"], ["rate", "c-num", "number"], ["min", "c-num", "number"]].forEach(function (c) {
        var td = document.createElement("td"), inp = document.createElement("input");
        inp.type = c[2]; inp.className = c[1]; inp.value = it[c[0]] === undefined ? "" : it[c[0]];
        if (c[2] === "number") { inp.min = "0"; inp.step = "any"; inp.inputMode = "decimal"; }
        inp.setAttribute("aria-label", c[0] + " for line " + (i + 1));
        inp.addEventListener("input", function () { it[c[0]] = inp.value; recalc(); });
        td.appendChild(inp); tr.appendChild(td);
      });
      var amt = document.createElement("td"); amt.className = "amt"; tr.appendChild(amt);
      var del = document.createElement("td"), b = document.createElement("button");
      b.type = "button"; b.className = "link"; b.textContent = "Remove"; b.addEventListener("click", function () { items.splice(i, 1); renderItems(); });
      del.appendChild(b); tr.appendChild(del); tb.appendChild(tr);
    });
    recalc();
  }

  function importQuote() {
    var qd = load(K.quoteDraft, null);
    var imp = I.importFromQuote(qd);
    if (!imp) { msg("a-msg", "No quote found in this browser. Make one in the Quote Maker first (it is saved automatically), then come back and import it.", true); return; }
    if (items.length && !confirm("Replace the current line items and customer with the saved Quote Maker draft?")) return;
    imp["m-number"] = $("m-number").value;
    imp["m-date"] = $("m-date").value || iso(new Date());
    if (!imp["m-terms"]) imp["m-terms"] = $("m-terms").value || "0";
    if (!imp["n-terms"]) imp["n-terms"] = $("n-terms").value || DEFAULT_TERMS;
    fillDraft(imp);
    msg("a-msg", "Imported the saved quote. The \"already paid\" amount is the quote's deposit, which you can edit. Check every line before you send this.");
  }

  function downloadPdf() {
    readBiz();
    var t = recalc();
    if (!t.lines.length) { msg("a-msg", "Add at least one line item first.", true); return; }
    if (!window.jspdf || !window.jspdf.jsPDF) { msg("a-msg", "The PDF library did not load. Reload the page and try again.", true); return; }
    var date = parseISO($("m-date").value), due = I.dueDate(date, $("m-terms").value);
    var opt = I.pdfOptions(isPro(), $("s-color").value, DEFAULT_COLOR);
    var doc = P.buildInvoicePdf(window.jspdf.jsPDF, {
      biz: biz,
      customer: { name: $("c-name").value.trim(), phone: $("c-phone").value.trim(), email: $("c-email").value.trim(), address: $("c-address").value.trim(), job: $("c-job").value.trim() },
      meta: { number: $("m-number").value.trim(), date: pretty(date), due: pretty(due), terms: I.termsLabel($("m-terms").value), ref: $("m-ref").value.trim() },
      totals: t, discountPct: $("t-discount").value, taxPct: $("t-tax").value, taxLabel: $("t-taxlabel").value.trim(),
      notes: $("n-notes").value.trim(), terms: $("n-terms").value.trim(),
      pageSize: $("s-page").value, brandColor: opt.brandColor, watermark: opt.watermark
    });
    var safe = ($("m-number").value.trim() || "invoice").replace(/[^A-Za-z0-9_-]+/g, "-");
    var cust = $("c-name").value.trim().replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
    doc.save(safe + (cust ? "-" + cust : "") + ".pdf");
    msg("a-msg", "PDF downloaded." + (opt.watermark ? " Free PDFs include a small \"Made with Quoteloom\" line." : ""));
  }

  function loadSample() {
    if (items.length && !confirm("Replace the current line items with sample data?")) return;
    if (!biz.name) {
      biz = { name: "Sample Pressure Washing Co. (example)", contact: "Alex Example", phone: "(555) 010-0000", email: "hello@example.com",
              website: "example.com", license: "Example data: replace with your details", address: "123 Example St, Anytown, USA" };
      save(K.biz, biz); fillBiz();
    }
    var sampleItems = Q.pressureWashItems([2400, 600, 0, 0, 0], window.QuoteloomCalc.PW_SERVICES).map(function (x) {
      return { desc: x.desc, qty: x.qty, unit: x.unit, rate: x.rate, min: x.min };
    });
    var dep = Q.computeQuote({ items: sampleItems, depositPct: 25 }).deposit;
    fillDraft({ "c-name": "Jordan Sample (example customer)", "c-address": "456 Sample Ave, Anytown, USA", "c-email": "jordan@example.com",
      "c-job": "House wash and driveway (sample data)", "m-number": $("m-number").value, "m-date": $("m-date").value, "m-terms": "14",
      "m-ref": "Q-EXAMPLE", "s-color": $("s-color").value, "s-page": $("s-page").value, "t-tax": "0", "t-paid": dep.toFixed(2),
      "n-notes": "Sample invoice made with example rates from the Quoteloom pressure washing calculator. The already-paid amount is a 25% deposit from the sample quote.",
      "n-terms": DEFAULT_TERMS, items: sampleItems });
    msg("a-msg", "Sample data loaded (clearly marked as example). Replace it with your own before sending an invoice.");
  }

  function nextInvoice() {
    ["c-name", "c-phone", "c-email", "c-address", "c-job", "m-ref"].forEach(function (id) { $(id).value = ""; });
    $("m-number").value = nextNumber(); $("m-date").value = iso(new Date()); $("t-paid").value = "0";
    saveDraft(); recalc(); msg("a-msg", "New invoice number set. Customer and amount already paid cleared; line items kept so you can edit them.");
  }

  function init() {
    I.TERMS.forEach(function (d) {
      var o = document.createElement("option"); o.value = String(d); o.textContent = I.termsLabel(d);
      $("m-terms").appendChild(o);
    });
    fillBiz(); fillDraft(load(K.draft, null)); renderPlan();
    BIZ.forEach(function (f) { $("b-" + f).addEventListener("input", readBiz); });
    $("b-logo").addEventListener("change", onLogo);
    $("b-logo-clear").addEventListener("click", function () { delete biz.logo; delete biz.logoW; delete biz.logoH; $("b-logo").value = ""; save(K.biz, biz); fillBiz(); });
    $("b-clear").addEventListener("click", function () { if (confirm("Clear your saved business profile from this browser? This also clears it in the Quote Maker.")) { biz = {}; save(K.biz, biz); fillBiz(); } });
    Object.keys(DRAFT_FIELDS).forEach(function (id) { $(id).addEventListener("input", recalc); $(id).addEventListener("change", recalc); });
    $("i-add").addEventListener("click", function () { items.push({ desc: "", qty: 1, unit: "job", rate: "", min: "" }); renderItems(); });
    $("i-clear").addEventListener("click", function () { if (!items.length || confirm("Remove all line items?")) { items = []; renderItems(); } });
    $("a-import").addEventListener("click", importQuote);
    $("a-pdf").addEventListener("click", downloadPdf);
    $("a-next").addEventListener("click", nextInvoice);
    $("a-sample").addEventListener("click", loadSample);
    $("l-verify").addEventListener("click", function () { var k = $("l-key").value.trim(); if (k) verify(k, false); else msg("l-msg", "Paste your license key first.", true); });
    $("l-remove").addEventListener("click", function () { lic = null; localStorage.removeItem(K.lic); $("l-key").value = ""; msg("l-msg", "License key removed from this browser."); renderPlan(); });
    if (lic && lic.key && Q.licenseState(lic, Date.now()) !== "pro") verify(lic.key, true);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
