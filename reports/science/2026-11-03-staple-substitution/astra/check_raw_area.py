"""Reconcile supplementary total (nonincremental) insulin Figure 5 with alternative intervals."""
import hashlib
import json
from io import BytesIO
from zipfile import ZipFile
from PIL import Image
import numpy as np
from extract_aggregate import base

with ZipFile(base/'mmc1.docx') as z:
    fig=z.read('word/media/image6.tiff')
im=Image.open(BytesIO(fig)).convert('RGBA')
assert im.size==(2131,1270)
bg=Image.new('RGBA',im.size,'white')
bg.alpha_composite(im)
ink=np.asarray(bg)[:,:,:3].max(axis=2)<50

def lines(x):
    k=np.flatnonzero(ink[275:1060,x])+275
    return np.split(k,np.where(np.diff(k)>1)[0]+1)

slope, intercept=np.polyfit([q.mean() for q in lines(278)],[5000,4000,3000,2000,1000,0],1)
curve=json.loads((base/'curve_baseline_check.json').read_text())
times=np.array(curve['time_min'])
rows=[]
for i,(x,arm) in enumerate(zip([440,680,920,1150,1390,1635],curve['rows'])):
    cap,bar,*_=lines(x)
    edge=bar[0] if i==0 else bar.mean()
    data=np.array(arm['mean_concentration_mIU_per_L'])
    rows.append(dict(arm=arm['arm'],supp5_auc=round(slope*edge+intercept),curve_0_300=round(np.trapezoid(data[1:],times[1:])),
                     curve_minus30_300=round(np.trapezoid(data,times))))
out=dict(panel='Supplementary Figure 5, referenced in article as Supplementary Figure 3',sha256=hashlib.sha256(fig).hexdigest(),
         note='The panel lists AUC, without an inscribed time window. Main Methods refer to 0–300 min. Window comparisons use aggregate means.', rows=rows)
(base/'raw_area_check.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
print(rows)
