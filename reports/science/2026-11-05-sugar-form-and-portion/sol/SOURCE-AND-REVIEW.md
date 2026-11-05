> Historical verification note. The subsequent visual table check is recorded in MIXTURE-REVIEW.md and the study reconciliation.

# Independent verification (Sol)

Scope: independent primary-source search and stdlib numerical replication. No repository changes. This research does not authorize product/scientific changes.

## Sources and limits

Published study: https://pubmed.ncbi.nlm.nih.gov/9881888/ and https://www.nature.com/articles/1600666 (DOI 10.1038/sj.ejcn.1600666). Abstract available; publisher explicitly returns subscription preview, not tables. Full published methods, per-arm arithmetic means, time window, baseline exclusions and within-arm repeat counts remain unavailable from that preview. Abstract verifies 8 healthy lean participants, 4 men/4 women, ages21–33, 13 separate-day randomized conditions: control; glucose/sucrose25/50/100g; fructose25/50g; free glucose50+fructose50g; bread25/50/100g carbohydrate. GI/II use same-dose bread as denominator. This is not the fixed50g-bread relative-response operator below.

Author primary thesis: Brenda Minfei Lee, University of Toronto MSc1997, https://www.collectionscanada.gc.ca/obj/s4/f2/dsk2/ftp04/mq28791.pdf . Retrieved via Firecrawl PDF parser (95 pages), source returned status200 and application/pdf. Direct shell download failed DNS; web fetch failed restricted URL. All numeric thesis extractions are OCR-only; no visually inspected page scan. Do not label them verified published1998 table values.

Thesis pp23–29:14 occasions including75g bread,10–12h fast. Sugar in500mL tea/water, subject beverage fixed, extra150mL water after sugar. Bread beverage500mL plus dose-dependent150/100/50/0mL water at25/50/75/100g. Venous samples baseline,15,30,45,60,90,120min from beginning eating. Five blocks (control/glucose/fructose/sucrose/bread) randomized; doses alternate ascending/descending within blocks. No repeated identical arm described:14 conditions per person, not independent replication cohorts. One participant omitted fructose50g after25g malabsorption symptoms; five experienced mild symptoms at50g. Fructose100g excluded due potential malabsorption.

Thesis Table3-1 p34 supplies arithmetic insulin area means±SEM (nmol min/L). Script stores those; fructose50g n7, others n8. Geometric positive incremental area ignores area below fasting (p28),0–120min. Relative responses used for thesis figures are per-person percentages of a FITTED50g-bread response, obtained from an exponential curve through four bread doses. Ratios of arithmetic raw means are not mean participant ratios.

OCR traps: extracted figure tables invent nonexistent75g sugar arms and swap chart values; exclude them. AppendixB gives conflicting glucose100 insulin relative191.7 whereas section3.2 explicitly268.0±40.2. Use raw Table3-1, with optical check outstanding. Published abstract glucose dose changes68%/38% differ from thesis aggregate changes~58%/~37%; thesis includes an additional bread75g condition. Therefore these are overlapping author-study evidence, not independent studies, and cannot silently be equated. The article's exact changes cannot be reconstructed from thesis without printed publication.

## Numerical findings

Run `python verify.py` to reproduce independent-results.json using standard library only. Source input external exponent uses coordinator-provided public/wb_portions.json. Anchors alone set R=1.2/8.1=.1481481481; exponent learned only externally is.7781175447. At a1, composition improves same-dose formulation ALE.899400→.114655 while exactly preserving mass-model portion ALE.111571. External exponent yields portion ALE.207910, worse than linear dose. Equality portion ALE.718783. Glucose-only lacks positive pure-fructose coverage (3/4 formulation cells,2/3 portion foods); its covered formulation ALE.196872 is not a full-panel score.

Exceptions: sucrose50→100 observed3.0 vs predicted2.0 (linear) or1.7149 (external). Glucose/fructose25→50 are approximately/exactly2.0; sucrose25→50 only1.5745. Ingredient score predicts identical nominal-mass free mix and sucrose, observed18.9/22.2=.85135. Hydrolysis360/342 changes individual sucrose contrasts and levels and predicts mix/sucrose below1; it leaves sucrose doubling unchanged. Aggregate formulation ALE happens to remain identical because its two sucrose signed log errors offset; this is not evidence hydrolysis is immaterial.

Measured-component sums predict mix18.7 against18.9, sucrose50 9.3 against7.4, sucrose100 18.7 against22.2. Component-glucose alone beats sum for sucrose50 (ALE.09038 vs.22853); sums beat it for mix100 and sucrose100. Adding these arithmetic means is a benchmark using additional measured arms, not a food-only prediction. No covariance or participant data supports paired confidence intervals; SEMs cannot be treated as independent across shared subjects/arms. No claim of difference significance for free-mix versus sucrose from these summaries.

Exposure: Sol read abstract and held thesis means BEFORE receiving PLAN.md. Formulation and dose metric implementation follows coordinator's pre-existing file, but this is exposed-data replication, not untouched validation. No target mean was used in fitted R except declaredG25/F25; all held cells remain outcome comparisons. Secondary measured-arm benchmarks intentionally consume50g component outcomes.

Remaining: visual table verification and published1998 numerical reconciliation; independent paired uncertainty unavailable; narrow healthy-adult fasted beverages cannot establish baked-food generality or personal prediction.
