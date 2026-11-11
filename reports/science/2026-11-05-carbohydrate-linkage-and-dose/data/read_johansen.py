"""Reproduce digitized arm summaries. Pixel rows refer to the archived figure previews."""
import csv
from pathlib import Path
from itertools import pairwise
root = Path(__file__).resolve().parent
times = [0,15,30,45,60,90,120,150,180]
# cohort, dose, panel, raster, y at 0, y at calibrating concentration, concentration, OM rows, MD rows, native relative reduction percentages
series = [
('HV',50,'2A','preview.png',573,140,80,[536,464,405,419,449,480,504,524,532],[539,379,225,238,316,394,461,520,546],[58,58.7,57.6]),
('PwO',33,'2B','preview.png',551,91,100,[510,446,362,387,433,487,502,511,515],[506,362,190,196,298,426,489,513,520],[59.9,58,57.4]),
('PwO',50,'2C','preview.png',1195,841,100,[1167,1125,1058,1046,1063,1104,1129,1143,1155],[1160,1057,924,832,897,1061,1099,1138,1146],[57.6,55,52.5]),
('T2D',50,'2D','preview.png',1190,837,100,[1142,1126,1114,1093,1088,1077,1076,1088,1096],[1134,1117,1067,1029,1007,1004,1045,1072,1100],[42,47.8,38.4]),
('PwO BMI 25-29.9',33,'S5a','FigS5.png',623,369,100,[604,571,530,546,572,599,604,608,608],[600,544,445,449,511,580,600,608,608],[58,53,51.9]),
('PwO BMI 25-29.9',50,'S5b','FigS5.png',623,368,100,[607,583,544,544,555,580,590,601,605],[606,558,456,425,445,541,580,606,609],[61.2,60.9,58.1]),
('PwO BMI >=30',33,'S5c','FigS5.png',943,703,150,[925,902,870,878,893,914,922,926,926],[924,861,802,804,837,883,914,925,930],[62,61.5,61]),
('PwO BMI >=30',50,'S5d','FigS5.png',950,697,150,[934,908,871,860,869,892,908,914,923],[929,857,800,726,779,875,883,906,912],[53.6,51.8,50.1]),
]
with (root/'arm_trajectory.csv').open('w',newline='') as pt, (root/'window_summary.csv').open('w',newline='') as ar:
 points=csv.writer(pt); areas=csv.writer(ar)
 points.writerow(['cohort','dose_g','panel','image','minute','OM_center_y_px','MD_center_y_px','cal_zero_y_px','cal_upper_y_px','cal_upper_uIU_mL','OM_approx_mean_uIU_mL','MD_approx_mean_uIU_mL'])
 areas.writerow(['cohort','dose_g','panel','minute','approx_OM_net_group_curve_uIU_min_mL','approx_MD_net_group_curve_uIU_min_mL','approx_curve_ratio','author_model_ratio_from_printed_percent','author_relative_reduction_percent'])
 for co,dose,panel,image,z,high,h,om,md,perc in series:
  a,b=[[h*(z-y)/(z-high) for y in rows] for rows in (om,md)]
  for j,t in enumerate(times):points.writerow([co,dose,panel,image,t,om[j],md[j],z,high,h,round(a[j],2),round(b[j],2)])
  for end,percent in zip([60,120,180],perc):
   def area(curve):
    return sum((right-left)*((curve[j]+curve[j+1])/2-curve[0]) for j,(left,right) in enumerate(pairwise(times)) if right<=end)
   oa,ma=area(a),area(b)
   areas.writerow([co,dose,panel,end,round(oa,1),round(ma,1),round(oa/ma,4),round(1-percent/100,3),percent])
