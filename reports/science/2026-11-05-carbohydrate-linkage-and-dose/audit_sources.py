"""Optional original-asset audit. Usage: python audit_sources.py ASSET_DIRECTORY."""
import csv
import hashlib
import json
import math
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parent


def source_table(xml, name):
    doc=ET.parse(xml)
    tables=[t for t in doc.iter('table-wrap') if t.findtext('label','').strip().rstrip('.')==name]
    assert len(tables)==1, name
    return [[' '.join(''.join(cell.itertext()).split()) for cell in row.findall('td')]
            for row in tables[0].iter('tr') if row.findall('td')]


def main(assets):
    import pymupdf
    manifest=json.loads((ROOT/'source_assets.json').read_text())
    for filename,entry in manifest.items():
        assert hashlib.sha256((assets/filename).read_bytes()).hexdigest()==entry['sha256'],filename
    print('Matched',len(manifest),'original asset fingerprints')
    with pymupdf.open(assets/'holub.pdf') as doc:
        drawing=doc[5].get_drawings()
        _,top,bottom=drawing[58]['items'][0]
        with (ROOT/'data/holub.csv').open() as f:
            records=list(csv.DictReader(f))
        for arm,p in [('sucrose',103),('isomaltulose',105)]:
            curated=[r for r in records if r['sugar']==arm]
            stems=drawing[p]['items'][:18:2]
            assert len(curated)==len(stems)==9
            for r,stem in zip(curated,stems):
                value=(bottom.y-stem[1].y)*600/(bottom.y-top.y)
                assert math.isclose(float(r['pmol_L']),value,abs_tol=1e-4)
    with pymupdf.open(assets/'vancan.pdf') as doc:
        paths=doc[2].get_drawings()
        items=paths[228]['items']
        y0,y1=items[17][1].y,items[17][2].y
        with (ROOT/'data/vancan.csv').open() as f:
            rows=list(csv.DictReader(f))
        for arm,period,first in [('sucrose','morning',27),('sucrose','lunch',33),
                                 ('isomaltulose','morning',39),('isomaltulose','lunch',45)]:
            pts=[items[first][1]]+[s[2] for s in items[first:first+6]]
            checked=[r for r in rows if r['sugar']==arm and r['period']==period]
            assert len(checked)==len(pts)==7
            assert all(abs(float(r['mean_uU_ml'])-(y0-p.y)*160/(y0-y1))<.0001 for r,p in zip(checked,pts))
    table=source_table(assets/'trehalose.xml','Table 1')
    start=next(i for i,r in enumerate(table) if r[0]=='Insulin')
    for (name,mean,se),row in zip([('Glucose',1709,142),('Trehalose',590,101)],table[start+1:start+3]):
        assert row[0]==name and tuple(map(int,re.findall(r'\d+',row[-1])))==(mean,se)
    text=' '.join(' '.join(ET.parse(assets/'trehalose.xml').getroot().itertext()).split())
    assert 'ignoring the area beneath the fasting concentration' in text
    assert '28 g of TREHA' in text and '36%' in text
    tab=source_table(assets/'johansen.xml','Table 3')
    flat=' | '.join(' '.join(r) for r in tab)
    assert all(x in flat for x in ['44 (14)','44 (16)','50 (24)','63 (44)'])
    with zipfile.ZipFile(assets/'johansen.zip') as z:
        assert z.testzip() is None and any(x.lower().endswith('.pdf') for x in z.namelist())
    import subprocess
    subprocess.run([sys.executable,'-B','-I','-X','utf8',str(ROOT/'opus_trehalose/trehalose.py'),'--check','--sources',str(assets.resolve())],check=True)
    print('Checked 46 original PDF vector points, native trehalose means/SE/operator and Johansen indices/supplement')


if __name__=='__main__':
    main(Path(sys.argv[1]))
