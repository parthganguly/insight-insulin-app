"""Verify optional local originals. No external source is required for the offline replay."""
from pathlib import Path
from hashlib import sha256
from io import BytesIO
import json,re,sys

def run(directory):
    import pymupdf
    from PIL import Image
    root=Path(__file__).resolve().parent
    registry=json.loads((root/"sources.json").read_text(encoding="utf8"))
    for name,meta in registry["originals"].items():
        assert sha256((directory/name).read_bytes()).hexdigest()==meta["sha256"],name
    with pymupdf.open(directory/"postexercise.pdf") as d:
        for idx,expected in registry["target_figure_pixel_sha256"].items():
            obj=d.extract_image(int(idx))
            assert sha256(Image.open(BytesIO(obj["image"])).convert("L").tobytes()).hexdigest()==expected
        section=" ".join(p.get_text() for p in d)
        assert "Hyprol" in section and "insulin" in section
    with pymupdf.open(directory/"pea2021.pdf") as d:
        pg=next(p.get_text() for p in d if "3369.6" in p.get_text())
        vals=json.loads((root/"mixed/pea2021.json").read_text())["native_120"]
        assert all(str(x) in pg for x in vals)
        assert re.search(r"3369\.6\s*±\s*1516\.5",pg)
    print("PASS three PDF hashes, two original postexercise figures and Oxford 2021 source table")

if __name__=="__main__":run(Path(sys.argv[1]))
