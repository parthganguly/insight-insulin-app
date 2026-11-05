"""Sharp bounds when labels disclose total sugars but not their composition."""
from pathlib import Path
from math import log
import json

ROOT=Path(__file__).resolve().parent
def read(name):return json.loads((ROOT/name).read_text(encoding='utf8'))

def bounds(num,den,r,a):
    # A serving contains between 0 and T grams assigned to fructose in this model.
    d1,t1=num;d0,t0=den
    assert 0<=t1<=d1 and 0<=t0<d0 and 0<=r<=1
    portion=(d1/d0)**(a-1)
    return [portion*(d1-(1-r)*t1)/d0,portion*d1/(d0-(1-r)*t0)]

def compute():
    y={arm[0]:arm[2] for arm in read('lee_inputs.json')['arms'] if arm[1]==25}
    r=y['fructose']/y['glucose']
    wb=read('wb_portions.json')['rows']
    per_food={}
    for row in wb:per_food.setdefault(row['food'],{})[row['C']]=row['mean']
    a=sum(log(levels[100]/levels[25])/log(4) for levels in per_food.values())/len(per_food)
    studies={}
    for name,stud in read('bakery_facts.json').items():
        ctrl=stud['servings']['control'];test=stud['servings']['fiber']
        studies[name]=((test['available_cho_g'],test['sugars_g']),(ctrl['available_cho_g'],ctrl['sugars_g']),stud['areas'][1]/stud['areas'][0])
    food=read('muffin_facts.json')
    meals=food['recipe_grams_and_kcal'];ref=meals['sucrose']
    for label in ('fructose','sucralose'):
        meal=meals[label]
        studies['muffin_'+label]=((meal['total_carb'],meal['fructose']+meal['sucrose']),
            (ref['total_carb'],ref['sucrose']),food['signed_0_120_muIU_min_per_ml'][label]/food['signed_0_120_muIU_min_per_ml']['sucrose'])
    result={}
    for name,(num,den,obs) in studies.items():
        result[name]={'numerator_D_T':num,'denominator_D_T':den,'observed_separate_endpoint':obs,'bounds':{}}
        for shape,exponent in [('linear',1),('WB_exponent',a)]:
            for weight,k in [('frozen',r),('all_0_to_1',0)]:
                ends=bounds(num,den,k,exponent)
                result[name]['bounds'][shape+'_'+weight]={'min_max':ends, 'contains_mean_ratio':ends[0]<=obs<=ends[1]}
    return result
if __name__=='__main__':print(json.dumps(compute(),indent=2))
