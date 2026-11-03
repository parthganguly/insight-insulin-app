"""Run with python (Pillow, NumPy) in any directory. Only published aggregate bars are used."""
from pathlib import Path
from zipfile import ZipFile
from io import BytesIO
import hashlib
import json
import xml.etree.ElementTree as ET

import numpy as np
from PIL import Image

base = Path(__file__).resolve().parent
source = base / "mmc1.docx"
with ZipFile(source) as archive:
    figure = archive.read("word/media/image3.tiff")
    root = ET.fromstring(archive.read("word/document.xml"))
image = Image.open(BytesIO(figure)).convert("RGBA")
assert image.size == (2035, 869)
white = Image.new("RGBA", image.size, "white")
white.alpha_composite(image)
ink = np.asarray(white)[:, :, :3].max(axis=2) < 50

def lines(x):
    """Contiguous ink runs on a column, clipped to panel A axis and data."""
    rows = np.flatnonzero(ink[190:685, x]) + 190
    return np.split(rows, np.nonzero(np.diff(rows) > 1)[0] + 1)

ticks = lines(210)
assert len(ticks) == 6
scale, intercept = np.polyfit([tick.mean() for tick in ticks], [1000,800,600,400,200,0], 1)
w = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
table = next(root.iter(w + "tbl"))
macros = [["".join(cell.itertext()) for cell in row.findall(w+"tc")] for row in table.findall(w+"tr")]
preparation = list(root.iter(w + "tbl"))[3]
served = ["".join(c.itertext()) for c in preparation.findall(w+"tr")[3].findall(w+"tc")]
arms = []
for i, (x, n) in enumerate(zip([280,405,510,630,750,865],[11,11,11,10,11,11]), 1):
    cap, bar, *_ = lines(x)
    # Egg-white bar is entirely black; first raster row locates its upper edge.
    mean_y = float(bar.min() if i == 1 else bar.mean())
    cap_y = float(cap.mean())
    arms.append(dict(arm=macros[0][i], n=n, mean=round(scale * mean_y + intercept),
                     sem=round(-scale * (mean_y - cap_y)), column=x, mean_y=mean_y,
                     cap_y=cap_y, kcal_per_80kg=macros[3][i], protein_g_per_80kg=macros[5][i],
                     carbohydrate_g_per_80kg=macros[7][i], fat_g_per_80kg=macros[11][i],
                     fibre_g_per_80kg=macros[17][i],
                     reported_serving_g=served[i], kcal_per_100g=macros[2][i],
                     protein_g_per_100g=macros[4][i], carbohydrate_g_per_100g=macros[6][i],
                     fat_g_per_100g=macros[10][i], fibre_g_per_100g=macros[16][i]))
result = dict(source="https://ars.els-cdn.com/content/image/1-s2.0-S0002916526000407-mmc1.docx",
              article="https://doi.org/10.1016/j.ajcnut.2026.101231",
              supplementary_docx_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),
              figure_tiff_sha256=hashlib.sha256(figure).hexdigest(),
              panel="Supplementary Figure 2a", endpoint="0-120 min serum insulin iAUC",
              units="mIU/L * min", assay="DRG Insulin ELISA, EIA-2935",
              note="Graph-digitized integer approximations. One raster pixel corresponds to ~2.04 integrated units. SEMs describe sampling uncertainty.",
              early_omnibus_p=0.805, food_composition_source="Supplementary Table 1, per 80 kg reference participant",
              pixel_slope=scale, pixel_intercept=intercept, arms=arms)
(base/"aggregate.json").write_text(json.dumps(result, indent=2)+"\n", encoding="utf-8")
