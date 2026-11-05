"""Post-outcome uncertainty and native-unit stress tests for a frozen relative forecast."""
from itertools import product
import math

# Yoshizane Table 1, area over 0-2 h above fasting; published means and SEs, n=20.
TEST, REF, SE_TEST, SE_REF = 590, 1709, 101, 142
T19 = 2.093024054408263


def conservative_interval(test, ref, se_test, se_ref):
    # Invert |T-rG| <= t*(SE_T+r SE_G). Only for r>=0 with positive reference.
    if ref <= T19*se_ref:
        raise ValueError('Conservative upper limit is unbounded')
    return max(0,(test-T19*se_test)/(ref+T19*se_ref)), (test+T19*se_test)/(ref-T19*se_ref)


def native_results():
    rules = {'grams':1,'stoichiometric':2*180.156/342.297,
             'Holub120':.65477135,'Holub_scalar':.52075798,'Johansen33':.420}
    central = conservative_interval(TEST,REF,SE_TEST,SE_REF)
    corners=[conservative_interval(*(x+y for x,y in zip((TEST,REF,SE_TEST,SE_REF),offsets)))
             for offsets in product((-.5,.5),repeat=4)]
    envelope=(min(p[0] for p in corners),max(p[1] for p in corners))
    midpoints={}
    for a,pa in rules.items():
        for b,pb in rules.items():
            if pa >= pb:
                continue
            cutoff=math.sqrt(pa*pb)
            midpoints[a+' vs '+b]={'cutoff':cutoff,
                'closer_throughout_rounding_envelope':a if envelope[1]<cutoff else b if envelope[0]>cutoff else None}
    levels={}
    for label,control in [('Lee25_6',8.1*1000/6),('Lee25_6.945_sensitivity',8.1*1000/6.945),
                          ('target_glucose_calibrated',REF)]:
        comparison={}
        for name,ratio in rules.items():
            test_prediction=control*ratio
            comparison[name]={'glucose':control,'trehalose':test_prediction,
                 'signed_errors':[control-REF,test_prediction-TEST],
                 'level_MAE':(abs(control-REF)+abs(test_prediction-TEST))/2,
                 'ratio_log_error':abs(math.log(ratio/(TEST/REF)))}
        levels[label]=comparison
    return {'positive_area_means':[TEST,REF],'ratio_of_means':TEST/REF,'mean_of_individual_ratios':.36,
            'unknown_covariance_t_interval':central,'rounding_envelope':envelope,'model_midpoints':midpoints,
            'native_levels_conditional_minute_unit':levels,
            'max_possible_literal_hour_integrals':[2*(15.5-4.25),2*(38.1-3.77)]}
