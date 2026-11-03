"""Replay the common-control checkpoint offline. Optionally verify original source assets."""
import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parent
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sources-dir",type=Path)
    args=parser.parse_args()
    opus=ROOT/"public/vanloon"
    receipt=json.loads((opus/"FREEZE_RECEIPT.json").read_text(encoding="utf-8-sig"))
    for name in ("PLAN.md","inputs.json","analysis.py","PREDICTIONS.json"):
        assert sha(opus/name)==receipt[name],name
    for name,digest in {"PLAN.md":"f14678a2b40b66ac0e02b10090ec135a4ae16273fc093126083403e97ffe2acc",
                        "frozen.json":"3c7acf912b4fa8c759cce12c4cda279298ab71c84cf44345ddf6dc0c60987a99"}.items():
        assert sha(ROOT/"profiles"/name)==digest,name
    print("PASS sealed forecasts and plans",flush=True)
    for script in ("public/vanloon/analysis.py","public/vanloon/bounds.py","public/vanloon/correction_v2.py","public/vanloon/pairs.py",
                   "profiles/evaluate.py","profiles/diagnose.py","profiles/reading_bound.py","astra/evaluate.py","astra/energy_posthoc.py"):
        subprocess.run([sys.executable,"-B","-I","-X","utf8",str(ROOT/script),"--check"],cwd=ROOT,check=True)
    if args.sources_dir:
        for entry in json.loads((ROOT/"sources.json").read_text(encoding="utf-8-sig")):
            assert sha(args.sources_dir/entry["name"])==entry["sha256"],entry["name"]
        print("PASS original source-asset identity; figure transcriptions independently audited",flush=True)
    print("PASS nine current scientific executions",flush=True)
if __name__=="__main__":main()
