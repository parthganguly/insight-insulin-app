import json
import unittest
from evaluate import ROOT, evaluate, net

class TestDigitization(unittest.TestCase):
    def test_net_includes_negative_portions_and_stops_at_window(self):
        self.assertEqual(net([0, 10, 20, 30], [10, 12, 6, 100], 20), 0)

    def test_source_geometry(self):
        data = json.loads((ROOT / "graph-input.json").read_text())
        for panel in data["panels"].values():
            x0,x80 = panel["x_at_0_and_80_pt"]
            y0,y180 = panel["y_at_0_and_180_min_pt"]
            for series in panel["series"].values():
                self.assertEqual(len(series["means"]), len(data["minutes"]))
                for (x,y),v,t in zip(series["xy_pt"], series["means"], data["minutes"]):
                    self.assertAlmostEqual(80*(x-x0)/(x80-x0), v, places=4)
                    self.assertLess(abs(180*(y-y0)/(y180-y0)-t), 1.0)
        r = evaluate(data)
        self.assertAlmostEqual(r["orders"][150]["soy_then_cho"]["predictions"]["scheduled"],
                               1257 + r["curve_areas"]["cho"][120])
        self.assertAlmostEqual(r["orders"][120]["cho_then_soy"]["predictions"]["scheduled"],
                               r["curve_areas"]["cho"][120] + r["curve_areas"]["soy"][90])
        self.assertLess(max(abs(v) for v in r["graph_minus_table_at_150"].values()), 45)
    def test_grid_omission_matches_triangle_identity(self):
        from sampling_grid import sensitivity
        data = json.loads((ROOT / "graph-input.json").read_text())
        result = sensitivity(data)
        singles = data["panels"]["4.2B"]["series"]
        for a,b in (("soy","cho"),("cho","soy")):
            v = singles[b]["means"]
            expected = 15 * ((v[0] + v[2])/2 - v[1])
            for end in (120,150):
                row = result[end][f"{a}_then_{b}"]["primary_source"]
                self.assertAlmostEqual(row["change_from_native_grid"], expected)
