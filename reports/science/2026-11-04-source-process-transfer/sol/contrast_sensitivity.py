"""Interval arithmetic on rounding/deletion envelopes; not confidence intervals."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parent

def div(a,b):return (a[0]/b[1],a[1]/b[0])
def rounding(m,half=.05):return (m-half,m+half)
def double_ratio(bt,bn,ot,on,half):
    return div(div(rounding(bt,half),rounding(bn,half)),div(rounding(ot,half),rounding(on,half)))

# All values below are public printed aggregate endpoints from source table.
# 1994 (kernel n10; flour n9); to obtain the retained-nine kernel mean,
# sample SEM e entails |m9-m10|<=e and nonnegative individual areas m9<=10*m10/9.
def delete1_bounds(m,e,n=10):return (max(0,m-e),min(m+e,n*m/(n-1)))
def delete1_rounding(m,e,den,mean_half=.05,sem_half=.5):
    low=max(0,m-mean_half-(e+sem_half))/(den+mean_half)
    high=min(m+mean_half+(e+sem_half),10*(m+mean_half)/9)/(den-mean_half)
    return (low,high)

oat=1111/1323
oat_rounding=div((1110.5,1111.5),(1322.5,1323.5))
target={
  'native90': {'ratio_oat':9.9/13.5,'ratio_barley':14.3/13.6,
               'double':(14.3/13.6)/(9.9/13.5),
               'double_rounding':double_ratio(14.3,13.6,9.9,13.5,.05)},
  'native120': {'ratio_oat':10.8/14.9,'ratio_barley':15.3/14.7,
                'double':(15.3/14.7)/(10.8/14.9),
                'double_rounding':double_ratio(15.3,14.7,10.8,14.9,.05)},
  'II90': {'ratio_oat':59/84,'ratio_barley':84/87,
           'double':(84/87)/(59/84),'double_rounding':double_ratio(84,87,59,84,.5)},
  'II120': {'ratio_oat':58/84,'ratio_barley':81/85,
            'double':(81/85)/(58/84),'double_rounding':double_ratio(81,85,58,84,.5)},
}
donor={}
for name,m,e,flour in [('normal',5.8,1,11.0),('high',5.2,2,10.2)]:
    b=tuple(x/flour for x in delete1_bounds(m,e))
    br=delete1_rounding(m,e,flour)
    donor[name]={'native120_central':m/flour,
                 'kernel_retained9_native120':b,
                 'kernel_retained9_plus_rounding_native120':br,
                 'central_double_barley_to_oat':(m/flour)/oat,
                 'deletion_double':div(b,(oat,oat)),
                 'deletion_rounding_double':div(br,oat_rounding)}
    assert div(br,oat_rounding)[1]<1
for t in target.values():assert t['double_rounding'][0]>1

extra={
 'barley_native90_donor_factors':{'normal':5.3/9.8,'high':4.4/9.0},
 'barley_II90_donor_factors':{'normal':29/55,'high':23/47},
 'barley_II120_donor_factors':{'normal':28/56,'high':24/47},
 'caveat':'Heaton oat endpoint is native180; barley native90/native120/II are separate operators, not commensurable windows. Primary transfer uses the stipulated native120 barley and native180 oat ratios; these are endpoint sensitivities, not alternative fitted factors.',
 'any_positive_power':'For any k>0, (barley_factor/oat_factor)**k<1, including crossed deletion+rounding envelope; all rounded target double ratios>1. For 0<k<=1 the prediction lies between donor contrast and1 (1 excluded).',
 'linear_attenuation':'If ratio is mapped as1-k*(1-r), and same positive k used for both species with positive mapped factors, barley factor remains below oat factor; same sign mismatch. Restrict k<=1 for attenuation.',
 'no_covariance':'No paired target covariance/individual data; SEMs do not identify uncertainty of ratios or cross-grain interaction. Arithmetic sign robustness under these deterministic input envelopes is not significance.',
 'cohort_overlap':'Heaton same ten within oat pair, per coordinator original verification; cross-publication 1994/2000 participant identity unknown. No deletion correction needed for Heaton pair.',
 'study_reference_pooling':'Do not pool1994 and2000 white bread means: different meals, SEMs and endpoints, no documented shared observations. Same 18.0 native120 mean is insufficient.'}
out={'target':target,'oat_factor':oat,'oat_printed_integer_rounding':oat_rounding,
     'barley_donor_bounds':donor,'endpoint_sensitivity':extra}
out['II_predictions_using_primary_native_donor_factors']={
    '90':{'oat':84*oat,'barley_normal':87*(5.8/11),'barley_high':87*(5.2/10.2)},
    '120':{'oat':84*oat,'barley_normal':85*(5.8/11),'barley_high':85*(5.2/10.2)}}
(ROOT/'contrast_sensitivity.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
print(json.dumps(out,indent=2))
