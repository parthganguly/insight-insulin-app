"""Evaluate the offset food score and retain the different interpretation of the pair rule."""
import math,json,itertools
from model import read,coefficients,assays,error

def run():
    p=coefficients();inputs=read("hoebler_inputs.json");arms=inputs["arms"];out={}
    for t in [15,30]:
        d={k:a[f"pct{t}"]*a["total_starch"]/100 for k,a in arms.items()}
        group={}
        for n,r in [('HAWB','WWB'),('SP','WWB'),('HAWB','SP')]:
            src,ref=arms[n],arms[r];pred=assays(d[n],d[r],p)
            pred.update(total_starch=src['total_starch']/ref['total_starch'],available_starch=src['available']/ref['available'])
            obs={'signed120':src['signed120']/ref['signed120'],'relative_reported_indices':src['II']/ref['II']}
            group[n+'/'+r]={'d_grams':[d[n],d[r]],'observed':obs,'forecast':pred,
                'abs_log_error':{ep:{k:error(v,o)for k,v in pred.items()}for ep,o in obs.items()}}
        metric={ep:{key:sum(group[c]['abs_log_error'][ep][key] for c in ('HAWB/WWB','SP/WWB'))/2
            for key in group['HAWB/WWB']['forecast']} for ep in group['HAWB/WWB']['observed']}
        triangle={k:group['HAWB/SP']['forecast'][k]-group['HAWB/WWB']['forecast'][k]/group['SP/WWB']['forecast'][k]for k in group['HAWB/SP']['forecast']}
        out[str(t)]={'pairs':group,'primary':metric,'direct_minus_WWB_derived_HAWB_SP':triangle}
    q=p['assay']['background_grams'];cal=p['assay']['pair_lambda']
    # Bornet data were previously exposed. Preserve the original oriented pair and wheat-referenced quotient.
    parent=read("previous_pair_facts.json")
    v=parent['raw_Figure3_H30'];aff=lambda z:1+cal*(z-1)
    ratio=lambda n,r:v[n]/v[r]
    prior={'direct_pea_cassava':aff(ratio('smooth_pea','manihot')),
           'quotient_via_wheat':aff(ratio('smooth_pea','wheat'))/aff(ratio('manihot','wheat'))}
    return {'q_gram_equivalent':q,'prior_affine_example':prior,'panels':out,
            'units':'Offset requires served amount of early starch release on the donor gram-equivalent scale. A percentage-only input does not supply this. The oriented pair comparator and its primary wheat-relative scores are unchanged.'}
if __name__=='__main__':print(json.dumps(run(),indent=2,allow_nan=False))
