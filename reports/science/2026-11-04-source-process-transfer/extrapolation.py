"""Necessary restrictions on the new meal scores, without estimating new coefficients from test outcomes."""
import json,math
from model import read,coefficients
from positive import run as envelopes
from wheat import calculate

def run():
    inputs=read('wheat_inputs.json')['arms'];bounds=envelopes()['ratio_bounds']
    cal=coefficients();results={};source=calculate()['printed_marginals']['source']['printed_ratio']
    for s in ['R','W']:
        n,d='HAW-'+s,'LAW-'+s
        starch=inputs[n]['Starch']/inputs[d]['Starch'];ah,al=inputs[n]['amylose_fraction'],inputs[d]['amylose_fraction']
        ap=(1-ah)/(1-al)
        outer=bounds[n+'/'+d]['with_reading'];need=outer[0]/starch
        max_b=math.log(need)/math.log(ap)
        # S=T[(1-a)+wa]. Solve S_high/S_low >= lower displayed-grid bound.
        denom=ah-need*al
        w=max(0,(need*(1-al)-(1-ah))/denom)
        refits=list(cal['gel']['leave_one_source_out'].values())
        results[s]={'admissible_participant_positive_ratio_envelope':outer,
                    'max_transfer_exponent_for_nonexcluded_prediction_at_reported_dose':max_b,
                    'min_amylose_weight_for_nonexcluded_two_pool_score':w,
                    'two_pool_assumptions':'Linear serving dose and amylopectin weight one in both arms. Inequality on the model only, not an identified nutrient potency.',
                    'drop_one_training_source_forecasts':[starch*ap**b for b in refits]}
    return {'paper_marginal_ratio':source,'forms':results,
            'note':'Each exponent or weight condition is a necessary condition for admission under the displayed-grid outer lower bound, not a fitted replacement, confidence interval, personal effect or upper bound on population parameters.'}
if __name__=='__main__':print(json.dumps(run(),indent=2))
