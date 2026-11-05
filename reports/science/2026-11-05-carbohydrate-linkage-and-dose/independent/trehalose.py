import math,json,hashlib
from pathlib import Path
P=Path(__file__).parent
r=590/1709
pred={'nominal_grams':1,'complete_hydrolysis_stated_anhydrous_basis':(2*180.156)/342.297,'Holub_q120':.65477135,'Holub_scalar':.52075798,'Johansen33':.420}
# Product mass/purity sensitivity is separate from stated 25g trehalose convention.
product_yield=[28*purity*(2*180.156)/378.327/25 for purity in [.98,1]]
out={'native_insulin':{'glucose_mean':1709,'glucose_SE':142,'trehalose_mean':590,'trehalose_SE':101,'n':20,'window_min':120,'operator':'individual positive incremental area; below fasting ignored','units_printed':'uIU/mL x 2h','ratio_of_means':r,'mean_of_individual_ratios_reported':.36},'predictions':pred,'absolute_log_errors':{k:abs(math.log(v/r)) for k,v in pred.items()},'product_28g_98to100pct_dihydrate_glucose_yield_ratio':product_yield,'loss_individual_ratio_sensitivity':{k:abs(math.log(v/.36)) for k,v in pred.items()},'paired_uncertainty':{'paired_covariance':None,'paired_ratio_CI':None,'marginal_SD_glucose':142*math.sqrt(20),'marginal_SD_trehalose':101*math.sqrt(20),'possible_SE_difference_given_unknown_correlation':[abs(142-101),142+101]},'exclusions':{'recruited':24,'anemia':1,'high_fasting_insulin':1,'trehalose_diarrhea':2,'analyzed':20}}
critical=2.093024
low=(590-critical*101)/(1709+critical*142);high=(590+critical*101)/(1709-critical*142)
out['rounding_envelope_interval']=[(589.5-critical*101.5)/(1709.5+critical*142.5),(590.5+critical*101.5)/(1708.5-critical*142.5)]
out['conservative_paired_t_ratio_interval']={'df':19,'critical':critical,'interval':[low,high],'equality_vs_Johansen_midpoint':math.sqrt(.420),'transport_pair_midpoints':{'Johansen_vs_scalar':math.sqrt(.420*.52075798),'Johansen_vs_q':math.sqrt(.420*.65477135),'scalar_vs_q':math.sqrt(.52075798*.65477135)},'interpretation':'Approximate paired-t uncertainty set using worst-case marginal-SE covariance bound; not distribution-free or a simultaneous interval.'}
out['conditional_cross_study_levels']={}
for conv in [6,6.945]:
 anchor=8.1*1000/conv
 out['conditional_cross_study_levels'][str(conv)]={'Lee_glucose25_anchor':anchor,'glucose_error':anchor-1709,'trehalose_predictions':{m:{'level':anchor*v,'signed_error':anchor*v-590,'same_control_calibrated_level':1709*v,'same_control_signed_error':1709*v-590} for m,v in pred.items() if m!='complete_hydrolysis_stated_anhydrous_basis'}}
out['literal_hour_positive_area_upper_bounds']={'glucose':2*(38.1-3.77),'trehalose':2*(15.5-4.25),'interpretation':'Published mean area values exceed these bounds, so literal hours are inconsistent; native level comparisons require a conditional minute-unit reading.'}
P.joinpath('results.json').write_text(json.dumps(out,indent=2));P.joinpath('receipt.json').write_text(json.dumps({'source_url':'https://pmc.ncbi.nlm.nih.gov/articles/PMC5292800/','retrieval':'EuropePMC fullTextXML public endpoint; supplementaryFiles request timed out','hashes':{f.name:hashlib.sha256(f.read_bytes()).hexdigest() for f in P.glob('original.*')},'exposure':'Frozen TREHALOSE_PLAN read before numeric extraction; parent study identity/design known; independent code, original text and table checked'},indent=2));print(json.dumps(out,indent=2))
