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
    / "visible_dss_rect.webp"
)

OUTPUT_FILE = (
    ROOT
    / "media"
    / "sky"
    / "visible_dss.webp"
)


# --------------------------------------------------
# Load image
# --------------------------------------------------

img = Image.open(INPUT_FILE).convert("RGB")

src = (
    np.asarray(img)
    .astype(np.float32)
    / 255.0
)


# --------------------------------------------------
# Crop black borders
# --------------------------------------------------

gray = src.mean(axis=2)

mask = gray > 0.02

rows = np.where(mask.any(axis=1))[0]
cols = np.where(mask.any(axis=0))[0]

if len(rows) and len(cols):

    src = src[
        rows[0]:rows[-1] + 1,
        cols[0]:cols[-1] + 1
    ]


# --------------------------------------------------
# Equirectangular -> Mollweide
# --------------------------------------------------

src_h, src_w, _ = src.shape

out_width = 2400
out_height = 1200

dst = np.zeros(
    (out_height, out_width, 3),
    dtype=np.float32
)

sqrt2 = np.sqrt(2.0)


for j in range(out_height):

    y = (
        0.5 -
        j / (out_height - 1)
    ) * 2.0 * sqrt2

    for i in range(out_width):

        x = (
            i / (out_width - 1) -
            0.5
        ) * 4.0 * sqrt2


        # Outside Mollweide ellipse
        if (
            (x / (2.0 * sqrt2)) ** 2 +
            (y / sqrt2) ** 2
            > 1.0
        ):
            continue


        theta = np.arcsin(
            np.clip(
                y / sqrt2,
                -1.0,
                1.0
            )
        )

        cos_theta = np.cos(theta)

        if abs(cos_theta) < 1e-10:

            longitude = 0.0

        else:

            longitude = (
                np.pi * x /
                (
                    2.0 *
                    sqrt2 *
                    cos_theta
                )
            )


        if (
            longitude < -np.pi or
            longitude > np.pi
        ):
            continue


        latitude_argument = (
            2.0 * theta +
            np.sin(2.0 * theta)
        ) / np.pi

        latitude = np.arcsin(
            np.clip(
                latitude_argument,
                -1.0,
                1.0
            )
        )


        # Map longitude/latitude back
        # into rectangular source image
        u = (
            (longitude + np.pi) /
            (2.0 * np.pi)
        ) * (src_w - 1)

        v = (
            (
                np.pi / 2.0 -
                latitude
            ) /
            np.pi
        ) * (src_h - 1)


        ui = int(
            np.clip(
                round(u),
                0,
                src_w - 1
            )
        )

        vi = int(
            np.clip(
                round(v),
                0,
                src_h - 1
            )
        )

        dst[j, i] = src[vi, ui]


# --------------------------------------------------
# Save
# --------------------------------------------------

output = Image.fromarray(
    np.clip(
        dst * 255,
        0,
        255
    ).astype(np.uint8)
)

output.save(
    OUTPUT_FILE,
    format="WEBP",
    quality=95
)

print(
    f"Created:\n{OUTPUT_FILE}"
)