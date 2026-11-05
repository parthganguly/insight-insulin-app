"""Point-estimate diagnostic for a shared gain with fixed, nonnegative source response increments."""
import json
from math import log
from test_transfer import load

def calculate():
    arms=load("plos.json")
    for source in ("pea","whey"):
        lo,hi=arms[source+"_low"],arms[source+"_high"]
        assert lo["availCHO"]==hi["availCHO"]==50 and hi["protein"]==2*lo["protein"]
    q_lo=arms["whey_low"]["area120"]/arms["pea_low"]["area120"]
    q_hi=arms["whey_high"]["area120"]/arms["pea_high"]["area120"]
    gap=log(q_hi)-2*log(q_lo)
    return {"low_ratio":q_lo,"high_ratio":q_hi,"high_observed_if_low_matched_ceiling":q_lo**2,
            "low_required_if_high_matched_floor":q_hi**0.5,"log_gap":gap,
            "worst_of_two_abs_log_errors_lower_bound":max(0,gap/3)}

if __name__=="__main__":
    print(json.dumps(calculate(),indent=2))
