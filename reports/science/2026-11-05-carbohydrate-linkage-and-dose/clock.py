"""Frozen sucrose-to-isomaltulose forecasts, evaluated on signed group trajectories."""
import bisect
import csv
import math
from pathlib import Path

DATA = Path(__file__).resolve().parent / 'data'


def rows(name):
    with (DATA / name).open(encoding='utf-8-sig', newline='') as stream:
        return list(csv.DictReader(stream))


def interpolate(times, values, t):
    if not times[0] <= t <= times[-1]:
        raise ValueError(f'Time {t} outside observed support')
    j = bisect.bisect_left(times, t)
    if t == times[j]:
        return values[j]
    fraction = (t - times[j-1]) / (times[j] - times[j-1])
    return values[j-1] + fraction * (values[j] - values[j-1])


def area(times, values, a, b):
    knots = [a] + [t for t in times if a < t < b] + [b]
    heights = [interpolate(times, values, t) for t in knots]
    return sum((v-u) * (left+right) / 2 for u,v,left,right in
               zip(knots, knots[1:], heights, heights[1:]))


def log_error(prediction, observation):
    if prediction <= 0 or observation <= 0:
        return None
    return abs(math.log(prediction / observation))


def read_curves():
    datasets = {}
    def add(name, unit, times, control, test):
        assert times == sorted(set(times)) and len(times) == len(test) == len(control)
        datasets[name] = (unit, [t-times[0] for t in times],
                          [x-control[0] for x in control], [x-test[0] for x in test])
    def paired(name, unit, groups, time, val, baseline_carry=False):
        minutes = [float(row[time]) for row in groups[0]]
        assert minutes == [float(row[time]) for row in groups[1]]
        if baseline_carry:
            assert minutes[0] == -5
            minutes[0] = 0
        add(name,unit,minutes,*[[float(row[val]) for row in group] for group in groups])
    def arms(source, field, left, right):
        return [[row for row in source if row[field] == key] for key in [left,right]]
    paired('Holub','pmol/L',arms(rows('holub.csv'),'sugar','sucrose','isomaltulose'),'minutes','pmol_L')
    for period in ['morning','lunch']:
        source = [row for row in rows('vancan.csv') if row['period'] == period]
        paired('vanCan_'+period,'microU/mL',arms(source,'sugar','sucrose','isomaltulose'),
               'sample_min','mean_uU_ml',baseline_carry=True)
    for vehicle in ['water','tea']:
        paired('Suraphad_'+vehicle,'microIU/mL',
               arms(rows('tea_trace.csv'),'arm',vehicle+'_sucrose',vehicle+'_isomaltulose'),
               't_min','mean_delta_uIU_mL')
    # Original Fig 3b, linear scale, independently read centers in the 782x1161 figure.
    scale = 30 / (1030-910)
    add('Keesing','microIU/L as printed',[0,30,60,90,120,150,180],
        [(910-y)*scale for y in [910,714,855,915,969,1001,1006]],
        [(910-y)*scale for y in [910,938,935,956,955,982,1012]])
    thai = rows('suklaew.csv')
    add('Suklaew','microIU/mL',[float(x['minute']) for x in thai],
        *[[float(x[arm+'_increment_uIU_mL']) for x in thai] for arm in ['sucrose','isomaltulose']])
    for key,filename in [('A','zhang_a.csv'),('B','zhang_b.csv')]:
        tab = rows(filename)
        add('Zhang_'+key,'pmol/L',[int(x['minute']) for x in tab],
            *[[(754-float(x['source_y_'+arm+'_px']))*600/605 for x in tab] for arm in ['SUC','ISO']])
    return datasets


def fit(times, sucrose, iso):
    def point_loss(k, fit_amplitude):
        basis = [interpolate(times,sucrose,t/k)/k for t in times[1:]]
        c = 1.0
        if fit_amplitude:
            c = max(0,sum(a*b for a,b in zip(basis,iso[1:]))/sum(a*a for a in basis))
        return (sum((c*a-b)**2 for a,b in zip(basis,iso[1:])),k,c)
    q = area(times,iso,0,120)/area(times,sucrose,0,120)
    grid = [n/1000 for n in range(1000,4001)]
    return {'equality':(1,1), 'empirical120':(1,q), 'amplitude':point_loss(1,True)[1:],
            'stretch':min(point_loss(k,False) for k in grid)[1:],
            'joint':min(point_loss(k,True) for k in grid)[1:]}


def clock_panel():
    curves = read_curves()
    models = fit(*curves['Holub'][1:])
    panels = {}
    for label,(unit,t,s,i) in curves.items():
        intervals = {}
        for a,b in [(0,60),(0,120),(0,180),(60,120),(120,180)]:
            if b > t[-1]:
                continue
            ref,observed = area(t,s,a,b),area(t,i,a,b)
            forecasts = {}
            for model,(k,c) in models.items():
                pred = c*area(t,s,a/k,b/k)
                forecasts[model] = {'test_area_given_reference_curve':pred,
                    'ratio':pred/ref if ref else None,
                    'absolute_log_ratio_error':log_error(pred,observed) if ref>0 else None}
            intervals[f'{a}-{b}']={'sucrose':ref,'isomaltulose':observed,
                'observed_ratio':observed/ref if ref else None, 'forecasts':forecasts}
        panels[label]={'units':unit+' x min','intervals':intervals}
    source=panels['Holub']['intervals']['0-120']
    target=panels['Zhang_A']['intervals']['0-120']
    source_levels={arm:{'prediction_from_50g_water':source[arm],'observed_50g_plus_breakfast':target[arm],
                   'absolute_log_error':log_error(source[arm],target[arm])}
                   for arm in ['sucrose','isomaltulose']}
    return {'fitted_k_c':models,'studies':panels,'nominal_same_unit_source_only_levels':source_levels}
