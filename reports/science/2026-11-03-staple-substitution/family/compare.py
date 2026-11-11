"""Partial-coverage analogues: pre-existing 1000 kJ insulin-index rows and served energy."""
import json,math,itertools,statistics
from pathlib import Path
ROOT=Path(__file__).resolve().parent
def run():
    arms=json.loads((ROOT.parent/'astra/aggregate.json').read_text())['arms']
    inp=json.loads((ROOT.parent/'native/inputs.json').read_text())
    refs=json.loads((ROOT/'references.json').read_text())
    # Analogue admission: same named food and edible fraction (not identical processing/recipe).
    indices=[1,2,4]; y=[arms[j]['mean'] for j in indices]
    idx=[v['FII_pct'] for v in refs]
    energy=[float(arms[j]['kcal_per_80kg'])*inp['body_mass_kg'][j]/80 for j in indices]
    v={'equality':[1]*3,'energy':energy,'FII_at_test_energy':idx,'FII_times_consumed_energy':[a*b for a,b in zip(idx,energy)]}
    pairs=list(itertools.combinations(range(3),2))
    return {name:{'observed':[y[b]/y[a] for a,b in pairs],'predicted':[values[b]/values[a] for a,b in pairs],
                  'mean_absolute_log_error':statistics.fmean(abs(math.log(values[b]/values[a])-math.log(y[b]/y[a])) for a,b in pairs)}
            for name,values in v.items()}
if __name__=='__main__':print(json.dumps(run(),indent=2))
