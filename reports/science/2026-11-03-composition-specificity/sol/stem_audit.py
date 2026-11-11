from pathlib import Path
import json,pymupdf
R=Path(__file__).resolve().parents[1];V=json.loads((R/'public/transfer/fig4_vector.json').read_text());M=json.loads((R/'panel/marginals.json').read_text());D=pymupdf.open(R/'sol/katsanos2006.pdf')[3].get_drawings();stems=[]
for i,d in enumerate(D):
 if d['type']!='s':continue
 for it in d['items']:
  if it[0]=='l':
   a,b=it[1:]
   if abs(a.x-b.x)<.01 and abs(a.y-b.y)>.3:stems.append((a.x,a.y,b.y-a.y,i))
amb=[];maxdist=0;counts={}
for arm,pts in M.items():
 for t,p in pts.items():
  x,y=V['groups'][arm][t]['px'];ss=[(abs(a-x)+abs(b-y),h,i)for a,b,h,i in stems if abs(a-x)<.1 and abs(b-y)<.1]
  for sign in [-1,1]:
   c=sorted(z for z in ss if sign*z[1]>0);assert c
   dist,h,i=c[0];assert i==p['path_id'];target=p['up_pt']if sign<0 else p['down_pt'];assert abs(abs(h)-target)<1e-9;maxdist=max(maxdist,dist)
   if len(c)>1:amb.append({'arm':arm,'time':t,'sign':sign,'candidates':c})
  counts[p['path_id']]=counts.get(p['path_id'],0)+1
print(json.dumps({'draws':sum(counts.values()),'max_nearest_start_manhattan_pt':maxdist,'by_path':counts,'multi_candidates':amb},indent=2))
