const { execFileSync } = require("child_process"); const path = require("path"); const fs = require("fs");
const { airbnb } = require("../assets/airbnb.js"); const out = path.join(require("os").tmpdir(), "ql_airbnb.json");
execFileSync("python3", [path.join(__dirname, "airbnb_cases.py"), out]);
let n = 0, fail = 0;
function close(g, e) {
  if (e === null || e === undefined) return g === null || g === undefined;
  if (typeof e === "string") return g === e;
  return typeof g === "number" && Math.abs(g - e) <= 1e-6 + 1e-9 * Math.abs(e);
}
for (const c of JSON.parse(fs.readFileSync(out, "utf8"))) {
  const r = airbnb(c.in);
  for (const k of Object.keys(c.exp)) {
    n++;
    if (!close(r[k], c.exp[k])) { fail++; console.log("FAIL", k, r[k], c.exp[k]); }
  }
}
console.log(`${n - fail}/${n} PASS`); process.exit(fail ? 1 : 0);
