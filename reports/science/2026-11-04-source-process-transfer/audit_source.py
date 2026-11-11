"""Optional verification against original public images and publisher table extractions."""
from pathlib import Path
import csv,hashlib,json,re,sys
from PIL import Image
from reproduce import ROOT,read,same

def audit(d):
    registry=read(ROOT/'sources.json')
    for k,row in registry['local_assets'].items():
        assert hashlib.sha256((d/k).read_bytes()).hexdigest()==row['sha256'],k
    fig=read(ROOT/'wheat_inputs.json');p=fig['figure2']
    im=Image.open(d/'belobrajdic_figure2.jpg').convert('L').crop(tuple(p['crop']))
    # Confirm our manual coordinates are registered to the retained image. Nearby ink alone cannot name a curve.
    for arm in fig['arms'].values():
        for x,y in zip(p['x'],arm['y']):
            assert im.crop((x-4,y-3,x+5,y+4)).getextrema()[0]<195
    t=(d/'belobrajdic_primary.md').read_text(encoding='utf8')
    for k in ['Starch','Sugars','Resistant starch','Protein','Fat','Moisture','Fiber']:
        line=next(r for r in t.splitlines() if r.startswith('| '+k+' |'))
        vals=[float(v.strip().replace(',','')) for v in line.split('|')[2:6]]
        same(vals,[v[k] for v in fig['arms'].values()],k)
    t3=next(r for r in t.splitlines() if r.startswith('| Plasma insulin (ng/L'))
    assert all(str(v) in t3 for v in [87.8,9.3,57.8,6.1,80.8,9.2,64.8,7.1])
    print('PASS wheat publisher tables, original image identity, geometry and 24 recorded point neighborhoods')
    # Registered author figure captures for Hoebler.
    i=Image.open(d/'hoebler_insulin.png').convert('L')
    h=Image.open(d/'hoebler_digest.png').convert('L')
    for im,file in [(i,'fig1b_points.csv'),(h,'fig2_points.csv')]:
        for r in csv.DictReader((ROOT/'support/hoebler'/file).open()):
            x=int(r['x_px']);y=int(r['y_px'])
            assert im.crop((x-3,y-3,x+4,y+4)).getextrema()[0]<200,(file,x,y)
    print('PASS source-figure coordinate registration for bread, pasta and digestion readings')
    import pymupdf
    doc=pymupdf.open(d/'ito.pdf')
    assert len(doc)>3
    paths=doc[3].get_drawings()
    # The ratio uses bar heights from the same axis. Independently identify rectangles via native vector geometry.
    for row in csv.DictReader((ROOT/'support/rice/ito-figure2.csv').open()):
        y=float(row['bar_top_pdf_y'])
        assert any(abs(item[1].y0-y)<0.01 for s in paths for item in s['items'] if item[0]=='re')
    print('PASS original Japanese rice vector bar geometry')
    print('PASS all source asset hashes')
if __name__=='__main__':audit(Path(sys.argv[1]))
