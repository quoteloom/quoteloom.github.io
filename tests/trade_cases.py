"""Expected values for the three free trade calculators, from each product's independent model."""
import json, os, sys

ROOT = "/workspace/business/products"

def pw_cases():
    sys.path.insert(0, os.path.join(ROOT, "pressure-washing", "src"))
    sys.path.insert(0, os.path.join(ROOT, "pressure-washing", "tests"))
    import build_workbook as bw
    from test_workbook import reference
    S = {k: v[1] for k, v in bw.SETTINGS.items()}
    eq = (S["equip_cost"] - S["equip_salvage"]) / (S["equip_life"] * S["jobs_per_year"])
    oh = S["monthly_overhead"] * 12 / S["jobs_per_year"]
    jobs = [
        ("default_example", dict(S), bw.JOB),
        ("minimums_3crew", dict(S, crew_size=3, labor_rate=25.0, target_margin=0.40, monthly_overhead=900.0),
         {"qty": [500, 300, 150, 0, 60], "miles": 40, "discount": 0.0}),
        ("loss_making", dict(S, labor_rate=40.0, monthly_overhead=2500.0, jobs_per_year=60),
         {"qty": [0, 200, 0, 0, 0], "miles": 80, "discount": 0.15}),
    ]
    out = []
    for name, s, job in jobs:
        r = reference(bw.SERVICES, s, job, [10] * 12, [])
        fixed = (s["equip_cost"] - s["equip_salvage"]) / (s["equip_life"] * s["jobs_per_year"]) + s["monthly_overhead"] * 12 / s["jobs_per_year"]
        inp = {
            "qty": job["qty"], "discountPct": job["discount"] * 100, "miles": job["miles"],
            "cpm": s["cost_per_mile"], "setupHours": s["setup_hours"], "laborRate": s["labor_rate"],
            "crew": s["crew_size"], "targetPct": s["target_margin"] * 100, "fixedCost": fixed,
        }
        exp = {"subtotal": r["subtotal"], "quoted": r["quoted"], "crewHours": r["crew_hours"],
               "labor": r["labor"], "chem": r["chem"], "travel": r["travel"], "cost": r["total_cost"],
               "profit": r["profit"], "margin": r["margin"], "minPrice": r["min_price"]}
        out.append({"name": name, "in": inp, "exp": exp})
    # Simplified path: same default job with fixedCost 0
    r0 = reference(bw.SERVICES, dict(S), bw.JOB, [10]*12, [])
    inp = {"qty": bw.JOB["qty"], "discountPct": 5, "miles": 24, "cpm": 0.7, "setupHours": 0.75,
           "laborRate": 22, "crew": 2, "targetPct": 35, "fixedCost": 0}
    cost = r0["labor"] + r0["chem"] + r0["travel"]
    out.append({"name": "simplified_no_fixed", "in": inp, "exp": {
        "quoted": r0["quoted"], "labor": r0["labor"], "chem": r0["chem"], "travel": r0["travel"],
        "cost": cost, "profit": r0["quoted"] - cost, "margin": (r0["quoted"] - cost) / r0["quoted"],
        "minPrice": cost / (1 - 0.35)}})
    return out

def hc_cases():
    # clear previous product modules
    for m in list(sys.modules):
        if m in ("build_workbook", "test_workbook") or m.startswith("build_workbook") or m.startswith("test_workbook"):
            sys.modules.pop(m, None)
    sys.path = [p for p in sys.path if "pressure-washing" not in p]
    sys.path.insert(0, os.path.join(ROOT, "house-cleaning", "src"))
    sys.path.insert(0, os.path.join(ROOT, "house-cleaning", "tests"))
    import build_workbook as bw
    import test_workbook as tw
    base = {k: v[1] for k, v in bw.SETTINGS.items()}
    specs = [
        ("default_rooms_biweekly", {}, dict(bw.JOB)),
        ("sqft_deep_onetime", {"tax": 0.07, "target": 0.35},
         dict(bw.JOB, service="Deep clean", method="Sq ft", freq="One-time", sqft=2600, beds=4, baths=3,
              addons=[1, 0, 12, 0], miles=22, discount=0.10)),
        ("minimum_weekly_solo", {"crew": 1, "drive_min": 0},
         dict(bw.JOB, service="Standard clean", method="Sq ft", freq="Weekly", sqft=650, beds=1, baths=1,
              addons=[0, 0, 0, 0], miles=5, discount=0.0)),
    ]
    out = []
    for name, s_over, job in specs:
        s = dict(base, **s_over)
        fixed = s["equip"] + s["overhead"] * 12 / s["jobs_year"]
        r = tw.model(bw.SERVICES, bw.FREQ, bw.ADDONS, s, job, [20]*12, [])
        inp = {
            "service": job["service"], "method": job["method"], "freq": job["freq"],
            "sqft": job["sqft"], "beds": job["beds"], "baths": job["baths"], "addons": job["addons"],
            "miles": job["miles"], "discountPct": job["discount"] * 100, "wage": s["wage"], "crew": s["crew"],
            "driveMin": s["drive_min"], "cpm": s["cpm"], "targetPct": s["target"] * 100, "fixedCost": fixed,
        }
        out.append({"name": name, "in": inp, "exp": {
            "cleanPrice": r["clean_price"], "quoted": r["quoted"], "onsite": r["onsite"],
            "labor": r["labor"], "supplies": r["supplies"], "travel": r["travel"], "cost": r["cost"],
            "profit": r["profit"], "margin": r["margin"], "minPrice": r["min_price"]}})
    return out

def lc_cases():
    for m in list(sys.modules):
        if m in ("build_workbook", "test_workbook"):
            sys.modules.pop(m, None)
    sys.path = [p for p in sys.path if "house-cleaning" not in p and "pressure-washing" not in p]
    sys.path.insert(0, os.path.join(ROOT, "lawn-care", "src"))
    sys.path.insert(0, os.path.join(ROOT, "lawn-care", "tests"))
    import build_workbook as bw
    import test_workbook as tw
    base = {k: v[1] for k, v in bw.SETTINGS.items()}
    specs = [
        ("default_quarter_acre", {}, dict(bw.JOB)),
        ("small_lot_minimums", {"tax": 0.06, "crew": 1},
         dict(bw.JOB, size=4000, unit="Sq ft", miles=4, visits=[30, 15, 30, 0, 0, 0], discount=0.0, months=12)),
        ("one_acre_crew3", {"crew": 3, "wage": 22.0, "equip_hr": 14.0, "setup_min": 15, "target": 0.35},
         dict(bw.JOB, size=1.0, unit="Acres", miles=22, visits=[26, 26, 26, 3, 5, 2], discount=0.10, months=9)),
    ]
    out = []
    for name, s_over, job in specs:
        s = dict(base, **s_over)
        ohv = s["overhead"] * 12 / s["visits_year"]
        r = tw.model(bw.SERVICES, s, job, [50]*12, [])
        inp = {
            "size": job["size"], "unit": job["unit"], "visits": job["visits"],
            "discountPct": job["discount"] * 100, "months": job["months"],
            "wage": s["wage"], "crew": s["crew"], "equipHr": s["equip_hr"], "setupMin": s["setup_min"],
            "miles": job["miles"], "cpm": s["cpm"], "targetPct": s["target"] * 100, "overheadPerVisit": ohv,
        }
        out.append({"name": name, "in": inp, "exp": {
            "sqft": r["sqft"], "trips": r["trips"], "contract": r["contract"], "monthly": r["monthly"],
            "hours": r["hours"], "labor": r["labor"], "equip": r["equip"], "travel": r["travel"],
            "materials": r["materials"], "disposal": r["disposal"], "cost": r["cost"], "profit": r["profit"],
            "margin": r["margin"], "minContract": r["min_contract"], "minMonthly": r["min_monthly"]}})
    return out

def main():
    data = {"pressureWash": pw_cases(), "houseClean": hc_cases(), "lawnCare": lc_cases()}
    json.dump(data, open(sys.argv[1], "w"), indent=1)

if __name__ == "__main__":
    main()
