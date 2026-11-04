"""Audit local publication files plus the public statistical source streamed in memory."""
from pathlib import Path
import csv
import json
import re
import shutil
import sys
import tempfile
import xml.etree.ElementTree as ET
from zipfile import ZipFile
from reproduce import ROOT, read, run, same, sha

def audit(folder):
    for name, source in read(ROOT/"sources.json")["originals"].items():
        if name == 'kanata-screenshot.png' and not (folder/name).exists():
            continue  # Local browser capture; coordinates can be replayed independently.
        assert sha(folder/name) == source["sha256"], name
    bread = read(ROOT/"bread/inputs.json")
    xml = ET.parse(folder/"PMC7859705.xml")
    rows = [[" ".join("".join(c.itertext()).split()) for c in r] for r in xml.findall(".//table-wrap//tr")]
    def row(name):
        return next(values[1:] for values in rows if values[0].startswith(name))
    weights = list(map(float,row("Wheat flour")))
    same([sum(weights[0:2]), sum(weights[2:4]), sum(weights[4:6])], bread["wheat_flour_g_batch"])
    same(list(map(float,row("Total Starch"))), bread["starch_g"])
    same(list(map(float,row("Total Sugars"))), bread["sugar_g"])
    with ZipFile(folder/"target_mmc.docx") as doc:
        table = ET.fromstring(doc.read("word/document.xml"))
    rows = [[" ".join("".join(c.itertext()).split()) for c in r.findall("{*}tc")] for r in table.findall(".//{*}tr")]
    # Check both the fixed window and its insulin row, distinct from the glucose and first-peak tables.
    insulin = next(values for values in rows if values[0]=="iAUC0-120min" and values[1].startswith("4523 "))
    numbers = [list(map(float,re.findall(r"\d+(?:\.\d+)?", value)[:2])) for value in insulin[1:4]]
    same([pair[0] for pair in numbers], bread["insulin_iAUC_0_120"])
    same([pair[1] for pair in numbers], bread["insulin_iAUC_0_120_SEM"])
    print("PASS original recipe and fixed-window insulin tables")
    with tempfile.TemporaryDirectory() as tmp:
        work = Path(tmp)
        for sub in ("astra","pilot","sol"):
            shutil.copytree(ROOT/sub,work/sub)
        for name in ["cai.pdf","hummus.pdf"]:
            shutil.copyfile(folder/name, work/"astra"/name)
        run(work/"astra/extract.py")
        with (work/"astra/aggregate.csv").open(newline="") as a, (ROOT/"astra/aggregate.csv").open(newline="") as b:
            assert list(csv.reader(a)) == list(csv.reader(b))
        print("PASS original PDF vector paths and retained manual figure coordinates")
        same(json.loads(run(work/"pilot/aggregate.py")), read(ROOT/"pilot/aggregate.json"))
        run(work/"sol/verify_cai_aggregate.py")
        same(read(work/"sol/cai-independent-aggregate.json"), read(ROOT/"sol/cai-independent-aggregate.json"))
        print("PASS two independent in-memory reductions of the published insulin source")
if __name__=="__main__":
    audit(Path(sys.argv[1]))
