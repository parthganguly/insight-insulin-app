"""Independent public aggregate arithmetic for final transfer review."""
import json,math
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
def trap(t,y):return sum((b-a)*(u+v)/2 for a,b,u,v in zip(t,t[1:],y,y[1:]))
def main():
 # Independent visual reading of kanata-B.png, rounded deliberately.
 t=[0,30,45,60,90,120,180]
 means={'CFM':[3.5,43,52,49,36,20.5,8],'CLP':[4.5,50.5,55,50,32,25,5]}
 areas={str(w):{a:trap(t[:6 if w==120 else 7],[x-v[0] for x in v[:6 if w==120 else 7]]) for a,v in means.items()} for w in [120,180]}
 ratio=areas['120']['CLP']/areas['120']['CFM']
 q={'process_Cai':.28464849503830014,'external_H20':.451505016722408,'hummus':.7062723100458949,'zero':0}
 forecasts={'equality':1,**{k:.7+.3*v for k,v in q.items()},'measured_total_starch':39.7/41.8}
 a=json.loads((ROOT/'pilot/aggregate.json').read_text())['windows']['120'];cov=a['positive_covariance_of_means'];m=a['positive']['arms'];x=m['Intact-C']['mean'];y=m['Intact-S']['mean'];tcrit=2.2621571628540993
 # Independently rearranged Fieller quadratic: x-r*y mean difference interval contains0.
 A=y*y-tcrit*tcrit*cov[1][1];B=-2*x*y+2*tcrit*tcrit*cov[2][1];C=x*x-tcrit*tcrit*cov[2][2]
 interval=[(-B-sign*math.sqrt(B*B-4*A*C))/(2*A) for sign in [1,-1]]
 assert A>0
 for r in interval:assert abs((x-r*y)**2-tcrit*tcrit*(cov[2][2]+r*r*cov[1][1]-2*r*cov[2][1]))<1e-6
 # For shared factorq both predictions must equalq; L1 triangle inequality gives floor.
 rb=x/m['Broken']['mean'];rs=y/m['Broken']['mean'];floor=abs(math.log(rb/rs))/2
 out={'Kanata_primary_source':'https://doi.org/10.1039/D5FO00348B','independent_visual_means':means,'signed_group_curve_areas':areas,'CLP_CFM_signed120_ratio':ratio,'published_positive180_bar_visual_approximate':{'CFM':4500,'CLP':4600,'ratio':4600/4500},'conditional_nominal_flour_fraction_predictions':forecasts,'abs_log_errors_against_rounded_signed120':{k:abs(math.log(v/ratio)) for k,v in forecasts.items()},'Cai_Fieller_C_S_95_normal_theory':interval,'shared_intact_factor_primary_error_floor':floor,'posthoc_duration_C_S':50/80,'frozen_measured_H20_C_S':.6164383561643835,'minimum_error_scope':'Only common multiplicative factor predicting same C/B and S/B; not all cheap process models or duration rules.'}
 (Path(__file__).with_name('final-independent-review.json')).write_text(json.dumps(out,indent=2)+'\n')
 print(json.dumps(out,indent=2))
if __name__=='__main__':main()
