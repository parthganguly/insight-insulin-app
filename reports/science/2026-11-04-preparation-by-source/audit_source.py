"""Optional original-source replay. Expects bornet.pdf from the HAL archive in DIRECTORY."""
from pathlib import Path
import hashlib,json,re,sys
import pymupdf
from PIL import Image
from reproduce import ROOT,read,same

def audit(directory):
    p=directory/"bornet.pdf"
    inputs=read(ROOT/"bornet_inputs.json")
    assert hashlib.sha256(p.read_bytes()).hexdigest()==inputs["pdf_sha256"]
    clinical_x={"raw":[354,471,590,709],"gel":[350,466,586,700],"industrial":[343,459,578,696]}
    with pymupdf.open(p) as doc:
        assert len(doc)==11
        def crop(index,xy):
            pix=doc[index].get_pixmap(clip=pymupdf.Rect(*xy),matrix=pymupdf.Matrix(4,4))
            return Image.frombytes("RGB",(pix.width,pix.height),pix.samples).convert("L")
        insulin=crop(5,inputs["figure2"]["clip"]);assay=crop(6,inputs["figure3"]["clip"])
        assert insulin.size==(1016,1876) and assay.size==(1032,580)
        def nearby_ink(im,x,y):
            return im.crop((int(x)-4,int(y)-3,int(x)+5,int(y)+4)).getextrema()[0]<190
        for group,data in inputs["groups"].items():
            for a in data["arms"]:
                assert all(nearby_ink(insulin,x,y) for x,y in zip(clinical_x[group],a["insulin_marker_y"]))
                assert all(nearby_ink(assay,x,y) for x,y in zip([244,275],a["hydrolysis_marker_y_at_20_30"]))
    # This is a check of source/scan registration; filtering dark neighborhoods cannot identify a curve on its own.
    print("PASS original Bornet PDF hash, figure geometry and 54 recorded marker neighborhoods")
    barley=directory/"granfeldt_table2_ocr.txt"
    if barley.is_file():
        assert hashlib.sha256(barley.read_bytes()).hexdigest()==read(ROOT/"sources.json")["Granfeldt"]["table_excerpt_sha256"]
        lines=dict(re.findall(r"^L([0-9]+): (.*)",barley.read_text(encoding="utf8").split("L945:")[0],re.M))
        arms=list(read(ROOT/"barley_inputs.json")["arms"].values())
        for label,field in [("935","mean_120"),("923","mean_90"),("938","II_120"),("940","HI_180")]:
            row=lines[label]
            values=[float(v) for v in re.findall(r"(\d+(?:\.\d+)?)\s*±",row)]
            if field in ("II_120","HI_180"):values.insert(0,100)
            same(values,[arm[field] for arm in arms],field)
        print("PASS four published barley rows from the retained Table 2 excerpt")
    print("Table 5 was transcribed and independently inspected; the scan has no electronic table layer.")
if __name__=="__main__":audit(Path(sys.argv[1]))
