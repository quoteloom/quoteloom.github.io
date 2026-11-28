const { execFileSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const { commercialBid } = require("../assets/commercial-cleaning.js");

const out = path.join(require("os").tmpdir(), "ql_commercial.json");
execFileSync("python3", [path.join(__dirname, "commercial_cases.py"), out]);
const cases = JSON.parse(fs.readFileSync(out, "utf8"));
let n = 0, fail = 0;
function check(name, ok, detail) { n++; if (!ok) { fail++; console.log("FAIL", name, detail || ""); } }

for (const c of cases) {
  const r = commercialBid(c.in);
  for (const k of Object.keys(c.exp)) {
    const got = r[k], exp = c.exp[k];
    check(`${c.name}.${k}`, Math.abs(got - exp) <= 1e-6 + 1e-9 * Math.abs(exp), `js=${got} py=${exp}`);
  }
}
const ex = cases.find((c) => c.name === "exact_multiple");
check("exact multiple is not over-rounded", commercialBid(ex.in).monthly === 600, commercialBid(ex.in).monthly);
check("minimum flag", commercialBid(cases.find((c) => c.name === "minimum_monthly").in).minApplied === true);
check("default does not trip the minimum flag", commercialBid(cases[0].in).minApplied === false);
check("cleanings exceed visits flag", commercialBid(Object.assign({}, cases[0].in, { cleanings: 6 })).cleaningsExceedVisits === true);

// the staged page must carry every input and output id the script reads
const page = path.join(__dirname, "..", "commercial-cleaning-bid-calculator", "index.html");
const html = fs.readFileSync(page, "utf8");
const ids = ["sqft","rate","cleanings","visits","weeks","crew","driveMin","miles","cpm","wage","burdenPct","nonprodPct","suppliesPer1000","equipPerVisit","overheadPct","fixedMonth","targetPct","minMonth","roundStep",
  "o-monthly","o-annual","o-pervisit","o-hours","o-labor","o-supplies","o-direct","o-cost","o-profit","o-margin","o-breakeven","o-status"];
for (const id of ids) check(`page #${id}`, new RegExp(`\\sid="${id}"`).test(html));
check("page loads the script", html.includes('src="/assets/commercial-cleaning.js"'));
check("page has a static data-buy cta", /<a class="cta"[^>]*data-buy="commercial-cleaning-bid"/.test(html));
check("page canonical", html.includes('<link rel="canonical" href="https://quoteloom.github.io/commercial-cleaning-bid-calculator/">'));
const sitemap = fs.readFileSync(path.join(__dirname, "..", "sitemap.xml"), "utf8");
check("sitemap has the page", sitemap.includes("https://quoteloom.github.io/commercial-cleaning-bid-calculator/"));

console.log(`${n - fail}/${n} PASS`);
process.exit(fail ? 1 : 0);
