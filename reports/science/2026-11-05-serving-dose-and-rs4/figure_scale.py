"""Scale check of Stewart and Zimmer Figure 2c. No conversion is fitted to the trial."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
TIME = (0,15,30,45,60,90,120)
Y_ZERO, Y_THREE_HUNDRED = 1645.5, 1289.5
CURVES = {'control':[1594,1425,1371,1375,1458,1497,1530],
          'fibre':[1584,1440,1426,1488,1519,1567,1581]}
SOURCE_SHA256 = '4a547342abd3992835d7fbd0910b7fc232fda2e60cacce5fe68c370a8d9da7af'

def signed(markers):
    scale=300/(Y_ZERO-Y_THREE_HUNDRED)
    increment=[(markers[0]-m)*scale for m in markers]
    return sum((v+w)*(t1-t0)/2 for t0,t1,v,w in zip(TIME,TIME[1:],increment,increment[1:]))

def result():
    facts=json.loads((ROOT/'source_facts.json').read_text(encoding='utf8'))
    out={}
    for (label,markers), area in zip(CURVES.items(),facts['cookie']['insulin_mean']):
        # Six pixels at baseline (overlapping markers) and three at all later times.
        low=signed([markers[0]-6]+[v+3 for v in markers[1:]])
        high=signed([markers[0]+6]+[v-3 for v in markers[1:]])
        out[label]={'source_y_markers':markers,'signed_group_pmol_min_per_L':signed(markers),
                    'marker_reading_range':[low,high],'table_if_hours':area*60,'table_if_minutes':area}
    return out

if __name__=='__main__': print(json.dumps(result(),indent=2))
