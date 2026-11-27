const { flip } = require("../assets/house-flip.js");
const cases = [
  { // EXAMPLE A from the workbook
    in: { price: 185000, closing: 5550, rehab: 46200, months: 5, holding: 2900, down: 20, rate: 11, points: 2, arv: 285000, selling: 21450 },
    exp: { loan: 148000, points: 2960, interest: 6783.333333333333, proceeds: 263550, cost: 249393.33333333334, profit: 14156.666666666657, invested: 101393.33333333333, roi: 14156.666666666657 / 101393.33333333333, ann: Math.pow(1 + 14156.666666666657 / 101393.33333333333, 12 / 5) - 1, mao: 153300, meets: false }
  },
  { // EXAMPLE B
    in: { price: 142000, closing: 4260, rehab: 60000, months: 6, holding: 4520, down: 25, rate: 10, points: 2, arv: 290000, selling: 19400 },
    exp: { loan: 106500, points: 2130, interest: 5325, proceeds: 270600, cost: 218235, profit: 52365, invested: 111735, roi: 52365 / 111735, ann: Math.pow(1 + 52365 / 111735, 12 / 6) - 1, mao: 143000, meets: true }
  },
  { // EXAMPLE C all cash, a loss
    in: { price: 210000, closing: 6300, rehab: 26800, months: 4, holding: 3620, down: 100, rate: 0, points: 0, arv: 245000, selling: 17460 },
    exp: { loan: 0, points: 0, interest: 0, proceeds: 227540, cost: 246720, profit: -19180, invested: 246720, roi: -19180 / 246720, ann: Math.pow(1 + -19180 / 246720, 12 / 4) - 1, mao: 144700, meets: false }
  },
  { // exact 70% rule, purchase == MAO
    in: { price: 143000, closing: 4260, rehab: 60000, months: 6, holding: 4520, down: 25, rate: 10, points: 2, arv: 290000, selling: 19400 },
    exp: { mao: 143000, meets: true }
  },
  { // zero hold months: interest 0, annualized n/a
    in: { price: 142000, closing: 4260, rehab: 60000, months: 0, holding: 0, down: 25, rate: 10, points: 2, arv: 290000, selling: 19400 },
    exp: { interest: 0, invested: 142000 * 0.25 + 4260 + 2130 + 60000, profit: 270600 - (142000 + 4260 + 2130 + 60000), ann: null, mao: 143000, meets: true }
  },
  { // all-cash of example A
    in: { price: 185000, closing: 5550, rehab: 46200, months: 5, holding: 2900, down: 100, rate: 0, points: 0, arv: 285000, selling: 21450 },
    exp: { loan: 0, points: 0, interest: 0, cost: 239650, profit: 23900, invested: 239650, roi: 23900 / 239650, meets: false }
  }
];
let n = 0, fail = 0;
for (const c of cases) {
  const r = flip(c.in);
  for (const k of Object.keys(c.exp)) {
    n++;
    const e = c.exp[k], g = r[k];
    const ok = (e === null || g === null) ? e === g : (typeof e === "boolean" ? e === g : Math.abs(g - e) <= 1e-6 * Math.max(1, Math.abs(e)));
    if (!ok) { fail++; console.log("FAIL", k, g, e); }
  }
}
console.log(`${n - fail}/${n} PASS`);
process.exit(fail ? 1 : 0);
