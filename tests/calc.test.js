const { execFileSync } = require("child_process"); const path = require("path"); const fs = require("fs");
const { jobProfit } = require("../assets/calc.js");
const out = path.join(require("os").tmpdir(), "ql_cases.json");
execFileSync("python3", [path.join(__dirname, "expected_cases.py"), out]);
const cases = JSON.parse(fs.readFileSync(out, "utf8")); let fail = 0, n = 0;
for (const c of cases) { const r = jobProfit(c.in);
  for (const k of Object.keys(c.exp)) { n++; const ok = Math.abs(r[k] - c.exp[k]) < 1e-9;
    if (!ok) fail++; console.log(`${ok ? "PASS" : "FAIL"} ${c.name}.${k} js=${r[k]} py=${c.exp[k]}`); } }
console.log(`\n${n - fail}/${n} PASS`); process.exit(fail ? 1 : 0);
