"""Independent Python expectations for the mini calculator; case 'wb_*' cross-checks the
LibreOffice-recalculated workbook: mini profit == workbook profit + equipment + overhead."""
import json, sys
cases = [
 {"name":"default","in":{"price":500,"hours":3,"crew":2,"rate":22,"other":60,"targetPct":35}},
 {"name":"loss","in":{"price":150,"hours":4,"crew":3,"rate":30,"other":40,"targetPct":40}},
 {"name":"solo_zero_target","in":{"price":275.5,"hours":2.25,"crew":1,"rate":27.5,"other":18.75,"targetPct":0}},
 {"name":"zero_price","in":{"price":0,"hours":1,"crew":2,"rate":20,"other":10,"targetPct":30}},
 # Workbook scenario 1 (LibreOffice): quoted 866.40, crew hours 5.275, crew 2, rate 22, chem 62.40 + travel 16.80;
 # workbook profit 517.461111 + equipment 7.638889 + overhead 30.00 = 555.10
 {"name":"wb_scenario1","in":{"price":866.4,"hours":5.275,"crew":2,"rate":22,"other":79.2,"targetPct":35},"wb_profit_plus_fixed":517.461111111111+5500/720+30},
]
for c in cases:
    v=c["in"]; labor=v["hours"]*v["crew"]*v["rate"]; cost=labor+v["other"]; profit=v["price"]-cost
    t=v["targetPct"]/100
    c["exp"]={"labor":labor,"cost":cost,"profit":profit,"margin":profit/v["price"] if v["price"]>0 else 0,"minPrice":cost/(1-t)}
    if "wb_profit_plus_fixed" in c: assert abs(c["wb_profit_plus_fixed"]-profit)<1e-6, (c["wb_profit_plus_fixed"],profit)
json.dump(cases, open(sys.argv[1],"w"), indent=1)
