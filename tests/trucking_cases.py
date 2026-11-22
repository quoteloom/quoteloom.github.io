"""Expected values for the free trucking calculator from an independent Python model."""
import json, sys

def expected(c):
    miles = c["miles"]
    loaded_pct = min(max(c["loadedPct"] / 100, 0), 1)
    fixed_annual = 12 * (c["truck"] + c["eld"] + c["otherFixed"]) + c["insurance"] + c["permits"]
    fuel_cpm = 0.0 if c["mpg"] <= 0 else c["fuelPrice"] / c["mpg"]
    variable_cpm = fuel_cpm + c["maint"] + c["tires"] + c["tolls"]
    driver = c["driver"]
    fixed_cpm = None if miles <= 0 else fixed_annual / miles
    total_cpm = None if fixed_cpm is None else fixed_cpm + variable_cpm + driver
    be_total = total_cpm
    be_loaded = None if (total_cpm is None or loaded_pct <= 0) else total_cpm / loaded_pct
    trip = c["loaded"] + c["deadhead"]
    revenue = c["rate"] * c["loaded"]
    load_cost = None if total_cpm is None else total_cpm * trip
    load_profit = None if load_cost is None else revenue - load_cost
    load_be = None if (load_cost is None or c["loaded"] <= 0) else load_cost / c["loaded"]
    return dict(fixedAnnual=fixed_annual, fuelCpm=fuel_cpm, variableCpm=variable_cpm,
                fixedCpm=fixed_cpm, driverCpm=driver, totalCpm=total_cpm,
                beTotal=be_total, beLoaded=be_loaded, trip=trip, revenue=revenue,
                loadCost=load_cost, loadProfit=load_profit, loadBe=load_be)

# Default teaser numbers are rounded examples (not market rates or ATRI averages).
base = dict(miles=100000, truck=2200, insurance=12000, permits=2000, eld=40, otherFixed=250,
            fuelPrice=5.90, mpg=7.0, maint=0.20, tires=0.05, tolls=0.04, driver=0,
            loadedPct=84, rate=2.40, loaded=500, deadhead=80)
cases = [
    dict(base),
    dict(base, miles=0),
    dict(base, mpg=0, fuelPrice=5.90),
    dict(base, loadedPct=0, loaded=0, deadhead=200, rate=2.40),
    dict(base, driver=0.65, rate=2.55, loaded=620, deadhead=40),
    dict(base, fuelPrice=8.0, mpg=5.0, maint=0.40, driver=0.90, rate=1.50, loaded=400, deadhead=200),
    dict(base, miles=85000, truck=0, insurance=8000, permits=1500, eld=25, otherFixed=100,
         fuelPrice=0, mpg=8, maint=0.10, tires=0, tolls=0, driver=0, loadedPct=100,
         rate=2.00, loaded=300, deadhead=0),
]
out = [{"in": c, "exp": expected(c)} for c in cases]
json.dump(out, open(sys.argv[1], "w"))
