from pathlib import Path

import healpy as hp
import matplotlib.pyplot as plt
import numpy as np


# --------------------------------------------------
# Physical constants
# --------------------------------------------------

H = 6.62607015e-34       # J s
K_B = 1.380649e-23       # J K^-1
C = 299792458.0          # m s^-1
T_CMB = 2.7255           # K


# --------------------------------------------------
# Paths
# --------------------------------------------------

INPUT_DIR = Path(
    "/Users/jonathanbyrd/Desktop/AAA College/NC State/"
    "Education work/websites/CMB data preschool fits etc/microwave"
)

ROOT = Path(__file__).resolve().parent.parent

OUTPUT_DIR = (
    ROOT
    / "media"
    / "sky"
    / "logarithmic"
)

OUTPUT_DIR.mkdir(
    parents=True,
    exist_ok=True
)


# --------------------------------------------------
# Planck bands
# --------------------------------------------------

BANDS = {
    30: "LFI",
    44: "LFI",
    70: "LFI",
    100: "HFI",
    143: "HFI",
    217: "HFI",
    353: "HFI",
    545: "HFI",
    857: "HFI",
}


# --------------------------------------------------
# Blackbody functions
# --------------------------------------------------

def planck_intensity_mjy_sr(nu_hz, temperature):
    """
    Planck blackbody specific intensity B_nu
    returned in MJy/sr.
    """

    x = (
        H * nu_hz
        / (K_B * temperature)
    )

    b_nu = (
        2
        * H
        * nu_hz**3
        / C**2
        / np.expm1(x)
    )

    # W m^-2 Hz^-1 sr^-1 -> MJy/sr
    return b_nu * 1e20


def dplanck_dT_mjy_sr_K(nu_hz, temperature):
    """
    Temperature derivative dB_nu/dT
    returned in MJy/sr/K.
    """

    x = (
        H * nu_hz
        / (K_B * temperature)
    )

    exp_x = np.exp(x)

    derivative = (
        2
        * H**2
        * nu_hz**4
        / (
            C**2
            * K_B
            * temperature**2
        )
        * exp_x
        / np.expm1(x)**2
    )

    return derivative * 1e20


# --------------------------------------------------
# Load and convert every band
# --------------------------------------------------

maps = {}

for band, instrument in BANDS.items():

    input_file = (
        INPUT_DIR
        / f"{instrument}_SkyMap_{band:03d}_nside512.fits"
    )

    print(f"\nReading {band} GHz:")
    print(input_file)

    sky_map = hp.read_map(
        input_file,
        field=0,
        dtype=np.float64
    )

    valid = (
        np.isfinite(sky_map)
        & (sky_map != hp.UNSEEN)
    )

    frequency_hz = band * 1e9

    cmb_monopole = planck_intensity_mjy_sr(
        frequency_hz,
        T_CMB
    )

    # --------------------------------------------------
    # Convert map to total specific intensity I_nu
    # --------------------------------------------------

    if band <= 353:

        conversion = dplanck_dT_mjy_sr_K(
            frequency_hz,
            T_CMB
        )

        intensity_mjy_sr = np.full(
            sky_map.shape,
            hp.UNSEEN,
            dtype=np.float64
        )

        intensity_mjy_sr[valid] = (
            cmb_monopole
            +
            sky_map[valid] * conversion
        )

    else:

        # 545 and 857 GHz maps are already MJy/sr.
        intensity_mjy_sr = np.full(
            sky_map.shape,
            hp.UNSEEN,
            dtype=np.float64
        )

        intensity_mjy_sr[valid] = (
            cmb_monopole
            +
            sky_map[valid]
        )

    # --------------------------------------------------
    # Convert to nu I_nu
    #
    # MJy/sr -> W m^-2 Hz^-1 sr^-1:
    # multiply by 1e-20
    #
    # Then multiply by frequency.
    # --------------------------------------------------

    nu_i_nu = np.full(
        sky_map.shape,
        hp.UNSEEN,
        dtype=np.float64
    )

    nu_i_nu[valid] = (
        frequency_hz
        * intensity_mjy_sr[valid]
        * 1e-20
    )

    maps[band] = nu_i_nu

    cmb_nu_i_nu = (
        frequency_hz
        * cmb_monopole
        * 1e-20
    )

    print(
        f"CMB background = "
        f"{cmb_nu_i_nu:.3e} W m^-2 sr^-1"
    )


# --------------------------------------------------
# Establish ONE shared logarithmic scale
# --------------------------------------------------

positive_values = []

for band, sky_map in maps.items():

    valid = (
        np.isfinite(sky_map)
        & (sky_map != hp.UNSEEN)
        & (sky_map > 0)
    )

    positive_values.append(
        sky_map[valid]
    )


# Avoid concatenating every pixel into one giant array.
# Use the lowest positive percentile among bands as the
# common floor and the highest upper percentile as ceiling.

band_floors = []
band_ceilings = []

for values in positive_values:

    band_floors.append(
        np.percentile(values, 0.1)
    )

    band_ceilings.append(
        np.percentile(values, 99.9)
    )


physical_floor = min(band_floors)
physical_ceiling = max(band_ceilings)

print("\nShared physical display range:")
print(
    f"floor   = {physical_floor:.3e} W m^-2 sr^-1"
)
print(
    f"ceiling = {physical_ceiling:.3e} W m^-2 sr^-1"
)


log_floor = np.log10(
    physical_floor
)

log_ceiling = np.log10(
    physical_ceiling
)


# --------------------------------------------------
# Render all nine maps
# --------------------------------------------------

for band, sky_map in maps.items():

    valid = (
        np.isfinite(sky_map)
        & (sky_map != hp.UNSEEN)
    )

    display_map = np.full(
        sky_map.shape,
        hp.UNSEEN,
        dtype=np.float64
    )

    clipped = np.maximum(
        sky_map[valid],
        physical_floor
    )

    display_map[valid] = np.log10(
        clipped
    )

    output_file = (
        OUTPUT_DIR
        / f"microwave_planck_log_{band}.webp"
    )

    plt.figure(
        figsize=(16, 8),
        dpi=150
    )

    hp.mollview(
        display_map,
        fig=plt.gcf().number,
        coord="G",
        title="",
        unit="",
        min=log_floor,
        max=log_ceiling,
        cmap="inferno",
        cbar=False,
        notext=True,
        bgcolor="black"
    )

    fig = plt.gcf()
    fig.patch.set_facecolor("black")

    for ax in fig.axes:
        ax.set_facecolor("black")

    plt.savefig(
        output_file,
        format="webp",
        dpi=150,
        bbox_inches="tight",
        pad_inches=0,
        facecolor="black"
    )

    plt.close()

    print(
        f"Created: {output_file}"
    )


print("\nDone.")