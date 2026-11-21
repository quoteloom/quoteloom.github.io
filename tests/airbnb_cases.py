"""Expected values for the free Airbnb calculator from an independent annual (365-day) Python model."""
import json, sys

def layer(rate, stay, clean_fee, platform, lodging_tax, clean_cost, supplies, mgmt, nights):
    stays = nights / stay if stay > 0 else 0.0
    lodging = nights * rate
    clean_rev = stays * clean_fee
    gross = lodging + clean_rev
    plat = gross * platform
    ltax = lodging * lodging_tax
    net = gross - plat - ltax
    var_cost = stays * (clean_cost + supplies) + net * mgmt
    return dict(nights=nights, stays=stays, lodging=lodging, cleanRev=clean_rev, gross=gross,
                plat=plat, ltax=ltax, net=net, varContrib=net - var_cost)

def expected(c):
    occ = min(max(c["occ"] / 100, 0), 1)
    platform = max(c["platform"] / 100, 0)
    lodging_tax = max(c["lodgingTax"] / 100, 0)
    mgmt = max(c["mgmt"] / 100, 0)
    kw = dict(rate=c["rate"], stay=c["stay"], clean_fee=c["cleanFee"], platform=platform,
              lodging_tax=lodging_tax, clean_cost=c["cleanCost"], supplies=c["supplies"], mgmt=mgmt)
    a = layer(nights=365 * occ, **kw)
    pot = layer(nights=365, **kw)
    fixed = c["housing"] * 12 + c["util"] * 12 + c["other"] * 12 + c["annualFixed"]
    cf = a["varContrib"] - fixed
    a.update(fixed=fixed, cf=cf, cfm=cf / 12,
             coc=None if c["invested"] <= 0 else cf / c["invested"],
             beo=None if pot["varContrib"] <= 0 else fixed / pot["varContrib"],
             potVar=pot["varContrib"])
    return a

# Default teaser numbers are rounded examples (not the workbook's seasonal deal).
cases = [
    dict(rate=165, occ=62, stay=3.5, cleanFee=125, platform=15, lodgingTax=6, cleanCost=85,
         supplies=12, mgmt=0, housing=1362, util=180, other=149, annualFixed=4400, invested=92000),
    dict(rate=165, occ=0, stay=3.5, cleanFee=125, platform=15, lodgingTax=6, cleanCost=85,
         supplies=12, mgmt=0, housing=1362, util=180, other=149, annualFixed=4400, invested=92000),
    dict(rate=165, occ=100, stay=3.5, cleanFee=125, platform=15, lodgingTax=6, cleanCost=85,
         supplies=12, mgmt=0, housing=1362, util=180, other=149, annualFixed=4400, invested=92000),
    dict(rate=90, occ=35, stay=1.0, cleanFee=80, platform=25, lodgingTax=12, cleanCost=150,
         supplies=15, mgmt=20, housing=1800, util=200, other=200, annualFixed=5000, invested=40000),
    dict(rate=140, occ=70, stay=0, cleanFee=95, platform=15, lodgingTax=8, cleanCost=70,
         supplies=10, mgmt=10, housing=1850, util=140, other=104, annualFixed=480, invested=11700),
    dict(rate=200, occ=80, stay=4, cleanFee=0, platform=0, lodgingTax=0, cleanCost=0,
         supplies=0, mgmt=0, housing=0, util=0, other=0, annualFixed=0, invested=0),
    dict(rate=50, occ=40, stay=2, cleanFee=20, platform=20, lodgingTax=10, cleanCost=80,
         supplies=30, mgmt=25, housing=3000, util=250, other=200, annualFixed=6000, invested=8000),
]
out = [{"in": c, "exp": expected(c)} for c in cases]
json.dump(out, open(sys.argv[1], "w"))
