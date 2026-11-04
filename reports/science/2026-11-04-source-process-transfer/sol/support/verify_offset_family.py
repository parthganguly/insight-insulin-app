"""Independent stdlib-only all-q check from two frozen native reading sets.

Run python verify_offset_family.py. Needs offset_family_inputs.json only.
No papers, images, other implementation modules or network required.
"""
import itertools,json,math
from pathlib import Path
HERE=Path(__file__).resolve().parent
inputs=json.loads((HERE/'offset_family_inputs.json').read_text(encoding='utf-8'))
pairs=[('HAWB','WWB'),('SP','WWB'),('HAWB','SP')]
scale_I=150/(1080-715)
time_after_fixed_baseline=120-15/2

def bound(case,marker_delta=2,clinical_zero_delta=0,assay_zero_delta=0):
    out={}
    for a,b in pairs:
        Ta,Tb=case['total_starch'][a],case['total_starch'][b]
        ya,yb=case['H30marker_y'][a],case['H30marker_y'][b]
        zero=case['H_axis_zero_y']
        # H-axis positive common scale cancels in direct release ratio.
        corners=[Ta/Tb*(z-(ya+da))/(z-(yb+db)) for z,da,db in itertools.product(
            [zero-assay_zero_delta,zero+assay_zero_delta],[-marker_delta,marker_delta],[-marker_delta,marker_delta])]
        release=[min(corners),max(corners)]
        allq=[min(1.,release[0]),max(1.,release[1])]
        # Baseline is identically0 in incremental graph. Post-baseline readings
        # and optional common zero-axis shift have coefficient sum112.5min.
        area_error=(marker_delta+clinical_zero_delta)*scale_I*time_after_fixed_baseline
        ca,cb=case['clinical_signed120'][a],case['clinical_signed120'][b]
        clinical=[(ca-area_error)/(cb+area_error),(ca+area_error)/(cb-area_error)]
        overlap=allq[0]<=clinical[1] and clinical[0]<=allq[1]
        gap=max(0.,allq[0]-clinical[1],clinical[0]-allq[1])
        # Check the theorem numerically at many q values and both d orientations.
        assert all(v>0 for v in corners)
        for direct in corners:
            for db_value in [.0001,1.,100.,100000.]:
                da_value=direct*db_value
                for ratio in [0.,1e-9,.001,.1,1.,100.,1e9]:
                    q=ratio*db_value
                    score=(q+da_value)/(q+db_value)
                    weight=db_value/(q+db_value)
                    assert math.isclose(score,weight*direct+(1-weight),rel_tol=1e-12,abs_tol=1e-12)
                    assert min(1.,direct)-1e-12<=score<=max(1.,direct)+1e-12
        out[a+'/'+b]={'direct_release_range':release,'closed_all_q_outer_envelope':allq,
                     'signed120_reading_range':clinical,'overlap':overlap,'positive_gap_if_disjoint':gap}
    return out

results={}
for label,case in inputs['cases'].items():
    fixed=bound(case)
    stress=bound(case,2,1,1)
    wider=bound(case,3)
    results[label]={'fixed_axes_marker2px':fixed,'marker2px_plus_axis_zero1px_stress':stress,
                    'fixed_axes_marker3px_stress':wider}
    assert all(not v['overlap'] for v in fixed.values())

# Cross-check actual coordinator artifact values independently of its function.
count=0
for pair,row in inputs['coordinator_expected']['pairs'].items():
    actual=results['astra']['fixed_axes_marker2px'][pair]
    for old,new in [('H30_marker_range','direct_release_range'),
                    ('all_q_nonnegative_envelope','closed_all_q_outer_envelope'),
                    ('signed120_reading_range','signed120_reading_range')]:
        for value,expected in zip(actual[new],row[old]):
            assert math.isclose(value,expected,rel_tol=1e-12,abs_tol=1e-12),(pair,new,value,expected)
            count+=1
    assert actual['overlap']==row['intervals_overlap']

out={'theorem':'For d_b>0 and q>=0, (q+d_a)/(q+d_b)=w*(d_a/d_b)+(1-w), w=d_b/(q+d_b) in(0,1]. It lies between direct release and1;1 is a q->infinity limit unless d_a=d_b.',
     'mathematical_scope':['Every finite common nonnegative q, not merely the fitted hummus q.',
          'Any common positive rescaling of both d values leaves the union over q unchanged (replace q by q/scale).',
          'Closed envelopes include limiting1; they are outer envelopes, not claims all endpoints attained for finite q.',
          'One common q across all foods is stronger than pairwise envelope membership; pairwise failure is already sufficient for impossibility under stated inputs.'],
     'numerical_scope':['H30 released grams from printed totalstarch, own/native screenshot readings; target signed120 arithmetic mean-curve ratio.',
          'The fixed-axis+/-2px numeric nonoverlap is deterministic reading sensitivity, not samplingCI or biological rejection.',
          'The SP/WWB and HAWB/SP disjointness is narrow; axis-zero or wider-marker stresses can admit overlap. See all cases.',
          'No assertion about other assay times, food-specific backgrounds, negative q, nonlinear transformations, participant-positive AUCs, reportedII or population effects.'],
     'results':results,'coordinator_numeric_values_checked':count,'checks_passed':True}
(HERE/'offset_family_verification.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf-8')
print(json.dumps(out,indent=2))
