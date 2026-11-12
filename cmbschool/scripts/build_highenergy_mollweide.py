from pathlib import Path

import numpy as np
from PIL import Image


# --------------------------------------------------
# CHANGE THESE TWO LINES
# --------------------------------------------------

INPUT_NAME = "xray_rosat_rect.webp"
OUTPUT_NAME = "xray_rosat.webp"


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
# Helpers
# --------------------------------------------------

def load_rgb(path):

    img = Image.open(path).convert("RGB")

    return (
        np.asarray(img)
        .astype(np.float32)
        / 255.0
    )


def crop_black_borders(
    img,
    threshold=0.02
):

    gray = img.mean(axis=2)

    mask = gray > threshold

    rows = np.where(
        mask.any(axis=1)
    )[0]

    cols = np.where(
        mask.any(axis=0)
    )[0]

    if (
        len(rows) == 0
        or len(cols) == 0
    ):
        return img

    r0 = rows[0]
    r1 = rows[-1] + 1

    c0 = cols[0]
    c1 = cols[-1] + 1

    return img[
        r0:r1,
        c0:c1,
        :
    ]


def equirectangular_to_mollweide(
    src,
    out_width=2400,
    out_height=1200
):

    src_h, src_w, _ = src.shape

    dst = np.zeros(
        (
            out_height,
            out_width,
            3
        ),
        dtype=np.float32
    )

    sqrt2 = np.sqrt(2.0)

    for j in range(out_height):

        y = (
            0.5
            - j / (out_height - 1)
        ) * 2.0 * sqrt2

        for i in range(out_width):

            x = (
                i / (out_width - 1)
                - 0.5
            ) * 4.0 * sqrt2


            # Outside Mollweide ellipse
            if (
                (x / (2.0 * sqrt2)) ** 2
                +
                (y / sqrt2) ** 2
                > 1.0
            ):
                continue


            # Invert Mollweide
            theta = np.arcsin(
                np.clip(
                    y / sqrt2,
                    -1.0,
                    1.0
                )
            )

            cos_theta = np.cos(
                theta
            )

            if abs(cos_theta) < 1e-10:

                lon = 0.0

            else:

                lon = (
                    np.pi * x
                    /
                    (
                        2.0
                        * sqrt2
                        * cos_theta
                    )
                )


            if (
                lon < -np.pi
                or lon > np.pi
            ):
                continue


            arg = (
                2.0 * theta
                +
                np.sin(
                    2.0 * theta
                )
            ) / np.pi


            lat = np.arcsin(
                np.clip(
                    arg,
                    -1.0,
                    1.0
                )
            )


            # ------------------------------------------
            # lon/lat -> rectangular source image
            # ------------------------------------------

            u = (
                (lon + np.pi)
                /
                (2.0 * np.pi)
            ) * (src_w - 1)

            v = (
                (
                    np.pi / 2.0
                    - lat
                )
                /
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


            dst[j, i] = src[
                vi,
                ui
            ]


    return dst


# --------------------------------------------------
# Load rectangular master
# --------------------------------------------------

src = load_rgb(
    INPUT_FILE
)


# --------------------------------------------------
# Remove black padding
# --------------------------------------------------

src = crop_black_borders(
    src
)


print(
    "Cropped source shape:",
    src.shape
)


# --------------------------------------------------
# Reproject
# --------------------------------------------------

moll = (
    equirectangular_to_mollweide(
        src,
        out_width=2400,
        out_height=1200
    )
)


# --------------------------------------------------
# Save
# --------------------------------------------------

out = Image.fromarray(
    np.clip(
        moll * 255,
        0,
        255
    ).astype(np.uint8)
)


out.save(
    OUTPUT_FILE,
    format="WEBP",
    quality=95
)


print(
    f"Created:\n{OUTPUT_FILE}"
)