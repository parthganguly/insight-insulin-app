"""Compare independently digitized main Figure 2b totals with temporal panel sums."""
import hashlib
import json
import numpy as np
from PIL import Image
from extract_aggregate import base, arms

src=base/'published_figure2.jpg'
img=Image.open(src)
assert img.size==(3159,1251)
ink=np.asarray(img).max(axis=2)<70
def lines(x):
    pixels=np.flatnonzero(ink[130:940,x])+130
    return np.split(pixels,np.flatnonzero(np.diff(pixels)>1)+1)
scale,intercept=np.polyfit([g.mean() for g in lines(1935)],[2000,1500,1000,500,0],1)
late=json.loads((base/'late_aggregate.json').read_text())['arms']
rows=[]
for i,x in enumerate([2067,2257,2439,2637,2825,3013]):
    cap,bar,*_=lines(x)
    edge=bar.min() if i==0 else bar.mean()
    total=round(scale*edge+intercept)
    summed=arms[i]['mean']+late[i]['mean']
    rows.append(dict(arm=arms[i]['arm'],main_total=total, window_sum=summed,main_minus_sum=total-summed))
out=dict(source="https://ars.els-cdn.com/content/image/1-s2.0-S0002916526000407-gr2_lrg.jpg",
         sha256=hashlib.sha256(src.read_bytes()).hexdigest(),rows=rows,
         note="The main and supplemental figures do not add under a shared signed baseline. The source does not resolve the discrepancy.")
(base/'window_check.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
