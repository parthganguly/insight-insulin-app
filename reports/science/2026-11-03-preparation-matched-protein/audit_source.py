"""Optional re-extraction of published tables, marker centers and SEMs. Needs PyMuPDF."""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys

def main(source):
    import pymupdf
    root=Path(__file__).resolve().parent
    facts=json.loads((root/"experiment/facts.json").read_text())
    assert hashlib.sha256(source.read_bytes()).hexdigest()==facts["thesis_sha256"]
    with pymupdf.open(source) as doc:
        for n,cols,key,idx in [(24,6,"concurrent_percent_dry_product",{"soy":2,"pea":0}),
                                (60,2,"staggered_percent_dry_product",{"soy":0,"pea":1})]:
            page=doc[n-1].get_text()
            text=page[page.index("Asx"):page.index("Values expressed")]
            values=[float(v) for v in re.findall(r"(?m)^\s*(\d+\.\d+)\s*$",text)]
            assert len(values)==18*cols
            for arm,c in idx.items():
                assert values[c::cols]==facts[key][arm]
        for page,arms in [(64,("soy","CHO")),(66,("soy_CHO","CHO_soy")),(67,("soy_CHO","pea_CHO"))]:
            text=doc[page-1].get_text()
            row=re.search(r"Insulin\s+([\d.]+)\s*±\s*([\d.]+)\s+([\d.]+)\s*±\s*([\d.]+)",text)
            numbers=list(map(float,row.groups()))
            assert numbers==sum((facts["staggered_150_native"][a] for a in arms),[])
    for script,snapshot in [("extract.py","graph-input.json"),("SEM-extract.py","SEM-input.json")]:
        raw=subprocess.check_output([sys.executable,"-B",str(root/"curves"/script),str(source)])
        assert json.loads(raw)==json.loads((root/"curves"/snapshot).read_text())
    raw=subprocess.check_output([sys.executable,"-B",str(root/"sol/extract_vectors.py"),str(source)])
    assert json.loads(raw)==json.loads((root/"sol/chapter3-extraction.json").read_text())
    print("PASS: 12 independently extracted bars and whiskers, 72 linked two-source composition entries, three clinical table rows, 35 means and 21 SEMs")

if __name__=="__main__":
    main(Path(sys.argv[1]))
