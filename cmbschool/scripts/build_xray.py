from pathlib import Path
from PIL import Image


# --------------------------------------------------
# Paths
# --------------------------------------------------

ROOT = Path(__file__).resolve().parent.parent

XRAY_DIR = (
    ROOT
    / "data"
    / "xray"
)

OUTPUT_FILE = (
    ROOT
    / "media"
    / "sky"
    / "xray_rosat_rect.webp"
)


# --------------------------------------------------
# Settings
# --------------------------------------------------

TILE_SIZE = 256
LEVEL = 4


# --------------------------------------------------
# Chromoscope / Google quadtree
# --------------------------------------------------

QUADRANTS = {
    "q": (0, 0),
    "r": (1, 0),
    "t": (0, 1),
    "s": (1, 1),
}


def quadkey_to_xy(filename):

    stem = Path(filename).stem
    key = stem[1:]

    x = 0
    y = 0

    for char in key:

        dx, dy = QUADRANTS[char]

        x = x * 2 + dx
        y = y * 2 + dy

    return x, y


# --------------------------------------------------
# Find all extracted JPG tiles automatically
# --------------------------------------------------

all_tiles = list(
    XRAY_DIR.rglob("*.jpg")
)

print(
    f"Found {len(all_tiles)} JPG files "
    f"under {XRAY_DIR}"
)

if not all_tiles:

    raise RuntimeError(
        "No ROSAT JPG tiles were found."
    )


# --------------------------------------------------
# Select one quadtree level
# --------------------------------------------------

expected_stem_length = 1 + LEVEL

level_tiles = [
    path
    for path in all_tiles
    if len(path.stem) ==
    expected_stem_length
]

print(
    f"Using {len(level_tiles)} tiles "
    f"at level {LEVEL}"
)

if not level_tiles:

    raise RuntimeError(
        f"No level-{LEVEL} tiles found."
    )


# --------------------------------------------------
# Construct mosaic
# --------------------------------------------------

grid_size = 2 ** LEVEL

canvas_size = (
    grid_size *
    TILE_SIZE
)

canvas = Image.new(
    "RGB",
    (
        canvas_size,
        canvas_size
    ),
    "black"
)


for tile_path in level_tiles:

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


# --------------------------------------------------
# Save rectangular master
# --------------------------------------------------

OUTPUT_FILE.parent.mkdir(
    parents=True,
    exist_ok=True
)

canvas.save(
    OUTPUT_FILE,
    format="WEBP",
    quality=95,
    method=6
)

print(
    f"Created:\n{OUTPUT_FILE}"
)