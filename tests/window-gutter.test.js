const { execFileSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const { windowClean, gutterClean } = require("../assets/window-gutter.js");

const out = path.join(require("os").tmpdir(), "ql_window_gutter.json");
execFileSync("python3", [path.join(__dirname, "window_gutter_cases.py"), out]);
const data = JSON.parse(fs.readFileSync(out, "utf8"));
const fns = { windowClean, gutterClean };
let n = 0, fail = 0;
for (const [fn, cases] of Object.entries(data)) {
  for (const c of cases) {
    const r = fns[fn](c.in);
    for (const k of Object.keys(c.exp)) {
      n++;
      const ok = Math.abs(r[k] - c.exp[k]) <= 1e-6;
      if (!ok) { fail++; console.log(`FAIL ${fn}.${c.name}.${k} js=${r[k]} py=${c.exp[k]}`); }
    }
  }
}
// Guide worked examples (published on /guides/how-to-bid-window-cleaning/ and /guides/how-to-price-gutter-cleaning/)
const w = windowClean(data.windowClean[0].in), g = gutterClean(data.gutterClean[0].in);
for (const [got, exp, label] of [[w.quoted, 477, "window guide price"], [w.cost, 203, "window guide cost"], [w.workerHours, 7.25, "window guide hours"],
                                  [g.lines, 393.75, "gutter guide raw price"], [g.workerHours, 5.125, "gutter guide hours"]]) {
  n++; if (Math.abs(got - exp) > 1e-9) { fail++; console.log(`FAIL ${label} ${got} != ${exp}`); }
}
console.log(`${n - fail}/${n} PASS`);
process.exit(fail ? 1 : 0);
