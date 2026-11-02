"""Rebuild compact factual input rows from the publisher's supplementary forest plot."""
import argparse
import csv
import hashlib
import io
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SHA256 = "f382957ab46e43caeaf9c6d6e7bdfa683e90fd3ae014961a4e786800d23ab5fa"
URL = "https://ars.els-cdn.com/content/image/1-s2.0-S0022316624003924-mmc5.pdf"
ROW = re.compile(
    r"^\s*(?P<author>.+?)\s+(?P<year>\d{4}(?: \([ab]\))?)\s+(?P<n>\d+)\s+"
    r"(?P<source>.+?)\s+(?P<dose>[\d.]+)\s+(?P<window>[<>]?\d+)\s+"
    r"(?P<method>Reported|Calculated)\s+(?:Good|Poor)\s+"
    r"(?P<rr>[\d.]+)\s+\[[\d.]+\s+to\s+[\d.]+\]\s+[\d.]+\s*$"
)

def extract(path):
    from pypdf import PdfReader
    if hashlib.sha256(path.read_bytes()).hexdigest() != SHA256:
        raise ValueError("The PDF differs from the reviewed supplement")
    page = PdfReader(path).pages[2].extract_text(extraction_mode="layout")
    if "Insulin AUC (Without Diabetes)" not in page:
        raise ValueError("Unexpected panel")
    rows = []
    for line in page.splitlines():
        match = ROW.fullmatch(line)
        if match:
            rows.append({**match.groupdict(), "row": len(rows) + 1})
        elif "Reported" in line or "Calculated" in line:
            raise ValueError(f"Unparsed data row {line!r}")
    if len(rows) != 78:
        raise ValueError(f"Expected 78 comparison rows, found {len(rows)}")
    selections = [r for r in rows if r["window"] == "120"]
    out = io.StringIO()
    fields = ["row", "author", "year", "source", "dose", "method", "rr"]
    writer = csv.DictWriter(out, fields, extrasaction="ignore", lineterminator="\n")
    writer.writeheader()
    writer.writerows(selections)
    return out.getvalue(), Counter(r["window"] for r in rows)

if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf", type=Path)
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()
    data, counts = extract(args.pdf)
    target = ROOT / "comparisons.csv"
    if args.check:
        assert target.read_text(encoding="utf-8") == data
    else:
        target.write_bytes(data.encode("utf-8"))
    print("Forest comparisons by follow-up label:", dict(counts))
