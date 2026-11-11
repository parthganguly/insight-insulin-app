# Compact independent support receipt

Run `python verify_support.py` (standard library only). Output `support_results.json` contains own marker coordinates, source hashes, all forecasts and checks. This is outcome-exposed research arithmetic; I also saw the other verifier's code before finalizing these readings. It is independent recomputation and manual graph checking, not blinded extraction. Source papers/images remain local and were not copied here.

Hoebler 1999: visually read public Figures 1 B/2 in supplied screenshots. Own native signed 0–120 areas are WWB 11531.80, HAWB 6661.50, spaghetti 6872.41 mU·min/L; ratios HAWB/WWB.577663, SP/WWB.595953, HAWB/SP.969311. Source reported II 100/57/61 remains separate (participant-normalized, source time-window/integration definition differs). The high-amylose bread uses high-amylose maize starch substituted into wheat flour, not the 2019 high-amylose-wheat cultivar.

Own H 30 markers use native y 0=570/y 80=184: WWB 350, HAWB 395, SP 429. Total starch grams 93/89/91. Frozen hummus donor independently givesq 14.2761598237 g,power.2563060312,pairlambda.3955848728. At H 30 with no 0.9 conversion:

|Contrast|Observed native 120|Direct releasegrams|Coherentq+d|Pairaffine|Power|
|---|---:|---:|---:|---:|---:|
|HAWB/WWB|.577663|.761241|.821378|.905551|.932467|
|SP/WWB|.595953|.627126|.721042|.852497|.887280|
|HAWB/SP|.969311|1.213857|1.139153|1.084599|1.050927|

For the first two comparisons, mean absolute log error direct.163473,q+d.271265,pairaffine.403780,power.438421. These are two dependent same-study descriptive contrasts; third contrast and reportedII scores are retained in JSON. The third contrast favors different models; do not claim uniform ranking. Positiveq pulls ratios toward 1, which worsens both first two central H 30 predictions because direct already exceeds the observed ratios. q+d passes reciprocity/triangle identities; old pairaffine generally fails these, with residuals recorded. Coherence does not establish accuracy.

H 15 and H 30, and 1/.9 recipient mass-conversion sensitivities, are all retained. The source Figure 2 caption uses glucose-equivalent wording while methods call the quantity percentage starch hydrolysed to soluble oligosaccharides; do not silently treat that as an unquestioned conversion. q+d depends on absolute gram scale whereas direct/power/pairaffine depend only on released-gram ratios. Donor offset transfer between foods/assays/portions is an extra assumption.

Actual original Table 1 transcript says total starch 93/89/91 g, RS 1.3/16.5/2.5 g, available 92/74/95 g, and defines available as total−RS. Spaghetti 95 available exceeds 91 total; arithmetic total−RS would 88.5. Even HAWB 89−16.5=72.5 differs from 74. Source prose repeats 92–95 g for WWB/spaghetti. This is a source inconsistency, not permission to repair the table. Primary releasegrams use printed totalstarch; printed available values remain a separate flagged baseline. Table 1 page image was not independently recovered at readable resolution here; the original author-upload transcript and screenshot context were checked.

Costabile 2023 first breakfast: original source 0.md prints insulinIAUC 13500/14000/13200 (85 HAF/70 HAF/control), SD 9700/12000/12000. Their ratios are 1.022727,1.060606,.964286 for 85/control,70/control,85/70. Equality forecast 1 is close descriptively; NS does not prove equality. The source prints insulinIAUC unitsmg/dL·min, inconsistent with the insulin graph'sµU/mL; retain original numbers with caveat.

Own first.png readings give signed 0–120 ratios.936959,.957726,.978317 and signed 0–240 ratios 1.010221,1.081955,.933700. All independently recomputed arm areas are within 2% of the supplied other-digitizationCSV; exact differences are in JSON. Signed mean-curve areas and source individualIAUC are different operators. First breakfast is the endpoint checked; subsequent-lunch effects are not used to redefine these breakfast results.

Two-pool check: for scoreT[(1−a)+wa], amylopectin weight 1 and amylose weightw, aH=.743/aL=.24 anddoseD, requiring ratio≥L givesu=L/D and necessaryw≥(.76 u−.257)/(.743−.24 u), when denominator positive. RequiringD(.257/.76)^b≥L givesb≤log(u)/log(.257/.76). Independently reproduced every root extrapolation_results.json condition: refinedwmin.161439267929,bmax.692586284578; wholemealwmin.211788226197,bmax.619165529645. Plugging weights back yields the exact stipulated lower bounds. All six leave-one-source-out forecasts match at relative 1 e−12.

These are model-admission inequalities under specified deterministic sample/reading envelopes and linear dose scaling. They do not estimate amylose potency, identify a replacement score, or supply population parameter bounds. No individual participant records, secrets, repository code or Git were accessed. Both replay scripts ran successfully and all assertions passed. Coordinator review of actual artifacts remains required.
