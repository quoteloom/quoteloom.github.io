/* Quote Maker math tests: node tests/quote.test.js */
const Q = require("../assets/quote-maker/quote-core.js");
const { pressureWash, SERVICES: PW } = require("../assets/pressure-washing.js");
const { houseClean } = require("../assets/house-cleaning.js");
const { lawnCare } = require("../assets/lawn-care.js");
let n = 0, fail = 0;
function eq(name, got, exp, tol = 1e-9) {
  n++;
  const ok = typeof exp === "number" ? Math.abs(got - exp) <= tol : JSON.stringify(got) === JSON.stringify(exp);
  if (!ok) { fail++; console.log(`FAIL ${name}: got ${JSON.stringify(got)} expected ${JSON.stringify(exp)}`); }
}

// lineTotal
eq("line basic", Q.lineTotal({ qty: 3, rate: 12.5 }).total, 37.5);
eq("line min applied", Q.lineTotal({ qty: 500, rate: 0.2, min: 250 }).total, 250);
eq("line min flag", Q.lineTotal({ qty: 500, rate: 0.2, min: 250 }).minApplied, true);
eq("line above min", Q.lineTotal({ qty: 2400, rate: 0.2, min: 250 }).total, 480);
eq("line qty 0 ignores min", Q.lineTotal({ qty: 0, rate: 0.2, min: 250 }).total, 0);
eq("line negative clamps", Q.lineTotal({ qty: -2, rate: 10 }).total, 0);
eq("line text input", Q.lineTotal({ qty: "2", rate: "19.99" }).total, 39.98);
eq("line blank", Q.lineTotal({ qty: "", rate: "abc" }).total, 0);
eq("line float cents", Q.lineTotal({ qty: 3, rate: 0.1 }).total, 0.3);
eq("line 1.005 rounds up", Q.round2(1.005), 1.01);
eq("small rate kept", Q.computeQuote({ items: [{ qty: 1000, rate: 0.015 }] }).lines[0].rate, 0.015);
eq("small rate total", Q.computeQuote({ items: [{ qty: 1000, rate: 0.015 }] }).total, 15);

// computeQuote
const q1 = Q.computeQuote({ items: [{ qty: 2400, rate: 0.2, min: 250 }, { qty: 600, rate: 0.18, min: 150 }, { qty: 1, rate: 49.99 }],
  discountPct: 10, taxPct: 8.25, depositPct: 25 });
eq("q1 subtotal", q1.subtotal, 480 + 150 + 49.99);
eq("q1 discount", q1.discount, 68.0); // 679.99 * 10% = 67.999 -> 68.00
eq("q1 after", q1.afterDiscount, 611.99);
eq("q1 tax", q1.tax, 50.49); // 611.99 * 8.25% = 50.489175
eq("q1 total", q1.total, 662.48);
eq("q1 deposit", q1.deposit, 165.62); // 662.48 * 25% = 165.62
eq("q1 balance", q1.balance, 496.86);
eq("q1 line count", q1.lines.length, 3);
eq("q1 second line min", q1.lines[1].minApplied, true);
const q2 = Q.computeQuote({ items: [], discountPct: 50, taxPct: 10 });
eq("empty total", q2.total, 0);
const q3 = Q.computeQuote({ items: [{ qty: 1, rate: 100 }], discountPct: 150, taxPct: -5, depositPct: 200 });
eq("pct clamp discount", q3.discount, 100);
eq("pct clamp tax", q3.tax, 0);
eq("pct clamp deposit", q3.deposit, 0);
const q4 = Q.computeQuote({ items: [{ qty: 1, rate: 100 }], depositPct: 100 });
eq("deposit 100", q4.balance, 0);
// sum of lines always equals subtotal
for (let s = 1; s <= 50; s++) {
  const items = Array.from({ length: (s % 7) + 1 }, (_, i) => ({ qty: ((s * 7 + i * 13) % 97) / 4, rate: ((s * 31 + i * 17) % 113) / 3 }));
  const r = Q.computeQuote({ items, discountPct: s % 20, taxPct: (s % 9) * 1.125 });
  eq(`fuzz ${s} subtotal = sum`, r.subtotal, Q.round2(r.lines.reduce((a, l) => a + l.total, 0)), 1e-9);
  eq(`fuzz ${s} total`, r.total, Q.round2(r.afterDiscount + r.tax), 1e-9);
  eq(`fuzz ${s} cents`, Math.round(r.total * 100) / 100, r.total, 1e-12);
}

// Presets reproduce the free calculators' prices
const pwCases = [[2400, 600, 300, 0, 0], [100, 0, 0, 0, 50], [0, 0, 0, 2000, 180], [3000, 1200, 400, 1500, 200]];
for (const qty of pwCases) {
  const items = Q.pressureWashItems(qty, PW);
  const r = Q.computeQuote({ items });
  eq(`pw ${qty} subtotal`, r.subtotal, Q.round2(pressureWash({ qty }).subtotal));
  eq(`pw ${qty} lines`, items.length, qty.filter(x => x > 0).length);
}
const hcCases = [
  { service: "Standard clean", method: "Sq ft", sqft: 2000, beds: 3, baths: 2, freq: "One-time", addons: [0, 0, 0, 0] },
  { service: "Deep clean", method: "Rooms", sqft: 1800, beds: 4, baths: 3, freq: "Biweekly", addons: [1, 1, 10, 2] },
  { service: "Move-in / move-out", method: "Hourly", sqft: 2500, beds: 3, baths: 2, freq: "Weekly", addons: [1, 0, 0, 0] },
  { service: "Standard clean", method: "Sq ft", sqft: 400, beds: 1, baths: 1, freq: "Monthly", addons: [0, 1, 0, 0] }
];
for (const v of hcCases) {
  const r = Q.computeQuote({ items: Q.houseCleanItems(v) });
  eq(`hc ${v.service}/${v.method}/${v.freq}`, r.subtotal, Q.round2(houseClean(Object.assign({}, v, { discountPct: 0 })).quoted), 0.005);
}
const lcCases = [
  { size: 8000, unit: "Sq ft", visits: [28, 28, 28, 2, 4, 1] },
  { size: 0.5, unit: "Acres", visits: [30, 0, 30, 0, 0, 0] },
  { size: 1500, unit: "Sq ft", visits: [10, 10, 10, 1, 1, 1] }
];
for (const v of lcCases) {
  const r = Q.computeQuote({ items: Q.lawnCareItems(v) });
  eq(`lc ${v.size}${v.unit}`, r.subtotal, lawnCare(Object.assign({}, v, { discountPct: 0 })).contract, 0.01 * 6);
}

// helpers
eq("quote number", Q.quoteNumber(new Date(2026, 10, 26), 7), "Q-20261126-007");
eq("add days", Q.addDays(new Date(2026, 10, 26), 30).getDate(), 26);
eq("free template limit", Q.canSaveTemplate(false, 0), true);
eq("free template full", Q.canSaveTemplate(false, 1), false);
eq("pro unlimited", Q.canSaveTemplate(true, 99), true);

// license response rules
eq("lic bad", Q.evaluateLicense({ success: false, message: "That license does not exist for the provided product." }).ok, false);
eq("lic ok", Q.evaluateLicense({ success: true, purchase: { email: "a@b.c" } }).ok, true);
eq("lic refunded", Q.evaluateLicense({ success: true, purchase: { refunded: true } }).ok, false);
eq("lic chargeback", Q.evaluateLicense({ success: true, purchase: { chargebacked: true } }).ok, false);
eq("lic ended", Q.evaluateLicense({ success: true, purchase: { subscription_ended_at: "2026-11-01" } }).ok, false);
eq("lic failed", Q.evaluateLicense({ success: true, purchase: { subscription_failed_at: "2026-11-01" } }).ok, false);
eq("lic cancelled still active", Q.evaluateLicense({ success: true, purchase: { subscription_cancelled_at: "2026-11-01" } }).ok, true);
const day = 864e5, now = 1e12;
eq("state none", Q.licenseState(null, now), "none");
eq("state fresh", Q.licenseState({ key: "k", ok: true, checkedAt: now - day, lastOkAt: now - day }, now), "pro");
eq("state recheck", Q.licenseState({ key: "k", ok: true, checkedAt: now - 5 * day, lastOkAt: now - 5 * day }, now), "pro-recheck");
eq("state stale", Q.licenseState({ key: "k", ok: true, checkedAt: now - 20 * day, lastOkAt: now - 20 * day }, now), "expired-check");
eq("state invalid", Q.licenseState({ key: "k", ok: false }, now), "invalid");

// verifyLicense request shape (mock fetch)
(async () => {
  let seen;
  const r = await Q.verifyLicense("PROD123", " KEY-1 ", (url, opt) => { seen = { url, opt }; return Promise.resolve({ json: () => ({ success: true, purchase: {} }) }); });
  eq("verify url", seen.url, "https://api.gumroad.com/v2/licenses/verify");
  eq("verify body", seen.opt.body, "product_id=PROD123&license_key=KEY-1&increment_uses_count=false");
  eq("verify ok", r.ok, true);
  const off = await Q.verifyLicense("PROD123", "K", () => Promise.reject(new Error("offline")));
  eq("verify offline", off.offline, true);
  const none = await Q.verifyLicense("", "K", () => { throw new Error("should not call"); });
  eq("verify no product", none.ok, false);
  console.log(`${n - fail}/${n} PASS`);
  process.exit(fail ? 1 : 0);
})();
