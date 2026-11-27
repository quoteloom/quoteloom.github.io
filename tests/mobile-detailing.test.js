const { execFileSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const { mobileDetail, PACKAGES, ADDON_MIN } = require("../assets/mobile-detailing.js");

const out = path.join(require("os").tmpdir(), "ql_mobile_detailing.json");
execFileSync("python3", [path.join(__dirname, "mobile_detailing_cases.py"), out]);
const data = JSON.parse(fs.readFileSync(out, "utf8"));
let n = 0, fail = 0;
for (const c of data.mobileDetail) {
  const r = mobileDetail(c.in);
  for (const k of Object.keys(c.exp)) {
    n++;
    if (!(Math.abs(r[k] - c.exp[k]) <= 1e-6)) { fail++; console.log(`FAIL ${c.name}.${k} js=${r[k]} py=${c.exp[k]}`); }
  }
}
// Example package table and add-on times = workbook example Inputs
for (const [k, p] of Object.entries(data.packages)) for (const s of ["car", "suv", "truck", "van"]) {
  n += 2;
  if (PACKAGES[k].price[s] !== p.price[s]) { fail++; console.log(`FAIL price ${k}.${s}`); }
  if (PACKAGES[k].min[s] !== p.min[s]) { fail++; console.log(`FAIL min ${k}.${s}`); }
}
for (const [k, m] of Object.entries(data.addonMin)) { n++; if (ADDON_MIN[k] !== m) { fail++; console.log(`FAIL addonMin ${k}`); } }
// Guide worked example (published on /guides/how-to-price-mobile-car-detailing/)
const g = mobileDetail(data.mobileDetail[0].in);
for (const [got, exp, label] of [[g.lines, 448.5, "guide services"], [g.quoted, 409.65, "guide price per visit"], [g.cost, 215.8, "guide cost"],
                                  [g.profit, 193.85, "guide profit"], [g.workerHours + g.driveHours, 7.1, "guide paid hours"]]) {
  n++; if (Math.abs(got - exp) > 1e-9) { fail++; console.log(`FAIL ${label} ${got} != ${exp}`); }
}
console.log(`${n - fail}/${n} PASS`);
process.exit(fail ? 1 : 0);
