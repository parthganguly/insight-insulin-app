"""Run the scientific comparisons offline, plus optional reconstruction from the original forest."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parent

def run(relative, *args):
    print(f"Checking {relative}", flush=True)
    subprocess.run([sys.executable, "-B", "-I", "-X", "utf8", str(ROOT/relative), *args],
                   cwd=ROOT, check=True)

def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--forest-pdf", type=Path, help="Optional publisher mmc5.pdf; requires pypdf")
    args = ap.parse_args()
    form = ROOT/"public"/"opus-experiment"
    receipt = json.loads((form/"FREEZE_RECEIPT.json").read_text(encoding="utf-8-sig"))
    for name in ("analysis.py", "PLAN.md", "inputs.json", "PREDICTIONS.json"):
        assert hashlib.sha256((form/name).read_bytes()).hexdigest() == receipt[name], name
    assert hashlib.sha256((ROOT/"transfer/PLAN.md").read_bytes()).hexdigest() == "fd993b6f92f7317bf277657ea15b46a7617beeba75e3df37f05dc5375be6b7cc"
    print("PASS protocol and four sealed Opus artifacts", flush=True)
    for script in ("transfer/evaluate.py", "transfer/anchor.py", "transfer/support.py",
                   "astra/evaluate.py","public/opus-experiment/analysis.py",
                   "public/opus-experiment/contrast_check.py", "nilsson/evaluate.py"):
        run(script, "--check")
    if args.forest_pdf:
        run("transfer/extract.py", str(args.forest_pdf.resolve()), "--check")
    print("PASS all seven offline scientific comparisons/checks", flush=True)

if __name__ == "__main__":
    main()
