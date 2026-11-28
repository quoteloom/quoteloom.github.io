const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");

const pages = {
  "house-cleaning-price-calculator": {
    ids: ["service","method","freq","sqft","beds","baths","oven","fridge","windows","laundry","miles","discountPct","wage","crew","driveMin","cpm","targetPct","o-quoted","o-onsite","o-labor","o-supplies","o-travel","o-cost","o-profit","o-margin","o-min","o-status"],
    values: ['value="Standard clean"', 'value="Deep clean"', 'value="Move-in / move-out"', 'value="Sq ft"', 'value="Rooms"', 'value="Hourly"', 'value="One-time"', 'value="Weekly"', 'value="Biweekly"', 'value="Monthly"'],
    buy: ['data-buy="house-cleaning"', 'data-buy="home-services-bundle"']
  },
  "pressure-washing-price-calculator": {
    ids: ["house","driveway","deck","roof","gutters","discountPct","miles","cpm","setupHours","laborRate","crew","targetPct","o-quoted","o-hours","o-labor","o-chem","o-travel","o-cost","o-profit","o-margin","o-min","o-status"],
    values: [],
    buy: ['data-buy="pressure-washing"', 'data-buy="home-services-bundle"'],
    phrases: ["lavado a presión", "hidrolavado por m²"]
  },
  "airbnb-profit-calculator": {
    ids: ["rate","occ","stay","cleanFee","platform","lodgingTax","cleanCost","supplies","mgmt","housing","util","other","annualFixed","invested","o-nights","o-gross","o-net","o-var","o-fixed","o-cf","o-cfm","o-coc","o-beo"],
    values: [],
    buy: ['data-buy="airbnb-profit"', 'data-buy="property-investor-bundle"', 'data-buy="rental-host-os"']
  },
  "rental-turnover-checklist": {
    ids: ["checklist"],
    values: [],
    buy: ['data-buy="rental-host-os"'],
    phrases: ["limpieza de salida", "/assets/rental-turnover-checklist-es.pdf"]
  }
};

const hreflangCodes = ["en", "es-MX", "es", "x-default"];
let n = 0, fail = 0;
function check(name, ok, detail) {
  n++;
  if (!ok) { fail++; console.log("FAIL", name, detail || ""); }
  else console.log("PASS", name);
}

for (const [slug, spec] of Object.entries(pages)) {
  const esPath = path.join(root, "es", slug, "index.html");
  const enPath = path.join(root, slug, "index.html");
  const es = fs.readFileSync(esPath, "utf8");
  const en = fs.readFileSync(enPath, "utf8");
  check(`${slug} es file`, fs.existsSync(esPath));
  check(`${slug} lang es-MX`, /<html lang="es-MX">/.test(es));
  check(`${slug} no aseo`, !/(^|[^a-záéíóúñü])aseo([^a-záéíóúñü]|$)/i.test(es));
  check(`${slug} no es-419`, !es.includes("es-419") && !en.includes("es-419"));
  for (const id of spec.ids) {
    check(`${slug} es #${id}`, new RegExp(`\\sid="${id}"`).test(es));
    if (id !== "checklist") check(`${slug} en #${id}`, new RegExp(`\\sid="${id}"`).test(en));
  }
  for (const v of spec.values) check(`${slug} ${v}`, es.includes(v));
  for (const b of spec.buy) {
    check(`${slug} ${b}`, es.includes(b) && es.includes("<a class=\"cta\""));
  }
  for (const ph of (spec.phrases || [])) check(`${slug} phrase ${ph}`, es.includes(ph));
  for (const code of hreflangCodes) {
    const esUrl = `https://quoteloom.github.io/es/${slug}/`;
    const enUrl = `https://quoteloom.github.io/${slug}/`;
    const target = (code === "en" || code === "x-default") ? enUrl : esUrl;
    const tag = `hreflang="${code}" href="${target}"`;
    check(`${slug} es hreflang ${code}`, es.includes(tag));
    check(`${slug} en hreflang ${code}`, en.includes(tag));
  }
  check(`${slug} es switcher`, es.includes("class=\"lang-switch\"") && es.includes(">English</a>") && es.includes('aria-current="page">Español</a>'));
  check(`${slug} en switcher`, en.includes("class=\"lang-switch\"") && en.includes('aria-current="page">English</a>') && en.includes(">Español</a>"));
}

const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
for (const slug of Object.keys(pages)) {
  check(`sitemap es ${slug}`, sitemap.includes(`https://quoteloom.github.io/es/${slug}/`));
  check(`sitemap xhtml es-MX ${slug}`, sitemap.includes(`hreflang="es-MX" href="https://quoteloom.github.io/es/${slug}/"`));
}
check("sitemap no es-419", !sitemap.includes("es-419"));

const pdf = path.join(root, "assets", "rental-turnover-checklist-es.pdf");
check("es checklist pdf exists", fs.existsSync(pdf) && fs.statSync(pdf).size > 1000);

function withDoc(lang, currency, fn) {
  const prev = global.document;
  global.document = {
    documentElement: {
      getAttribute(k) {
        if (k === "lang") return lang;
        if (k === "data-currency") return currency;
        return "";
      }
    }
  };
  try { return fn(); } finally {
    if (prev === undefined) delete global.document;
    else global.document = prev;
  }
}

for (const mod of ["house-cleaning.js", "pressure-washing.js", "airbnb.js"]) {
  const api = require(path.join(root, "assets", mod));
  check(`${mod} exports formatters`, typeof api.isEs === "function" && typeof api.fmtNum === "function" && typeof api.money === "function");
  check(`${mod} en money no sep`, withDoc("en", null, () => api.money(1234.5) === "$1234.50"), withDoc("en", null, () => api.money(1234.5)));
  check(`${mod} es money sep`, withDoc("es-MX", null, () => api.money(1234.5) === "US$1,234.50"), withDoc("es-MX", null, () => api.money(1234.5)));
  check(`${mod} es negative`, withDoc("es-MX", null, () => api.money(-10) === "-US$10.00"));
  check(`${mod} es currency attr`, withDoc("es-MX", "MXN$", () => api.money(12) === "MXN$12.00"));
  check(`${mod} en fmtNum`, withDoc("en", null, () => api.fmtNum(12.5, 1) === "12.5"));
  check(`${mod} isEs en`, withDoc("en", null, () => api.isEs() === false));
  check(`${mod} isEs es`, withDoc("es-MX", null, () => api.isEs() === true));
}


const esIndex = fs.readFileSync(path.join(root, "es", "index.html"), "utf8");
const home = fs.readFileSync(path.join(root, "index.html"), "utf8");
check("es index lang", /<html lang="es-MX">/.test(esIndex));
check("es index no aseo", !/(^|[^a-záéíóúñü])aseo([^a-záéíóúñü]|$)/i.test(esIndex));
check("es index no es-419", !esIndex.includes("es-419") && !home.includes("es-419"));
check("es index lists four pages", ["/es/house-cleaning-price-calculator/", "/es/airbnb-profit-calculator/", "/es/rental-turnover-checklist/", "/es/pressure-washing-price-calculator/"].every((u) => esIndex.includes(`href="${u}"`)));
check("es index switcher", esIndex.includes("class=\"lang-switch\"") && esIndex.includes(">English</a>") && esIndex.includes('aria-current="page">Español</a>'));
check("home switcher", home.includes("class=\"lang-switch\"") && home.includes('aria-current="page">English</a>') && home.includes('href="/es/"') && home.includes(">Español</a>"));
check("home domain_verify", home.includes('name="p:domain_verify"'));
const indexTags = [
  'hreflang="en" href="https://quoteloom.github.io/"',
  'hreflang="es-MX" href="https://quoteloom.github.io/es/"',
  'hreflang="es" href="https://quoteloom.github.io/es/"',
  'hreflang="x-default" href="https://quoteloom.github.io/"'
];
for (const tag of indexTags) {
  check(`es index ${tag}`, esIndex.includes(tag));
  check(`home ${tag}`, home.includes(tag));
}
check("sitemap /es/", sitemap.includes("https://quoteloom.github.io/es/</loc>") || sitemap.includes("https://quoteloom.github.io/es/\"") || sitemap.includes("<loc>https://quoteloom.github.io/es/</loc>"));
check("sitemap xhtml /es/", sitemap.includes('hreflang="es-MX" href="https://quoteloom.github.io/es/"'));
check("home footer Español", /<footer>[\s\S]*href="\/es\/"[\s\S]*<\/footer>/.test(home));

console.log(`\n${n - fail}/${n} PASS`);
process.exit(fail ? 1 : 0);
