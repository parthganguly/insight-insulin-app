import csv,itertools,statistics
import extract as e
def read_bounds(food):
 y=e.iy[food]; common=list(map(e.conc,y))
 return tuple(e.profile_area([0.0]+[e.conc(v+shift) for v in y[1:]],120) for shift in (2,-2))
bounds=[]
for a,b in e.pairs:
    lo,hi=read_bounds(a);blo,bhi=read_bounds(b)
    bounds.append([a+'/'+b,e.native[a]/e.native[b],lo/bhi,hi/blo])
e.save('clinical_reading_bounds.csv',['pair','central','min_at_2px_each','max_at_2px_each'],bounds)
print('clinical reading bounds',bounds)
summary=[]
for t in (15,30):
 for endpoint in ['signed_iAUC120_arm_ratio','reported_II_group_mean_ratio']:
  for model in sorted({v[3] for v in e.out}):
   vals=[row for row in e.out if row[0]==t and row[1]==1 and row[4]==endpoint and row[3]==model]
   summary.append([t,endpoint,model,statistics.mean(x[-1] for x in vals[:2]),statistics.mean(x[-1] for x in vals)])
e.save('summary.csv',['assay_min','endpoint','model','mean_abs_log_error_two_prespecified','mean_abs_log_error_three_dependent'],summary)
print([r for r in summary if r[0]==30 and r[1]=='signed_iAUC120_arm_ratio'])
