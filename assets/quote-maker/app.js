/* Quoteloom Quote Maker UI. All data stays in localStorage on this device. */
(function () {
  var Q = window.QuoteCore, P = window.QuotePdf;
  var cfg = (window.QUOTELOOM_CONFIG && window.QUOTELOOM_CONFIG.quoteTool) || {};
  var PRODUCT_ID = (cfg.gumroadProductId || "").trim();
  var K = { biz: "ql.qm.biz", draft: "ql.qm.draft", tpl: "ql.qm.templates", lic: "ql.qm.license", seq: "ql.qm.seq" };
  var DEFAULT_COLOR = "#1F4E78";
  var DEFAULT_TERMS = "Prices are valid until the date above. Work is scheduled once the quote is accepted (and any deposit is paid). Changes to the scope of work may change the price. Payment is due on completion unless agreed otherwise.";

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

  /* ---------- plan / license ---------- */
  var lic = load(K.lic, null);
  function isPro() { var s = Q.licenseState(lic, Date.now()); return s === "pro" || s === "pro-recheck"; }
  function renderPlan() {
    var pro = isPro();
    $("qm-plan").innerHTML = pro
      ? "<b>Pro is active</b> in this browser. PDFs have no Quoteloom line, templates are unlimited and brand color is unlocked."
      : "<b>Free plan.</b> Unlimited PDF quotes with a small \"Made with Quoteloom\" line, 1 saved template. <a href=\"#pro\">See Pro</a>.";
    $("s-color").disabled = !pro;
    if (!pro) $("s-color").value = DEFAULT_COLOR;
    $("tpl-limit").textContent = String(Q.FREE_TEMPLATE_LIMIT);
    $("l-remove").hidden = !(lic && lic.key);
    if (lic && lic.key) $("l-key").value = lic.key;
    renderTemplates();
  }
  function applyVerify(key, r) {
    var now = Date.now();
    if (r.ok) {
      lic = { key: key, ok: true, checkedAt: now, lastOkAt: now };
      msg("l-msg", "Pro activated. " + (r.reason && r.reason !== "Active" ? r.reason : ""));
    } else if (r.offline && lic && lic.key === key && lic.ok) {
      msg("l-msg", r.reason, true); // keep the earlier good result; grace period applies
    } else {
      lic = { key: key, ok: false, checkedAt: now, lastOkAt: lic && lic.key === key ? lic.lastOkAt || 0 : 0 };
      msg("l-msg", r.reason || "That key did not work.", true);
    }
    save(K.lic, lic); renderPlan();
  }
  function verify(key, quiet) {
    if (!PRODUCT_ID) { msg("l-msg", "Pro is not on sale yet, so there are no keys to check. The free version has every quote feature.", true); return; }
    if (!quiet) msg("l-msg", "Checking with Gumroad…");
    Q.verifyLicense(PRODUCT_ID, key).then(function (r) { if (quiet && r.offline) return; applyVerify(key, r); });
  }

  /* ---------- business profile ---------- */
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

  /* ---------- quote draft ---------- */
  var DRAFT_FIELDS = { "c-name": "", "c-phone": "", "c-email": "", "c-address": "", "c-job": "", "m-number": "", "m-date": "", "m-valid": "30",
    "t-discount": "0", "t-taxlabel": "Sales tax", "t-tax": "0", "t-deposit": "0", "n-notes": "", "n-terms": DEFAULT_TERMS, "s-page": "letter", "s-accept": "1", "s-color": DEFAULT_COLOR };
  var items = [];
  function nextNumber() { var seq = (+load(K.seq, 0) || 0) + 1; save(K.seq, seq); return Q.quoteNumber(new Date(), seq); }
  function readDraft() {
    var d = { items: items };
    for (var id in DRAFT_FIELDS) d[id] = $(id).value;
    return d;
  }
  function saveDraft() { save(K.draft, readDraft()); }
  function fillDraft(d) {
    for (var id in DRAFT_FIELDS) $(id).value = d && d[id] !== undefined ? d[id] : DRAFT_FIELDS[id];
    if (!$("m-date").value) $("m-date").value = iso(new Date());
    if (!$("m-number").value) $("m-number").value = nextNumber();
    if (!isPro()) $("s-color").value = DEFAULT_COLOR;
    items = (d && d.items) ? d.items.map(function (x) { return { desc: x.desc || "", qty: x.qty, unit: x.unit || "", rate: x.rate, min: x.min || "" }; }) : [];
    renderItems();
  }

  function quoteInput() {
    return { items: items, discountPct: $("t-discount").value, taxPct: $("t-tax").value, depositPct: $("t-deposit").value };
  }
  function recalc() {
    var t = Q.computeQuote(quoteInput());
    $("o-sub").textContent = money(t.subtotal); $("o-disc").textContent = "-" + money(t.discount);
    $("o-tax").textContent = money(t.tax); $("o-total").textContent = money(t.total); $("o-dep").textContent = money(t.deposit);
    var cells = document.querySelectorAll("#items tbody td.amt");
    t.lines.forEach(function (l, i) { if (cells[i]) cells[i].innerHTML = money(l.total) + (l.minApplied ? "<small>minimum applied</small>" : ""); });
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

  /* ---------- presets from the free calculators ---------- */
  function numv(id) { return parseFloat($(id).value) || 0; }
  function showTrade() { ["pw", "hc", "lc"].forEach(function (t) { $("p-" + t).hidden = $("p-trade").value !== t; }); }
  function addPreset() {
    var t = $("p-trade").value, add = [];
    if (t === "pw") add = Q.pressureWashItems([0, 1, 2, 3, 4].map(function (i) { return numv("pw" + i); }), window.QuoteloomCalc.PW_SERVICES);
    if (t === "hc") add = Q.houseCleanItems({ service: $("hc-service").value, method: $("hc-method").value, freq: $("hc-freq").value,
      sqft: numv("hc-sqft"), beds: numv("hc-beds"), baths: numv("hc-baths"), addons: [0, 1, 2, 3].map(function (i) { return numv("hc-a" + i); }) });
    if (t === "lc") add = Q.lawnCareItems({ size: numv("lc-size"), unit: $("lc-unit").value, visits: [0, 1, 2, 3, 4, 5].map(function (i) { return numv("lc-v" + i); }) });
    if (!add.length) { msg("p-msg", "Enter at least one size or visit count first.", true); return; }
    add.forEach(function (x) { items.push({ desc: x.desc, qty: x.qty, unit: x.unit, rate: x.rate, min: x.min || "" }); });
    renderItems();
    msg("p-msg", "Added " + add.length + " line" + (add.length > 1 ? "s" : "") + " at example rates. Edit the rates to match your prices.");
  }

  /* ---------- templates ---------- */
  function templates() { return load(K.tpl, []); }
  function renderTemplates() {
    var list = $("tpl-list"), tpls = templates(); list.innerHTML = "";
    if (!tpls.length) { list.innerHTML = "<li class=\"note\">No templates yet.</li>"; return; }
    tpls.forEach(function (tp, i) {
      var li = document.createElement("li"), name = document.createElement("b");
      name.textContent = tp.name + " "; li.appendChild(name);
      var use = document.createElement("button"); use.type = "button"; use.className = "btn"; use.textContent = "Use";
      use.addEventListener("click", function () {
        var d = readDraft();
        ["t-discount", "t-taxlabel", "t-tax", "t-deposit", "n-notes", "n-terms"].forEach(function (k) { if (tp.data[k] !== undefined) d[k] = tp.data[k]; });
        d.items = JSON.parse(JSON.stringify(tp.data.items || []));
        fillDraft(d); msg("a-msg", "Loaded template \"" + tp.name + "\".");
      });
      var del = document.createElement("button"); del.type = "button"; del.className = "link"; del.textContent = "Delete";
      del.addEventListener("click", function () { var a = templates(); a.splice(i, 1); save(K.tpl, a); renderTemplates(); });
      li.appendChild(use); li.appendChild(document.createTextNode(" ")); li.appendChild(del); list.appendChild(li);
    });
  }
  function saveTemplate() {
    var tpls = templates(), name = $("tpl-name").value.trim() || ("Template " + (tpls.length + 1));
    var existing = -1; tpls.forEach(function (t, i) { if (t.name === name) existing = i; });
    if (existing < 0 && !Q.canSaveTemplate(isPro(), tpls.length)) {
      msg("a-msg", "The free plan keeps " + Q.FREE_TEMPLATE_LIMIT + " template. Delete it, save over it with the same name, or upgrade to Pro for unlimited templates.", true);
      $("tpl-box").open = true; return;
    }
    var d = readDraft(), data = { items: JSON.parse(JSON.stringify(items)) };
    ["t-discount", "t-taxlabel", "t-tax", "t-deposit", "n-notes", "n-terms"].forEach(function (k) { data[k] = d[k]; });
    var tp = { name: name, data: data, savedAt: Date.now() };
    if (existing >= 0) tpls[existing] = tp; else tpls.push(tp);
    if (save(K.tpl, tpls)) { $("tpl-name").value = ""; renderTemplates(); msg("a-msg", "Saved template \"" + name + "\"."); }
  }

  /* ---------- PDF ---------- */
  function downloadPdf() {
    readBiz();
    var t = recalc();
    if (!t.lines.length) { msg("a-msg", "Add at least one line item first.", true); return; }
    if (!window.jspdf || !window.jspdf.jsPDF) { msg("a-msg", "The PDF library did not load. Reload the page and try again.", true); return; }
    var date = parseISO($("m-date").value), valid = parseInt($("m-valid").value, 10);
    var pro = isPro();
    var doc = P.buildQuotePdf(window.jspdf.jsPDF, {
      biz: biz,
      customer: { name: $("c-name").value.trim(), phone: $("c-phone").value.trim(), email: $("c-email").value.trim(), address: $("c-address").value.trim(), job: $("c-job").value.trim() },
      meta: { number: $("m-number").value.trim(), date: pretty(date), validUntil: valid > 0 ? pretty(Q.addDays(date, valid)) : "" },
      totals: t, discountPct: $("t-discount").value, taxPct: $("t-tax").value, depositPct: $("t-deposit").value, taxLabel: $("t-taxlabel").value.trim(),
      notes: $("n-notes").value.trim(), terms: $("n-terms").value.trim(), acceptLine: $("s-accept").value === "1",
      pageSize: $("s-page").value, brandColor: pro ? $("s-color").value : DEFAULT_COLOR, watermark: !pro
    });
    var safe = ($("m-number").value.trim() || "quote").replace(/[^A-Za-z0-9_-]+/g, "-");
    var cust = $("c-name").value.trim().replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
    doc.save(safe + (cust ? "-" + cust : "") + ".pdf");
    msg("a-msg", "PDF downloaded." + (pro ? "" : " Free PDFs include a small \"Made with Quoteloom\" line."));
  }

  function loadSample() {
    if (items.length && !confirm("Replace the current line items with sample data?")) return;
    if (!biz.name) {
      biz = { name: "Sample Pressure Washing Co. (example)", contact: "Alex Example", phone: "(555) 010-0000", email: "hello@example.com",
              website: "example.com", license: "Example data: replace with your details", address: "123 Example St, Anytown, USA" };
      save(K.biz, biz); fillBiz();
    }
    fillDraft({ "c-name": "Jordan Sample (example customer)", "c-address": "456 Sample Ave, Anytown, USA", "c-email": "jordan@example.com",
      "c-job": "House wash and driveway (sample data)", "m-number": $("m-number").value, "m-date": $("m-date").value, "s-color": $("s-color").value, "s-page": $("s-page").value, "s-accept": $("s-accept").value, "t-tax": "0", "t-deposit": "25",
      "n-notes": "Sample quote made with example rates from the Quoteloom pressure washing calculator.", "n-terms": DEFAULT_TERMS,
      items: Q.pressureWashItems([2400, 600, 0, 0, 0], window.QuoteloomCalc.PW_SERVICES).map(function (x) { return { desc: x.desc, qty: x.qty, unit: x.unit, rate: x.rate, min: x.min }; }) });
    msg("a-msg", "Sample data loaded (clearly marked as example). Replace it with your own before sending a quote.");
  }

  function nextQuote() {
    ["c-name", "c-phone", "c-email", "c-address", "c-job"].forEach(function (id) { $(id).value = ""; });
    $("m-number").value = nextNumber(); $("m-date").value = iso(new Date());
    saveDraft(); msg("a-msg", "New quote number set. Customer cleared; line items kept so you can edit them.");
  }

  function init() {
    fillBiz(); fillDraft(load(K.draft, null)); renderPlan(); showTrade();
    BIZ.forEach(function (f) { $("b-" + f).addEventListener("input", readBiz); });
    $("b-logo").addEventListener("change", onLogo);
    $("b-logo-clear").addEventListener("click", function () { delete biz.logo; delete biz.logoW; delete biz.logoH; $("b-logo").value = ""; save(K.biz, biz); fillBiz(); });
    $("b-clear").addEventListener("click", function () { if (confirm("Clear your saved business profile from this browser?")) { biz = {}; save(K.biz, biz); fillBiz(); } });
    Object.keys(DRAFT_FIELDS).forEach(function (id) { $(id).addEventListener("input", recalc); $(id).addEventListener("change", recalc); });
    $("p-trade").addEventListener("change", showTrade);
    $("p-add").addEventListener("click", addPreset);
    $("i-add").addEventListener("click", function () { items.push({ desc: "", qty: 1, unit: "job", rate: "", min: "" }); renderItems(); });
    $("i-clear").addEventListener("click", function () { if (!items.length || confirm("Remove all line items?")) { items = []; renderItems(); } });
    $("a-pdf").addEventListener("click", downloadPdf);
    $("a-next").addEventListener("click", nextQuote);
    $("a-sample").addEventListener("click", loadSample);
    $("tpl-save").addEventListener("click", saveTemplate);
    $("l-verify").addEventListener("click", function () { var k = $("l-key").value.trim(); if (k) verify(k, false); else msg("l-msg", "Paste your license key first.", true); });
    $("l-remove").addEventListener("click", function () { lic = null; localStorage.removeItem(K.lic); $("l-key").value = ""; msg("l-msg", "License key removed from this browser."); renderPlan(); });
    // Re-check a saved key with Gumroad every few days (catches ended or refunded memberships).
    if (lic && lic.key && Q.licenseState(lic, Date.now()) !== "pro") verify(lic.key, true);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
