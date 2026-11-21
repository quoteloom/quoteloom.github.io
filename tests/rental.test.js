const { execFileSync } = require("child_process"); const path = require("path"); const fs = require("fs");
const { rental } = require("../assets/rental.js"); const out = path.join(require("os").tmpdir(), "ql_rental.json");
execFileSync("python3", [path.join(__dirname, "rental_cases.py"), out]);
let n = 0, fail = 0;
for (const c of JSON.parse(fs.readFileSync(out, "utf8"))) { const r = rental(c.in);
  for (const k of Object.keys(c.exp)) { n++; if (Math.abs(r[k] - c.exp[k]) > 1e-6) { fail++; console.log("FAIL", k, r[k], c.exp[k]); } } }
console.log(`${n - fail}/${n} PASS`); process.exit(fail ? 1 : 0);
