from pathlib import Path
import json

import healpy as hp
import numpy as np
from astropy.io import fits


# ==================================================
# Paths
# ==================================================

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
CAL = DATA / "IR_V_X_G"
PLANCK = DATA / "reduced"

OUTPUT_JSON = DATA / "relative_intensity_scales.json"


# ==================================================
# Physical constants
# ==================================================

C = 299792458.0
H = 6.62607015e-34
K_B = 1.380649e-23

T_CMB = 2.7255

MEV_TO_J = 1.602176634e-13


# ==================================================
# Generic helpers
# ==================================================

def finite_positive(arr):
    arr = np.asarray(arr, dtype=np.float64)
    return arr[
        np.isfinite(arr)
        & (arr > 0)
    ]


def robust_median(arr):
    arr = finite_positive(arr)

    if arr.size == 0:
        raise RuntimeError(
            "No finite positive values found."
        )

    return float(np.median(arr))


def read_healpix(path):
    return hp.read_map(
        str(path),
        field=0,
        dtype=np.float64
    )

def read_iris_map(path):
    """
    Read legacy IRIS HEALPix FITS files whose
    binary-table column names are malformed.
    """

    with fits.open(
        path,
        memmap=True
    ) as hdul:

        hdu = hdul[1]

        # Repair missing/non-string TTYPE keywords
        # before Astropy constructs the table dtype.
        nfields = int(
            hdu.header.get(
                "TFIELDS",
                1
            )
        )

        for i in range(
            1,
            nfields + 1
        ):

            key = f"TTYPE{i}"

            value = hdu.header.get(
                key
            )

            if not isinstance(
                value,
                str
            ):

                hdu.header[key] = (
                    f"COL{i}"
                )

        # Force Astropy to rebuild its column
        # definitions from the repaired header.
        hdu._columns = None

        data = hdu.data

        # First table column contains the map.
        sky = np.asarray(
            data.field(0),
            dtype=np.float64
        ).ravel()

    return sky


# ==================================================
# Spectral conversions
# ==================================================

def planck_Bnu(nu_hz, temperature):
    """
    Planck spectral radiance B_nu.

    W m^-2 Hz^-1 sr^-1
    """

    x = (
        H * nu_hz
        / (K_B * temperature)
    )

    return (
        2.0 * H * nu_hz**3
        / C**2
        / np.expm1(x)
    )


def dBnu_dT(nu_hz, temperature):
    """
    Temperature derivative of Planck radiance.

    W m^-2 Hz^-1 sr^-1 K^-1
    """

    x = (
        H * nu_hz
        / (K_B * temperature)
    )

    ex = np.exp(x)

    return (
        2.0
        * H
        * nu_hz**3
        / C**2
        *
        ex
        / (ex - 1.0)**2
        *
        x
        / temperature
    )


def mjysr_to_nuInu(
    intensity_mjysr,
    nu_hz
):
    """
    MJy/sr -> nu I_nu

    Returns W m^-2 sr^-1.
    """

    I_nu = (
        intensity_mjysr
        * 1.0e-20
    )

    return nu_hz * I_nu


# ==================================================
# RADIO — Haslam 408 MHz
# ==================================================

def radio_scale():

    path = (
        DATA
        / "haslam408_dsds_Remazeilles2014.fits"
    )

    sky = read_healpix(path)

    T_b = robust_median(sky)

    nu = 408.0e6

    # Rayleigh-Jeans brightness.
    I_nu = (
        2.0
        * K_B
        * T_b
        * nu**2
        / C**2
    )

    return nu * I_nu


# ==================================================
# PLANCK
# ==================================================

PLANCK_FILES = {
    30: "LFI_SkyMap_030_nside512.fits",
    44: "LFI_SkyMap_044_nside512.fits",
    70: "LFI_SkyMap_070_nside512.fits",
    100: "HFI_SkyMap_100_nside512.fits",
    143: "HFI_SkyMap_143_nside512.fits",
    217: "HFI_SkyMap_217_nside512.fits",
    353: "HFI_SkyMap_353_nside512.fits",
    545: "HFI_SkyMap_545_nside512.fits",
    857: "HFI_SkyMap_857_nside512.fits",
}


def planck_scale(freq_ghz):

    path = (
        PLANCK
        / PLANCK_FILES[freq_ghz]
    )

    sky = read_healpix(path)

    median_signal = float(
        np.median(
            sky[np.isfinite(sky)]
        )
    )

    nu = freq_ghz * 1.0e9


    # ----------------------------------------------
    # 30–353 GHz:
    # native units are K_CMB.
    #
    # Treat map value as differential brightness
    # around the CMB monopole.
    # ----------------------------------------------

    if freq_ghz <= 353:

        B_cmb = planck_Bnu(
            nu,
            T_CMB
        )

        delta_B = (
            dBnu_dT(
                nu,
                T_CMB
            )
            * median_signal
        )

        I_nu = (
            B_cmb
            + delta_B
        )

        return nu * I_nu


    # ----------------------------------------------
    # 545 and 857 GHz:
    # native units are MJy/sr.
    # ----------------------------------------------

    # 545 and 857 GHz:
    # map is already in MJy/sr, but it does not
    # contain the absolute CMB monopole in the same
    # way we explicitly added it above.

    map_nuInu = mjysr_to_nuInu(
        median_signal,
        nu
    )

    cmb_nuInu = (
        nu
        * planck_Bnu(
            nu,
            T_CMB
        )
    )

    return (
        map_nuInu
        + cmb_nuInu
    )


# ==================================================
# INFRARED — WISE + IRIS
# ==================================================

def infrared_scale():

    # ----------------------------------------------
    # WISE 12 micron
    # ----------------------------------------------

    wise_path = (
        CAL
        / "wssa_sample_1024-bintable.fits"
    )

    with fits.open(wise_path) as hdul:
        wise = np.asarray(
            hdul[1].data["I12"],
            dtype=np.float64
        )

    wise_12 = robust_median(wise)


    # ----------------------------------------------
    # IRIS:
    # map 1 = 12 um
    # map 2 = 25 um
    # map 3 = 60 um
    # map 4 = 100 um
    #
    # Units: MJy/sr
    # ----------------------------------------------

    iris_wavelengths = {
        12: "IRIS_nohole_1_1024.fits",
        25: "IRIS_nohole_2_1024.fits",
        60: "IRIS_nohole_3_1024.fits",
        100: "IRIS_nohole_4_1024.fits",
    }

    iris_values = {}

    for wavelength_um, filename in (
        iris_wavelengths.items()
    ):

        sky = read_iris_map(
            CAL / filename
        )

        iris_values[wavelength_um] = (
            robust_median(sky)
        )


    # ----------------------------------------------
    # Combine WISE and IRIS at 12 um so that the
    # same wavelength is not double-weighted.
    # ----------------------------------------------

    twelve_um = np.median(
        [
            wise_12,
            iris_values[12]
        ]
    )


    representative = {
        12: twelve_um,
        25: iris_values[25],
        60: iris_values[60],
        100: iris_values[100],
    }


    sed_values = []

    for wavelength_um, intensity in (
        representative.items()
    ):

        wavelength_m = (
            wavelength_um * 1.0e-6
        )

        nu = C / wavelength_m

        sed_values.append(
            mjysr_to_nuInu(
                intensity,
                nu
            )
        )


    # Typical energy level across the IR bands.
    return float(
        np.median(sed_values)
    )


# ==================================================
# VISIBLE — Pioneer B + R
# ==================================================

def visible_scale():

    # Pioneer effective wavelengths.
    bands = {
        "B": {
            "filename": "P_all_1_B.fits",
            "lambda_A": 4370.0,

            # 1 S10(G2V)
            # erg cm^-2 s^-1 sr^-1 A^-1
            "conversion": 1.192e-9,
        },

        "R": {
            "filename": "P_all_1_R.fits",
            "lambda_A": 6441.0,
            "conversion": 0.992e-9,
        },
    }


    sed_values = []

    for info in bands.values():

        with fits.open(
            CAL / info["filename"]
        ) as hdul:

            sky = np.asarray(
                hdul[0].data,
                dtype=np.float64
            )


        # Zeros are missing/unobserved pixels.
        median_s10 = robust_median(sky)


        # erg cm^-2 s^-1 -> W m^-2
        I_lambda_per_A = (
            median_s10
            * info["conversion"]
            * 1.0e-3
        )


        # lambda I_lambda.
        sed = (
            info["lambda_A"]
            * I_lambda_per_A
        )

        sed_values.append(sed)


    return float(
        np.median(sed_values)
    )


# ==================================================
# ULTRAVIOLET — GALEX NUV
# ==================================================

def ultraviolet_scale():

    path = (
        DATA
        / "ultraviolet"
        / "hlsp_uv-bkgd_galex_map_allsky_nuv_v1_skymap.fits"
    )

    with fits.open(path) as hdul:

        sky = np.asarray(
            hdul[0].data,
            dtype=np.float64
        )


    photons = robust_median(sky)

    # Murthy diffuse NUV map:
    # ph cm^-2 s^-1 sr^-1 A^-1.
    #
    # Murthy 2014 quotes NUV ~2316 A.
    lambda_A = 2316.0
    lambda_m = lambda_A * 1.0e-10

    photon_energy = (
        H * C / lambda_m
    )


    # Convert cm^-2 -> m^-2.
    I_lambda_per_A = (
        photons
        * 1.0e4
        * photon_energy
    )


    # lambda I_lambda
    return (
        lambda_A
        * I_lambda_per_A
    )

# ==================================================
# XRAY 
# ==================================================


def xray_scale():
    """
    Approximate ROSAT diffuse X-ray energy intensity.

    Uses representative photon energies for the
    three broad ROSAT composite maps.

    This is an educational count-to-energy estimate,
    not a full spectral forward-fold through the PSPC
    response matrix.
    """

    bands = [
        {
            "filename": "rass_c.fits",
            "energy_keV": 0.25,
        },
        {
            "filename": "rass_m.fits",
            "energy_keV": 0.75,
        },
        {
            "filename": "rass_ij.fits",
            "energy_keV": 1.5,
        },
    ]

    values = []

    arcmin2_per_sr = (
        (180.0 / np.pi) * 60.0
    ) ** 2

    kev_to_joule = (
        1.0e3
        * 1.602176634e-19
    )

    for band in bands:

        path = (
            CAL
            / band["filename"]
        )

        with fits.open(path) as hdul:

            sky = np.asarray(
                hdul[0].data,
                dtype=np.float64
            )

        # Ignore zero/negative missing or background-
        # subtracted pixels.
        median_microcounts = (
            robust_median(sky)
        )

        # FITS units:
        # 10^-6 counts s^-1 arcmin^-2
        count_rate_arcmin2 = (
            median_microcounts
            * 1.0e-6
        )

        # Convert to counts s^-1 sr^-1
        count_rate_sr = (
            count_rate_arcmin2
            * arcmin2_per_sr
        )

        photon_energy = (
            band["energy_keV"]
            * kev_to_joule
        )

        # Approximate energy intensity assuming
        # one representative photon energy per count.
        energy_intensity = (
            count_rate_sr
            * photon_energy
        )

        values.append(
            energy_intensity
        )

    return float(
        np.median(values)
    )

# ==================================================
# GAMMA — Fermi diffuse + isotropic
# ==================================================

def load_isotropic_template(path):

    energies = []
    intensities = []

    with open(path, "r") as f:

        for line in f:

            line = line.strip()

            if (
                not line
                or line.startswith("#")
            ):
                continue

            parts = line.split()

            try:
                energy = float(parts[0])
                intensity = float(parts[1])

            except (
                ValueError,
                IndexError
            ):
                continue

            energies.append(energy)
            intensities.append(intensity)


    return (
        np.asarray(
            energies,
            dtype=np.float64
        ),
        np.asarray(
            intensities,
            dtype=np.float64
        )
    )


def gamma_scale():

    diffuse_path = (
        CAL / "gll_iem_v07.fits"
    )

    iso_path = (
        CAL
        / "iso_P8R3_SOURCE_V3_v1.txt"
    )


    with fits.open(
        diffuse_path,
        memmap=True
    ) as hdul:

        cube = np.asarray(
            hdul[0].data,
            dtype=np.float64
        )

        energies = np.asarray(
            hdul[1].data["energy"],
            dtype=np.float64
        )


    # Spatial median of diffuse intensity
    # for each energy plane.
    diffuse_median = np.array(
        [
            robust_median(plane)
            for plane in cube
        ]
    )


    # Isotropic template
    iso_energy, iso_intensity = (
        load_isotropic_template(
            iso_path
        )
    )


    # Log-log interpolation of isotropic spectrum.
    iso_interp = np.exp(
        np.interp(
            np.log(energies),
            np.log(iso_energy),
            np.log(iso_intensity)
        )
    )


    total_dnde = (
        diffuse_median
        + iso_interp
    )


    # E^2 dN/dE:
    #
    # dN/dE units:
    # ph cm^-2 s^-1 sr^-1 MeV^-1
    #
    # result first in:
    # MeV cm^-2 s^-1 sr^-1
    sed_mev = (
        energies**2
        * total_dnde
    )


    # MeV -> joules
    # cm^-2 -> m^-2
    sed_si = (
        sed_mev
        * MEV_TO_J
        * 1.0e4
    )


    return float(
        np.median(sed_si)
    )


# ==================================================
# Calculate
# ==================================================

physical = {
    "radio": radio_scale(),

    "microwave": {
        str(freq): planck_scale(freq)
        for freq in PLANCK_FILES
    },

    "infrared": infrared_scale(),

    "visible": visible_scale(),

    "ultraviolet": ultraviolet_scale(),

    # Deliberately excluded until ROSAT counts are
    # converted through a spectral/response model.
    "xray": xray_scale(),

    "gamma": gamma_scale(),
}


# ==================================================
# Find global maximum
# ==================================================

all_values = [
    physical["radio"],
    physical["infrared"],
    physical["visible"],
    physical["ultraviolet"],
    physical["xray"],
    physical["gamma"],
]

all_values.extend(
    physical["microwave"].values()
)

global_max = max(all_values)


# ==================================================
# Relative scales
# ==================================================

relative = {

    "radio":
        physical["radio"]
        / global_max,

    "microwave": {
        freq:
            value / global_max
        for freq, value
        in physical["microwave"].items()
    },

    "infrared":
        physical["infrared"]
        / global_max,

    "visible":
        physical["visible"]
        / global_max,

    "ultraviolet":
        physical["ultraviolet"]
        / global_max,

    "xray":
        physical["xray"]
        / global_max,

    "gamma":
        physical["gamma"]
        / global_max,
}


# ==================================================
# Output
# ==================================================

result = {
    "quantity":
        "representative energy per logarithmic spectral interval",

    "units":
        "W m^-2 sr^-1",

    "physical": physical,

    "relative_to_global_max": relative,

    "notes": {
        "xray":
        (
            "Approximate ROSAT diffuse X-ray energy "
            "intensity using representative photon "
            "energies of 0.25, 0.75, and 1.5 keV. "
            "Not a full PSPC spectral forward-fold."
        ),

        "planck_30_353":
            "CMB monopole plus differential K_CMB map median.",

        "infrared":
            "Median across representative 12, 25, 60, and 100 micron SED values.",

        "visible":
            "Median of Pioneer B and R lambda*I_lambda.",

        "ultraviolet":
            "GALEX diffuse NUV background at 2316 Angstrom.",

        "gamma":
            "Median E^2 dN/dE across the Fermi diffuse+isotropic energy grid."
    }
}


with open(
    OUTPUT_JSON,
    "w"
) as f:

    json.dump(
        result,
        f,
        indent=2
    )


# ==================================================
# Console report
# ==================================================

print()
print("=" * 72)
print("RELATIVE INTENSITY SCALE")
print("=" * 72)

print(
    f"{'Band':<18}"
    f"{'Physical [W m^-2 sr^-1]':>28}"
    f"{'Relative':>16}"
)

print("-" * 72)


def report(name, value, rel):

    print(
        f"{name:<18}"
        f"{value:>28.6e}"
        f"{rel:>16.6e}"
    )


report(
    "radio",
    physical["radio"],
    relative["radio"]
)

for freq in PLANCK_FILES:

    report(
        f"{freq} GHz",
        physical["microwave"][str(freq)],
        relative["microwave"][str(freq)]
    )

report(
    "infrared",
    physical["infrared"],
    relative["infrared"]
)

report(
    "visible",
    physical["visible"],
    relative["visible"]
)

report(
    "ultraviolet",
    physical["ultraviolet"],
    relative["ultraviolet"]
)

report(
    "xray",
    physical["xray"],
    relative["xray"]
)

report(
    "gamma",
    physical["gamma"],
    relative["gamma"]
)

print()
print(
    f"Saved:\n{OUTPUT_JSON}"
)