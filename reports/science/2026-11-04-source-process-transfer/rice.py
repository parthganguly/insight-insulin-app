"""Limited transfer to a Japanese rice trial. Distinct controls, windows and clinical populations."""
import csv,json,math
from pathlib import Path
from model import assays,error,coefficients
ROOT=Path(__file__).resolve().parent
def calculate():
    f=ROOT/'rice_inputs.json';r=json.loads(f.read_text(encoding='utf8'))
    # Cross-study milling state reference and a separately collected 30-minute rice assay;
    # treated as transported conditional proxies, never as same-food measurements.
    proxy=r["rice_H30_percent"][0]/r["rice_H30_percent"][1]
    pri=coefficients()['assay']
    p={'same_response':1,'previous_brown_polished_insulin_index_ratio':39/63,
       'external_whole_rice_H30_share_ratio':proxy,
       'external_release_power':proxy**pri['power'],
       'external_oriented_affine':1+pri['pair_lambda']*(proxy-1)}
    rows={}
    for window,facts in r['ito'].items():
        ratio=facts['BR']/facts['WR']
        rows[window]={'study_arm_means':facts,'observed_brown_white':ratio,'pred':p,'absolute_log_errors':{k:error(v,ratio) for k,v in p.items()}}
    rel=r['larsen_br16']
    return {'ito':rows,'parboil_180':{'traditional_vs_unprocessed':rel[1]/rel[0],'pressure_vs_unprocessed':rel[2]/rel[0]},
            'scope':'Original Japanese serum iAUC arm summaries at different windows. Brown and white rice preparation/water differ. No native absolute forecast. Malaysian donor is normalized 180min, rice assay was from another 75g test.'}
if __name__=='__main__':print(json.dumps(calculate(),indent=2))
