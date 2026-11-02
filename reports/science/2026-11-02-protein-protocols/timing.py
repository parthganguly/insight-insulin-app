"""Post hoc check of the direction allowed by translating one protein component."""
import json
import math

# Allerton et al., post-breakfast results and Fig. 2(d). Total plasma insulin
# AUC, pmol/L x min, measured on the common breakfast clock from 0 to 180.
AUC = {"pre": 96340, "during": 112344, "post": 121997, "control": 99115}

def trapezoids(values, times):
    return sum((a + b) * (t1 - t0) / 2
               for a,b,t0,t1 in zip(values, values[1:], times, times[1:]))

def pulse(t):
    # Illustration only. Unit-height triangular incremental component,
    # centered at minute 105. Both translated pulses finish before minute 180.
    return max(0.0, 1 - abs(t - 105)/5)

def timing_check():
    pairs = [("pre","during"), ("post","during"), ("pre","post")]
    ratios = {f"{a}_over_{b}": AUC[a]/AUC[b] for a,b in pairs}
    ties = {key: abs(math.log(value)) for key,value in ratios.items()}
    grid = [0, 30, 60, 90, 120, 150, 180]  # illustrative, not the clinical grid
    sampled = [trapezoids([1 + pulse(t-s) for t in grid],grid) for s in (0, 15)]
    # Constant background of one unit and two triangles of equal area 5.
    exact = 180.0 + 5.0
    assert sampled[1] > sampled[0]
    versus_control = {arm:AUC[arm]/AUC['control'] for arm in ('pre','during','post')}
    return dict(observed=ratios,supplement_versus_no_whey=versus_control,no_change_abs_log_errors=ties,
                exact_integral_post_over_during_upper_bound=1.0,
                minimum_log_error_vs_printed_post_over_during=max(0, math.log(ratios["post_over_during"])),
                illustration=dict(grid=grid, exact_during=exact, exact_post=exact,
                                  sampled_during=sampled[0],sampled_post=sampled[1]))
if __name__ == "__main__":
    print(json.dumps(timing_check(),indent=2))
