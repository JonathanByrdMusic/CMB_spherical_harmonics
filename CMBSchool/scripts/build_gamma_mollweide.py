from pathlib import Path

import numpy as np
from PIL import Image


# --------------------------------------------------
# Paths
# --------------------------------------------------

ROOT = Path(__file__).resolve().parent.parent

INPUT_FILE = (
    ROOT
    / "media"
    / "sky"
    / "gamma_fermi_rect.webp"
)

OUTPUT_FILE = (
    ROOT
    / "media"
    / "sky"
    / "gamma_fermi.webp"
)


# --------------------------------------------------
# Output size
# --------------------------------------------------

OUT_WIDTH = 2400
OUT_HEIGHT = 1200


# --------------------------------------------------
# Load source image
# --------------------------------------------------

src_img = Image.open(INPUT_FILE).convert("RGB")
src = np.asarray(src_img)

src_h, src_w = src.shape[:2]


# --------------------------------------------------
# Build Mollweide output
# --------------------------------------------------

output = np.zeros(
    (OUT_HEIGHT, OUT_WIDTH, 3),
    dtype=np.uint8
)

x_pix = np.arange(OUT_WIDTH) + 0.5
y_pix = np.arange(OUT_HEIGHT) + 0.5

xx, yy = np.meshgrid(x_pix, y_pix)

x = (
    (xx / OUT_WIDTH) * (4 * np.sqrt(2))
    - 2 * np.sqrt(2)
)

y = (
    np.sqrt(2)
    - (yy / OUT_HEIGHT) * (2 * np.sqrt(2))
)

inside = (
    (x / (2 * np.sqrt(2))) ** 2
    + (y / np.sqrt(2)) ** 2
) <= 1.0

y_clipped = np.clip(
    y / np.sqrt(2),
    -1.0,
    1.0
)

theta = np.arcsin(y_clipped)

cos_theta = np.cos(theta)

safe_cos_theta = np.where(
    np.abs(cos_theta) < 1e-10,
    1e-10,
    cos_theta
)

lon = (
    np.pi * x
    / (2 * np.sqrt(2) * safe_cos_theta)
)

arg = (
    2 * theta
    + np.sin(2 * theta)
) / np.pi

arg = np.clip(arg, -1.0, 1.0)

lat = np.arcsin(arg)

valid = inside & (lon >= -np.pi) & (lon <= np.pi)

u = (
    (lon + np.pi)
    / (2 * np.pi)
    * (src_w - 1)
)

v = (
    (np.pi / 2 - lat)
    / np.pi
    * (src_h - 1)
)

u = np.clip(u, 0, src_w - 1)
v = np.clip(v, 0, src_h - 1)

ui = np.round(u).astype(int)
vi = np.round(v).astype(int)

output[valid] = src[vi[valid], ui[valid]]

result = Image.fromarray(output, mode="RGB")

OUTPUT_FILE.parent.mkdir(
    parents=True,
    exist_ok=True
)

result.save(
    OUTPUT_FILE,
    format="WEBP",
    quality=95,
    method=6
)

print(f"Created:\n{OUTPUT_FILE}")