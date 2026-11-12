from pathlib import Path

import numpy as np
from astropy.io import fits
from PIL import Image


# --------------------------------------------------
# Paths
# --------------------------------------------------

ROOT = Path(__file__).resolve().parent.parent

INPUT_FILE = (
    ROOT
    / "data"
    / "ultraviolet"
    / "hlsp_uv-bkgd_galex_map_allsky_nuv_v1_skymap.fits"
)

OUTPUT_FILE = (
    ROOT
    / "media"
    / "sky"
    / "ultraviolet_galex.webp"
)


# --------------------------------------------------
# Load the first usable 2D image from the FITS file
# --------------------------------------------------

def load_first_2d_image(fits_path):
    with fits.open(fits_path) as hdul:
        for hdu in hdul:
            data = hdu.data

            if data is None:
                continue

            array = np.array(data, dtype=np.float64)
            array = np.squeeze(array)

            if array.ndim == 2:
                return array

    raise RuntimeError(
        "No 2D image array was found in the FITS file."
    )


uv_map = load_first_2d_image(INPUT_FILE)


# --------------------------------------------------
# Build a clean stretch
# --------------------------------------------------

finite_values = uv_map[np.isfinite(uv_map)]

if finite_values.size == 0:
    raise RuntimeError(
        "The FITS file contains no finite image values."
    )

vmin = np.percentile(finite_values, 2.0)
vmax = np.percentile(finite_values, 99.7)

clipped = np.clip(uv_map, vmin, vmax)
scaled = (clipped - vmin) / (vmax - vmin)

# asinh stretch for diffuse structure
stretch = np.arcsinh(6.0 * scaled) / np.arcsinh(6.0)

# mask invalid pixels to black
invalid = ~np.isfinite(uv_map)
stretch[invalid] = 0.0


# --------------------------------------------------
# Colorize: dark blue -> cyan/white
# --------------------------------------------------

r = 0.18 * stretch + 0.42 * stretch**2.2
g = 0.30 * stretch + 0.55 * stretch**1.6
b = 0.75 * stretch + 0.25 * stretch**0.8

rgb = np.dstack([r, g, b])
rgb = np.clip(rgb, 0.0, 1.0)

rgb8 = (255 * rgb).astype(np.uint8)

# Uncomment this if the map comes out upside down:
# rgb8 = np.flipud(rgb8)

def crop_empty_border(rgb, data):
    """
    Crop rows/columns that contain no valid FITS data.
    """

    valid = np.isfinite(data)

    rows = np.where(valid.any(axis=1))[0]
    cols = np.where(valid.any(axis=0))[0]

    if len(rows) == 0 or len(cols) == 0:
        return rgb

    r0, r1 = rows[0], rows[-1] + 1
    c0, c1 = cols[0], cols[-1] + 1

    return rgb[r0:r1, c0:c1]

# --------------------------------------------------
# Crop empty border and resize
# --------------------------------------------------

rgb8 = crop_empty_border(
    rgb8,
    uv_map
)

img = Image.fromarray(
    rgb8,
    mode="RGB"
)

img = img.resize(
    (2400, 1200),
    Image.Resampling.LANCZOS
)


# --------------------------------------------------
# Save output
# --------------------------------------------------

OUTPUT_FILE.parent.mkdir(
    parents=True,
    exist_ok=True
)

img.save(
    OUTPUT_FILE,
    format="WEBP",
    quality=92,
    method=6
)

print(f"Created:\n{OUTPUT_FILE}")