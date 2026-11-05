"""Separately test starch inputs on other published breakfast contrasts."""
import csv,json
from pathlib import Path
from model import read,error
D=Path(__file__).resolve().parent
def run():
    h=read("hoebler_inputs.json")['arms']; rs={'WWB':1.3,'HAWB':16.5,'SP':2.5}
    panel={}
    for a,b in [('HAWB','WWB'),('SP','WWB'),('HAWB','SP')]:
        sub=(h[a]['total_starch']-rs[a])/(h[b]['total_starch']-rs[b])
        avail=h[a]['available']/h[b]['available']
        obs=h[a]['signed120']/h[b]['signed120']
        panel[a+'/'+b]={'observed_signed120':obs,'subtracted':sub,'separately_reported_available':avail,
                        'subtracted_error':error(sub,obs),'available_error':error(avail,obs)}
    return {'hoebler_independent_of_2019':panel,'Costabile_matched_meal_available_g':[80,80,80],
            'Costabile_control_85_70_RS_g':[1,8,7],'Costabile_serving_starch_less_RS':None,
            'basis_note':'Table 1 values for total/available/RS in Hoebler are retained as separately printed (not algebraically forced to agree). Costabile lacked numeric total starch in the serving.'}
if __name__=='__main__':print(json.dumps(run(),indent=2))
