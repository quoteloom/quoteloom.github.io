const { execFileSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const { pressureWash } = require("../assets/pressure-washing.js");
const { houseClean } = require("../assets/house-cleaning.js");
const { lawnCare } = require("../assets/lawn-care.js");

const out = path.join(require("os").tmpdir(), "ql_trade.json");
execFileSync("python3", [path.join(__dirname, "trade_cases.py"), out]);
const data = JSON.parse(fs.readFileSync(out, "utf8"));
const fns = { pressureWash, houseClean, lawnCare };
let n = 0, fail = 0;
for (const [fn, cases] of Object.entries(data)) {
  for (const c of cases) {
    const r = fns[fn](c.in);
    for (const k of Object.keys(c.exp)) {
      n++;
      const got = r[k], exp = c.exp[k];
      const ok = Math.abs(got - exp) <= 1e-6;
      if (!ok) { fail++; console.log(`FAIL ${fn}.${c.name}.${k} js=${got} py=${exp}`); }
    }
  }
}
console.log(`${n - fail}/${n} PASS`);
process.exit(fail ? 1 : 0);
