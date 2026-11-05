"""Independent stdlib replay of corrected empirical-transfer arithmetic.

No imports/evaluation of amylose_transfer.py or model.py. Run beside the study
files: python -I -X utf8 verify_transfer_v2.py. Alternatively --study-dir DIR.
Writes transfer_v2_verification.json beside verifier; prints compact receipt.
"""
import argparse,csv,hashlib,json,math
from pathlib import Path
HERE=Path(__file__).resolve().parent
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--study-dir',type=Path,default=HERE)
args=parser.parse_args();D=args.study_dir
def read(name):return json.loads((D/name).read_text(encoding='utf-8-sig'))
tr,wi,wr,pos,hb,ex=[read(n) for n in ['training.json','wheat_inputs.json','wheat_results.json','positive_results.json','hoebler_inputs.json','amylose_transfer_results.json']]
checks=[]
def check(name,a,b,rtol=1e-8,atol=2e-8):
    if isinstance(b,bool) or b is None:assert a==b,(name,a,b)
    else:assert math.isclose(a,b,rel_tol=rtol,abs_tol=atol),(name,a,b)
    checks.append(name)
def inverse(r,ah,an):return 1-(1-r)/(ah-r*an)
def f(a,t):return 1-a+t*a
P={}
for form in ['kernel','flour']:
    high=tr['barley']['high_'+form];normal=tr['barley']['normal_'+form]
    P[form]={'r':high['mean_120']/normal['mean_120'],'ah':high['amylose_pct']/100,'an':normal['amylose_pct']/100,
             'cvh':high['sem_120']/high['mean_120'],'cvn':normal['sem_120']/normal['mean_120']}
assert len({(v['ah'],v['an']) for v in P.values()})==1
ah,an=P['kernel']['ah'],P['kernel']['an']
mean_log=sum(math.log(v['r']) for v in P.values())/2
theta={'joint':inverse(math.exp(mean_log),ah,an),
       'kernel_donor':inverse(P['kernel']['r'],ah,an),'flour_donor':inverse(P['flour']['r'],ah,an)}
power=mean_log/math.log((1-ah)/(1-an))
points=[(math.log1p(-r['amylose_pct']/100),math.log(r['area180'])) for r in tr['Bornet']['gel']]
xmean=sum(p[0] for p in points)/len(points);ymean=sum(p[1] for p in points)/len(points)
bb=sum((x-xmean)*(y-ymean) for x,y in points)/sum((x-xmean)**2 for x,y in points)
for k,v in theta.items():check('theta/'+k,v,ex['training']['theta'][k])
check('power',power,ex['training']['empirical_barley_power_b']);check('bornet_exact',bb,ex['training']['bornet_heated_b_exact'])
ident={}
for form,p in P.items():
    r0=f(ah,0)/f(an,0);rinf=ah/an;ident[form]={}
    for label,rho in [('rho_plus1',1),('rho_0',0),('rho_minus1',-1)]:
        se=math.sqrt(max(0,p['cvh']**2+p['cvn']**2-2*rho*p['cvh']*p['cvn']))
        lo,hi=p['r']*math.exp(-1.96*se),p['r']*math.exp(1.96*se)
        tlo=0. if lo<=r0 else inverse(lo,ah,an);thi='unbounded' if hi>=rinf else inverse(hi,ah,an)
        want=ex['training']['identification_sensitivity_range_theta_ge_0'][form][label]
        check('ident/'+form+'/'+label+'/se',se,want['log_se'])
        check('ident/'+form+'/'+label+'/low',tlo,want['theta_band_sensitivity_range'][0])
        if isinstance(thi,str):assert thi==want['theta_band_sensitivity_range'][1]
        else:check('ident/'+form+'/'+label+'/high',thi,want['theta_band_sensitivity_range'][1])
        ident[form][label]={'delta_log_se':se,'approximate_normal_band':[lo,hi],
                           'theta_sensitivity':[tlo,thi],'includes0':lo<=r0<=hi,'includes1':lo<=1<=hi}
scores={};dose={}
for arm,r in wi['arms'].items():
    mult=wi['serving_g']/100;a=r['amylose_fraction'];st=mult*r['Starch'];nr=mult*(r['Starch']-r['Resistant starch'])
    dose[arm]={'total':st,'available':nr}
    sc={'equality':1.,'total':st,'available':nr,'bornet_heated_exact_x_total':st*(1-a)**bb}
    for name,t in theta.items():
        for basis,d in [('total',st),('available',nr)]:sc['empirical_barley_theta:'+name+':'+basis]=d*f(a,t)
    for basis,d in [('total',st),('available',nr)]:sc['empirical_barley_power:joint:'+basis]=d*(1-a)**power
    scores[arm]=sc
models=list(next(iter(scores.values())))
sol_low={'HAW-R/LAW-R':.3736559,'HAW-W/LAW-W':.3803384}
cases={}
for pair,a,b in [('HAW-R/LAW-R','HAW-R','LAW-R'),('HAW-W/LAW-W','HAW-W','LAW-W')]:
    observed={time:wr['signed_arm_areas_pg_min_per_mL'][a][time]/wr['signed_arm_areas_pg_min_per_mL'][b][time] for time in ['120','180']}
    outer=pos['ratio_bounds'][pair]['ratio_envelope'];reader=pos['ratio_bounds'][pair]['with_reading'];sl=sol_low[pair]
    limits={'envelope_no_reading':outer[0],'coordinator_with_reading':reader[0],'sol_lower_reading':sl}
    cases[pair]={'observed':observed,'models':{},'thresholds':{},'implied':{}}
    for model in models:
        pred=scores[a][model]/scores[b][model]
        margins={k:math.log(pred/v) for k,v in limits.items()}
        err={t:abs(math.log(pred/v)) for t,v in observed.items()}
        flags={'inside_envelope_no_reading':outer[0]<=pred<=outer[1],
               'inside_coordinator_with_reading':reader[0]<=pred<=reader[1],
               'above_sol_lower':pred>=sl,'near_a_lower_boundary':any(abs(v)<.02 for v in margins.values())}
        want=ex['wheat']['pairs'][pair]['admissibility'][model]
        check(pair+'/'+model+'/pred',pred,want['pred'])
        for k,v in flags.items():check(pair+'/'+model+'/'+k,v,want[k])
        for k,v in margins.items():check(pair+'/'+model+'/margin/'+k,v,want['log_margin_to_lower'][k])
        for t,v in err.items():check(pair+'/'+model+'/error/'+t,v,want['abs_log_error_signed'][t])
        cases[pair]['models'][model]={'pred':pred,'flags':flags,'log_margin_to_lower':margins,'abs_log_error':err}
    for basis in ['total','available']:
        d=dose[a][basis]/dose[b][basis];ah2=wi['arms'][a]['amylose_fraction'];an2=wi['arms'][b]['amylose_fraction']
        cases[pair]['thresholds'][basis]={};cases[pair]['implied'][basis]={}
        for key,low in limits.items():
            lower_ratio=d*f(ah2,0)/f(an2,0)
            threshold=0. if lower_ratio>=low else None if d<low else inverse(low/d,ah2,an2)
            want=ex['wheat']['pairs'][pair]['theta_admissibility_threshold_in_fit_domain_DIAGNOSTIC'][basis][key]
            check(pair+'/'+basis+'/threshold/'+key,threshold,want)
            cases[pair]['thresholds'][basis][key]=threshold
        for t,v in observed.items():
            implied=inverse(v/d,ah2,an2)
            check(pair+'/'+basis+'/implied/'+t,implied,ex['wheat']['pairs'][pair]['target_implied_theta_DIAGNOSTIC'][basis][t])
            cases[pair]['implied'][basis][t]=implied
primary={m:sum(cases[p]['models'][m]['abs_log_error']['120'] for p in cases)/2 for m in models}
mo=wi['table3_marginals']['HAW'][0]/wi['table3_marginals']['LAW'][0]
margin={m:(scores['HAW-R'][m]+scores['HAW-W'][m])/(scores['LAW-R'][m]+scores['LAW-W'][m]) for m in models}
margin_errors={m:abs(math.log(p/mo)) for m,p in margin.items()}
for m in models:
    check('primary/'+m,primary[m],ex['wheat']['primary_signed120_mean_high_low'][m])
    check('marginal/'+m,margin[m],ex['wheat']['table3_marginal']['pred'][m])
    check('marginalerror/'+m,margin_errors[m],ex['wheat']['table3_marginal']['abs_log_error'][m])
ho={};hp=[('HAWB','WWB'),('SP','WWB'),('HAWB','SP')]
for a,b in hp:
    pair=a+'/'+b;obs=hb['arms'][a]['signed120']/hb['arms'][b]['signed120'];ho[pair]={}
    for label,key in [('total_starch','total_starch'),('available_starch','available')]:
        pred=hb['arms'][a][key]/hb['arms'][b][key];err=abs(math.log(pred/obs))
        check('Hoebler/'+label+'/'+pair,err,ex['hoebler']['dose_only_abs_log_error'][label][pair])
        ho[pair][label]={'pred':pred,'observed':obs,'abs_log_error':err}
with (D/'independent_first_breakfast.csv').open(encoding='utf-8',newline='') as stream:rows=list(csv.DictReader(stream))
co={row['comparison']:abs(math.log(float(row['first_meal_signed_120_ratio']))) for row in rows}
for k,v in co.items():check('Costabile/'+k,v,ex['costabile_2023_first_breakfast']['equal_CHO_abs_log_error_signed120'][k])
out={'status':'Independent numerical replay only; chemistry and inferential limitations recorded separately.',
     'SHA256':{name:hashlib.sha256((D/name).read_bytes()).hexdigest() for name in ['amylose_transfer.py','amylose_transfer_results.json','AMYLOSE_MEMO.md']},
     'params':{'theta':theta,'power':power,'bornet_heated_exact':bb},'identification_sensitivities':ident,
     'cases':cases,'primary120_abs_log_errors':primary,'table3':{'observed':mo,'pred':margin,'error':margin_errors},
     'Hoebler_dose_only':ho,'Costabile_equality_errors':co,'numeric_checks_passed':len(checks),
     'comparators':{'flour_available_error':primary['empirical_barley_theta:flour_donor:available'],
                    'equality_error':primary['equality'],'flour_available_beats_equality':primary['empirical_barley_theta:flour_donor:available']<primary['equality']},
     'reader_disagreement':'Jointthetaavailable refined passes Sol lower only; wholemeal fails all three lower conventions. Above Sol lower is not full-interval membership.'}
(HERE/'transfer_v2_verification.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
print('CHECKS',len(checks));print('SHA256',out['SHA256']);print('PARAMS',out['params'])
for m,e in sorted(primary.items(),key=lambda kv:kv[1]):print(m,e,margin[m],margin_errors[m])
for pair,c in cases.items():
    for m in ['empirical_barley_theta:joint:available','empirical_barley_theta:joint:total','empirical_barley_theta:kernel_donor:total']:
        print('ADMISSION',pair,m,c['models'][m])
    print('THRESHOLDS',pair,c['thresholds'])
