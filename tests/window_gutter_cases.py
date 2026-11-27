"""Expected values for the free window and gutter cleaning calculators.
Independent Python model written from the page spec, cross-checked (price, worker-hours, labor) against the
Window & Gutter workbook's independent test model in products/window-gutter/tests/test_workbook.py."""
import json, os, sys
ROOT = "/workspace/business/products/window-gutter"
sys.path.insert(0, os.path.join(ROOT, "src")); sys.path.insert(0, os.path.join(ROOT, "tests"))
import build_workbook as bw
from test_workbook import model as wb_model

def finish(lines, c, minutes):
    price = max(lines, c["minimum"]) if lines > 0 else 0.0
    quoted = price * (1 - c["discountPct"] / 100)
    wh = (minutes + c["setupMin"]) / 60 if lines > 0 else 0.0
    labor = wh * c["laborRate"]; sup = c["supplies"] if lines > 0 else 0.0; travel = c["miles"] * c["cpm"]
    cost = labor + sup + travel + (c.get("fixedCost", 0) if quoted > 0 else 0)
    profit = quoted - cost
    return {"lines": lines, "price": price, "quoted": quoted, "workerHours": wh, "onSite": wh / c["crew"], "labor": labor,
            "supplies": sup, "travel": travel, "cost": cost, "profit": profit, "margin": profit / quoted if quoted else 0.0,
            "minPrice": cost / (1 - c["targetPct"] / 100)}

def win(c):
    i = (c["ground"] + c["upper"]) if c["interior"] == "yes" else 0
    lines = (c["ground"] + c["upper"] * c["upperMult"]) * c["extPrice"] + i * c["intPrice"] + c["screens"] * c["screenPrice"] \
        + c["tracks"] * c["trackPrice"] + c["hard"] * c["hardPrice"]
    minutes = c["ground"] * 5 + c["upper"] * 8 + i * 4 + c["screens"] * 2 + c["tracks"] * 3 + c["hard"] * 15
    return finish(lines, c, minutes)

def gut(c):
    s = c["conditionPct"] / 100
    base = c["ft1"] * c["rate1"] + c["ft2"] * c["rate2"] + c["ft3"] * c["rate3"]
    hrs = (c["ft1"] / 80 + c["ft2"] / 50 + c["ft3"] / 35) * (1 + s) + c["downspouts"] * 5 / 60
    return finish(base * (1 + s) + c["downspouts"] * c["downspoutPrice"], c, hrs * 60)

def xcheck_win(c, e):
    wl = [list(r) for r in bw.WLINES]
    wl[0][2] = c["extPrice"]; wl[1][2] = c["intPrice"]; wl[4][2] = c["screenPrice"]; wl[5][2] = c["trackPrice"]; wl[6][2] = c["hardPrice"]
    for r in wl: r[4] = 0
    lv = [list(r) for r in bw.LEVELS]; lv[1][1] = c["upperMult"]; lv[2][1] = c["upperMult"]
    P = {k: v[1] for k, v in bw.PRICES.items()}; P["w_min"] = c["minimum"]
    s = {k: v[1] for k, v in bw.SETTINGS.items()}; s.update(wage=c["laborRate"], crew=c["crew"], setup_min=c["setupMin"], drive_min=0)
    job = dict(bw.JOB, method="Per window", ext="Yes", int="Yes" if c["interior"] == "yes" else "No", units=[c["ground"], c["upper"], 0],
               screens=c["screens"], tracks=c["tracks"], hard=c["hard"], lf=[0, 0, 0], downspouts=0, guards=0)
    m = wb_model(wl, lv, P, bw.FREQ, bw.COND, s, job, bw.SEASON, [])
    for a, b in (("window_price", "price"), ("worker_h", "workerHours"), ("labor", "labor")):
        assert abs(m[a] - e[b]) < 1e-9, (c, a, m[a], e[b])

def xcheck_gut(c, e):
    lv = [list(r) for r in bw.LEVELS]; lv[0][3] = c["rate1"]; lv[1][3] = c["rate2"]; lv[2][3] = c["rate3"]
    P = {k: v[1] for k, v in bw.PRICES.items()}; P.update(g_min=c["minimum"], ds_price=c["downspoutPrice"])
    s = {k: v[1] for k, v in bw.SETTINGS.items()}; s.update(wage=c["laborRate"], crew=c["crew"], setup_min=c["setupMin"], drive_min=0)
    job = dict(bw.JOB, ext="No", int="No", screens=0, tracks=0, hard=0, lf=[c["ft1"], c["ft2"], c["ft3"]], cond="X",
               downspouts=c["downspouts"], guards=0)
    m = wb_model(bw.WLINES, lv, P, bw.FREQ, [("X", c["conditionPct"] / 100)], s, job, bw.SEASON, [])
    for a, b in (("gutter_price", "price"), ("worker_h", "workerHours"), ("labor", "labor")):
        assert abs(m[a] - e[b]) < 1e-9, (c, a, m[a], e[b])

WD = dict(ground=16, upper=8, interior="yes", screens=24, tracks=24, hard=3, extPrice=6, intPrice=5, screenPrice=3, trackPrice=3,
          hardPrice=15, upperMult=1.5, minimum=150, discountPct=0, miles=20, cpm=0.7, supplies=15, crew=2, laborRate=24, setupMin=30, targetPct=35)
GD = dict(ft1=120, ft2=90, ft3=0, rate1=1.10, rate2=1.50, rate3=2.00, conditionPct=25, downspouts=6, downspoutPrice=10, minimum=125,
          discountPct=0, miles=24, cpm=0.7, supplies=10, crew=1, laborRate=28.57, setupMin=30, targetPct=40)
wcases = [("guide_example", WD), ("outside_only_quarterly", dict(WD, interior="no", screens=0, tracks=0, hard=0, discountPct=15, miles=6, supplies=5)),
          ("minimum_applies", dict(WD, ground=4, upper=0, interior="no", screens=0, tracks=0, hard=0)),
          ("three_crew_with_fixed", dict(WD, ground=30, upper=22, crew=3, hard=0, fixedCost=23.0, targetPct=50)),
          ("empty_job", dict(WD, ground=0, upper=0, screens=0, tracks=0, hard=0))]
gcases = [("guide_example", GD), ("three_story_very_heavy", dict(GD, ft1=0, ft2=60, ft3=150, conditionPct=50, downspouts=10, crew=2, discountPct=10)),
          ("minimum_applies", dict(GD, ft1=40, ft2=0, conditionPct=0, downspouts=0)),
          ("loss_making_with_fixed", dict(GD, ft1=200, ft2=0, conditionPct=0, downspouts=2, laborRate=80, miles=120, fixedCost=40, discountPct=30)),
          ("empty_job", dict(GD, ft1=0, ft2=0, downspouts=0))]
out = {"windowClean": [], "gutterClean": []}
for name, c in wcases:
    e = win(c); xcheck_win(c, e); out["windowClean"].append({"name": name, "in": c, "exp": e})
for name, c in gcases:
    e = gut(c); xcheck_gut(c, e); out["gutterClean"].append({"name": name, "in": c, "exp": e})
json.dump(out, open(sys.argv[1], "w"), indent=1)
