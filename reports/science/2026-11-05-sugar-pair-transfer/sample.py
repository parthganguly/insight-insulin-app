"""Describe the finite sample compatible with plotted means and upper SEM bars."""
import json
import math
from pathlib import Path

ROOT=Path(__file__).resolve().parent


def trapezoids(times, heights):
    return sum((b-a)*(u+v)/2 for a,b,u,v in zip(times,times[1:],heights,heights[1:]))


def positive_mean_integral(times, heights):
    value=0
    for left,right,u,v in zip(times,times[1:],heights,heights[1:]):
        if u*v<0:
            value+=(right-left)*max(u,v)**2/(2*abs(v-u))
        else:
            value+=(right-left)*(max(u,0)+max(v,0))/2
    return value


def max_positive(n, concentration, base, se, base_se):
    """Top-k sum bound; all masses nonnegative, sample SD = SEM * sqrt(n)."""
    top=0
    for k in range(n+1):
        fraction=k/n
        factor=math.sqrt((n-1)*fraction*(1-fraction))
        # Contribution to the whole-sample mean from an arbitrary subset of k.
        contributed=min(concentration, fraction*concentration+factor*se)
        baseline=max(0,fraction*base-factor*base_se)
        top=max(top,contributed-baseline)
    return top


def extract(fig):
    _,image_top,_,image_bottom=fig['image_pdf_box']
    point_per_px=(image_bottom-image_top)/fig['height']
    for period,arm,panel,x,y,cap in fig['series']:
        axis=fig['panels'][panel]
        unit_per_pt=axis['top_value']/(axis['bottom']-axis['top'])
        scale=unit_per_pt*point_per_px
        mu=[(axis['bottom']-image_top-(v+.5)*point_per_px)*unit_per_pt for v in y]
        sem=[(v-tip)*scale for v,tip in zip(y,cap)]
        yield period,arm,scale,mu,sem


def sample():
    fig=json.loads((ROOT/'figure.json').read_text())
    out={}
    for period,arm,scale,means,sems in extract(fig):
        panels=out.setdefault(period,{})
        estimates={}
        for end in [60,120,180]:
            times=[v for v in fig['times'] if v<=end]
            signed=[v-means[0] for v in means[:len(times)]]
            bounds={}
            for radius in [0,1,2,3]:
                err=radius*scale
                b_lo=max(0,means[0]-err)
                upper_mu=[v+err for v in means]
                # An unknown individual baseline lies behind two almost coincident marks.
                for method in ['caps','baseline_sem_unknown','all_sems_unknown']:
                    sb=sems[0]+2*err if method=='caps' else upper_mu[0]
                    low=[0]+[u-2*err for u in signed[1:]]
                    upper=[0]
                    for j in range(1,len(times)):
                        se=sems[j]+2*err if method!='all_sems_unknown' else upper_mu[j]
                        upper.append(max_positive(fig['sample_n'],upper_mu[j],b_lo,se,sb))
                    bounds[f'{method}_{radius}px']=[positive_mean_integral(times,low),trapezoids(times,upper)]
            estimates[str(end)]={'signed':trapezoids(times,signed),'positive_bounds':bounds}
        panels[arm]={'mean':means,'upper_SE_reading':sems,'area':estimates}
    return out


def contrasts(study):
    out={}
    for period,arms in study.items():
        out[period]={}
        for end in ['60','120','180']:
            observed={k:v['area'][end]['signed'] for k,v in arms.items()}
            rat=lambda a:a['T']*a['S']/(a['G']*a['I'])
            results={}
            for key in arms['G']['area'][end]['positive_bounds']:
                b={k:v['area'][end]['positive_bounds'][key] for k,v in arms.items()}
                low,high=({k:b[k][int((k in ('G','I'))==lower)] for k in b} for lower in [True,False])
                results[key]=[rat(low),rat(high)]
            out[period][end]={'signed_D':rat(observed),'sample_positive_D_bounds':results}
    return out
