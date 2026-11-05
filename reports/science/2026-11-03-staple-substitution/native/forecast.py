"""Prospective transfer using only published serving inputs and previously fitted coefficients."""
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parent
def load(name):return json.loads((ROOT/name).read_text(encoding='utf8'))
def predict():
    i=load('inputs.json')
    out={}
    for actual in (True,False):
        for egg in (0,.05,.1):
            label=('group_mean_mass' if actual else '80kg')+f'_egg_{egg:g}'
            forecasts={}
            for name,model in i['models'].items():
                vals=[]
                for k,mass in enumerate(i['body_mass_kg']):
                    factor=mass/80 if actual else 1
                    c=egg if k==1 else i['C'][k]
                    inputs={'C':c*factor,'P':20*factor,'F':i['F'][k]*factor}
                    vals.append(model['intercept']+sum(s*inputs[x] for x,s in model['slopes'].items()))
                forecasts[name]=vals
            out[label]=forecasts
    return out
if __name__=='__main__':print(json.dumps(predict(),indent=2))
