"""Figure digitization of exposed Hoebler 1999, using aggregate public data only."""
from pathlib import Path
import csv, hashlib, itertools, math
root=Path(__file__).resolve().parent
def save(name,header,rows):
    with (root/name).open('w',newline='',encoding='utf-8') as f:
        w=csv.writer(f);w.writerow(header);w.writerows(rows)
foods=['WWB','HAWB','SP']
time=[0,15,30,45,60,75,90,105,140,170,200,230]
ins_x=[309,336,362,387,413,439,466,493,553,606,659,710]
# Marker centers in the original screenshot, not resized crops. Read against the symbol legend.
iy={'WWB':[1080,982,794,823,749,807,819,828,876,967,984,1017],
    'HAWB':[1080,1037,886,844,856,920,969,1001,1019,1028,1032,1033],
    'SP':[1080,1046,891,877,889,920,954,937,940,959,950,985]}
hy={15:{'WWB':426,'HAWB':453,'SP':470},30:{'WWB':350,'HAWB':395,'SP':429}}
tot={'WWB':93,'HAWB':89,'SP':91}
avail={'WWB':92,'HAWB':74,'SP':95}
index={'WWB':100,'HAWB':57,'SP':61}
index_sd={'WWB':None,'HAWB':20,'SP':16}
def conc(y):return (1080-y)*150/(1080-715)
def hydro(y):return (570-y)*80/(570-183)/100
def profile_area(values,cut):
    area=0
    for i in range(1,len(time)):
        if time[i-1]>=cut:break
        width=min(time[i],cut)-time[i-1]
        c0,c1=values[i-1],values[i]
        endpoint=c0+(c1-c0)*width/(time[i]-time[i-1])
        area+=width*(endpoint+c0)/2
    return area
native={k:profile_area(list(map(conc,iy[k])),120) for k in foods}
save('fig1b_points.csv',['food','time_min','x_px','y_px','approx_increment_mU_L'],([k,t,x,y,conc(y)] for k in foods for t,x,y in zip(time,ins_x,iy[k])))
save('fig2_points.csv',['time_min','food','x_px','y_px','approx_H_pct','total_starch_g','hydrolysed_starch_g_if_H_is_fraction_of_starch'],([t,k,{15:310,30:344}[t],yy,100*hydro(yy),tot[k],tot[k]*hydro(yy)] for t,ys in hy.items() for k,yy in ys.items()))
save('clinical.csv',['food','n','signed_120_approx_mU_min_L','signed_230_approx_mU_min_L','study_II','II_SD','II_reference','total_starch_g','reported_available_starch_g'],
     ([k,8,native[k],profile_area(list(map(conc,iy[k])),230),index[k],index_sd[k],'WWB',tot[k],avail[k]] for k in foods))
ref_d=9.34363256785; intact_d=2.40584551148; donor_r=0.70627231005
q=14.2761598
power=math.log(donor_r)/math.log(intact_d/ref_d); slope=(1-donor_r)/(1-intact_d/ref_d)
def models(a,b,ha,hb,multiplier=1):
    da,db=tot[a]*ha*multiplier,tot[b]*hb*multiplier
    x=da/db
    return {'equality':1,'total_starch':tot[a]/tot[b],'reported_available_starch':avail[a]/avail[b],
            'raw_H_fraction_ratio':ha/hb,'released_g_direct':x,'released_g_power':x**power,
            'old_oriented_affine':1+slope*(x-1),'q_plus_d':(q+da)/(q+db)}
pairs=[('HAWB','WWB'),('SP','WWB'),('HAWB','SP')]
out=[]
for t,ys in hy.items():
    for a,b in pairs:
        for conv in (1,0.9):
            central=models(a,b,hydro(ys[a]),hydro(ys[b]),conv)
            edge=[models(a,b,hydro(ys[a]+dy1),hydro(ys[b]+dy2),conv)
                  for dy1,dy2 in itertools.product((-2,2),repeat=2)]
            for model,pred in central.items():
                for outcome, obs in [('signed_iAUC120_arm_ratio',native[a]/native[b]),('reported_II_group_mean_ratio',index[a]/index[b])]:
                    bounds=[v[model] for v in edge]
                    out.append([t,conv,a+'/'+b,model,outcome,obs,pred,min(bounds),max(bounds),abs(math.log(pred/obs))])
save('forecasts.csv',['assay_min','mass_conversion','contrast','model','evaluation_endpoint','observed','predicted','pred_reading_min','pred_reading_max','absolute_log_error'],out)
for f in foods:print(f,'area120',native[f], 'area230',profile_area(list(map(conc,iy[f])),230))
for row in out:
    if row[0:2]==[30,1] and row[4]=='signed_iAUC120_arm_ratio':
        print(row[2],row[3],round(row[5],4),round(row[6],4),round(row[9],4))
print('donor q/power/affine slope',q,power,slope)
assert len(out)==192
