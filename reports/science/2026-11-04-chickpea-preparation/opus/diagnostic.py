"""Opus co-lead diagnostic v2: Cai C/S compatibility, anchored vs standalone decomposition, and ILLUSTRATIVE
perturbation of the frozen D20 assay readings, including exact extrema of the primary error over perturbation boxes.
Reads only public cohort aggregates in this directory tree. Standard library only; no participant data; no fitting.
v1 is preserved in opus/_v1/.

python -I -X utf8 opus/diagnostic.py           (run from correction/)  write opus/DIAGNOSTIC.json
python -I -X utf8 opus/diagnostic.py --check
"""
from pathlib import Path
import csv, itertools, json, math, sys

ROOT = Path(__file__).resolve().parent
C = ROOT.parent
ILLUSTRATIVE = {'delta_1p34': None, 'delta_3p48': None}  # filled from the two observed 60->90 min mean decrements


def load(p): return json.loads((C / p).read_text(encoding='utf-8'))


def facts():
    with (C / 'astra' / 'aggregate.csv').open(encoding='utf-8', newline='') as f:
        return {(r['study'], r['arm'], r['measure'], int(r['minutes'])): float(r['value']) for r in csv.DictReader(f) if r['minutes'].isdigit()}


def dist(x, lo, hi): return 0.0 if lo <= x <= hi else (lo - x if x < lo else x - hi)


def box_extrema(d20, d, obs, R):
    """Exact extrema over the box {each D20 percent reading +/- d independently}. In log coordinates (u,v,w)=ln(B,S,C)
    the box is a box and every error below is a sum of |affine| terms, hence convex: maxima at vertices (all 8 evaluated);
    minima by exact 1-D piecewise-linear minimisation over breakpoints."""
    lo = {k: math.log(d20[k] - d) for k in d20}; hi = {k: math.log(d20[k] + d) for k in d20}
    a, b, c = math.log(obs['C_B']), math.log(obs['S_B']), math.log(obs['C_S']); lr = math.log(R)
    def f_stand(u, v, w): return (abs(w - u - a) + abs(v - u - b)) / 2
    def f_anch(u, v, w): return (abs(lr + w - v - a) + abs(lr - b)) / 2
    def f_cs(u, v, w): return abs(w - v - c)
    corners = list(itertools.product(*[(lo[k], hi[k]) for k in ('Broken', 'Intact-S', 'Intact-C')]))
    mx = {n: max(f(*x) for x in corners) for n, f in (('standalone', f_stand), ('anchored', f_anch), ('C_S', f_cs))}
    # minima
    u0, u1 = lo['Broken'], hi['Broken']; v0, v1 = lo['Intact-S'], hi['Intact-S']; w0, w1 = lo['Intact-C'], hi['Intact-C']
    cand = [u0, u1] + [min(max(x, u0), u1) for x in (w0 - a, w1 - a, v0 - b, v1 - b)]
    mn_stand = min((dist(u + a, w0, w1) + dist(u + b, v0, v1)) / 2 for u in cand)
    z0, z1 = w0 - v1, w1 - v0
    mn_anch = (dist(a - lr, z0, z1) + abs(lr - b)) / 2
    mn_cs = dist(c, z0, z1)
    return dict(primary_standalone=[mn_stand, mx['standalone']], primary_anchored=[mn_anch, mx['anchored']], C_S_error=[mn_cs, mx['C_S']])


def breakeven(d20, obs, R, target, which, lo=0.0, hi=None):
    """Smallest illustrative half-width d at which the box maximum of the chosen primary error reaches `target`
    (box maxima are nondecreasing in d because boxes are nested)."""
    hi = hi or min(d20.values()) - 1e-6
    f = lambda d: box_extrema(d20, d, obs, R)[which][1]
    if f(hi) < target: return None
    for _ in range(80):
        m = (lo + hi) / 2
        if f(m) >= target: hi = m
        else: lo = m
    return hi


def run():
    F = facts(); pr = load('pilot/results.json'); ag = load('pilot/aggregate.json')['windows']['120']['positive']
    obs = {'C_B': pr['positive_target_ratios'][0], 'S_B': pr['positive_target_ratios'][1]}; obs['C_S'] = obs['C_B'] / obs['S_B']
    se = {'C_B': ag['pairs']['Intact-C/Broken']['paired_delta_log_ratio_sem'], 'S_B': ag['pairs']['Intact-S/Broken']['paired_delta_log_ratio_sem'],
          'C_S': ag['pairs']['Intact-C/Intact-S']['paired_delta_log_ratio_sem']}
    ci = {'C_B': pr['paired_ratio_intervals_normal_theory']['Intact-C/Broken'], 'S_B': pr['paired_ratio_intervals_normal_theory']['Intact-S/Broken'],
          'C_S': pr['paired_ratio_intervals_normal_theory']['Intact-C/Intact-S']}
    m = pr['models']; R = pr['hummus_signed120_process_ratio']

    compat = {k: {q: dict(pred=v[q], inside_clinical_95=ci[q][0] <= v[q] <= ci[q][1], z_vs_paired_SE=math.log(v[q] / obs[q]) / se[q])
                  for q in ('C_B', 'S_B', 'C_S')} for k, v in m.items()}

    pairs = {'D20_anchored_vs_posthoc_5080_anchored': ('S_anchor_H20', 'posthoc_S_anchor_time'),
             'D20_standalone_vs_D20_anchored': ('local_H20', 'S_anchor_H20'),
             'D20_standalone_vs_hummus_shared_factor': ('local_H20', 'hummus_process'),
             'D20_anchored_vs_hummus_shared_factor': ('S_anchor_H20', 'hummus_process')}
    resolv = {}
    for name, (a, b) in pairs.items():
        resolv[name] = {q: dict(delta_log=abs(math.log(m[a][q] / m[b][q])), in_observed_paired_SE_units=abs(math.log(m[a][q] / m[b][q])) / se[q]) for q in ('C_B', 'S_B', 'C_S')}
        resolv[name]['identical_inputs'] = [q for q in ('C_B', 'S_B', 'C_S') if math.isclose(m[a][q], m[b][q], rel_tol=1e-12)]
        resolv[name]['observed_primary_error'] = {a: m[a]['primary_error'], b: m[b]['primary_error']}

    times = [20, 60, 90, 120]
    pct = {a: [F[('Cai2025', a, 'measured_amylo_pct', t)] for t in times] for a in ('Broken', 'Intact-S', 'Intact-C')}
    decs = {a: [max(0.0, v[i] - v[i + 1]) for i in range(len(v) - 1)] for a, v in pct.items()}
    d_vals = sorted({x for v in decs.values() for x in v if x > 0})
    d20 = {a: pct[a][0] for a in pct}
    hummus_primary = m['hummus_process']['primary_error']; t5080 = m['posthoc_S_anchor_time']['primary_error']
    boxes = {}
    for d in d_vals:
        ex = box_extrema(d20, d, obs, R)
        boxes[f'pm_{d:.2f}_pp'] = dict(half_width_pp=d, extrema=ex,
            standalone_below_hummus_throughout=ex['primary_standalone'][1] < hummus_primary,
            anchored_below_hummus_throughout=ex['primary_anchored'][1] < hummus_primary,
            anchored_minus_5080=[ex['primary_anchored'][0] - t5080, ex['primary_anchored'][1] - t5080],
            D20_ratio_ranges={q: [min(r[q] for r in rr), max(r[q] for r in rr)] for rr in [[{'C_B': (d20['Intact-C'] + sc) / (d20['Broken'] + sb),
                              'S_B': (d20['Intact-S'] + ss) / (d20['Broken'] + sb), 'C_S': (d20['Intact-C'] + sc) / (d20['Intact-S'] + ss)}
                              for sb, ss, sc in itertools.product((-d, d), repeat=3)]] for q in ('C_B', 'S_B', 'C_S')})
    central = dict(primary_standalone=m['local_H20']['primary_error'], primary_anchored=m['S_anchor_H20']['primary_error'],
                   C_S_error=m['local_H20']['C_S_error'], hummus_primary=hummus_primary, posthoc_5080_anchored_primary=t5080)
    be = dict(standalone=breakeven(d20, obs, R, hummus_primary, 'primary_standalone'), anchored=breakeven(d20, obs, R, hummus_primary, 'primary_anchored'))

    br = load('bread/results.json'); ex = load('external/results.json')
    bread = {k: dict(mean_error_vs_control=br['models'][k]['mean_error_vs_control'], separation_error=br['models'][k]['separation_error'])
             for k in ('equality', 'total_starch', 'wheat_flour_recipe', 'partly_accessible_hummus_reference', 'figure_H20', 'figure_H120')}

    return dict(
        status='v2 post-result diagnostic on public aggregates; no coefficient selected; not a validation',
        target=dict(endpoint=('Cai 2025: ratio of arm arithmetic means of participant-positive insulin area from the PUBLISHED time-zero sample to 120 min '
                              '(actual first-bite offset not established); n = 10 complete crossover triplets'),
                    observed=obs, observed_paired_delta_log_SE=se, clinical_fieller_95_normal_theory=ci,
                    note='Clinical sampling intervals for the response ratio; they are NOT assay-precision intervals.'),
        rule_compatibility_with_clinical_interval=compat,
        anchored_vs_standalone=dict(pairs=resolv, note=('Anchoring replaces S/B by the hummus ratio and therefore changes both S/B and C/B; C/S is unchanged. '
            'Conditional on the observed paired SEs, anchored D20 and anchored 50/80 predictions are close (0.08 SE on C/S), but their point rankings '
            'on an observed outcome can still differ.')),
        assay=dict(source_note=('Cai Fig. 1d: plotted points are means of n = 3 with a nonlinear fit and SEM bands; no Figure 1 source file in the listed '
                                'supplement. Values here are figure readings.'),
                   percent_hydrolysed=pct, observed_60_90_mean_decrements_pp=decs, assay_C_S_by_time={t: pct['Intact-C'][i] / pct['Intact-S'][i] for i, t in enumerate(times)},
                   perturbation_label=('ILLUSTRATIVE sensitivity magnitudes only (the two observed downward mean deviations). They do not estimate the 20-min '
                                       'assay error, a minimum uncertainty for every marker, or a probability distribution.'),
                   shift_to_reach_clinical_CS_upper_pp=pct['Intact-C'][0] - ci['C_S'][1] * pct['Intact-S'][0],
                   central_observed=central, perturbation_boxes=boxes,
                   breakeven_half_width_pp_where_box_max_primary_reaches_hummus=be,
                   extrema_method='log-coordinate convexity: maxima at the 8 box vertices; minima exact by piecewise-linear 1-D minimisation'),
        bread_assay_vs_label=dict(bajka_rolls_development=bread, kanata_120_signed_group=ex['outcomes']['120']['abs_log_error'],
                                  kanata_bread_assay_coverage=ex['own_bread_H20_coverage']))


if __name__ == '__main__':
    r = json.loads(json.dumps(run(), allow_nan=False)); p = ROOT / 'DIAGNOSTIC.json'
    if '--check' in sys.argv:
        assert json.dumps(r, sort_keys=True) == json.dumps(json.loads(p.read_text(encoding='utf-8')), sort_keys=True); print('PASS check'); sys.exit()
    p.write_text(json.dumps(r, indent=2, allow_nan=False) + '\n', encoding='utf-8', newline='\n')
    a = r['assay']; print('central', {k: round(v, 4) for k, v in a['central_observed'].items()})
    for k, v in a['perturbation_boxes'].items():
        print(k, {q: [round(x, 4) for x in y] for q, y in v['extrema'].items()}, 'below hummus:', v['standalone_below_hummus_throughout'], v['anchored_below_hummus_throughout'],
              'anch-5080', [round(x, 4) for x in v['anchored_minus_5080']])
    print('breakeven', a['breakeven_half_width_pp_where_box_max_primary_reaches_hummus'], 'shift', round(a['shift_to_reach_clinical_CS_upper_pp'], 3))
    for k, v in r['anchored_vs_standalone']['pairs'].items(): print(k, v['identical_inputs'], {q: round(x['in_observed_paired_SE_units'], 3) for q, x in v.items() if q in ('C_B', 'S_B', 'C_S')})
