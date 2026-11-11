"""Independent aggregate comparison; source-native endpoints never pooled.

Granfeldt et al 1994 DOI 10.1093/ajcn/59.5.1075 Table 2, pp1077-1079.
Kernel n=10; flour n=9. Printed mean/SEM, not individual observations.
Run: python verify_barley.py; writes verified_results.json in this folder.
"""
import itertools
import json
import math
from pathlib import Path
from statistics import median
from statistics import stdev

PULSE_R = 0.7062723100
H0 = 0.25748503
HEATON = [1211 / 2366, 1238 / 2341, 1111 / 1323]
R = math.exp(median(map(math.log, HEATON)))
B = math.log(PULSE_R) / math.log(H0)

# [insulin iAUC 120m mean, SEM, iAUC90 mean, SEM, II120, HI180, amylose%]
ARMS = {
    'waxy_hullless_kernel': [5.4, 1, 4.8, 1, 27, 44, 7],
    'normal_covered_kernel': [5.8, 1, 5.3, 1, 28, 47, 33],
    'high_covered_kernel': [5.2, 2, 4.4, 1, 24, 34, 42],
    'high_hullless_kernel': [3.7, 1, 3.4, 1, 19, 34, 44],
    'normal_covered_flour': [11.0, 3, 9.8, 2, 56, 75, 33],
    'high_covered_flour': [10.2, 3, 9.0, 2, 47, 56, 42],
}

def maps(h):
    return {'direct_HI180': h, 'power_HI180': h**B,
            'affine_HI180': 1-(1-PULSE_R)*(1-h)/(1-H0)}

def bounds(m,e,f,rounded=False):
    # Exact finite-sample deletion envelope, under nonnegative individual areas.
    # m9=(10m-x)/9. From sample SEM, |x-m|<=9e, plus x>=0.
    d=.05 if rounded else 0
    de=.5 if rounded else 0
    return [max(0,m-d-e-de)/(f+d),
            min(m+d+e+de,10*(m+d)/9)/(f-d)]

def error(pred,obs):
    return abs(math.log(pred/obs))

def evaluate(a,b,within_genotype=False):
    x,y=ARMS[a],ARMS[b]
    models = {'equality':1, 'amylopectin_dose':(100-x[6])/(100-y[6])}
    if within_genotype:
        models.update({'Heaton_median':R, 'pulse_reference':PULSE_R})
    models.update(maps(x[5]/y[5]))
    endpoints={'native_iAUC120':x[0]/y[0], 'native_iAUC90':x[2]/y[2],
               'II120_ratio':x[4]/y[4]}
    r={'numerator':a,'denominator':b, 'observed':endpoints,'predictions':models,
       'errors':{k:{p:error(v,z) for p,v in models.items()} for k,z in endpoints.items()}}
    if within_genotype:
        r['matched9_bounds120']=bounds(x[0],x[1],y[0])
        r['rounding_matched9_bounds120']=bounds(x[0],x[1],y[0],True)
        r['matched9_bounds90']=bounds(x[2],x[3],y[2])
        r['rounding_matched9_bounds90']=bounds(x[2],x[3],y[2],True)
        r['R_HI_geometric_midpoint']=math.sqrt(R*x[5]/y[5])
        # R varied for printed Heaton rounding; HI independently +/-0.5.
        rlo=1237.5/2341.5
        rhi=1238.5/2340.5
        r['R_HI_midpoint_rounding_range']=[
            math.sqrt(rlo*(x[5]-.5)/(y[5]+.5)),
            math.sqrt(rhi*(x[5]+.5)/(y[5]-.5))]
    return r

def main():
    cases=[evaluate('normal_covered_kernel','normal_covered_flour',True),
           evaluate('high_covered_kernel','high_covered_flour',True)]
    # Fix direction before comparison: higher-amylose over lower-amylose.
    # Affine maps are not reciprocal, so arbitrary row inversion is invalid.
    kernels=sorted(list(ARMS)[:4],key=lambda a:ARMS[a][6],reverse=True)
    within=[evaluate(a,b) for a,b in itertools.combinations(kernels,2)]
    within.append(evaluate('high_covered_flour','normal_covered_flour'))
    out={'Heaton_donors':HEATON,'Heaton_median':R,'pulse_R':PULSE_R,'power_b':B,
         'barley_milling':cases,'within_form':within,
         'milling_mean_abs_log_error':{
             ep:{model:sum(case['errors'][ep][model] for case in cases)/2
                 for model in cases[0]['predictions']}
             for ep in cases[0]['observed']},
         'constraints':['No H20 or H30 available in article: Figure 1 is glucose only.',
          'Native iAUC ratios use n10/n9 arm means; not paired n9 ratios.',
          'Matched-subset bounds are algebraic deletion bounds, not sampling CIs.',
          'II120 is mean within-person bread-referenced index, not ratio of arm means.',
          'Heaton donor endpoint 180m differs from target120m.',
          'HI180 omits cheese/butter/salt included in native clinical meals.',
          'Within-genotype protein/fat/starch matched, preparation time differs.',
          'Within-form kernel genotypes differ in fiber and other composition as well as amylose.']}
    # Construct a nonnegative synthetic moment witness: the same omitted
    # participant can have zero area in both kernel conditions. This is not
    # an imputation or participant reconstruction, only a feasibility proof.
    witnesses=[]
    for c in cases:
        m,e,*_=ARMS[c['numerator']]
        q=10*m/9
        ss=90*e*e-10*m*m/9
        values=[0,q+math.sqrt(8*ss/9)]+[q-math.sqrt(ss/72)]*8
        assert min(values)>=0
        assert math.isclose(sum(values)/10,m,abs_tol=1e-12)
        assert math.isclose(stdev(values)/math.sqrt(10),e,abs_tol=1e-12)
        witnesses.append({'synthetic_areas':values,'mean9':q,
                          'ratio9':q/ARMS[c['denominator']][0]})
    out['nonnegative_deletion_witnesses']=witnesses
    out['upper_bound_witness_mean_log_error']={
        model:sum(error(c['predictions'][model],w['ratio9'])
                  for c,w in zip(cases,witnesses))/2
        for model in ['Heaton_median','direct_HI180']}
    Path(__file__).with_name('verified_results.json').write_text(json.dumps(out,indent=2))
    print(json.dumps(out,indent=2))

if __name__=='__main__':main()
