"""Extract mean-marker and matching two-sided SE stem extents from the public PDF."""
from pathlib import Path
import sys,json,hashlib
def read(pdf,vector):
    import pymupdf
    d=json.loads(Path(vector).read_text(encoding="utf8"))
    assert hashlib.sha256(Path(pdf).read_bytes()).hexdigest()=="28667197291a3654fe5a868f17efd4daffed46d00d5ac71e6510047cfc126d9e"
    limbs=[]
    with pymupdf.open(pdf) as paper:
        for path_id,path in enumerate(paper[3].get_drawings()):
            if path["type"]!="s":continue
            for item in path["items"]:
                if item[0]!="l":continue
                a,b=item[1:]
                if abs(a.x-b.x)<.01 and abs(b.y-a.y)>.3:
                    limbs.append((a.x,a.y,b.y-a.y,path_id))
    scale=24/(max(d["y_ticks_pt"])-min(d["y_ticks_pt"]))
    out={}
    for arm,points in d["groups"].items():
        out[arm]={}
        for t,pt in points.items():
            if int(t)>120:continue
            x,y=pt["px"]
            matches=[(abs(a-x)+abs(b-y),h,i) for a,b,h,i in limbs if abs(a-x)<.1 and abs(b-y)<.1]
            up=min((v for v in matches if v[1]<0),key=lambda v:v[0])
            down=min((v for v in matches if v[1]>0),key=lambda v:v[0])
            assert up[2]==down[2] and abs(abs(up[1])-down[1])*scale<0.06,(arm,t,up,down)
            out[arm][t]={"mean":pt["mean"],"sem":(abs(up[1])+down[1])*scale/2,
                         "up_pt":-up[1],"down_pt":down[1],"path_id":up[2],"start_distance_pt":max(up[0],down[0])}
    return out
if __name__=="__main__":print(json.dumps(read(*sys.argv[1:]),indent=2))
