"""Extract the human Table 1 and the reported insulin AUCs, excluding the animal experiment."""
from pathlib import Path
import json,re,sys
import xml.etree.ElementTree as ET

def parse(path):
    root=ET.parse(path)
    table=next(t for t in root.findall(".//table-wrap") if "Characterization of the High DH" in (t.findtext("caption/p") or ""))
    rows=[[" ".join("".join(c.itertext()).split()) for c in tr] for tr in table.findall(".//tr")]
    names=rows[0][1:]
    assert names==["High DH","Medium DH","Low DH","Casein"]
    arms={name:{} for name in names}
    fields={"Leucine":"leu_per100protein","Degree of hydrolysis (% cleaved peptide bonds)":"dh",
            "Protein, as is (%), (N × 6.38)":"protein_pct","Lactose, as is (%)":"lactose_pct","Fat, as is (%)":"fat_pct"}
    for row in rows:
        if row[0] in fields:
            for name,val in zip(names,row[1:]):
                arms[name][fields[row[0]]]=None if val=="NA" else float(val)
    text=" ".join(" ".join(root.getroot().itertext()).split())
    expr=r"(High DH|Medium DH|Low DH|Casein) ([\d.]+) \[(-?[\d.]+), ([\d.]+)\]"
    auc=text.split("Insulin AUC estimates and 95 % CI were:")[1]
    found=re.findall(expr,auc)[:4]
    assert [r[0] for r in found]==names
    for name,mean,lo,hi in found:
        arms[name].update(auc=float(mean),interval=[float(lo),float(hi)])
    assert "20 g of the respective proteins" in text and "500 mL" in text
    assert "log transformed before statistical analyses" in text
    return {"protein_g":20,"water_ml":500,"arms":arms}
if __name__=="__main__":print(json.dumps(parse(Path(sys.argv[1])),indent=2))
