"""Synthetic arithmetic checks for research scripts; no health records."""
import unittest
from direct import area_bounds
from calculate import trapezoid,TIMES
def positive_integral(y,end=120):
    b=y[0];total=0
    for t0,t1,v0,v1 in zip(TIMES,TIMES[1:],y,y[1:]):
        l,h=max(0,t0),min(end,t1)
        if l>=h:continue
        a=v0+(v1-v0)*(l-t0)/(t1-t0)-b
        z=v0+(v1-v0)*(h-t0)/(t1-t0)-b
        if a>=0 and z>=0:total+=(h-l)*(a+z)/2
        elif a>0:total+=(h-l)*a*a/(2*(a-z))
        elif z>0:total+=(h-l)*z*z/(2*(z-a))
    return total
class Checks(unittest.TestCase):
 def test_constant_baseline(self):
    self.assertAlmostEqual(trapezoid([20]*7,120),0)
 def test_known_triangle_actual_clock(self):
    self.assertAlmostEqual(trapezoid([0,35,35,35,35,35,35],30),600)
 def test_finite_sample_positive_bounds(self):
    people=[[20,0,0,100,30,40,20],[0,100,90,0,30,40,20],
            [5,20,30,10,20,0,0]]
    mean=[sum(x[i] for x in people)/len(people) for i in range(7)]
    lo,hi=area_bounds(mean)
    actual=sum(positive_integral(x) for x in people)/len(people)
    self.assertLessEqual(lo,actual)
    self.assertLessEqual(actual,hi)
 def test_clipped_group_not_participant_positive(self):
    people=[[20,0,0,100,30,40,20],[0,100,90,0,30,40,20]]
    mean=[sum(x[i] for x in people)/2 for i in range(7)]
    actual=sum(positive_integral(x) for x in people)/2
    self.assertGreater(actual,positive_integral(mean))
if __name__=="__main__":unittest.main()
