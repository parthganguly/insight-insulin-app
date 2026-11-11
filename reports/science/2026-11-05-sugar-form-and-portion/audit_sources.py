"""Optional original-asset audit. The portable numerical replay needs no original articles."""
import hashlib
import json
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parent

def audit(folder):
    registry=json.loads((ROOT/'source_assets.json').read_text(encoding='utf8'))
    for item in registry:
        assert hashlib.sha256((folder/item['filename']).read_bytes()).hexdigest()==item['sha256'],item['filename']
    print('Verified original identities and the recorded Eckstein plot crop:',len(registry))
    tree=ET.parse(folder/'PMC7900990.xml')
    text=' '.join(' '.join(''.join(p.itertext()).split()) for p in tree.iter('p'))
    values=re.search(r'ΔAUC glucose (\d+) ± (\d+) and ΔAUC sucrose (\d+) ± (\d+)',text)
    assert values
    arms=json.loads((ROOT/'external_inputs.json').read_text(encoding='utf8'))['rows']
    assert [float(v) for v in values.groups()]==[v[k] for v in arms for k in ('mean','dispersion')]
    other=ET.parse(folder/'PMC5465854.xml')
    cells=[' '.join(''.join(t.itertext()).split()) for t in other.iter('tr')]
    assert any('1089' in s and '492' in s for s in cells)
    print('Verified the independently collected 30 g arms and the 35 g free-mixture reference from primary XML.')
    # This additional visual registration check needs Pillow only for the original-asset audit.
    from PIL import Image
    with Image.open(folder/'jameel_figure1.jpg') as im:
        assert im.size==(600,473)
        gray=im.convert('L')
        for x,y in [(432,424),(473,323),(520,344)]:
            assert gray.getpixel((x,y+3))<210 and gray.getpixel((x,y-3))>220
    print('Verified registration of all three Jameel panel-D bar tops.')
if __name__=='__main__':audit(Path(sys.argv[1]))
