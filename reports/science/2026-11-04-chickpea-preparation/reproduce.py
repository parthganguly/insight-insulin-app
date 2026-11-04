"""Reproduce public aggregate results offline. Python 3.10 or later."""
from pathlib import Path
import csv
import hashlib
import json
import math
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parent

def read(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def same(actual, expected, field="root"):
    if isinstance(expected, dict):
        assert actual.keys() == expected.keys(), field
        for key in expected:
            same(actual[key], expected[key], f"{field}/{key}")
    elif isinstance(expected, list):
        assert len(actual) == len(expected), field
        for i, (x, y) in enumerate(zip(actual, expected)):
            same(x, y, f"{field}/{i}")
    elif type(expected) in (int, float):
        assert type(actual) in (int, float) and math.isclose(actual, expected, rel_tol=1e-10, abs_tol=1e-9), field
    else:
        assert actual == expected, field

def run(path):
    return subprocess.check_output([sys.executable, "-B", "-X", "utf8", str(path)], cwd=path.parent, encoding="utf8")

def check_independent(root):
    pilot = read(root / "pilot/aggregate.json")
    summary = pilot["windows"]["120"]
    independent = read(root / "sol/cai-independent-aggregate.json")
    assert independent["source_sha256"] == pilot["sha256"]
    assert summary["n_complete_triplets"] == independent["complete_paired_n"] == 10
    for operator, name in [("positive", "exact_positive"), ("signed", "signed"), ("positive_nodes", "positive_nodes")]:
        for arm, data in summary[operator]["arms"].items():
            separate = independent["endpoints"][name][arm]
            for field in ["mean", "n", "sd", "sem"]:
                same(data[field], separate.get(field.upper(), separate.get(field)), f"{operator}/{arm}/{field}")
    forecasts = read(root / "pilot/results.json")
    for model, separate in [("same_starch","tie"), ("local_H20","D20"), ("hummus_process","categorical_hummus"), ("S_anchor_H20","anchored_S"), ("external_beta_H20","external_power"), ("prior_ingredient_H120","external_assay120")]:
        spec = independent["forecast_comparison"][separate]
        model_row = forecasts["models"][model]
        same(model_row["primary_error"], spec["primary_mean_absolute_log_ratio_error"], model)
        same(model_row["C_S_error"], spec["secondary_C_S_absolute_log_ratio_error"], model)
        for key, pred in spec["predicted_ratios"].items():
            same(model_row[key.replace("/", "_")], pred, model)
    reviewer = read(root / "sol/final-independent-review.json")
    same(forecasts["paired_ratio_intervals_normal_theory"]["Intact-C/Intact-S"], reviewer["Cai_Fieller_C_S_95_normal_theory"])
    same(forecasts["minimum_error_for_any_shared_intact_factor"], reviewer["shared_intact_factor_primary_error_floor"])
    check = read(root / "sol/bajka-independent-results.json")
    bread = read(root / "bread/results.json")
    same(bread["native_areas"], check["target"]["means"])
    same(bread["models"]["wheat_flour_recipe"]["ratios_30_0_60_0_60_30"], list(check["recipe_ratios"].values()))
    same(bread["models"]["fitted_H20"]["ratios_30_0_60_0_60_30"], list(check["assay"]["fit_model_H20"]["ratios"].values()))
    kanata = read(root / "external/results.json")
    assert abs(kanata["outcomes"]["120"]["ratio_CLP_CFM"] - reviewer["CLP_CFM_signed120_ratio"]) < 0.01

def replay():
    for folder in ["pilot", "external"]:
        assert sha(ROOT / folder / "PLAN.md") == read(ROOT / folder / "FREEZE.json")["sha256"]
    print("PASS both forecast-plan hashes")
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        for folder in ["pilot","sol","bread","external","astra","opus"]:
            shutil.copytree(ROOT / folder, root / folder)
        for script, snapshot in [("pilot/score.py","pilot/results.json"), ("pilot/levels.py","pilot/levels.json"), ("bread/score.py","bread/results.json"), ("external/score.py","external/results.json")]:
            same(json.loads(run(root / script)), read(ROOT / snapshot), script)
        print("PASS four forecast and level panels")
        run(root / "astra/kanata-extract.py")
        with (root/"astra/kanata-aggregate.csv").open(newline="") as generated, (ROOT/"astra/kanata-aggregate.csv").open(newline="") as retained:
            assert list(csv.reader(generated)) == list(csv.reader(retained))
        for script, snapshot in [("verify_final_transfer.py","final-independent-review.json"), ("verify_bajka.py","bajka-independent-results.json")]:
            run(root / "sol" / script)
            same(read(root / "sol" / snapshot), read(ROOT / "sol" / snapshot), script)
        run(root/"opus/diagnostic.py")
        same(read(root/"opus/DIAGNOSTIC.json"), read(ROOT/"opus/DIAGNOSTIC.json"), "Opus diagnostic")
        # Check reviewer inputs against the original files, not the last-bit host
        # differences in the scratch diagnostic just regenerated above.
        shutil.copyfile(ROOT/"opus/DIAGNOSTIC.json", root/"opus/DIAGNOSTIC.json")
        same(json.loads(run(root/"sol/verify_opus.py")), read(ROOT/"sol/opus-independent.json"), "Sol check of final Opus diagnostic")
        print("PASS Opus post-result assay sensitivity")
        check_independent(root)
        print("PASS independent endpoint, forecast, figure-reading and ratio checks")

if __name__ == "__main__":
    replay()
