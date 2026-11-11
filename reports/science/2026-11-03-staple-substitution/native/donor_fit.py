"""Small source-trained additive ridge experiment; no evaluation-source access here."""
from pathlib import Path
import itertools, json, math, xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT/'public/sources/PMC12719656.xml'
GRID = [.1, 1., 10., 100.]
FAMILIES = ['bread', 'crisp', 'bar', 'cereal']
SPECS = {'mean': [], 'C': ['C'], 'CP': ['C','P'], 'CPF': ['C','P','F'], 'CPF_nonnegative': ['C','P','F']}

def text(e): return ' '.join(''.join(e.itertext()).split())
def table(root, label):
    return next(t for t in root.findall('.//table-wrap') if t.findtext('label') == label)
def rows(t): return [[text(c) for c in r] for r in t.findall('.//tr')]
def number(s):
    import re
    m = re.match(r'^[~∼]?\s*([\d,]+(?:\.\d+)?)',s)
    assert m, s
    return float(m[1].replace(',',''))

def development():
    x = ET.parse(SOURCE).getroot()
    outcome = {r[1]:number(r[3]) for r in rows(table(x,'TABLE 4'))[1:]}
    data = []
    for r in rows(table(x,'TABLE 1')):
        if len(r)!=10 or r[1] not in ['WB20.8','WB5.2','SirCr','ChdCr','ABBB','PBDCB','ADCB','PBCer','CinnCer']: continue
        name=r[1]; allulose=0. if name.startswith('WB') else number(r[9])
        a=number(r[8]); y=(outcome['WB20.8#1']+outcome['WB20.8#2'])/2 if name=='WB20.8' else outcome[name]
        group='bread' if name.startswith('WB') else 'crisp' if name.endswith('Cr') else 'cereal' if name.endswith('Cer') else 'bar'
        data.append(dict(name=name, group=group, A=a, N=a-allulose, P=number(r[5]), F=number(r[4]), y=y))
    assert len(data)==9 and {r['group'] for r in data}==set(FAMILIES)
    return data

def solve(a,b):
    n=len(b); a=[list(r)+[v] for r,v in zip(a,b)]
    for k in range(n):
        q=max(range(k,n),key=lambda i:abs(a[i][k]));a[k],a[q]=a[q],a[k]
        assert abs(a[k][k])>1e-12, 'singular system'
        v=a[k][k];a[k]=[v2/v for v2 in a[k]]
        for i in range(n):
            if i!=k:
                v=a[i][k];a[i]=[u-v*w for u,w in zip(a[i],a[k])]
    return [r[-1] for r in a]

def fit(data,basis,features,penalty,nonnegative=False):
    n=len(data); ys=[r['y'] for r in data]; ym=sum(ys)/n
    xs=[[r[basis if k=='C' else k] for k in features] for r in data]
    means=[sum(r[j] for r in xs)/n for j in range(len(features))]
    scales=[math.sqrt(sum((r[j]-means[j])**2 for r in xs)/n) for j in range(len(features))]
    z=[[(v-means[j])/scales[j] if scales[j]>0 else 0. for j,v in enumerate(r)] for r in xs]
    usable=[j for j,s in enumerate(scales) if s>0]
    subsets=[tuple(usable)] if not nonnegative else [s for size in range(len(usable)+1) for s in itertools.combinations(usable,size)]
    candidates=[]
    for active in subsets:
        a=[[sum(r[j]*r[k] for r in z)+(penalty if j==k else 0.) for k in active] for j in active]
        b=[sum(r[j]*(y-ym) for r,y in zip(z,ys)) for j in active]
        beta=[0.]*len(features)
        for j,v in zip(active,solve(a,b)): beta[j]=v
        if nonnegative and any(v<0 for v in beta): continue
        residual=[ym+sum(u*v for u,v in zip(r,beta))-y for r,y in zip(z,ys)]
        objective=sum(v*v for v in residual)+penalty*sum(v*v for v in beta)
        candidates.append((objective,beta))
    objective,beta=min(candidates,key=lambda t:t[0])
    slopes={k:beta[j]/scales[j] if scales[j]>0 else 0. for j,k in enumerate(features)}
    intercept=ym-sum(slopes[k]*means[j] for j,k in enumerate(features))
    return dict(intercept=intercept,slopes=slopes,basis=basis,features=features,lambda_=penalty,
                means=means,scales=scales,standardized_slopes=beta,objective=objective,
                active=[k for k in features if slopes[k]!=0],nonnegative_slopes=nonnegative)

def predict(m,row):
    return m['intercept']+sum(v*row[m['basis'] if k=='C' else k] for k,v in m['slopes'].items())

def train():
    data=development(); result={'development':data,'families':FAMILIES,'grid':GRID,'models':{}}
    for basis in ['N','A']:
        result['models'][basis]={}
        for name,features in SPECS.items():
            selection=[]
            for penalty in GRID if features else [0.]:
                scores=[]; folds=[]
                for family in FAMILIES:
                    source=[r for r in data if r['group']!=family]; held=[r for r in data if r['group']==family]
                    m=fit(source,basis,features,penalty,name.endswith('nonnegative'))
                    preds=[predict(m,r) for r in held]
                    valid=all(math.isfinite(v) and v>0 for v in preds)
                    score=sum(abs(math.log(v/r['y'])) for v,r in zip(preds,held))/len(held) if valid else None
                    scores.append(score);folds.append(dict(family=family,names=[r['name'] for r in held],predictions=preds,score=score,model=m))
                score=sum(scores)/4 if all(v is not None for v in scores) else None
                selection.append(dict(lambda_=penalty,score=score,folds=folds))
            eligible=[s for s in selection if s['score'] is not None]
            if not eligible:
                result['models'][basis][name]=dict(status='no eligible fit',selection=selection);continue
            best=min(eligible,key=lambda s:(s['score'],-s['lambda_']))
            m=fit(data,basis,features,best['lambda_'],name.endswith('nonnegative'))
            preds=[predict(m,r) for r in data]
            result['models'][basis][name]=dict(status='fitted',selection=selection,selected_lambda=best['lambda_'],cv_score=best['score'],model=m,
                development_predictions=preds,development_mae=sum(abs(v-r['y']) for v,r in zip(preds,data))/len(data),
                development_bread_ratio=preds[0]/preds[1] if preds[0]>0 and preds[1]>0 else None)
    return result

def close(a,b):
    if isinstance(a,dict): return a.keys()==b.keys() and all(close(v,b[k]) for k,v in a.items())
    if isinstance(a,list): return len(a)==len(b) and all(close(x,y) for x,y in zip(a,b))
    if isinstance(a,(int,float)) and not isinstance(a,bool): return math.isclose(a,b,rel_tol=1e-10,abs_tol=1e-9)
    return a==b

def selfcheck():
    assert close(solve([[2.,0.],[0.,4.]],[6.,8.]),[3.,2.])
    data=[dict(A=float(i),N=float(i),P=2.,F=3.,y=10.-i) for i in range(1,5)]
    m=fit(data,'N',['C','P'],1.,True)
    assert m['slopes']=={'C':0.,'P':0.} and close(predict(m,data[0]),7.5)
    m=fit(data,'N',['C'],1.)
    assert m['slopes']['C']<0 and close(sum(predict(m,r)-r['y'] for r in data),0.)

if __name__=='__main__':
    import datetime,hashlib,sys
    selfcheck(); current=train(); frozen=ROOT/'FROZEN_MODEL.json'
    hashes={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in [ROOT/'PLAN.md',Path(__file__),SOURCE]}
    if sys.argv[1:]==['--freeze']:
        with frozen.open('x',encoding='utf-8') as f: json.dump(dict(utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),hashes=hashes,fit=current),f,indent=2,allow_nan=False)
    else:
        assert not sys.argv[1:]
        old=json.loads(frozen.read_text(encoding='utf-8'));assert old['hashes']==hashes and close(old['fit'],current)
        (ROOT/'TRAINING_REPRODUCTION.json').write_text(json.dumps(dict(pass_frozen_reproduction=True,hashes=hashes),indent=2)+'\n',encoding='utf-8')
    for basis,models in current['models'].items():
        for name,m in models.items(): print(basis,name,m['status'],m.get('selected_lambda'),m.get('cv_score'),m.get('model',{}).get('intercept'),m.get('model',{}).get('slopes'))
