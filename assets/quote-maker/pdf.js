/* Quoteloom Quote Maker: draws the quote PDF with jsPDF (bundled locally at /assets/vendor/jspdf.umd.min.js).
   d = { biz, customer, meta, totals (from QuoteCore.computeQuote), notes, terms, brandColor, watermark } */
(function (root) {
  function hexToRgb(h) {
    var m = /^#?([0-9a-f]{6})$/i.exec(h || "");
    var n = m ? parseInt(m[1], 16) : 0x1F4E78;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function money(x, cur) { return (cur || "$") + (Number(x) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function rateFmt(x, cur) { return (cur || "$") + (Number(x) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 }); }
  function qty(x) { return (Math.round((Number(x) || 0) * 100) / 100).toLocaleString("en-US"); }

  function buildQuotePdf(JsPDF, d) {
    var doc = new JsPDF({ unit: "pt", format: d.pageSize === "a4" ? "a4" : "letter" });
    var W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
    var M = 48, y = M, brand = hexToRgb(d.brandColor), cur = d.currency || "$";
    var ink = [29, 39, 51], muted = [90, 103, 115];
    doc.setProperties({ title: "Quote " + (d.meta.number || ""), creator: "Quoteloom Quote Maker" });

    function footer() {
      doc.setFontSize(8); doc.setTextColor(muted[0], muted[1], muted[2]);
      if (d.watermark) doc.text("Made with Quoteloom · quoteloom.github.io/quote-maker", W / 2, H - 24, { align: "center" });
    }
    function newPageIfNeeded(h) {
      if (y + h > H - 60) { footer(); doc.addPage(); y = M; return true; }
      return false;
    }

    // Header: logo (left), business block (right)
    doc.setFillColor(brand[0], brand[1], brand[2]); doc.rect(0, 0, W, 6, "F");
    var logoH = 0;
    if (d.biz.logo && d.biz.logoW && d.biz.logoH) {
      var maxW = 150, maxH = 64, s = Math.min(maxW / d.biz.logoW, maxH / d.biz.logoH, 1);
      var lw = d.biz.logoW * s, lh = d.biz.logoH * s;
      try { doc.addImage(d.biz.logo, d.biz.logo.indexOf("image/png") > 0 ? "PNG" : "JPEG", M, y, lw, lh); logoH = lh; } catch (e) { logoH = 0; }
    }
    var rx = W - M, ry = y + 4;
    doc.setTextColor(ink[0], ink[1], ink[2]); doc.setFont("helvetica", "bold"); doc.setFontSize(14);
    doc.text(d.biz.name || "Your business", rx, ry + 8, { align: "right" }); ry += 24;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(muted[0], muted[1], muted[2]);
    [d.biz.contact, d.biz.address, d.biz.phone, d.biz.email, d.biz.website, d.biz.license].forEach(function (line) {
      if (line) { doc.splitTextToSize(String(line), 230).forEach(function (t) { doc.text(t, rx, ry, { align: "right" }); ry += 12; }); }
    });
    y = Math.max(y + logoH, ry) + 18;

    // Title + meta
    doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.setTextColor(brand[0], brand[1], brand[2]);
    doc.text("QUOTE", M, y + 10);
    doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(ink[0], ink[1], ink[2]);
    var meta = [["Quote #", d.meta.number], ["Date", d.meta.date], ["Valid until", d.meta.validUntil]];
    var my = y;
    meta.forEach(function (m) {
      if (!m[1]) return;
      doc.setTextColor(muted[0], muted[1], muted[2]); doc.text(m[0], W - M - 150, my);
      doc.setTextColor(ink[0], ink[1], ink[2]); doc.text(String(m[1]), W - M, my, { align: "right" }); my += 13;
    });
    y = Math.max(y + 30, my + 6);

    // Prepared for
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(muted[0], muted[1], muted[2]);
    doc.text("PREPARED FOR", M, y); y += 13;
    doc.setFont("helvetica", "normal"); doc.setTextColor(ink[0], ink[1], ink[2]); doc.setFontSize(10);
    [d.customer.name, d.customer.address, d.customer.phone, d.customer.email].forEach(function (line) {
      if (line) { doc.splitTextToSize(String(line), 300).forEach(function (t) { doc.text(t, M, y); y += 13; }); }
    });
    if (d.customer.job) { doc.setTextColor(muted[0], muted[1], muted[2]); doc.splitTextToSize("Job: " + d.customer.job, W - 2 * M).forEach(function (t) { doc.text(t, M, y); y += 13; }); }
    y += 12;

    // Line items table
    var cols = { desc: M + 8, qty: W - M - 220, unit: W - M - 170, rate: W - M - 80, amt: W - M - 8 };
    function tableHeader() {
      doc.setFillColor(brand[0], brand[1], brand[2]); doc.rect(M, y, W - 2 * M, 20, "F");
      doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
      doc.text("Description", cols.desc, y + 13); doc.text("Qty", cols.qty, y + 13, { align: "right" });
      doc.text("Unit", cols.unit, y + 13); doc.text("Rate", cols.rate, y + 13, { align: "right" });
      doc.text("Amount", cols.amt, y + 13, { align: "right" });
      y += 20; doc.setFont("helvetica", "normal"); doc.setTextColor(ink[0], ink[1], ink[2]);
    }
    tableHeader();
    var t = d.totals;
    t.lines.forEach(function (l, i) {
      var descLines = doc.splitTextToSize(l.desc || "", cols.qty - cols.desc - 40);
      if (l.minApplied) descLines.push("Minimum charge applied");
      var h = Math.max(20, descLines.length * 12 + 8);
      if (newPageIfNeeded(h + 4)) tableHeader();
      if (i % 2 === 1) { doc.setFillColor(244, 248, 251); doc.rect(M, y, W - 2 * M, h, "F"); }
      doc.setFontSize(9); doc.setTextColor(ink[0], ink[1], ink[2]);
      descLines.forEach(function (s, k) {
        if (l.minApplied && k === descLines.length - 1) doc.setTextColor(muted[0], muted[1], muted[2]);
        doc.text(s, cols.desc, y + 13 + k * 12);
      });
      doc.setTextColor(ink[0], ink[1], ink[2]);
      doc.text(qty(l.qty), cols.qty, y + 13, { align: "right" });
      doc.text(String(l.unit || "").slice(0, 14), cols.unit, y + 13);
      doc.text(rateFmt(l.rate, cur), cols.rate, y + 13, { align: "right" });
      doc.text(money(l.total, cur), cols.amt, y + 13, { align: "right" });
      y += h;
    });
    doc.setDrawColor(214, 226, 236); doc.line(M, y, W - M, y); y += 14;

    // Totals
    var rows = [["Subtotal", t.subtotal]];
    if (t.discount > 0) rows.push(["Discount (" + d.discountPct + "%)", -t.discount]);
    if (t.tax > 0) rows.push([(d.taxLabel || "Tax") + " (" + d.taxPct + "%)", t.tax]);
    newPageIfNeeded(rows.length * 15 + 60);
    doc.setFontSize(10);
    rows.forEach(function (r) {
      doc.setTextColor(muted[0], muted[1], muted[2]); doc.text(r[0], W - M - 170, y);
      doc.setTextColor(ink[0], ink[1], ink[2]); doc.text((r[1] < 0 ? "-" : "") + money(Math.abs(r[1]), cur), W - M - 8, y, { align: "right" }); y += 15;
    });
    doc.setFillColor(brand[0], brand[1], brand[2]); doc.rect(W - M - 180, y - 4, 180, 24, "F");
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.text("Total", W - M - 170, y + 12); doc.text(money(t.total, cur), W - M - 8, y + 12, { align: "right" });
    y += 34; doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(ink[0], ink[1], ink[2]);
    if (t.deposit > 0) {
      doc.text("Deposit due to book (" + d.depositPct + "%): " + money(t.deposit, cur), W - M - 8, y, { align: "right" }); y += 14;
      doc.setTextColor(muted[0], muted[1], muted[2]);
      doc.text("Balance on completion: " + money(t.balance, cur), W - M - 8, y, { align: "right" }); y += 14;
    }
    y += 10;

    // Notes / terms
    [["Notes", d.notes], ["Terms", d.terms]].forEach(function (blk) {
      if (!blk[1]) return;
      var lines = doc.splitTextToSize(String(blk[1]), W - 2 * M);
      newPageIfNeeded(30);
      doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(muted[0], muted[1], muted[2]);
      doc.text(blk[0].toUpperCase(), M, y); y += 13;
      doc.setFont("helvetica", "normal"); doc.setTextColor(ink[0], ink[1], ink[2]);
      lines.forEach(function (s) { newPageIfNeeded(13); doc.text(s, M, y); y += 12; });
      y += 10;
    });

    if (d.acceptLine) {
      newPageIfNeeded(50); y += 16;
      doc.setDrawColor(150, 160, 170); doc.line(M, y, M + 220, y); doc.line(W - M - 160, y, W - M, y);
      doc.setFontSize(8); doc.setTextColor(muted[0], muted[1], muted[2]);
      doc.text("Customer acceptance (signature)", M, y + 11); doc.text("Date", W - M - 160, y + 11);
    }
    footer();
    var pages = doc.getNumberOfPages();
    if (pages > 1) for (var p = 1; p <= pages; p++) { doc.setPage(p); doc.setFontSize(8); doc.setTextColor(muted[0], muted[1], muted[2]); doc.text("Page " + p + " of " + pages, W - M, H - 24, { align: "right" }); }
    return doc;
  }

  var api = { buildQuotePdf: buildQuotePdf, money: money };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) root.QuotePdf = api;
})(typeof window !== "undefined" ? window : null);
