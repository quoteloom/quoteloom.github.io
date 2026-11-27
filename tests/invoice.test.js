/* Invoice Maker math tests: node tests/invoice.test.js */
const I = require("../assets/invoice-maker/invoice-core.js");
const Q = require("../assets/quote-maker/quote-core.js");
let n = 0, fail = 0;
function eq(name, got, exp, tol = 1e-9) {
  n++;
  const ok = typeof exp === "number" ? Math.abs(got - exp) <= tol : JSON.stringify(got) === JSON.stringify(exp);
  if (!ok) { fail++; console.log(`FAIL ${name}: got ${JSON.stringify(got)} expected ${JSON.stringify(exp)}`); }
}

// Reuse the quote fixture: 10% off, 8.25% tax, then a $165.62 deposit already paid.
const items = [
  { desc: "House wash", qty: 2400, rate: 0.2, min: 250, unit: "sq ft" },
  { desc: "Driveway", qty: 600, rate: 0.18, min: 150, unit: "sq ft" },
  { desc: "Travel", qty: 1, rate: 49.99, unit: "job" }
];
const q1 = Q.computeQuote({ items, discountPct: 10, taxPct: 8.25, depositPct: 25 });
const i1 = I.computeInvoice({ items, discountPct: 10, taxPct: 8.25, paid: q1.deposit });
eq("i1 subtotal matches quote", i1.subtotal, q1.subtotal);
eq("i1 discount", i1.discount, q1.discount);
eq("i1 tax", i1.tax, q1.tax);
eq("i1 total", i1.total, q1.total);
eq("i1 paid", i1.paid, q1.deposit);
eq("i1 due", i1.due, q1.balance);
eq("i1 not paid in full", i1.paidInFull, false);
eq("i1 line 2 min", i1.lines[1].minApplied, true);

const empty = I.computeInvoice({ items: [], discountPct: 50, taxPct: 10, paid: 20 });
eq("empty total", empty.total, 0);
eq("empty paid capped", empty.paid, 0);
eq("empty due", empty.due, 0);
eq("empty not paid in full (no invoice)", empty.paidInFull, false);

const i2 = I.computeInvoice({ items: [{ qty: 1, rate: 100 }], discountPct: 150, taxPct: -5, paid: 200 });
eq("pct clamp discount", i2.discount, 100);
eq("pct clamp tax", i2.tax, 0);
eq("paid capped at total", i2.paid, 0); // total is 0 after 100% discount
eq("paid cap due", i2.due, 0);

const i3 = I.computeInvoice({ items: [{ qty: 1, rate: 100 }], paid: 100 });
eq("paid in full", i3.paidInFull, true);
eq("paid in full due", i3.due, 0);

const i4 = I.computeInvoice({ items: [{ qty: 1, rate: 80 }], paid: -10 });
eq("negative paid -> 0", i4.paid, 0);
eq("negative paid due", i4.due, 80);

const i5 = I.computeInvoice({ items: [{ qty: 1, rate: 80 }], paid: "25.50" });
eq("paid from text", i5.paid, 25.5);
eq("due from text paid", i5.due, 54.5);

for (let s = 1; s <= 50; s++) {
  const its = Array.from({ length: (s % 7) + 1 }, (_, i) => ({ qty: ((s * 7 + i * 13) % 97) / 4, rate: ((s * 31 + i * 17) % 113) / 3 }));
  const r = I.computeInvoice({ items: its, discountPct: s % 20, taxPct: (s % 9) * 1.125, paid: s * 1.37 });
  eq(`fuzz ${s} subtotal = sum`, r.subtotal, I.round2(r.lines.reduce((a, l) => a + l.total, 0)), 1e-9);
  eq(`fuzz ${s} due`, r.due, I.round2(r.total - r.paid), 1e-9);
  eq(`fuzz ${s} paid <= total`, r.paid <= r.total, true);
  eq(`fuzz ${s} cents`, Math.round(r.due * 100) / 100, r.due, 1e-12);
}

// Dates and labels (local calendar, not UTC)
function ymd(d) { return [d.getFullYear(), d.getMonth() + 1, d.getDate()]; }
eq("due 0 days", ymd(I.dueDate(new Date(2026, 10, 27), 0)), [2026, 11, 27]);
eq("due 30 days month rollover", ymd(I.dueDate(new Date(2026, 0, 31), 30)), [2026, 3, 2]); // Jan 31 + 30 = Mar 2 2026
eq("due leap year", ymd(I.dueDate(new Date(2028, 1, 28), 1)), [2028, 2, 29]);
eq("due after Feb 29", ymd(I.dueDate(new Date(2028, 1, 29), 1)), [2028, 3, 1]);
eq("terms 0", I.termsLabel(0), "Due on receipt");
eq("terms 30", I.termsLabel(30), "Net 30");
eq("terms text", I.termsLabel("14"), "Net 14");
eq("terms negative -> 0", I.termsLabel(-5), "Due on receipt");

eq("invoice number", I.invoiceNumber(new Date(2026, 10, 27), 7), "INV-20261127-007");
eq("invoice number seq 1", I.invoiceNumber(new Date(2026, 0, 1), 1), "INV-20260101-001");

// importFromQuote
eq("import empty object", I.importFromQuote({}), null);
eq("import null", I.importFromQuote(null), null);
const qd = {
  "c-name": "Jordan Sample", "c-address": "456 Sample Ave", "c-email": "jordan@example.com", "c-phone": "555",
  "c-job": "House wash", "m-number": "Q-20261127-001",
  "t-discount": "10", "t-taxlabel": "Sales tax", "t-tax": "8.25", "t-deposit": "25",
  "n-notes": "After the quote.", "s-page": "a4", "s-color": "#224466",
  items: items
};
const imp = I.importFromQuote(qd);
eq("import name", imp["c-name"], "Jordan Sample");
eq("import job", imp["c-job"], "House wash");
eq("import items", imp.items.length, 3);
eq("import discount", imp["t-discount"], "10");
eq("import tax", imp["t-tax"], "8.25");
eq("import paid = quote deposit", imp["t-paid"], q1.deposit.toFixed(2));
eq("import ref = quote #", imp["m-ref"], "Q-20261127-001");
eq("import page", imp["s-page"], "a4");
eq("import color", imp["s-color"], "#224466");
eq("import drops empty lines", I.importFromQuote({ items: [{ desc: "", qty: 0, rate: 0 }], "c-name": "A" }).items.length, 0);
eq("import customer only", I.importFromQuote({ "c-name": "A" }).items.length, 0);
eq("import customer only not null", I.importFromQuote({ "c-name": "A" }) !== null, true);

// Pro gating helpers
eq("isPro fresh", I.isPro({ key: "k", ok: true, checkedAt: 1e12, lastOkAt: 1e12 }, 1e12), true);
eq("isPro none", I.isPro(null, 1e12), false);
eq("isPro invalid", I.isPro({ key: "k", ok: false, checkedAt: 1e12, lastOkAt: 0 }, 1e12), false);
const freePdf = I.pdfOptions(false, "#112233", "#1F4E78");
eq("free watermark", freePdf.watermark, true);
eq("free color default", freePdf.brandColor, "#1F4E78");
const proPdf = I.pdfOptions(true, "#112233", "#1F4E78");
eq("pro no watermark", proPdf.watermark, false);
eq("pro color", proPdf.brandColor, "#112233");
const proBad = I.pdfOptions(true, "blue", "#1F4E78");
eq("pro bad color falls back", proBad.brandColor, "#1F4E78");

const Pdf = require("../assets/invoice-maker/pdf.js");
eq("pdf export", typeof Pdf.buildInvoicePdf, "function");

console.log(`${n - fail}/${n} PASS`);
process.exit(fail ? 1 : 0);
