from pathlib import Path

import numpy as np
from PIL import Image


# --------------------------------------------------
# CHANGE THESE TWO LINES FOR EACH MAP
# --------------------------------------------------

INPUT_NAME = "gamma_fermi_rect.webp"
OUTPUT_NAME = "gamma_fermi.webp"


# --------------------------------------------------
# Paths
# --------------------------------------------------

ROOT = Path(__file__).resolve().parent.parent

INPUT_FILE = (
    ROOT
    / "media"
    / "sky"
    / INPUT_NAME
)

OUTPUT_FILE = (
    ROOT
    / "media"
    / "sky"
    / OUTPUT_NAME
)


# --------------------------------------------------
# Output
# --------------------------------------------------

OUT_WIDTH = 2400
OUT_HEIGHT = 1200


# --------------------------------------------------
# Load Web-Mercator mosaic
# --------------------------------------------------

src = np.asarray(
    Image.open(INPUT_FILE).convert("RGB")
)

src_h, src_w = src.shape[:2]


# --------------------------------------------------
# Mollweide output coordinates
# --------------------------------------------------

output = np.zeros(
    (OUT_HEIGHT, OUT_WIDTH, 3),
    dtype=np.uint8
)

xx, yy = np.meshgrid(
    np.arange(OUT_WIDTH) + 0.5,
    np.arange(OUT_HEIGHT) + 0.5
)

sqrt2 = np.sqrt(2.0)

x = (
    xx / OUT_WIDTH *
    (4.0 * sqrt2)
    - 2.0 * sqrt2
)

y = (
    sqrt2
    - yy / OUT_HEIGHT *
    (2.0 * sqrt2)
)


# --------------------------------------------------
# Mollweide ellipse
# --------------------------------------------------

inside = (
    (x / (2.0 * sqrt2)) ** 2
    +
    (y / sqrt2) ** 2
) <= 1.0


# --------------------------------------------------
# Invert Mollweide projection
# --------------------------------------------------

theta = np.arcsin(
    np.clip(
        y / sqrt2,
        -1.0,
        1.0
    )
)

cos_theta = np.cos(theta)

safe_cos_theta = np.where(
    np.abs(cos_theta) < 1e-10,
    1e-10,
    cos_theta
)

lon = (
    np.pi * x /
    (
        2.0 *
        sqrt2 *
        safe_cos_theta
    )
)

latitude_argument = (
    2.0 * theta +
    np.sin(2.0 * theta)
) / np.pi

lat = np.arcsin(
    np.clip(
        latitude_argument,
        -1.0,
        1.0
    )
)


# --------------------------------------------------
# Web Mercator only reaches ±85.0511 degrees
# --------------------------------------------------

mercator_limit = np.deg2rad(
    85.05112878
)

valid = (
    inside
    & (lon >= -np.pi)
    & (lon <= np.pi)
    & (lat >= -mercator_limit)
    & (lat <= mercator_limit)
)


# --------------------------------------------------
# Longitude -> Web-Mercator x
# --------------------------------------------------

u = (
    (lon + np.pi) /
    (2.0 * np.pi)
) * (src_w - 1)


# --------------------------------------------------
# Latitude -> Web-Mercator y
#
# THIS is the important correction.
# --------------------------------------------------

mercator_y = (
    0.5
    -
    np.arcsinh(
        np.tan(lat)
    ) /
    (2.0 * np.pi)
)

v = (
    mercator_y *
    (src_h - 1)
)


# --------------------------------------------------
# Sample source image
# --------------------------------------------------

u = np.clip(
    u,
    0,
    src_w - 1
)

v = np.clip(
    v,
    0,
    src_h - 1
)

ui = np.round(u).astype(int)
vi = np.round(v).astype(int)

output[valid] = src[
    vi[valid],
    ui[valid]
]


# --------------------------------------------------
# Save
# --------------------------------------------------

result = Image.fromarray(
    output,
    mode="RGB"
)

result.save(
    OUTPUT_FILE,
    format="WEBP",
    quality=95,
    method=6
)

print(
    f"Created:\n{OUTPUT_FILE}"
)