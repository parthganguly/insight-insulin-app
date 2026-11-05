"""Re-read PLOS NCT04871971 Tables 1 and 4 from original JATS."""
import json, re, sys
import xml.etree.ElementTree as ET

def parse(path):
    root=ET.parse(path)
    tables={t.findtext("label").strip("."):t for t in root.findall(".//table-wrap")}
    def rows(k):
        return [[" ".join("".join(c.itertext()).split()) for c in row] for row in tables[k].findall(".//tr")]
    comp=rows("Table 1")
    arm_names=["glucose","pea_low","pea_high","whey_low","whey_high"]
    assert comp[0][1:]==["GLU","GLU + 10g-PP","GLU + 20g-PP","GLU + 10g-WP","GLU + 20g-WP"]
    labels={"Alanine":"Ala","Arginine":"Arg","Aspartic acid":"Asx","Glutamic acid":"Glx","Glycine":"Gly",
            "Histidine":"His","Isoleucine":"Ile","Leucine":"Leu","Lysine":"Lys","Methionine":"Met",
            "Phenyl alanine":"Phe","Proline":"Pro","Serine":"Ser","Threonine":"Thr","Tyrosine":"Tyr",
            "Valine":"Val","Tryptophan":"Trp","Cysteine":"Cys"}
    result={k:{} for k in arm_names}
    for row in comp[1:]:
        if len(row)!=6:continue
        field={"Energy(kCal/kJ)":"kcal","Protein (g)":"protein","Available Carbohydrates (g)":"availCHO",
               "Fat (g)":"fat","Dietary Fibre (g)":"fibre"}.get(row[0],labels.get(row[0]))
        if field:
            for arm,val in zip(arm_names,row[1:]):
                result[arm][field]=float(val.split("/")[0])
    area=next(r for r in rows("Table 4") if r[0]=="iAUC 120")
    for arm,cell in zip(arm_names,area[1:]):
        mean,sd=re.findall(r"[\d.]+",cell)[:2]
        result[arm].update(area120=float(mean),SD120=float(sd))
    return result

if __name__=="__main__":
    print(json.dumps(parse(sys.argv[1]),indent=2))
