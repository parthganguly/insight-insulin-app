"""Run this checkpoint from a clean checkout or extracted handoff. No network needed."""
import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path
from xml.etree import ElementTree

ROOT=Path(__file__).resolve().parent

def digest(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def audit_sources(directory):
    registry=json.loads((ROOT/"source_files.json").read_text(encoding="utf-8"))
    for entry in registry:
        path=directory/entry["filename"]
        assert digest(path)==entry["sha256"],path.name
    # Confirm key recaps against the two primary full-text XMLs. Figure coordinates are
    # human readings, separately checked, not inferred by the XML parser.
    xml=lambda name:ElementTree.parse(directory/(name+".xml"))
    phe=" ".join("".join(p.itertext()) for p in xml("PMC3745835").findall(".//body//p"))
    for term in ("53.2","77%","66% and 7%","39%","NCT01471509"):
        assert term in phe,term
    gly=xml("PMC4121211")
    text=" ".join("".join(p.itertext()) for p in gly.findall(".//body//p"))
    assert "52.5" in text and "area of the water control was subtracted" in text
    rows=[[" ".join("".join(cell.itertext()).split()) for cell in row.findall("td")] for row in gly.findall(".//table-wrap//tr")]
    for label,wanted in [("Glucose + Gly","101%"),("Glucose + Leu","159%"),("Gluc + Leu + Gly","124%")]:
        assert any(r and r[0]==label and wanted in r for r in rows),label
    print("PASS primary PDF/figure/XML hashes and primary-text facts",flush=True)

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sources-dir",type=Path)
    args=parser.parse_args()
    frozen={"pairs/protocol.md":"f8ad2e4d1a59688ae56b8186b85921bb0ae203efc91c37b7e08804fe39e0bbcc",
            "substitution/protocol.md":"cefe2c0c83c7b9fa60d4b550f032064644bad7107e7e5c94c0a011894a8cc2d5",
            "substitution/frozen.json":"fd42a694c5e7fce259debba219771f2448b7fcfd0a53965f2c4033be78265e07",
            "astra/FREEZE.json":"5c20cebd0d2b88b85c17c68ef1a01211ea4eb36a951934915d9e14c35c166072"}
    assert all(digest(ROOT/name)==value for name,value in frozen.items())
    for name in ("substitution/evaluate.py","pairs/evaluate.py","astra/evaluate.py","astra/graphic_sensitivity_v2.py"):
        subprocess.run([sys.executable,"-B","-I","-X","utf8",str(ROOT/name),"--check"],check=True)
    if args.sources_dir:audit_sources(args.sources_dir)
    print("PASS all four scientific executions and pre-scoring hashes",flush=True)

if __name__=="__main__":
    main()
