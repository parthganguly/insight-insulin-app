"""Recover the serving facts and native insulin-area summaries from four public JATS articles.

Optional audit: python audit_sources.py /path/to/the/four/xml/files
Use --snapshot during research to write source_facts.json after obtaining the originals.
"""
from pathlib import Path
import argparse
import hashlib
import json
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
STUDIES = {
    'wheat': ('PMC2925102', 'tab2', 'tab3', (2, 3)),
    'potato': ('PMC7698388', 'foods-09-01679-t001', 'foods-09-01679-t004', (1, 2, 3)),
    'cookie': ('PMC5372900', 'nutrients-09-00237-t001', 'nutrients-09-00237-t003', (1, 2)),
    'scone': ('PMC5852705', 'nutrients-10-00129-t001', 'nutrients-10-00129-t003', (1, 2)),
}

def table(article, table_id):
    node = next(t for t in article.iter('table-wrap') if t.attrib['id'] == table_id)
    return [[' '.join(''.join(cell.itertext()).split()) for cell in row] for row in node.iter('tr')]

def numbers(cell):
    return [float(i) for i in re.findall(r'[0-9]+(?:\.[0-9]+)?', cell.replace(',',''))]

def column_values(rows, label, columns, second=False):
    matches = [r for r in rows if r and r[0].lower().startswith(label)]
    if len(matches) != 1:
        raise ValueError(f'Expected one row for {label!r}: {matches}')
    return [numbers(matches[0][i])[int(second)] for i in columns]

def extract(directory):
    results = {}
    for key, (pmc, inputs_id, endpoint_id, cols) in STUDIES.items():
        data = (directory / (pmc+'.xml')).read_bytes()
        article = ET.fromstring(data)
        assert article.find('.//article-id[@pub-id-type="doi"]') is not None
        foods, areas = table(article,inputs_id), table(article,endpoint_id)
        fibre = 'total dietary fiber' if key=='wheat' else 'dietary fiber'
        insulin = {'wheat':'iauc (pm','potato':'venous insulin','cookie':'iauc0-120min (pmol','scone':'iauc0–120 min (min × pmol'}[key]
        if key=='potato':
            areas=[r for r in areas if r and r[0].lower()=='venous insulin']
        if key=='scone':
            start=next(i for i,r in enumerate(areas) if r[0]=='Venous insulin')
            areas=areas[start+1:]
        facts = {
            'pmc':pmc, 'doi':article.find('.//article-id[@pub-id-type="doi"]').text,
            'source_url':'https://www.ebi.ac.uk/europepmc/webservices/rest/'+pmc+'/fullTextXML',
            'xml_sha256':hashlib.sha256(data).hexdigest(), 'table_ids':[inputs_id,endpoint_id],
            'available':column_values(foods,'available',cols),'fibre':column_values(foods,fibre,cols),
            'protein':column_values(foods,'protein',cols),'fat':column_values(foods,'fat',cols),
            'insulin_mean':column_values(areas,insulin,cols),'insulin_dispersion':column_values(areas,insulin,cols,True)
        }
        if key in ('cookie','scone'):
            facts['label_kcal']=column_values(foods,'calories',cols)
        results[key]=facts
    return results

def audit_portions(path):
    saved=json.loads((ROOT/'wb_portions.json').read_text(encoding='utf8'))
    raw=path.read_bytes()
    assert hashlib.sha256(raw).hexdigest()==saved['retained_extraction_sha256']
    record=json.loads(raw.decode('utf-8-sig'))
    text=json.loads(record['content'][0]['text'])['markdown']
    insulin=text.split('| Plasma insulin, (nmol · min)/L |',1)[1].split('| Means4 |',1)[0]
    rows=[]
    for line in insulin.splitlines():
        cells=[c.strip() for c in line.strip('| ').split('|')]
        if cells[0] not in ('Barley','Bread','Potato','Spaghetti'):
            continue
        for dose,cell in zip((25,50,75,100),cells[1:5]):
            pair=cell.split(' ± ')
            if len(pair)==2:
                rows.append(dict(food=cells[0].lower(),C=dose,mean=float(pair[0]),SEM=float(pair[1])))
    assert rows==saved['rows']
    print('Verified all 13 means and SEMs in the retained original Table 2 extraction.')

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source_dir',type=Path)
    parser.add_argument('--snapshot',action='store_true')
    parser.add_argument('--wb-extract',type=Path)
    parser.add_argument('--cookie-figure',type=Path)
    args=parser.parse_args()
    if args.wb_extract:
        audit_portions(args.wb_extract)
    if args.cookie_figure:
        expected='4a547342abd3992835d7fbd0910b7fc232fda2e60cacce5fe68c370a8d9da7af'
        assert hashlib.sha256(args.cookie_figure.read_bytes()).hexdigest()==expected
        print('Verified identity of the original Figure 2 used for the insulin-unit scale check.')
    facts=extract(args.source_dir)
    path=ROOT/'source_facts.json'
    if args.snapshot:
        path.write_text(json.dumps(facts,indent=2)+'\n',encoding='utf8',newline='\n')
    elif facts!=json.loads(path.read_text(encoding='utf8')):
        raise SystemExit('Published input snapshot or XML bytes differ')
    print('Verified four original JATS articles, serving rows and native insulin area summaries.')
