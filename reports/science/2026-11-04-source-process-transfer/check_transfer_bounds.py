"""Additional cohort-envelope diagnostics on Opus's external barley fit. Reads saved numeric results."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parent
def calculate():
    results=json.loads((ROOT/'amylose_transfer_results.json').read_text(encoding='utf8'))
    bounds=json.loads((ROOT/'positive_results.json').read_text(encoding='utf8'))['ratio_bounds']
    other=json.loads((ROOT/'sol/wheat/portable_results.json').read_text(encoding='utf8'))
    out={}
    for key in ['HAW-R/LAW-R','HAW-W/LAW-W']:
        low,high=bounds[key]['with_reading']
        slo,shi=other['positive_bounds']['refined' if key=='HAW-R/LAW-R' else 'wholemeal']
        out[key]={'our_envelope':[low,high],'verifier_envelope':[slo,shi],'checks':{}}
        for model,row in results['wheat']['pairs'][key]['admissibility'].items():
            v=row['pred']
            if 'joint' in model or model in ('available','total'):
                out[key]['checks'][model]={'prediction':v,'inside_our_envelope':low<=v<=high,'inside_Sol_envelope':slo<=v<=shi}
    return out
if __name__=='__main__':print(json.dumps(calculate(),indent=2))
