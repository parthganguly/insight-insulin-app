"""Cross-platform comparisons for scientific results. Exact match for structure and abstentions."""
import math

def compare(actual,expected):
    if isinstance(actual,dict):
        assert actual.keys()==expected.keys()
        for key in actual:compare(actual[key],expected[key])
    elif isinstance(actual,list):
        assert len(actual)==len(expected)
        for a,b in zip(actual,expected):compare(a,b)
    elif type(actual) is float:
        assert math.isclose(actual,expected,rel_tol=1e-11,abs_tol=1e-11),(actual,expected)
    else:assert actual==expected,(actual,expected)
