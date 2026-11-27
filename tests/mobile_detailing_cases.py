"""Expected values for the free mobile car detailing calculator.
Independent Python model written from the page spec, cross-checked (quoted price, worker-hours, labor, cost) against the
Mobile Car Detailing workbook's independent test model in products/mobile-detailing/tests/test_workbook.py."""
import json, os, sys
ROOT = "/workspace/business/products/mobile-detailing"
sys.path.insert(0, os.path.join(ROOT, "src")); sys.path.insert(0, os.path.join(ROOT, "tests"))
import build_workbook as bw
from test_workbook import model as wb_model

AD = ["petHair", "odor", "headlight", "engine", "ceramic", "clay"]
AMIN = {k: a[3] for k, a in zip(AD, bw.ADDONS)}

def calc(c):
    s = c["conditionPct"] / 100
    lines = c["pkgPrice"] * (1 + s) + sum(c[k] * c[k + "Price"] for k in AD)
    minutes = c["pkgMin"] * (1 + s) + sum(c[k] * AMIN[k] for k in AD)
    work = lines > 0
    services = max(lines, c["minimum"]) if work else 0.0
    fee = max(0.0, c["miles"] - c["freeMiles"]) * c["feePerMile"] if work else 0.0
    quoted = services * (1 - c["memberPct"] / 100) + fee
    wh = (minutes + c["setupMin"]) / 60 if work else 0.0
    dh = c["driveMin"] * 2 / 60 * c["crew"] if work else 0.0
    labor = (wh + dh) * c["laborRate"]
    sup = c["chemicals"] if work else 0.0
    veh = c["miles"] * 2 * c["cpm"] if work else 0.0
    cost = labor + sup + veh + (c.get("fixedCost", 0) if quoted > 0 else 0)
    profit = quoted - cost
    return {"lines": lines, "services": services, "travelFee": fee, "quoted": quoted, "workerHours": wh, "onSite": wh / c["crew"],
            "driveHours": dh, "labor": labor, "supplies": sup, "vehicle": veh, "cost": cost, "profit": profit,
            "margin": profit / quoted if quoted else 0.0, "minPrice": cost / (1 - c["targetPct"] / 100),
            "profitPerHour": profit / (wh + dh) if wh + dh else 0.0}

def xcheck(c, e):
    """Same job through the workbook test model: package table row = this price/time/chemicals, add-on materials 0,
    water setup = setupMin at $0, no equipment wear or overhead."""
    if c.get("fixedCost"): return
    pk = [("P", [c["pkgPrice"]] * 4, [c["pkgMin"]] * 4, c["chemicals"])]
    ad = [(a[0], a[1], c[k + "Price"], a[3], 0.0) for k, a in zip(AD, bw.ADDONS)]
    s = {k: v[1] for k, v in bw.SETTINGS.items()}
    s.update(wage=c["laborRate"], crew=c["crew"], cpm=c["cpm"], equip=0.0, overhead=0.0, min_charge=c["minimum"],
             free_miles=c["freeMiles"], fee_mile=c["feePerMile"], target=c["targetPct"] / 100)
    job = dict(bw.JOB, size="Car", package="P" if c["pkgPrice"] > 0 else "none", cond="X", addons=[c[k] for k in AD],
               water="W", member="M", miles=c["miles"], drive_min=c["driveMin"])
    m = wb_model(pk, ad, [("X", c["conditionPct"] / 100)], [("M", c["memberPct"] / 100, 1)], [("W", c["setupMin"], 0.0)], s, job, bw.SEASON, [])
    if c["pkgPrice"] == 0 and m["lines"] == 0: return
    adj = 0.0 if c["pkgPrice"] > 0 else c["chemicals"]  # workbook charges package chemicals only with a package
    for a, b, d in (("quoted", "quoted", 0), ("worker_h", "workerHours", 0), ("labor", "labor", 0), ("cost", "cost", -adj)):
        assert abs(m[a] - (e[b] + d)) < 1e-9, (c, a, m[a], e[b])

D = dict(pkgPrice=190, pkgMin=180, conditionPct=15, petHair=1, petHairPrice=40, odor=0, odorPrice=50, headlight=1, headlightPrice=60,
         engine=0, enginePrice=40, ceramic=1, ceramicPrice=80, clay=1, clayPrice=50, minimum=80, memberPct=10, miles=14, freeMiles=10,
         feePerMile=1.5, driveMin=22, cpm=0.7, chemicals=40, setupMin=15, crew=1, laborRate=22, targetPct=40)
cases = [("guide_example", D),
         ("car_exterior_inside_radius", dict(D, pkgPrice=50, pkgMin=60, conditionPct=0, petHair=0, headlight=0, ceramic=0, clay=0, memberPct=0, miles=6, driveMin=12, chemicals=4, setupMin=10)),
         ("truck_interior_extreme_weekly_crew2", dict(D, pkgPrice=130, pkgMin=120, conditionPct=50, odor=1, headlight=0, ceramic=0, clay=0, memberPct=20, miles=35, driveMin=45, crew=2, laborRate=25)),
         ("addons_only_minimum", dict(D, pkgPrice=0, pkgMin=0, conditionPct=0, petHair=0, ceramic=0, clay=0, memberPct=0, miles=22, driveMin=30)),
         ("with_fixed_cost_loss", dict(D, pkgPrice=50, pkgMin=60, conditionPct=0, petHair=0, headlight=0, ceramic=0, clay=0, memberPct=20, laborRate=60, miles=40, driveMin=60, fixedCost=25, minimum=0, feePerMile=0)),
         ("empty_job", dict(D, pkgPrice=0, pkgMin=0, petHair=0, headlight=0, ceramic=0, clay=0))]
# example package table must match the workbook's example Inputs
tbl = {key: {"price": dict(zip(["car", "suv", "truck", "van"], p[1])), "min": dict(zip(["car", "suv", "truck", "van"], p[2]))}
       for key, p in zip(["exterior", "interior", "full"], bw.PACKAGES)}
out = {"mobileDetail": [], "packages": tbl, "addonMin": AMIN}
for name, c in cases:
    e = calc(c); xcheck(c, e); out["mobileDetail"].append({"name": name, "in": c, "exp": e})
json.dump(out, open(sys.argv[1], "w"), indent=1)
