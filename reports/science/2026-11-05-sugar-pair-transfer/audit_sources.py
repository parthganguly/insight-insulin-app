"""Optional direct-source audit: python audit_sources.py DIRECTORY (PyMuPDF)."""
from pathlib import Path
import csv,hashlib,json,re,subprocess,sys,tempfile,shutil
import pymupdf
ROOT=Path(__file__).resolve().parent
def clean(s):return re.sub(r'\s+','',s).lower()
def main():
    assets=Path(sys.argv[1]).resolve(strict=True)
    rows=json.loads((ROOT/'source_assets.json').read_text(encoding='utf8'))
    for a in rows:
        assert hashlib.sha256((assets/a['name']).read_bytes()).hexdigest()==a['sha256'],a['name']
    with pymupdf.open(assets/'target.pdf') as doc:
        im=[g for g in doc[3].get_images() if g[0]==118];assert im[0][2:4]==(809,988)
        txt=clean(' '.join(p.get_text() for p in doc))
        for v in ('9425','15216','5779','7326','17934','20875','11726','17658'):assert v in txt,v
    with pymupdf.open(assets/'kawai.pdf') as doc:
        assert doc[1].get_images()[0][2:4]==(4299,6071)
        txt=clean(' '.join(p.get_text() for p in doc))
        for v in ('56.5','118.7','palatinose','sucrose'):assert v in txt,v
    with tempfile.TemporaryDirectory() as td:
        path=Path(td);shutil.copyfile(ROOT/'matched/extract_vectors.py',path/'extract_vectors.py')
        subprocess.run([sys.executable,'-B','-X','utf8',str(path/'extract_vectors.py'),'--source-dir',str(assets)],check=True)
        def coordinates(p):
            with p.open(newline='',encoding='utf8') as f:return list(csv.reader(f))
        assert coordinates(path/'coordinates.csv')==coordinates(ROOT/'matched/coordinates.csv')
    subprocess.run([sys.executable,'-B','-I','-X','utf8',str(ROOT/'opus_pair/pair.py'),'--check','--lab','--sources',str(assets)],check=True)
    print(f'PASS {len(rows)} original asset hashes, both target figure editions, numerical source text, 56 donor vertices and six original publisher figure/table images')
if __name__=='__main__':main()
