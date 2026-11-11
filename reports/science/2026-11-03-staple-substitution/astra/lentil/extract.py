"""Extract published arm-level facts from Chamoun 2024 JATS XML (stdlib only)."""
from pathlib import Path
from xml.etree import ElementTree as ET
import hashlib
import json
import re

base = Path(__file__).resolve().parent
source = base / 'article.xml'
root = ET.parse(source)
text = lambda x: ' '.join(''.join(x.itertext()).split())
tables = {t.findtext('label'):t for t in root.iter('table-wrap') if t.findtext('label')}
def cells(table):
    return [[text(cell) for cell in row] for row in tables[table].iter('tr')]
nutrients = cells('Table 1')
characteristics = cells('Table 2')
measured = cells('Table 3')
insulin = next(row for row in measured if row[0].startswith('Postprandial plasma insulin'))
paragraphs = [text(p) for p in root.iter('p')]
relative = next(p for p in paragraphs if 'The relative insulinemic response elicited by' in p)
green = re.search(r'green lentil muffin, chili and soup compared to the controls was (\d+), (\d+) and (\d+)%', relative).groups()
red = re.search(r'red lentil muffin, chili and soup compared to the controls was (\d+), (\d+) and (\d+)%', relative).groups()
keys = ['serving_g','energy_kcal','protein_g','fat_g','carbohydrate_by_difference_g','fibre_g','available_carbohydrate_g']
arms=[]
for idx in range(1,10):
    family=(idx-1)//3
    color=(idx-1)%3
    values=re.match(r'([\d.]+)\s*\(([\d.]+),\s*([\d.]+)\)\s*([ab,]+)',insulin[idx])
    mean,lo,hi=map(float,values.groups()[:3])
    matched=next(re.finditer(r'n = (\d+)', characteristics[0][family+1]))
    arms.append(dict(family=['muffin','chili','soup'][family], treatment=nutrients[1][idx],n=int(matched.group(1)),
        **{key:float(row[idx]) for key,row in zip(keys,nutrients[2:])},
        insulin_iAUC_geometric_mean=mean,CI95=[lo,hi],Tukey_letters=values.group(4),
        author_relative_response_percent=[100,int(green[family]),int(red[family])][color]))
for i,arm in enumerate(arms):
    arm['ratio_of_geometric_means_percent']=round(arm['insulin_iAUC_geometric_mean']/arms[3*(i//3)]['insulin_iAUC_geometric_mean']*100,2)
result=dict(source='https://www.ebi.ac.uk/europepmc/webservices/rest/PMC11357280/fullTextXML',
    doi='10.3390/nu16162669', article_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),
    outcomes='0-120 min capillary plasma insulin iAUC, nmol/L * min. Table 3 geometric means and 95% CIs.',
    relative='Author-reported treatment/control response, separate estimand; estimator of group summary unspecified.',
    figure2='Figure 2 D-F show medians and 95% CIs. Arithmetic mean concentration series and arithmetic absolute iAUC not established.',
    overlap='Figure 1 reports 42 unique, 4 completed three studies, 18 two, and 20 one.',
    calculation='2h trapezoidal iAUC, ref. 24 Brouns et al. Trial does not explicitly specify treatment of below-baseline excursions.',
    availability='Crown Copyright restricts public access; corresponding author accepts reasonable requests.',
    arms=arms)
(base/'aggregate.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
