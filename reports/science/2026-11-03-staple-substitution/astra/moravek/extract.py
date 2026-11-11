"""Parse factual publisher table-row snapshot, retrieved from indexed journal article."""
from pathlib import Path
import json
import re
import hashlib
base=Path(__file__).resolve().parent
src=base/'publisher_table_rows.txt'
rows=[[v.strip() for v in s.split('|')] for s in src.read_text(encoding='utf-8-sig').splitlines()]
keys=['energy_kcal','protein_g','fat_g','carbohydrate_by_difference_g','fibre_g','available_carbohydrate_g']
assert len(rows)==8 and all(len(r)==9 for r in rows[:6]) and all(len(r)==5 for r in rows[6:])
arms=[]
for i in range(8):
    group,intervention=divmod(i,4)
    gm,lo,hi=map(float,re.findall(r'\d+\.\d+',rows[6+group][intervention+1]))
    arms.append(dict(group=['rice','potato'][group],intervention=['control','large green','small green','split red'][intervention],
                     n=24, gm=gm,ci95=[lo,hi],
                     ratio_of_geometric_means=gm/float(rows[6+group][1].split()[0]),
                     **{key:float(row[i+1]) for key,row in zip(keys,rows[:6])}))
out=dict(doi='10.1093/jn/nxy018',source='https://jn.nutrition.org/article/S0022-3166%2822%2910813-8/fulltext',
         trial='NCT02426606', snapshot='Indexed publisher article rows from Table 1 and Tables 3/4, not original PDF bytes',
         snapshot_sha256=hashlib.sha256(src.read_bytes()).hexdigest(),
         measure='2-h plasma insulin iAUC in nmol/L * min, geometric mean (95% CI).',
         samples_min=[0,15,30,45,60,90,120],baseline='Following a 10-12 hour overnight fast before eating.',
         convention='Trapezoid rule, ref. 26; below-baseline handling not explicitly described.',
         population='24 per crossover group, 11 participated in both, 37 unique. Cross-trial participant overlap unknown.',
         assay='Capillary EDTA plasma, duplicate ALPCO insulin ELISA',arms=arms)
(base/'aggregate.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
