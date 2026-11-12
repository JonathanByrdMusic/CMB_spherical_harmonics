import base64
import glob
import json
import math
import os

import numpy as np


SPECTRA_DIR = "Simulator/db_pol_all/spectra_slices"

FILE_PATTERN = os.path.join(
    SPECTRA_DIR,
    "Ob_Oc*_Ol*.json"
)


def decode_float32_base64(encoded):
    raw = base64.b64decode(encoded)

    return np.frombuffer(
        raw,
        dtype="<f4"
    ).astype(np.float64)


def polarization_sigma(ell_stored, cee_stored):

    ell_stored = np.asarray(
        ell_stored,
        dtype=np.float64
    )

    cee_stored = np.asarray(
        cee_stored,
        dtype=np.float64
    )

    ell = np.arange(
        2,
        3001,
        dtype=np.float64
    )

    cee = np.interp(
        ell,
        ell_stored,
        cee_stored,
        left=0.0,
        right=0.0
    )

    variance = np.sum(
        (2.0 * ell + 1.0) * cee
    ) / (
        4.0 * math.pi
    )

    variance = max(
        0.0,
        variance
    )

    return math.sqrt(
        variance
    )


files = sorted(
    glob.glob(
        FILE_PATTERN
    )
)

print(
    "Found",
    len(files),
    "omega_b slice files"
)


maximum_sigma = -1.0
maximum_file = None
maximum_key = None

model_count = 0


for file_number, filename in enumerate(
    files,
    start=1
):

    with open(
        filename,
        "r"
    ) as f:

        data = json.load(f)

    ell = data["ell"]

    for key, model in data["models"].items():

        cee = decode_float32_base64(
            model["data"]
        )

        if len(cee) != len(ell):

            raise ValueError(
                f"Length mismatch in {filename}, "
                f"model {key}: "
                f"{len(cee)} EE values vs "
                f"{len(ell)} ell values"
            )

        sigma = polarization_sigma(
            ell,
            cee
        )

        model_count += 1

        if sigma > maximum_sigma:

            maximum_sigma = sigma
            maximum_file = filename
            maximum_key = key

    if (
        file_number % 100 == 0 or
        file_number == len(files)
    ):

        print(
            f"{file_number}/{len(files)} files, "
            f"{model_count} cosmologies scanned, "
            f"current max sigma_E = "
            f"{maximum_sigma:.12g}"
        )


print()
print("DONE")
print("-----------------------------")
print(
    "Cosmologies scanned:",
    model_count
)
print(
    "Maximum sigma_E:",
    repr(maximum_sigma)
)
print(
    "Slice file:",
    maximum_file
)
print(
    "Omega_b key:",
    maximum_key
)