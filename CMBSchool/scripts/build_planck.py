from pathlib import Path

import healpy as hp
import matplotlib.pyplot as plt
import numpy as np


# --------------------------------------------------
# Settings: change only these two lines each time
# --------------------------------------------------

BAND = 70
INSTRUMENT = "LFI"   # "LFI" or "HFI"


# --------------------------------------------------
# Paths
# --------------------------------------------------

ROOT = Path(__file__).resolve().parent.parent

INPUT_FILE = (
    ROOT
    / "data"
    / f"{INSTRUMENT}_SkyMap_{BAND:03d}_1024_R3.00_full.fits"
)

REDUCED_FILE = (
    ROOT
    / "data"
    / "reduced"
    / f"{INSTRUMENT}_SkyMap_{BAND:03d}_nside512.fits"
)

OUTPUT_FILE = (
    ROOT
    / "media"
    / "sky"
    / f"microwave_planck_{BAND}.webp"
)


# --------------------------------------------------
# Load Planck intensity map
# --------------------------------------------------

sky_map = hp.read_map(
    INPUT_FILE,
    field=0,
    dtype=np.float64
)


# --------------------------------------------------
# Downgrade resolution for web use
# --------------------------------------------------

sky_map = hp.ud_grade(
    sky_map,
    nside_out=512
)

hp.write_map(
    REDUCED_FILE,
    sky_map,
    overwrite=True,
    dtype=np.float32
)


# --------------------------------------------------
# Valid pixels
# --------------------------------------------------

valid = (
    np.isfinite(sky_map)
    & (sky_map != hp.UNSEEN)
)

finite_values = sky_map[valid]


# --------------------------------------------------
# Stretch
# --------------------------------------------------

vmin = np.percentile(
    finite_values,
    1
)

vmax = np.percentile(
    finite_values,
    99
)


# --------------------------------------------------
# Plot
# --------------------------------------------------

plt.figure(
    figsize=(16, 8),
    dpi=150
)

hp.mollview(
    sky_map,
    fig=plt.gcf().number,
    coord="G",
    title="",
    unit="",
    min=vmin,
    max=vmax,
    cmap="inferno",
    cbar=False,
    notext=True,
    bgcolor="black"
)

fig = plt.gcf()
fig.patch.set_facecolor("black")

for ax in fig.axes:
    ax.set_facecolor("black")

plt.savefig(
    OUTPUT_FILE,
    format="webp",
    dpi=150,
    bbox_inches="tight",
    pad_inches=0,
    facecolor="black"
)

plt.close()

print(f"Reduced FITS created:\n{REDUCED_FILE}")
print(f"WebP created:\n{OUTPUT_FILE}")