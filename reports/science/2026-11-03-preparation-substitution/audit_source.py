"""Optional source-linked replay. Standard offline calculations do not require publication files."""
from pathlib import Path
import csv,re,shutil,sys,tempfile
import xml.etree.ElementTree as ET
import pymupdf
from PIL import Image
from reproduce import ROOT,read,sha,same,run
def rows(xml,label):
    doc=ET.parse(xml)
    t=next(t for t in doc.findall('.//table-wrap') if t.findtext('label')==label)
    return [[' '.join(''.join(c.itertext()).split()) for c in row] for row in t.findall('.//tr')]
def audit(assets):
    for name,entry in read(ROOT/'sources.json')['originals'].items():assert sha(assets/name)==entry['sha256'],name
    q=read(ROOT/'contrast/assay_inputs.json')
    w=assets/'wei.xml';z=assets/'zhao.xml'
    r=rows(w,'Table 9')
    for (label,y,sem),row in zip(zip(['RC','HP + R','SP + R'],q['wei']['insulin_area'],q['wei']['SEM']),r[1:]):
        assert row[0]==label
        assert list(map(int,re.findall(r'\d+',row[1].replace(',',''))))==[y,sem]
    tab=rows(w,'Table 5')
    for row,key in zip(tab[1:4],['rice','hard','soft']):
        same([float(v.split()[0]) for v in row[1:]],q['wei']['RDS_SDS_RS_percent'][key])
    zr=next(r for r in rows(z,'Table 2') if r[0].replace(' ','')=='iAUC0–120')
    same([float(zr[i].split()[0]) for i in [1,3,5]],[230.4,229.3,213.5])
    # Verify selected Fig 1 bar edges, not just the hash. Allow half-pixel convention and antialiasing.
    im=Image.open(assets/'zhao_fig.jpg').convert('L')
    for duration,cols in q['zhao']['x_columns'].items():
        for col,height in zip(cols,q['zhao']['bars'][duration]):
            row=round(height);assert min(im.getpixel((col,y)) for y in range(row-1,row+2))<105,(col,height)
    for n in ['bmjcred00240-0009.png','bmjcred00240-0010.png']:assert Image.open(assets/n).size==(816,1120)
    with pymupdf.open(assets/'collier.pdf') as pdf:
        t=pdf[2].get_text()
        for y,se in [(3333,590),(3024,452),(1796,333),(1324,256)]:assert re.search(str(y)+r'\D{1,8}'+str(se),t)
    with tempfile.TemporaryDirectory() as tmp:
        d=Path(tmp);(d/'raw').mkdir()
        shutil.copyfile(assets/'collier.pdf',d/'raw/collier.pdf')
        shutil.copyfile(ROOT/'astra/collier_fig1.py',d/'collier_fig1.py');run(d/'collier_fig1.py')
        def csvrows(path):
            with path.open(encoding='utf8',newline='') as f:return list(csv.reader(f))
        assert csvrows(d/'collier_chart_120.csv')==csvrows(ROOT/'astra/collier_chart_120.csv')
    run(ROOT/'public/cooking/wei.py','verify',w)
    print('PASS original hashes, Wei and Zhao table cells, figure landmarks, Collier printed estimates and two-hour coordinate replay')
if __name__=='__main__':audit(Path(sys.argv[1]))
