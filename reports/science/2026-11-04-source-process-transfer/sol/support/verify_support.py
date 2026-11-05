"""Compact stdlib-only independent support arithmetic, outcome-exposed.

Own manual figure readings; other verifier's scripts/outputs were also exposed.
Run from anywhere. All numeric inputs are public aggregate values/coordinates.
"""
import csv,hashlib,json,math
from pathlib import Path
ROOT=Path(__file__).resolve().parent
LAB=ROOT.parent.parent

def trap(times,values,cut):
    area=0.
    for a,b,u,v in zip(times,times[1:],values,values[1:]):
        if a>=cut:break
        end=min(cut,b);end_value=u+(v-u)*(end-a)/(b-a)
        area+=(end-a)*(u+end_value)/2
    return area

# Hoebler own Figure1B readings against native screenshot axis0/150.
t=[0,15,30,45,60,75,90,105,140,170,200,230]
ys={'WWB':[1080,982,795,824,750,807,819,828,876,968,984,1017],
    'HAWB':[1080,1037,886,844,857,921,969,1001,1019,1028,1032,1033],
    'SP':[1080,1046,891,878,889,920,955,937,940,959,950,985]}
areas={k:trap(t,[(1080-y)*150/(1080-715) for y in row],120) for k,row in ys.items()}
# Hoebler Figure2H30 and optionalH15. Axis own reading0y570/80y184.
hy={15:{'WWB':426,'HAWB':453,'SP':470},30:{'WWB':350,'HAWB':395,'SP':429}}
total={'WWB':93.,'HAWB':89.,'SP':91.}
available_printed={'WWB':92.,'HAWB':74.,'SP':95.}
rs_printed={'WWB':1.3,'HAWB':16.5,'SP':2.5}
II={'WWB':100.,'HAWB':57.,'SP':61.}
# Frozen public hummus donor values; fitq, pairlambda andpower from donor only.
hummus={'ICC_area':1725.498338870432,'RCC_area':2443.106312292359,
        'ICC_release_g':2.4058455114822546,'RCC_release_g':9.343632567849687}
r=hummus['ICC_area']/hummus['RCC_area']
h=hummus['ICC_release_g']/hummus['RCC_release_g']
lam=(1-r)/(1-h)
power=math.log(r)/math.log(h)
q=(r*hummus['RCC_release_g']-hummus['ICC_release_g'])/(1-r)
assert q>0
preds=[]
coherence=[]
for minute,food_y in hy.items():
    H={k:(570-y)*80/(570-184)/100 for k,y in food_y.items()}
    for conv in [1.,.9]:
        d={k:total[k]*H[k]*conv for k in total}
        for a,b in [('HAWB','WWB'),('SP','WWB'),('HAWB','SP')]:
            x=d[a]/d[b]
            models={'direct_released_grams':x,'power':x**power,
                    'pair_oriented_affine':1+lam*(x-1),'coherent_q_plus_d':(q+d[a])/(q+d[b]),
                    'equality':1.,'starch_dose':total[a]/total[b],
                    'reported_available_starch':available_printed[a]/available_printed[b]}
            for endpoint,obs in [('native_signed120',areas[a]/areas[b]),('reported_II',II[a]/II[b])]:
                preds.append({'minute':minute,'mass_conversion':conv,'contrast':a+'/'+b,'endpoint':endpoint,
                              'observed':obs,'predictions':models,
                              'abs_log_error':{m:abs(math.log(p/obs)) for m,p in models.items()}})
        qratio=lambda a,b:(q+d[a])/(q+d[b])
        assert math.isclose(qratio('HAWB','WWB')*qratio('WWB','SP'),qratio('HAWB','SP'),rel_tol=1e-14)
        assert math.isclose(qratio('HAWB','WWB')*qratio('WWB','HAWB'),1,rel_tol=1e-14)
        pair=lambda a,b:1+lam*(d[a]/d[b]-1)
        coherence.append({'minute':minute,'mass_conversion':conv,
                          'q_plus_d_triangle_residual':qratio('HAWB','WWB')*qratio('WWB','SP')-qratio('HAWB','SP'),
                          'pair_triangle_residual':pair('HAWB','WWB')*pair('WWB','SP')-pair('HAWB','SP'),
                          'pair_reciprocal_product':pair('HAWB','WWB')*pair('WWB','HAWB')})

# Costabile independent graph anchors; first-breakfast period, not lunch.
ct=[0,30,60,90,120,180,240]
cy={'85HAF':[893,331,206,437,513,701,834],
    '70HAF':[866,214,339,311,460,615,800],
    'control':[875,282,235,286,474,762,834]}
ca={}
for name,row in cy.items():
    values=[(1003-y)*200/(1003-59) for y in row]
    inc=[v-values[0] for v in values]
    ca[name]={'signed120':trap(ct,inc,120),'signed240':trap(ct,inc,240)}
published={'85HAF':13500.,'70HAF':14000.,'control':13200.}
costabile=[]
for a,b in [('85HAF','control'),('70HAF','control'),('85HAF','70HAF')]:
    costabile.append({'pair':a+'/'+b,'own_signed120_ratio':ca[a]['signed120']/ca[b]['signed120'],
                      'own_signed240_ratio':ca[a]['signed240']/ca[b]['signed240'],
                      'published_breakfast_ratio':published[a]/published[b],
                      'equality_forecast':1.})
other=list(csv.DictReader((LAB/'support/breakfast/areas.csv').open(encoding='utf-8')))
checks={}
for row in other:
    name=row['food']; checks[name]={}
    for endpoint,col in [('signed120','discrete_signed_120_uU_min_mL'),('signed240','discrete_signed_240_uU_min_mL')]:
        diff=ca[name][endpoint]-float(row[col]);checks[name][endpoint+'_difference_vs_astra']=diff
        assert abs(diff)<.02*float(row[col])

# Independent necessary parameter algebra. ScoreT*((1-a)+w*a), aH=.743,aL=.24.
ex=json.loads((LAB/'extrapolation_results.json').read_text(encoding='utf-8'))
two_pool={}
for form,TH,TL in [('R',28.5,35.2),('W',19.9,26.9)]:
    target_lower=ex['forms'][form]['admissible_participant_positive_ratio_envelope'][0]
    dose=TH/TL;u=target_lower/dose
    bmax=math.log(u)/math.log(.257/.76)
    wmin=(.76*u-.257)/(.743-.24*u)
    assert math.isclose(bmax,ex['forms'][form]['max_transfer_exponent_for_nonexcluded_prediction_at_reported_dose'],rel_tol=1e-12)
    assert math.isclose(wmin,ex['forms'][form]['min_amylose_weight_for_nonexcluded_two_pool_score'],rel_tol=1e-12)
    assert math.isclose(dose*(.257+.743*wmin)/(.76+.24*wmin),target_lower,rel_tol=1e-12)
    forecasts=[]
    aa=[.27,.17,.35];yy=[24.8,29.2,19.1]
    for omitted in range(3):
        inds=[i for i in range(3) if i!=omitted]
        i,j=inds;b=(math.log(yy[i])-math.log(yy[j]))/(math.log1p(-aa[i])-math.log1p(-aa[j]))
        forecasts.append(dose*(.257/.76)**b)
    assert all(math.isclose(a,b,rel_tol=1e-12) for a,b in zip(forecasts,ex['forms'][form]['drop_one_training_source_forecasts']))
    two_pool[form]={'bmax_recomputed':bmax,'wmin_recomputed':wmin,'weight_boundary_forecast':target_lower,
                    'drop_one_forecasts':forecasts,'all_root_snapshot_fields_match':True}

hashes=json.loads((ROOT/'source_digests.json').read_text(encoding='utf8'))
out={'scope':'Outcome-exposed public aggregate source arithmetic. Own manual readings after exposure to other verifier code; not blinded.',
     'source_hashes':hashes,'hummus_coefficients':{'q_grams':q,'power':power,'pair_lambda':lam},
     'hoebler':{'clinical_marker_y':ys,'H_marker_y':hy,'signed120':areas,'forecasts':preds,'coherence_checks':coherence,
                 'table1_ambiguity':{'total_starch_g':total,'RS_g':rs_printed,'available_starch_g_printed':available_printed,
                  'available_by_difference':{k:total[k]-rs_printed[k] for k in total},
                  'note':'Spaghetti printedavailable95 exceeds total91; source also definesavailable as total-RS. Do not silentlyfix. Primaryreleasedgrams use measured totalstarch; reportedavailable kept separate. H glucose-equivalent/starchbasis ambiguity retained as1/.9massconversion sensitivity.'}},
     'costabile':{'own_marker_y':cy,'own_areas':ca,'contrasts':costabile,'comparison_to_other_digitization':checks,
                  'source_note':'Original breakfast insulin13500/14000/13200 areas,SD9700/12000/12000; prose printsmg/dLmin inconsistent with insulinplotuU/mL. Firstbreakfast outcomes only; laterlunch effect separate. NSdoesnotimplyratio1.'},
     'two_pool':two_pool,'limitations':['No samplingCI or independent performance estimate from dependent same-study contrasts.',
          'q+d is calibrated to one frozenhummus pair and assumestransfer ofgram-scaleoffset across foods/assays/portions.',
          'Readings and totalstarch/Hconversion uncertainty limit descriptive ranking.',
          'Necessaryw,bconditions concern modeladmission under deterministic displayed-grid lowerbound, not identifiednutrientpotency or populationparameterbounds.']}
(ROOT/'support_results.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
print('Hummus',out['hummus_coefficients'])
print('Hoebler120',areas)
for p in preds:
    if p['minute']==30 and p['mass_conversion']==1 and p['endpoint']=='native_signed120':print(p)
print('Costabile',costabile)
print('Two_pool',two_pool)
