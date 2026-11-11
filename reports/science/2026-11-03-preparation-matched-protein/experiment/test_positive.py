import math
import random
from statistics import mean, stdev
import unittest
from positive import bounds, lower_piecewise

class EmpiricalBounds(unittest.TestCase):
    def test_observed_individual_positive_area_is_enclosed(self):
        seed = random.Random(684)
        times = [0, 15, 30, 60, 90, 120]
        for turn in range(250):
            values = [[seed.uniform(0,60) for _ in times] for _ in range(8)]
            if turn % 3 == 0:
                for row in values:
                    row[1] = row[0]
            means = [mean(col) for col in zip(*values)]
            sems = [stdev(col)/math.sqrt(8) for col in zip(*values)]
            actual = mean(lower_piecewise(times,[x-row[0] for x in row]) for row in values)
            limits = bounds(times,means,sems,8,0,0)
            self.assertLessEqual(limits["lower"], actual+1e-9)
            self.assertLessEqual(actual, limits["upper_finite_n"]+1e-9)
            self.assertLessEqual(limits["upper_finite_n"], limits["upper_cauchy"]+1e-9)

    def test_known_crossing(self):
        self.assertEqual(lower_piecewise([0,20],[-2,2]),10)
        self.assertEqual(lower_piecewise([0,20],[2,-2]),10)
        self.assertEqual(lower_piecewise([0,20],[-2,-2]),0)

if __name__ == "__main__":
    unittest.main()
