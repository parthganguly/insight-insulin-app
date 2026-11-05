"""Optional checks against the original Katsanos vector PDF and Farup publisher JATS."""
from pathlib import Path
from hashlib import sha256
from tempfile import TemporaryDirectory
import json, subprocess,sys
from reproduce import same,read

ROOT=Path(__file__).resolve().parent
def audit(sources):
    registry=read(ROOT/"sources.json")
    for name,rec in registry["originals"].items():assert sha256((sources/name).read_bytes()).hexdigest()==rec["sha256"],name
    pdf=sources/"katsanos.pdf";jats=sources/"farup.xml"
    with TemporaryDirectory() as td:
        result=Path(td)/"figure.json"
        subprocess.run([sys.executable,"-B","-X","utf8",str(ROOT/"public/transfer/digitize_fig4.py"),str(pdf),str(result)],check=True,stdout=subprocess.PIPE)
        same(read(result),read(ROOT/"public/transfer/fig4_vector.json"),"vector")
        out=subprocess.check_output([sys.executable,"-B","-X","utf8",str(ROOT/"panel/extract_marginals.py"),str(pdf),str(result)])
        same(json.loads(out),read(ROOT/"panel/marginals.json"),"SE")
    out=subprocess.check_output([sys.executable,"-B","-X","utf8",str(ROOT/"panel/extract_farup.py"),str(jats)])
    same(json.loads(out),read(ROOT/"panel/farup.json"),"JATS")
    print("PASS original source hashes, 48 Figure 4 markers, 36 paired error-bar stems, Farup Table 1 and all four reported area estimates")
if __name__=="__main__":audit(Path(sys.argv[1]))
