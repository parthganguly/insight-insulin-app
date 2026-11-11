"""Replay original-source extractions in scratch space; requires numpy>=2 and Pillow."""
from pathlib import Path
import shutil,sys,tempfile,xml.etree.ElementTree as ET
from reproduce import ROOT,read,same,run,checksum
def audit(assets):
    reg=read(ROOT/'sources.json')['assets']
    with tempfile.TemporaryDirectory() as t:
        work=Path(t)
        for n,v in reg.items():assert checksum(assets/n)==v['sha256'],n
        a=work/'astra';shutil.copytree(ROOT/'astra',a)
        for n in ['mmc1.docx','published_figure2.jpg']:shutil.copyfile(assets/n,a/n)
        shutil.copyfile(assets/'chamoun.xml',a/'lentil/article.xml')
        cases=[('extract_aggregate','aggregate'),('extract_late','late_aggregate'),('check_window_additivity','window_check'),('check_curve_baselines','curve_baseline_check'),('check_raw_area','raw_area_check'),('lentil/extract','lentil/aggregate')]
        for script,out in cases:
            run(a/(script+'.py'));same(read(a/(out+'.json')),read(ROOT/'astra'/(out+'.json')),out)
        table=ET.parse(assets/'haigh.xml').find('.//table-wrap')
        row=next(r for r in table.findall('.//tr') if ''.join(r[0].itertext()).startswith('Body mass, kg'))
        same([float(''.join(c.itertext()).split()[0]) for c in list(row)[1:]],read(ROOT/'native/inputs.json')['body_mass_kg'])
        from importlib.util import spec_from_file_location,module_from_spec
        spec=spec_from_file_location('training',ROOT/'native/donor_fit.py')
        mod=module_from_spec(spec);spec.loader.exec_module(mod);mod.SOURCE=assets/'wolever.xml'
        fitted=mod.train()['models']['N'];entries={k:{f:v['model'][f] for f in ['intercept','slopes']} for k,v in fitted.items()}
        same(entries,read(ROOT/'native/inputs.json')['models'])
        print('PASS six aggregate extractions, original arm body masses and historical training coefficients')
if __name__=='__main__':audit(Path(sys.argv[1]))
