from pathlib import Path

import numpy as np
from PIL import Image


# --------------------------------------------------
# Paths
# --------------------------------------------------

ROOT = Path(__file__).resolve().parent.parent

WISE_FILE = ROOT / "media" / "sky" / "infrared_wise.webp"
IRAS_FILE = ROOT / "media" / "sky" / "infrared_iras.webp"

OUTPUT_FILE = ROOT / "media" / "sky" / "infrared_wise_iras.webp"


# --------------------------------------------------
# Helpers
# --------------------------------------------------

def load_rgb(path):
    img = Image.open(path).convert("RGB")
    return np.asarray(img).astype(np.float32) / 255.0


def crop_black_borders(img, threshold=0.02):
    """
    Remove nearly-black border rows/columns.
    """
    gray = img.mean(axis=2)
    mask = gray > threshold

    rows = np.where(mask.any(axis=1))[0]
    cols = np.where(mask.any(axis=0))[0]

    if len(rows) == 0 or len(cols) == 0:
        return img

    r0, r1 = rows[0], rows[-1] + 1
    c0, c1 = cols[0], cols[-1] + 1

    return img[r0:r1, c0:c1, :]


def resize_to_match(img, width, height):
    pil = Image.fromarray(np.clip(img * 255, 0, 255).astype(np.uint8))
    pil = pil.resize((width, height), Image.Resampling.LANCZOS)
    return np.asarray(pil).astype(np.float32) / 255.0


def blend_images(wise, iras, wise_weight=0.6, iras_weight=0.4):
    blended = wise_weight * wise + iras_weight * iras
    return np.clip(blended, 0.0, 1.0)


def equirectangular_to_mollweide(src, out_width=2400, out_height=1200):
    """
    Reproject an equirectangular all-sky image into a Mollweide ellipse.
    """
    src_h, src_w, _ = src.shape
    dst = np.zeros((out_height, out_width, 3), dtype=np.float32)

    sqrt2 = np.sqrt(2.0)

    for j in range(out_height):
        # y in Mollweide coordinates: [-sqrt(2), +sqrt(2)]
        y = (0.5 - j / (out_height - 1)) * 2.0 * sqrt2

        for i in range(out_width):
            # x in Mollweide coordinates: [-2sqrt(2), +2sqrt(2)]
            x = (i / (out_width - 1) - 0.5) * 4.0 * sqrt2

            # outside Mollweide ellipse
            if (x / (2.0 * sqrt2))**2 + (y / sqrt2)**2 > 1.0:
                continue

            # invert Mollweide
            theta = np.arcsin(np.clip(y / sqrt2, -1.0, 1.0))
            cos_theta = np.cos(theta)

            if abs(cos_theta) < 1e-10:
                lam = 0.0
            else:
                lam = (np.pi * x) / (2.0 * sqrt2 * cos_theta)

            if lam < -np.pi or lam > np.pi:
                continue

            arg = (2.0 * theta + np.sin(2.0 * theta)) / np.pi
            phi = np.arcsin(np.clip(arg, -1.0, 1.0))

            # map spherical coords to equirectangular source image
            u = (lam + np.pi) / (2.0 * np.pi) * (src_w - 1)
            v = (np.pi / 2.0 - phi) / np.pi * (src_h - 1)

            ui = int(np.clip(round(u), 0, src_w - 1))
            vi = int(np.clip(round(v), 0, src_h - 1))

            dst[j, i] = src[vi, ui]

    return dst


# --------------------------------------------------
# Load, crop, resize, blend
# --------------------------------------------------

wise = load_rgb(WISE_FILE)
iras = load_rgb(IRAS_FILE)

wise = crop_black_borders(wise)
iras = crop_black_borders(iras)

target_width = max(wise.shape[1], iras.shape[1])
target_height = max(wise.shape[0], iras.shape[0])

wise = resize_to_match(wise, target_width, target_height)
iras = resize_to_match(iras, target_width, target_height)

infrared_rect = blend_images(wise, iras, wise_weight=0.6, iras_weight=0.4)


# --------------------------------------------------
# Reproject to Mollweide
# --------------------------------------------------

infrared_moll = equirectangular_to_mollweide(
    infrared_rect,
    out_width=2400,
    out_height=1200
)


# --------------------------------------------------
# Save
# --------------------------------------------------

out = Image.fromarray(
    np.clip(infrared_moll * 255, 0, 255).astype(np.uint8)
)

out.save(OUTPUT_FILE, format="WEBP", quality=95)

print(f"Created:\n{OUTPUT_FILE}")