from pathlib import Path

import healpy as hp
import matplotlib.pyplot as plt
import numpy as np


# --------------------------------------------------
# Paths
# --------------------------------------------------

ROOT = Path(__file__).resolve().parent.parent

INPUT_FILE = (
    ROOT
    / "data"
    / "haslam408_dsds_Remazeilles2014.fits"
)

OUTPUT_FILE = (
    ROOT
    / "media"
    / "sky"
    / "radio_haslam.webp"
)


# --------------------------------------------------
# Load Haslam HEALPix map
# --------------------------------------------------

sky_map = hp.read_map(
    INPUT_FILE,
    field=0,
    dtype=np.float64
)


# --------------------------------------------------
# Robust intensity stretch
# --------------------------------------------------

finite_values = sky_map[
    np.isfinite(sky_map)
    & (sky_map != hp.UNSEEN)
]

vmin = np.percentile(
    finite_values,
    1
)

vmax = np.percentile(
    finite_values,
    99.5
)


# --------------------------------------------------
# Draw Galactic Mollweide projection
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

print(
    f"Created:\n{OUTPUT_FILE}"
)