"""Check retained public source assets optionally. PDF extraction requires pypdf."""
import hashlib,json,subprocess,sys
from pathlib import Path

root=Path(__file__).resolve().parent
if __name__=="__main__":
    sources=Path(sys.argv[1]).resolve()
    registry=json.loads((root/"sources.json").read_text(encoding="utf8"))
    for name in ["Thondre.xml","forest.pdf","acheson-fig4_lrg.jpg","moro-fig4.jpg"]:
        p=sources/name
        assert hashlib.sha256(p.read_bytes()).hexdigest()==registry["assets"][name]["sha256"],name
    sys.path.insert(0,str(root/"mixed"))
    from extract_plos import parse
    from extract_forest import extract
    assert parse(sources/"Thondre.xml")==json.loads((root/"mixed/plos.json").read_text(encoding="utf-8-sig"))
    csv_values,_=extract(sources/"forest.pdf")
    assert csv_values==(root/"mixed/comparisons.csv").read_text(encoding="utf-8-sig")
    print("PASS four original asset hashes, two Oxford tables and all 57 forest rows. Figure coordinates are retained visual readings.")
