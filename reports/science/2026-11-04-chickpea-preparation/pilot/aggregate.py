"""Reduce a public statistical source in memory. No participant rows or identifiers are exported."""
from pathlib import Path
from io import BytesIO
import csv,hashlib,itertools,json,math,statistics,sys
from urllib.request import urlopen
from zipfile import ZipFile
from xml.etree import ElementTree as E

ROOT=Path(__file__).resolve().parent
URL='https://pmc-oa-opendata.s3.amazonaws.com/PMC12286859.1/42255_2025_1309_MOESM4_ESM.xlsx'
HASH='00eb9d8e0337ef722010a699fecbd291e51ae35533589f25c561902dd030152c'
ARMS=('Broken','Intact-S','Intact-C')
TIME=[0,15,30,45,60,90,120,150,180]
def areas(times,v):
    v=[a-v[0] for a in v]; pos=signed=nodes=0.
    for i,(t,u) in enumerate(zip(times,times[1:])):
        x,y=v[i:i+2];width=u-t
        signed+=width*(x+y)/2;nodes+=width*(max(0.,x)+max(0.,y))/2
        if max(x,y)<=0:continue
        if min(x,y)>=0:pos+=width*(x+y)/2
        else:pos+=width*max(x,y)**2/(2*abs(x-y))
    return {'positive':pos,'signed':signed,'positive_nodes':nodes}
def stats(v):return {'n':len(v),'mean':statistics.mean(v),'sd':statistics.stdev(v),'sem':statistics.stdev(v)/math.sqrt(len(v))}
def get_rows():
    with urlopen(URL,timeout=30) as reply: data=reply.read()
    assert hashlib.sha256(data).hexdigest()==HASH
    with ZipFile(BytesIO(data)) as z:
        sheets=E.fromstring(z.read('xl/workbook.xml')).findall('.//{*}sheet')
        assert sheets[1].get('name')=='insulin_uU.ml' and sheets[1].get('sheetId')=='2'
        strings=[''.join(s.itertext()) for s in E.fromstring(z.read('xl/sharedStrings.xml')).findall('{*}si')]
        cells={}
        for node in E.fromstring(z.read('xl/worksheets/sheet2.xml')).findall('.//{*}c'):
            val=node.findtext('{*}v')
            if val is not None:cells[node.get('r')]=strings[int(val)] if node.get('t')=='s' else val
    assert cells['B2']=='PID' and [int(cells[f'B{i}']) for i in range(3,12)]==TIME
    visits={arm:{} for arm in ARMS}
    for k,arm in cells.items():
        if not k.endswith('1') or arm not in ARMS:continue
        col=k[:-1];pid=cells[col+'2'];assert pid not in visits[arm]
        visits[arm][pid]=[float(cells[col+str(i)]) if col+str(i) in cells else None for i in range(3,12)]
    assert all(len(v)==10 and set(v)==set(visits[ARMS[0]]) for v in visits.values())
    return visits
def derive():
    visits=get_rows();out={'url':URL,'sha256':HASH,'arm_timepoint_means':{},'windows':{}}
    for arm in ARMS:out['arm_timepoint_means'][arm]=[stats([v[i] for v in visits[arm].values() if v[i] is not None])['mean'] for i in range(9)]
    for stop in (120,180):
        window={};m=TIME.index(stop)+1
        ids=[p for p in visits['Broken'] if all(None not in visits[k][p][:m] for k in ARMS)]
        assert len(ids)>=3
        byarm={arm:[areas(TIME[:m],visits[arm][p][:m]) for p in ids] for arm in ARMS}
        for mode in ('positive','signed','positive_nodes'):
            vectors={a:[v[mode] for v in byarm[a]] for a in ARMS}
            arms={k:stats(v) for k,v in vectors.items()}
            pairs={}
            for left,right in [('Intact-C','Broken'),('Intact-S','Broken'),('Intact-C','Intact-S')]:
                u,v=vectors[left],vectors[right];x,y=statistics.mean(u),statistics.mean(v)
                key=left+'/'+right
                pairs[key]={'ratio':x/y,'mean_difference':x-y,'paired_difference_sem':stats([a-b for a,b in zip(u,v)])['sem'],
                    'paired_delta_log_ratio_sem':stats([a/x-b/y for a,b in zip(u,v)])['sem']}
            window[mode]={'arms':arms,'pairs':pairs}
        # Paired covariance of complete participants' endpoint vector suffices for any fixed linear contrast.
        window['positive_covariance_of_means']=[[statistics.covariance([e['positive'] for e in byarm[a]],[e['positive'] for e in byarm[b]])/len(ids) for b in ARMS] for a in ARMS]
        window['covariance_order']=ARMS; window['n_complete_triplets']=len(ids)
        window['complete_by_arm']={k:sum(None not in v[:m] for v in visits[k].values()) for k in ARMS}
        out['windows'][str(stop)]=window
    return out
if __name__=='__main__':print(json.dumps(derive(),indent=2,allow_nan=False))
