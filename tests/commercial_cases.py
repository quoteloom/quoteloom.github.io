"""Expected values for the free commercial cleaning bid calculator, from the product workbook's independent model."""
import json, os, sys

ROOT = "/workspace/business/products/commercial-cleaning-bid"

def cases():
    sys.path.insert(0, os.path.join(ROOT, "src")); sys.path.insert(0, os.path.join(ROOT, "tests"))
    import build_workbook as bw
    from test_workbook import model
    S0 = {k: v[1] for k, v in bw.SETTINGS.items()}
    base = dict(sqft=12500, rate=3000, cleanings=5, visits=5, weeks=52, crew=2, driveMin=15, miles=12, cpm=0.65, wage=16, burdenPct=20,
                nonprodPct=10, suppliesPer1000=0.9, equipPerVisit=4, overheadPct=12, fixedMonth=75, targetPct=25, minMonth=400, roundStep=5)
    variants = [
        ("default_example", {}),
        ("minimum_monthly", dict(sqft=1500, cleanings=1, visits=1, crew=1, miles=3, driveMin=0)),
        ("no_rounding_tax_free_zero_target", dict(roundStep=0, targetPct=0, burdenPct=0, nonprodPct=0, overheadPct=0, minMonth=0)),
        ("target_over_99", dict(targetPct=150, weeks=50, crew=3, wage=21.5, burdenPct=31)),
        ("negative_target", dict(targetPct=-10, roundStep=1)),
        ("zero_visits", dict(visits=0)),
        ("zero_rate", dict(rate=0)),
        ("crew_zero", dict(crew=0)),
        ("zero_weeks", dict(weeks=0)),
        ("large_building", dict(sqft=260000, cleanings=6, visits=6, crew=8, minMonth=2000, roundStep=25, overheadPct=15, targetPct=22, fixedMonth=240)),
        ("exact_multiple", dict(wage=0, equipPerVisit=0, cpm=0, overheadPct=0, targetPct=0, minMonth=0, fixedMonth=600, roundStep=5, sqft=0)),
    ]
    out = []
    for name, ch in variants:
        v = dict(base); v.update(ch)
        s = dict(S0, wage=v["wage"], burden=v["burdenPct"] / 100, nonprod=v["nonprodPct"] / 100, equip=v["equipPerVisit"], cpm=v["cpm"],
                 overhead=v["overheadPct"] / 100, target=v["targetPct"] / 100, min_month=v["minMonth"], round_step=v["roundStep"], fixed_month=v["fixedMonth"])
        bid = dict(bw.BID, visits=v["visits"], weeks=v["weeks"], crew=v["crew"], miles=v["miles"], drive_min=v["driveMin"])
        areas = [("Whole building", v["rate"], v["suppliesPer1000"])]
        bid_areas = [("Whole building", v["sqft"], v["cleanings"])]
        m = model(areas, s, bid, bid_areas, [], [], [], bw.PROPOSAL)
        exp = {"cleanHours": m["hours_wk"], "paidHours": m["paid_wk"], "labor": m["labor_wk"], "supplies": m["supplies_wk"],
               "equipment": m["equip_wk"], "travel": m["travel_wk"], "directWeek": m["direct_wk"], "direct": m["direct"],
               "overhead": m["overhead"], "fixed": m["fixed"], "cost": m["cost"], "annualAtTarget": m["annual_pre"],
               "monthlyPre": m["monthly_pre"], "monthly": m["monthly"], "annual": m["annual"], "perVisit": m["per_visit"],
               "profit": m["profit"], "margin": m["margin"], "breakEvenMonthly": m["breakeven"]}
        out.append({"name": name, "in": v, "exp": exp})
    return out

if __name__ == "__main__":
    json.dump(cases(), open(sys.argv[1], "w"))
