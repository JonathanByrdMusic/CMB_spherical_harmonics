from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlretrieve

ROOT = Path(__file__).resolve().parent.parent

OUTPUT_FILE = (
    ROOT
    / "data"
    / "ultraviolet"
    / "galex_nuv_allsky.fits"
)

OUTPUT_FILE.parent.mkdir(
    parents=True,
    exist_ok=True
)

params = {
    "Survey": "GALEX Near UV",
    "Position": "0,0",
    "Coordinates": "Galactic",
    "Projection": "Ait",
    "Size": "360,180",
    "Pixels": "800,400",
    "Return": "FITS",
}

url = (
    "https://skyview.gsfc.nasa.gov/current/cgi/runquery.pl?"
    + urlencode(params)
)

print("Requesting:")
print(url)

urlretrieve(
    url,
    OUTPUT_FILE
)

print(f"Created:\n{OUTPUT_FILE}")