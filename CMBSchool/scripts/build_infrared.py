from pathlib import Path

from PIL import Image


# --------------------------------------------------
# Paths
# --------------------------------------------------

ROOT = Path(__file__).resolve().parent.parent

IRAS_DIR = (
    ROOT
    / "data"
    / "infrared"
    / "IRAS-tiles"
)

WISE_DIR = (
    ROOT
    / "data"
    / "infrared"
    / "WISE-tiles"
)

OUTPUT_DIR = (
    ROOT
    / "media"
    / "sky"
)

OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True
)


# --------------------------------------------------
# Settings
# --------------------------------------------------

# Chromoscope tiles are 256 x 256 px.
TILE_SIZE = 256

# Level 4 gives:
# 16 x 16 tiles = 4096 x 4096 pixels.
LEVEL = 4


# --------------------------------------------------
# Decode Chromoscope / Google quadkey
#
# q = upper-left
# r = upper-right
# t = lower-left
# s = lower-right
#
# Tile names begin with "t", the root tile.
# --------------------------------------------------

QUADRANTS = {
    "q": (0, 0),
    "r": (1, 0),
    "t": (0, 1),
    "s": (1, 1),
}


def quadkey_to_xy(name):

    stem = Path(name).stem

    # Remove initial root "t".
    key = stem[1:]

    x = 0
    y = 0

    for char in key:

        dx, dy = QUADRANTS[char]

        x = x * 2 + dx
        y = y * 2 + dy

    return x, y


# --------------------------------------------------
# Reconstruct one level of a Chromoscope tile set
# --------------------------------------------------

def build_mosaic(tile_dir, output_file):

    grid_size = 2 ** LEVEL

    canvas_size = (
        grid_size * TILE_SIZE
    )

    canvas = Image.new(
        "RGB",
        (
            canvas_size,
            canvas_size
        ),
        "black"
    )

    expected_length = (
        1 + LEVEL
    )

    tiles_used = 0

    for tile_path in tile_dir.glob("*.jpg"):

        stem = tile_path.stem

        if len(stem) != expected_length:
            continue

        x, y = quadkey_to_xy(
            tile_path.name
        )

        tile = Image.open(
            tile_path
        ).convert("RGB")

        canvas.paste(
            tile,
            (
                x * TILE_SIZE,
                y * TILE_SIZE
            )
        )

        tiles_used += 1

    canvas.save(
        output_file,
        format="WEBP",
        quality=92,
        method=6
    )

    print(
        f"{tile_dir.name}: "
        f"{tiles_used} tiles used"
    )

    print(
        f"Created:\n{output_file}"
    )


# --------------------------------------------------
# Build IRAS and WISE mosaics
# --------------------------------------------------

build_mosaic(
    IRAS_DIR,
    OUTPUT_DIR
    / "infrared_iras.webp"
)

build_mosaic(
    WISE_DIR,
    OUTPUT_DIR
    / "infrared_wise.webp"
)