"""Food-input forecasts only. No evaluation insulin is read here."""
from pathlib import Path
import csv
import hashlib
import json
import sys

ROOT = Path(__file__).resolve().parent
PROTEIN = (1.0, 1.1666666666666667, 1.5518518518518518)
FAT = (1.0, 1.0736497545008183, 1.1522094926350246)

def factor(grams, ratios):
    if not 0 <= grams <= 30:
        raise ValueError("Outside declared interpolation domain")
    if grams <= 5:
        return 1 + grams * (ratios[1] - 1) / 5
    return ratios[1] + (grams - 5) * (ratios[2] - ratios[1]) / 25

def predictions():
    with (ROOT / 'composition.csv').open(encoding='utf-8', newline='') as file:
        rows = {row['arm']: {k:float(v) for k,v in row.items() if k!='arm'} for row in csv.DictReader(file)}
    out = {name:{} for name in ('same_glucose','printed_energy','protein','leucine_scaled','whey_domain')}
    reference = rows['glucose']
    scale = rows['whey10']['protein_g'] / rows['whey10']['leucine_g']
    for arm, row in rows.items():
        if arm == 'glucose':
            continue
        assert row['available_carbohydrate_g'] == reference['available_carbohydrate_g']
        fat = factor(row['fat_g'], FAT)
        out['same_glucose'][arm] = 1.0
        out['printed_energy'][arm] = row['energy_kcal'] / reference['energy_kcal']
        out['protein'][arm] = factor(row['protein_g'], PROTEIN) * fat
        out['leucine_scaled'][arm] = factor(row['leucine_g'] * scale, PROTEIN) * fat
        out['whey_domain'][arm] = out['protein'][arm] if arm.startswith('whey') else None
    return out

if __name__ == '__main__':
    print(json.dumps(predictions(),indent=2))

