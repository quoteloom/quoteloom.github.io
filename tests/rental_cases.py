"""Expected values for the free rental calculator from the product's independent model (bisection payment)."""
import json, sys
sys.path.insert(0, "/workspace/business/products/rental-analyzer/tests"); sys.path.insert(0, "/workspace/business/products/rental-analyzer/src")
from test_workbook import deal
cases = [dict(price=240000, closing=12200, down=25, rate=7, term=30, rent=2100, vac=6, opex=763.92),
         dict(price=200000, closing=5000, down=10, rate=0, term=10, rent=1800, vac=5, opex=500),
         dict(price=310000, closing=18000, down=100, rate=6, term=30, rent=3100, vac=7, opex=1294.47),
         dict(price=450000, closing=9000, down=20, rate=7.5, term=30, rent=2200, vac=6, opex=900)]
out = []
for c in cases:
    d = dict(price=c["price"], closing=c["closing"], rehab=0, down=c["down"]/100, rate=c["rate"]/100, term=c["term"], rent=c["rent"], other=0,
             vac=c["vac"]/100, tax=0, ins=0, hoa=0, mgmt=0, rep=0, capex=0, util=c["opex"])
    e = deal(d); out.append({"in": c, "exp": {"pmt": e["pmt"], "noi": e["noi_y"]/12, "cf": e["cf_m"], "cap": e["cap"], "coc": e["coc"]}})
json.dump(out, open(sys.argv[1], "w"))
