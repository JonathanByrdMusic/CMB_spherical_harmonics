// lambda.js
// Controller for "The Hidden Universe" front-door experience.
//
// First-pass responsibilities:
// 1. Track the selected broadband region.
// 2. Show/hide the Planck microwave selector.
// 3. Track the selected Planck microwave band.
// 4. Track Relative Intensity mode.
// 5. Track Logarithmic Intensity mode.
// Real sky maps and the physical spectrum will be added later.

const skyImages = {

    radio:
        "media/sky/radio_haslam.webp",

    infrared:
        "media/sky/infrared_wise_iras.webp",

    visible:
        "media/sky/visible_dss.webp?v=2",

    ultraviolet:
        "media/sky/ultraviolet_galex.webp?v=2",

    xray:
    "media/sky/xray_rosat.webp?v=3",

    gamma:
        "media/sky/gamma_fermi.webp?v=4"
};

const skyCredits = {
    radio:
        "Haslam 408 MHz / Remazeilles et al.",

    infrared:
        "WISE + IRAS / NASA",

    visible:
        "DSS / STScI",

    ultraviolet:
        "GALEX / NASA",

    xray:
        "ROSAT All-Sky Survey",

    gamma:
        "Fermi-LAT / NASA"
};

const microwaveCredit =
    "Planck / ESA";

const planckSkyImages = {

    30:
        "media/sky/microwave_planck_30.webp",

    44:
        "media/sky/microwave_planck_44.webp",

    70:
        "media/sky/microwave_planck_70.webp",

    100:
        "media/sky/microwave_planck_100.webp",

    143:
        "media/sky/microwave_planck_143.webp",

    217:
        "media/sky/microwave_planck_217.webp",

    353:
        "media/sky/microwave_planck_353.webp",

    545:
        "media/sky/microwave_planck_545.webp",

    857:
        "media/sky/microwave_planck_857.webp"
};

const planckLogarithmicSkyImages = {

    30:
        "media/sky/logarithmic/microwave_planck_log_30.webp",

    44:
        "media/sky/logarithmic/microwave_planck_log_44.webp",

    70:
        "media/sky/logarithmic/microwave_planck_log_70.webp",

    100:
        "media/sky/logarithmic/microwave_planck_log_100.webp",

    143:
        "media/sky/logarithmic/microwave_planck_log_143.webp",

    217:
        "media/sky/logarithmic/microwave_planck_log_217.webp",

    353:
        "media/sky/logarithmic/microwave_planck_log_353.webp",

    545:
        "media/sky/logarithmic/microwave_planck_log_545.webp",

    857:
        "media/sky/logarithmic/microwave_planck_log_857.webp"
};

const state = {
    broadbandBand: "microwave",
    microwaveBand: 143,
    relativeIntensity: false,
    logarithmicIntensity: false
};

let relativeIntensityScales = null;

// --------------------------------------------------
// Spectrum configuration
// --------------------------------------------------

const spectrumViews = {
    broadband: {
        minFrequency: 1e7,
        maxFrequency: 1e25
    },

    microwave: {
        minFrequency: 1e10,
        maxFrequency: 1e12
    }
};


const broadbandRanges = {

    radio: {
        min: 1e7,
        max: 1e10
    },

    microwave: {
        min: 1e10,
        max: 1e12
    },

    infrared: {
        min: 1e12,
        max: 1e14
    },

    visible: {
        min: 1e14,
        max: 1e15
    },

    ultraviolet: {
        min: 1e15,
        max: 1e16
    },

    xray: {
        min: 1e16,
        max: 1e19
    },

    gamma: {
        min: 1e19,
        max: 1e25
    }
};


const planckBandsGHz = {
    30: 30,
    44: 44,
    70: 70,
    100: 100,
    143: 143,
    217: 217,
    353: 353,
    545: 545,
    857: 857
};


// --------------------------------------------------
// DOM references
// --------------------------------------------------

const broadbandInputs =
    document.querySelectorAll(
        'input[name="broadbandBand"]'
    );

const microwaveInputs =
    document.querySelectorAll(
        'input[name="microwaveBand"]'
    );

const microwaveControls =
    document.getElementById("microwaveControls");

const broadbandControls =
    document.getElementById(
        "broadbandControls"
    );

const logarithmicIntensityCheckbox =
    document.getElementById(
        "logarithmicIntensityCheckbox"
    );

const relativeIntensityCheckbox =
    document.getElementById(
        "relativeIntensityCheckbox"
    );

const skyPanelTitle =
    document.getElementById("skyPanelTitle");

const spectrumPanelTitle =
    document.getElementById("spectrumPanelTitle");

const skyImage =
    document.getElementById("skyImage");

const skyCredit =
    document.getElementById("skyCredit");

const spectrumCanvas =
    document.getElementById("spectrumCanvas");


// --------------------------------------------------
// Helpers
// --------------------------------------------------

function getSelectedBroadbandBand() {

    const selected =
        document.querySelector(
            'input[name="broadbandBand"]:checked'
        );

    return selected
        ? selected.value
        : "microwave";
}


function getSelectedMicrowaveBand() {

    const selected =
        document.querySelector(
            'input[name="microwaveBand"]:checked'
        );

    return selected
        ? Number(selected.value)
        : 143;
}


function formatBroadbandLabel(value) {

    const labels = {
        radio: "Radio",
        microwave: "Microwave",
        infrared: "Infrared",
        visible: "Visible",
        ultraviolet: "Ultraviolet",
        xray: "X-ray",
        gamma: "Gamma ray"
    };

    return labels[value] || value;
}

// --------------------------------------------------
// Physical spectrum
// --------------------------------------------------

function planckIntensity(nu, temperature) {

    const h = 6.62607015e-34;
    const k = 1.380649e-23;
    const c = 299792458;

    const x =
        h * nu /
        (k * temperature);

    /*
     * At extremely large x, exp(x) overflows.
     * The Planck intensity is effectively zero there.
     */
    if (x > 700) {
        return 0;
    }

    return (
        (2 * h * Math.pow(nu, 3)) /
        (c * c) /
        Math.expm1(x)
    );
}


function cmbEnergyPerLogFrequency(nu) {

    const cmbTemperature = 2.7255;

    return (
        nu *
        planckIntensity(
            nu,
            cmbTemperature
        )
    );
}


// --------------------------------------------------
// Spectrum drawing helpers
// --------------------------------------------------

function log10(value) {
    return Math.log(value) / Math.LN10;
}


function mapLogFrequencyToX(
    frequency,
    minFrequency,
    maxFrequency,
    left,
    width
) {

    const minLog =
        log10(minFrequency);

    const maxLog =
        log10(maxFrequency);

    const valueLog =
        log10(frequency);

    const fraction =
        (valueLog - minLog) /
        (maxLog - minLog);

    return (
        left +
        fraction * width
    );
}

function mapLinearIntensityToY(
    intensity,
    minIntensity,
    maxIntensity,
    top,
    height
) {

    const fraction =
        (intensity - minIntensity) /
        (maxIntensity - minIntensity);

    return (
        top +
        height -
        fraction * height
    );
}


function mapLogIntensityToY(
    intensity,
    minIntensity,
    maxIntensity,
    top,
    height
) {

    const safeIntensity =
        Math.max(
            intensity,
            minIntensity
        );

    const minLog =
        log10(minIntensity);

    const maxLog =
        log10(maxIntensity);

    const valueLog =
        log10(safeIntensity);

    const fraction =
        (valueLog - minLog) /
        (maxLog - minLog);

    return (
        top +
        height -
        fraction * height
    );
}


function getSpectrumView() {

    if (state.relativeIntensity) {

        return {
            minFrequency: 1e7,
            maxFrequency: 1e26
        };
    }

    if (
        state.broadbandBand ===
        "microwave"
    ) {

        return {
            minFrequency: 1e10,
            maxFrequency: 1e12
        };
    }

    /*
     * All non-microwave selections share
     * one logarithmic electromagnetic-
     * spectrum scale.
     *
     * This lets students see where each
     * survey sits relative to the others.
     */
    return {
        minFrequency: 1e7,
        maxFrequency: 1e26
    };
}


function getHighlightRange() {

    if (
        state.broadbandBand ===
        "microwave"
    ) {

        const centerGHz =
            planckBandsGHz[
                state.microwaveBand
            ];

        const centerHz =
            centerGHz * 1e9;

        /*
         * Temporary visual width.
         *
         * This is NOT yet the real Planck
         * bandpass. We will replace this
         * with measured response curves.
         */
        return {
            min: centerHz / 1.08,
            max: centerHz * 1.08
        };
    }

    return broadbandRanges[
        state.broadbandBand
    ];
}

async function loadRelativeIntensityScales() {
    try {
        const response = await fetch(
            "data/relative_intensity_scales.json"
        );

        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}`
            );
        }

        relativeIntensityScales =
            await response.json();

        console.log(
            "Relative intensity scales loaded:",
            relativeIntensityScales
        );
    }

    catch (error) {
        console.error(
            "Could not load relative intensity scales:",
            error
        );

        relativeIntensityScales = null;
    }
}

// --------------------------------------------------
// Planck bandpass loading
// --------------------------------------------------

const planckBandpassFiles = {
    30:  "data/LFI_BANDPASS_F030.txt",
    44:  "data/LFI_BANDPASS_F044.txt",
    70:  "data/LFI_BANDPASS_F070.txt",
    100: "data/HFI_BANDPASS_F100.txt",
    143: "data/HFI_BANDPASS_F143.txt",
    217: "data/HFI_BANDPASS_F217.txt",
    353: "data/HFI_BANDPASS_F353.txt",
    545: "data/HFI_BANDPASS_F545.txt",
    857: "data/HFI_BANDPASS_F857.txt"
};

const bandpassCache = {};


async function loadPlanckBandpass(channelGHz) {

    if (bandpassCache[channelGHz]) {
        return bandpassCache[channelGHz];
    }

    const filename =
        planckBandpassFiles[channelGHz];

    const response =
        await fetch(filename);

    if (!response.ok) {
        throw new Error(
            `Could not load ${filename}`
        );
    }

    const text =
        await response.text();

    const lines =
        text.split(/\r?\n/);

    const isLFI =
        channelGHz <= 70;

    const points = [];

    for (const rawLine of lines) {

        const line =
            rawLine.trim();

        if (!line) {
            continue;
        }

        if (
            line.startsWith("FREQUENCY") ||
            line.startsWith("WAVENUMBER") ||
            line.startsWith("[")
        ) {
            continue;
        }

        const columns =
            line.split(/\s+/);

        if (columns.length < 2) {
            continue;
        }

        const x =
            Number(columns[0]);

        const transmission =
            Number(columns[1]);

        if (
            !Number.isFinite(x) ||
            !Number.isFinite(transmission)
        ) {
            continue;
        }

        let frequencyGHz;

        if (isLFI) {

            frequencyGHz = x;

        } else {

            /*
             * HFI files use wavenumber in cm^-1.
             *
             * 1 cm^-1 = 29.9792458 GHz
             */
            frequencyGHz =
                x * 29.9792458;
        }

        points.push({
            frequencyGHz,
            transmission
        });
    }

    bandpassCache[channelGHz] =
        points;

    return points;
}

async function loadDSSVisibleResponses() {

    const filename =
        "data/DSS_representative_visible_response.csv";

    const response =
        await fetch(filename);

    if (!response.ok) {

        throw new Error(
            `Could not load ${filename}`
        );
    }

    const text =
        await response.text();

    const lines =
        text
            .split(/\r?\n/)
            .slice(1);

    const grouped = {};

    for (const line of lines) {

        if (!line.trim()) {
            continue;
        }

        const columns =
            line.split(",");

        const band =
            columns[0];

        const wavelength =
            Number(columns[1]);

        const transmission =
            Number(columns[2]);

        if (
            !band ||
            !Number.isFinite(wavelength) ||
            !Number.isFinite(transmission)
        ) {
            continue;
        }

        if (!grouped[band]) {
            grouped[band] = [];
        }

        grouped[band].push({

            frequency:
                angstromsToHz(wavelength),

            response:
                transmission
        });
    }

    return Object.entries(grouped)
        .map(([band, points]) => ({

            label: band,

            points:
                normalizeResponse(points)
        }));
}

// --------------------------------------------------
// Broadband instrument responses
// --------------------------------------------------

const broadbandResponseCache = {};

const speedOfLight = 299792458;

const planckConstant =
    6.62607015e-34;

const electronVolt =
    1.602176634e-19;


/*
 * Convert wavelength in micrometers
 * to frequency in Hz.
 */
function micronsToHz(wavelengthMicrons) {

    return (
        speedOfLight /
        (wavelengthMicrons * 1e-6)
    );
}


/*
 * Convert wavelength in Angstroms
 * to frequency in Hz.
 */
function angstromsToHz(wavelengthAngstroms) {

    return (
        speedOfLight /
        (wavelengthAngstroms * 1e-10)
    );
}


/*
 * Convert photon energy in MeV
 * to frequency in Hz using E = h nu.
 */
function mevToHz(energyMeV) {

    const energyJoules =
        energyMeV *
        1e6 *
        electronVolt;

    return (
        energyJoules /
        planckConstant
    );
}


/*
 * Read a text file and extract the first
 * two numeric columns from each usable line.
 *
 * This works for the WISE RSR files and
 * the GALEX imaging-response tables.
 */
async function loadTwoColumnTable(filename) {

    if (broadbandResponseCache[filename]) {
        return broadbandResponseCache[filename];
    }

    const response =
        await fetch(filename);

    if (!response.ok) {

        throw new Error(
            `Could not load ${filename}`
        );
    }

    const text =
        await response.text();

    const rows = [];

    const lines =
        text.split(/\r?\n/);

    for (const rawLine of lines) {

        const line =
            rawLine.trim();

        if (
            !line ||
            line.startsWith("#")
        ) {
            continue;
        }

        const values =
            line
                .split(/[\s,]+/)
                .map(Number)
                .filter(Number.isFinite);

        if (values.length < 2) {
            continue;
        }

        rows.push({
            x: values[0],
            y: values[1]
        });
    }

    broadbandResponseCache[filename] =
        rows;

    return rows;
}


/*
 * Normalize any response curve so its
 * maximum is 1.
 */
function normalizeResponse(points) {

    let maxResponse = 0;

    for (const point of points) {

        if (point.response > maxResponse) {
            maxResponse = point.response;
        }
    }

    if (maxResponse <= 0) {
        return points;
    }

    return points.map(point => ({
        frequency: point.frequency,
        response:
            point.response /
            maxResponse
    }));
}


// --------------------------------------------------
// WISE
// --------------------------------------------------

async function loadWISEResponses() {

    const bands = [
        ["WISE W1", "data/RSR-W1.txt"],
        ["WISE W2", "data/RSR-W2.txt"],
        ["WISE W3", "data/RSR-W3.txt"],
        ["WISE W4", "data/RSR-W4.txt"]
    ];

    const curves = [];

    for (const [label, filename] of bands) {

        const rows =
            await loadTwoColumnTable(
                filename
            );

        const points =
            rows.map(row => ({
                frequency:
                    micronsToHz(row.x),

                response:
                    row.y
            }));

        curves.push({
            label,
            points:
                normalizeResponse(points)
        });
    }

    return curves;
}


// --------------------------------------------------
// IRAS
// --------------------------------------------------

async function loadIRASResponses() {

    const filename =
        "data/IRAS_relative_system_response.csv";

    const response =
        await fetch(filename);

    if (!response.ok) {

        throw new Error(
            `Could not load ${filename}`
        );
    }

    const text =
        await response.text();

    const lines =
        text
            .split(/\r?\n/)
            .slice(1);

    const grouped = {};

    for (const line of lines) {

        if (!line.trim()) {
            continue;
        }

        const columns =
            line.split(",");

        const band =
            Number(columns[0]);

        const wavelength =
            Number(columns[1]);

        const responseValue =
            Number(columns[2]);

        if (
            !Number.isFinite(band) ||
            !Number.isFinite(wavelength) ||
            !Number.isFinite(responseValue)
        ) {
            continue;
        }

        if (!grouped[band]) {
            grouped[band] = [];
        }

        grouped[band].push({
            frequency:
                micronsToHz(wavelength),

            response:
                responseValue
        });
    }

    return Object.entries(grouped)
        .map(([band, points]) => ({

            label:
                `IRAS ${band} μm`,

            points:
                normalizeResponse(points)
        }));
}


// --------------------------------------------------
// GALEX
// --------------------------------------------------

async function loadGALEXResponses() {

    const bands = [
        [
            "GALEX FUV",
            "data/EA-fuv_im.tbl"
        ],

        [
            "GALEX NUV",
            "data/EA-nuv_im.tbl"
        ]
    ];

    const curves = [];

    for (const [label, filename] of bands) {

        const rows =
            await loadTwoColumnTable(
                filename
            );

        const points =
            rows.map(row => ({

                /*
                 * GALEX wavelength tables
                 * are in Angstroms.
                 */
                frequency:
                    angstromsToHz(row.x),

                response:
                    row.y
            }));

        curves.push({
            label,
            points:
                normalizeResponse(points)
        });
    }

    return curves;
}


// --------------------------------------------------
// Fermi LAT
// --------------------------------------------------

async function loadFermiResponse() {

    const filename =
        "data/Fermi_LAT_representative_effective_area.csv";

    const response =
        await fetch(filename);

    if (!response.ok) {

        throw new Error(
            `Could not load ${filename}`
        );
    }

    const text =
        await response.text();

    const lines =
        text
            .split(/\r?\n/)
            .slice(1);

    const points = [];

    for (const line of lines) {

        if (!line.trim()) {
            continue;
        }

        const columns =
            line.split(",");

        const energyMeV =
            Number(columns[0]);

        const effectiveArea =
            Number(columns[1]);

        if (
            !Number.isFinite(energyMeV) ||
            !Number.isFinite(effectiveArea)
        ) {
            continue;
        }

        points.push({

            frequency:
                mevToHz(energyMeV),

            response:
                effectiveArea
        });
    }

    return [{
        label:
            "Fermi LAT representative",

        points:
            normalizeResponse(points)
    }];
}

function getCurrentRelativeIntensityScale() {

    if (
        !relativeIntensityScales ||
        !relativeIntensityScales.relative_to_global_max
    ) {
        return 1;
    }

    const scales =
        relativeIntensityScales.relative_to_global_max;


    // Microwave uses an individual Planck frequency.
    if (state.broadbandBand === "microwave") {

        return (
            scales.microwave[
                String(state.microwaveBand)
            ] ?? 1
        );
    }


    return (
        scales[state.broadbandBand]
        ?? 1
    );

}

function updateSkyIntensity() {

    if (!skyImage) return;


    // Normalized mode:
    // every image displays at its ordinary brightness.
    if (!state.relativeIntensity) {

        skyImage.style.filter =
            "brightness(1)";

        skyImage.style.opacity =
            "1";

        return;
    }

    const scale =
        getCurrentRelativeIntensityScale();


    skyImage.style.filter =
        `brightness(${scale})`;

    skyImage.style.opacity =
        "1";
}

// --------------------------------------------------
// Get response for selected broadband region
// --------------------------------------------------

async function getBroadbandResponse() {

    switch (state.broadbandBand) {

        case "infrared":

            return [
                ...await loadWISEResponses(),
                ...await loadIRASResponses()
            ];

        case "visible":

            return (
                await loadDSSVisibleResponses()
            );


        case "ultraviolet":

            return (
                await loadGALEXResponses()
            );


        case "gamma":

            return (
                await loadFermiResponse()
            );


        default:

            return [];
    }
}


async function drawSpectrum() {

    if (!spectrumCanvas) {
        return;
    }

    const ctx =
        spectrumCanvas.getContext("2d");

    if (!ctx) {
        return;
    }


    // --------------------------------------------------
    // HiDPI canvas setup
    // --------------------------------------------------

    const rect =
        spectrumCanvas.getBoundingClientRect();

    const pixelRatio =
        window.devicePixelRatio || 1;

    spectrumCanvas.width =
        Math.max(
            1,
            Math.round(
                rect.width *
                pixelRatio
            )
        );

    spectrumCanvas.height =
        Math.max(
            1,
            Math.round(
                rect.height *
                pixelRatio
            )
        );

    ctx.setTransform(
        pixelRatio,
        0,
        0,
        pixelRatio,
        0,
        0
    );

    const width =
        rect.width;

    const height =
        rect.height;

    ctx.clearRect(
        0,
        0,
        width,
        height
    );


    // --------------------------------------------------
    // Plot dimensions
    // --------------------------------------------------

    const margin = {
        left: 72,
        right: 24,
        top: 32,
        bottom: 58
    };

    const plotLeft =
        margin.left;

    const plotTop =
        margin.top;

    const plotWidth =
        width -
        margin.left -
        margin.right;

    const plotHeight =
        height -
        margin.top -
        margin.bottom;

    const plotBottom =
        plotTop +
        plotHeight;


    const view =
        getSpectrumView();

    const minFrequency =
        view.minFrequency;

    const maxFrequency =
        view.maxFrequency;

    const microwaveMode =
        state.broadbandBand === "microwave" &&
        !state.relativeIntensity;

    const relativeMode =
        state.relativeIntensity;


    // --------------------------------------------------
    // X grid
    // --------------------------------------------------

    const firstExponent =
        Math.ceil(
            log10(minFrequency)
        );

    const lastExponent =
        Math.floor(
            log10(maxFrequency)
        );

    ctx.font =
        '11px "Figtree", sans-serif';

    ctx.textAlign =
        "center";

    ctx.textBaseline =
        "top";


    for (
        let exponent = firstExponent;
        exponent <= lastExponent;
        exponent++
    ) {

        const frequency =
            Math.pow(
                10,
                exponent
            );

        const x =
            mapLogFrequencyToX(
                frequency,
                minFrequency,
                maxFrequency,
                plotLeft,
                plotWidth
            );

        ctx.strokeStyle =
            "rgba(175, 182, 213, 0.12)";

        ctx.lineWidth = 1;

        ctx.beginPath();

        ctx.moveTo(
            x,
            plotTop
        );

        ctx.lineTo(
            x,
            plotBottom
        );

        ctx.stroke();

        ctx.fillStyle =
            "rgba(175, 182, 213, 0.88)";

        const shouldLabel =
            microwaveMode ||
            (
                (
                    exponent -
                    firstExponent
                ) % 2 === 0
            );

        if (shouldLabel) {

            ctx.fillStyle =
                "rgba(175, 182, 213, 0.88)";

            ctx.fillText(
                `10${toSuperscript(
                    exponent
                )}`,
                x,
                plotBottom + 9
            );
        }
    }


    // --------------------------------------------------
    // Axes
    // --------------------------------------------------

    ctx.strokeStyle =
        "rgba(175, 182, 213, 0.55)";

    ctx.lineWidth = 1.2;

    ctx.beginPath();

    ctx.moveTo(
        plotLeft,
        plotTop
    );

    ctx.lineTo(
        plotLeft,
        plotBottom
    );

    ctx.lineTo(
        plotLeft + plotWidth,
        plotBottom
    );

    ctx.stroke();


    // --------------------------------------------------
    // Microwave:
    // CMB + real Planck response
    // --------------------------------------------------

    if (relativeMode) {

    // --------------------------------------------------
    // Global relative spectral-intensity view
    // --------------------------------------------------

    const sampleCount = 900;

    const minLog =
        log10(minFrequency);

    const maxLog =
        log10(maxFrequency);


    // Exact CMB blackbody peak in nu I_nu.
    //
    // 217 GHz is extremely close to the peak,
    // but calculate the curve maximum directly
    // so the normalization is self-contained.
    let cmbMax = 0;

    const cmbPoints = [];

    for (
        let i = 0;
        i < sampleCount;
        i++
    ) {

        const fraction =
            i / (sampleCount - 1);

        const frequency =
            Math.pow(
                10,
                minLog +
                fraction *
                (maxLog - minLog)
            );

        const intensity =
            cmbEnergyPerLogFrequency(
                frequency
            );

        cmbMax =
            Math.max(
                cmbMax,
                intensity
            );

        cmbPoints.push({
            frequency,
            intensity
        });
    }


    // --------------------------------------------------
    // Draw CMB blackbody
    // --------------------------------------------------

    ctx.beginPath();

    let cmbStarted = false;

    for (const point of cmbPoints) {

        const relativeIntensity =
            point.intensity / cmbMax;

        const x =
            mapLogFrequencyToX(
                point.frequency,
                minFrequency,
                maxFrequency,
                plotLeft,
                plotWidth
            );

        const y =
            plotBottom -
            relativeIntensity *
            plotHeight;

        if (!cmbStarted) {

            ctx.moveTo(x, y);
            cmbStarted = true;

        } else {

            ctx.lineTo(x, y);
        }
    }

    ctx.strokeStyle =
        "#609cf8";

    ctx.lineWidth = 3;

    ctx.lineJoin =
        "round";

    ctx.stroke();


    // --------------------------------------------------
    // Draw selected survey / instrument response
    // at its real relative spectral intensity
    // --------------------------------------------------

    const scale =
        getCurrentRelativeIntensityScale();


    if (
        state.broadbandBand ===
        "microwave"
    ) {

        try {

            const bandpass =
                await loadPlanckBandpass(
                    state.microwaveBand
                );

            let maxTransmission = 0;

            for (const point of bandpass) {

                maxTransmission =
                    Math.max(
                        maxTransmission,
                        point.transmission
                    );
            }

            ctx.beginPath();

            let started = false;

            for (const point of bandpass) {

                const frequency =
                    point.frequencyGHz *
                    1e9;

                const response =
                    maxTransmission > 0
                        ? point.transmission /
                          maxTransmission
                        : 0;

                const x =
                    mapLogFrequencyToX(
                        frequency,
                        minFrequency,
                        maxFrequency,
                        plotLeft,
                        plotWidth
                    );

                const y =
                    plotBottom -
                    response *
                    scale *
                    plotHeight;

                if (!started) {

                    ctx.moveTo(x, y);
                    started = true;

                } else {

                    ctx.lineTo(x, y);
                }
            }

            ctx.strokeStyle =
                "#f26522";

            ctx.lineWidth = 2.5;

            ctx.stroke();

        } catch (error) {

            console.error(
                "Relative Planck bandpass:",
                error
            );
        }

    } else if (
        state.broadbandBand ===
        "radio"
    ) {

        const frequency =
            408e6;

        const x =
            mapLogFrequencyToX(
                frequency,
                minFrequency,
                maxFrequency,
                plotLeft,
                plotWidth
            );

        const y =
            plotBottom -
            scale *
            plotHeight;

        ctx.strokeStyle =
            "#f26522";

        ctx.lineWidth = 3;

        ctx.beginPath();

        ctx.moveTo(
            x - 5,
            y
        );

        ctx.lineTo(
            x + 5,
            y
        );

        ctx.stroke();

    } else if (
        state.broadbandBand ===
        "xray"
    ) {

        const xrayBands = [
            0.25,
            0.75,
            1.5
        ];

        for (
            const energyKeV
            of xrayBands
        ) {

            const frequency =
                mevToHz(
                    energyKeV /
                    1000
                );

            const x =
                mapLogFrequencyToX(
                    frequency,
                    minFrequency,
                    maxFrequency,
                    plotLeft,
                    plotWidth
                );

            const y =
                plotBottom -
                scale *
                plotHeight;

            ctx.strokeStyle =
                "#f26522";

            ctx.lineWidth = 2;

            ctx.beginPath();

            ctx.moveTo(
                x - 4,
                y
            );

            ctx.lineTo(
                x + 4,
                y
            );

            ctx.stroke();
        }

    } else {

        try {

            const curves =
                await getBroadbandResponse();

            for (
                const curve
                of curves
            ) {

                const points =
                    [...curve.points]
                        .sort(
                            (a, b) =>
                                a.frequency -
                                b.frequency
                        );

                ctx.beginPath();

                let started = false;

                for (
                    const point
                    of points
                ) {

                    const x =
                        mapLogFrequencyToX(
                            point.frequency,
                            minFrequency,
                            maxFrequency,
                            plotLeft,
                            plotWidth
                        );

                    const y =
                        plotBottom -
                        point.response *
                        scale *
                        plotHeight;

                    if (!started) {

                        ctx.moveTo(
                            x,
                            y
                        );

                        started = true;

                    } else {

                        ctx.lineTo(
                            x,
                            y
                        );
                    }
                }

                ctx.strokeStyle =
                    "#f26522";

                ctx.lineWidth = 2;

                ctx.lineJoin =
                    "round";

                ctx.stroke();
            }

        } catch (error) {

            console.error(
                "Relative broadband response:",
                error
            );
        }
    }


    // --------------------------------------------------
    // Legend
    // --------------------------------------------------

    ctx.font =
        '600 12px "Figtree", sans-serif';

    ctx.textAlign =
        "left";

    ctx.textBaseline =
        "top";

    ctx.fillStyle =
        "#609cf8";

    ctx.fillText(
        "CMB blackbody",
        plotLeft + 10,
        plotTop + 8
    );

    ctx.fillStyle =
        "#f26522";

    ctx.fillText(
        "Selected band",
        plotLeft + 10,
        plotTop + 27
    );
}

    else if (microwaveMode) {

        const sampleCount = 700;

        const frequencies = [];
        const intensities = [];

        const minLog =
            log10(minFrequency);

        const maxLog =
            log10(maxFrequency);

        let maxIntensity = 0;

        for (
            let i = 0;
            i < sampleCount;
            i++
        ) {

            const fraction =
                i /
                (sampleCount - 1);

            const frequency =
                Math.pow(
                    10,
                    minLog +
                    fraction *
                    (maxLog - minLog)
                );

            const intensity =
                cmbEnergyPerLogFrequency(
                    frequency
                );

            frequencies.push(
                frequency
            );

            intensities.push(
                intensity
            );

            maxIntensity =
                Math.max(
                    maxIntensity,
                    intensity
                );
        }


        // CMB

        ctx.beginPath();

        for (
            let i = 0;
            i < sampleCount;
            i++
        ) {

            const x =
                mapLogFrequencyToX(
                    frequencies[i],
                    minFrequency,
                    maxFrequency,
                    plotLeft,
                    plotWidth
                );

            const y =
                plotBottom -
                (
                    intensities[i] /
                    (maxIntensity * 1.12)
                ) *
                plotHeight;

            if (i === 0) {

                ctx.moveTo(x, y);

            } else {

                ctx.lineTo(x, y);
            }
        }

        ctx.strokeStyle =
            "#609cf8";

        ctx.lineWidth = 3;

        ctx.lineJoin =
            "round";

        ctx.stroke();


        // Planck response

        try {

            const bandpass =
                await loadPlanckBandpass(
                    state.microwaveBand
                );

            let maxTransmission = 0;

            for (const point of bandpass) {

                maxTransmission =
                    Math.max(
                        maxTransmission,
                        point.transmission
                    );
            }

            ctx.beginPath();

            let started = false;

            for (const point of bandpass) {

                const frequency =
                    point.frequencyGHz *
                    1e9;

                if (
                    frequency < minFrequency ||
                    frequency > maxFrequency
                ) {
                    continue;
                }

                const x =
                    mapLogFrequencyToX(
                        frequency,
                        minFrequency,
                        maxFrequency,
                        plotLeft,
                        plotWidth
                    );

                const y =
                    plotBottom -
                    (
                        point.transmission /
                        maxTransmission
                    ) *
                    plotHeight;

                if (!started) {

                    ctx.moveTo(x, y);
                    started = true;

                } else {

                    ctx.lineTo(x, y);
                }
            }

            ctx.strokeStyle =
                "#f26522";

            ctx.lineWidth = 2.5;

            ctx.stroke();

        } catch (error) {

            console.error(
                "Planck bandpass:",
                error
            );
        }


        ctx.fillStyle =
            "#609cf8";

        ctx.font =
            '600 12px "Figtree", sans-serif';

        ctx.textAlign =
            "left";

        ctx.fillText(
            "CMB",
            plotLeft + 10,
            plotTop + 8
        );

        ctx.fillStyle =
            "#f26522";

        ctx.fillText(
            `Planck ${state.microwaveBand} GHz response`,
            plotLeft + 10,
            plotTop + 27
        );
    }


    // --------------------------------------------------
    // Radio:
    // Haslam 408 MHz
    // --------------------------------------------------

    else if (
        state.broadbandBand ===
        "radio"
    ) {

        const frequency =
            408e6;

        const x =
            mapLogFrequencyToX(
                frequency,
                minFrequency,
                maxFrequency,
                plotLeft,
                plotWidth
            );

        ctx.strokeStyle =
            "#f26522";

        ctx.lineWidth = 3;

        ctx.beginPath();

        ctx.moveTo(
            x,
            plotTop
        );

        ctx.lineTo(
            x,
            plotBottom
        );

        ctx.stroke();

        ctx.fillStyle =
            "#e8ecf4";

        ctx.font =
            '600 12px "Figtree", sans-serif';

        ctx.textAlign =
            "center";

        ctx.fillText(
            "Haslam 408 MHz",
            x,
            plotTop + 8
        );
    }


    // --------------------------------------------------
    // ROSAT X-ray composite
    // --------------------------------------------------

    else if (
        state.broadbandBand ===
        "xray"
    ) {

        const xrayBands = [
            {
                label: "0.25 keV",
                energyKeV: 0.25
            },
            {
                label: "0.75 keV",
                energyKeV: 0.75
            },
            {
                label: "1.5 keV",
                energyKeV: 1.5
            }
        ];

        ctx.font =
            '600 11px "Figtree", sans-serif';

        ctx.textAlign =
            "center";

        for (const band of xrayBands) {

            const frequency =
                mevToHz(
                    band.energyKeV /
                    1000
                );

            const x =
                mapLogFrequencyToX(
                    frequency,
                    minFrequency,
                    maxFrequency,
                    plotLeft,
                    plotWidth
                );

            ctx.strokeStyle =
                "#f26522";

            ctx.lineWidth = 2;

            ctx.beginPath();

            ctx.moveTo(
                x,
                plotTop
            );

            ctx.lineTo(
                x,
                plotBottom
            );

            ctx.stroke();

            ctx.fillStyle =
                "#e8ecf4";

            ctx.fillText(
                band.label,
                x,
                plotTop + 8
            );
        }

        ctx.fillStyle =
            "rgba(175, 182, 213, 0.8)";

        ctx.textAlign =
            "left";

        ctx.fillText(
            "ROSAT PSPC composite band centers",
            plotLeft + 10,
            plotBottom - 20
        );
    }


    // --------------------------------------------------
    // IR / UV / Gamma curves
    // --------------------------------------------------

    else {

        try {

            const curves =
                await getBroadbandResponse();

            const curveColors = [
                "#f26522",
                "#f5aa42",
                "#f6d365",
                "#d9a3ff",
                "#7bb7ff",
                "#71d7c7",
                "#ee88aa",
                "#b6e36c"
            ];

            let colorIndex = 0;

            for (const curve of curves) {

                const points =
                    [...curve.points]
                        .sort(
                            (a, b) =>
                                a.frequency -
                                b.frequency
                        );

                ctx.beginPath();

                let started = false;

                for (const point of points) {

                    if (
                        point.frequency <
                            minFrequency ||
                        point.frequency >
                            maxFrequency
                    ) {
                        continue;
                    }

                    const x =
                        mapLogFrequencyToX(
                            point.frequency,
                            minFrequency,
                            maxFrequency,
                            plotLeft,
                            plotWidth
                        );

                    const y =
                        plotBottom -
                        point.response *
                        plotHeight;

                    if (!started) {

                        ctx.moveTo(x, y);
                        started = true;

                    } else {

                        ctx.lineTo(x, y);
                    }
                }

                const color =
                    curveColors[
                        colorIndex %
                        curveColors.length
                    ];

                ctx.strokeStyle =
                    color;

                ctx.lineWidth = 2;

                ctx.lineJoin =
                    "round";

                ctx.stroke();


                // Legend

                const legendX =
                    plotLeft + 10;

                const legendY =
                    plotTop +
                    8 +
                    colorIndex * 17;

                ctx.strokeStyle =
                    color;

                ctx.beginPath();

                ctx.moveTo(
                    legendX,
                    legendY + 5
                );

                ctx.lineTo(
                    legendX + 18,
                    legendY + 5
                );

                ctx.stroke();

                ctx.fillStyle =
                    "#e8ecf4";

                ctx.font =
                    '10px "Figtree", sans-serif';

                ctx.textAlign =
                    "left";

                ctx.textBaseline =
                    "top";

                ctx.fillText(
                    curve.label,
                    legendX + 24,
                    legendY
                );

                colorIndex++;
            }

        } catch (error) {

            console.error(
                "Broadband response:",
                error
            );

            ctx.fillStyle =
                "#e8ecf4";

            ctx.font =
                '12px "Figtree", sans-serif';

            ctx.textAlign =
                "center";

            ctx.fillText(
                "Response data could not be loaded.",
                plotLeft +
                    plotWidth / 2,
                plotTop +
                    plotHeight / 2
            );
        }
    }


    // --------------------------------------------------
    // Axis titles
    // --------------------------------------------------

    ctx.fillStyle =
        "rgba(175, 182, 213, 0.95)";

    ctx.font =
        '12px "Figtree", sans-serif';

    ctx.textAlign =
        "center";

    ctx.textBaseline =
        "bottom";

    ctx.fillText(
        "Frequency (Hz)",
        plotLeft +
            plotWidth / 2,
        height - 4
    );


    if (!microwaveMode) {

        ctx.save();

        ctx.translate(
            18,
            plotTop +
                plotHeight / 2
        );

        ctx.rotate(
            -Math.PI / 2
        );

        ctx.textAlign =
            "center";

        ctx.textBaseline =
            "top";

        ctx.fillText(
            state.relativeIntensity
                ? "Relative Spectral Intensity"
                : "Relative Response",
            0,
            0
        );

        ctx.restore();
    }
}


function toSuperscript(number) {

    const map = {
        "-": "⁻",
        "0": "⁰",
        "1": "¹",
        "2": "²",
        "3": "³",
        "4": "⁴",
        "5": "⁵",
        "6": "⁶",
        "7": "⁷",
        "8": "⁸",
        "9": "⁹"
    };

    return String(number)
        .split("")
        .map(
            character =>
                map[character] ||
                character
        )
        .join("");
}


// --------------------------------------------------
// State synchronization
// --------------------------------------------------

function syncStateFromControls() {

    state.broadbandBand =
        getSelectedBroadbandBand();

    state.microwaveBand =
        getSelectedMicrowaveBand();

    state.relativeIntensity =
        Boolean(
            relativeIntensityCheckbox &&
            relativeIntensityCheckbox.checked
        );

    state.logarithmicIntensity =
        Boolean(
            logarithmicIntensityCheckbox &&
            logarithmicIntensityCheckbox.checked
        );
}

function updateBroadbandControls() {

    if (!broadbandControls) {
        return;
    }

    broadbandControls.hidden =
        state.logarithmicIntensity;
}


// --------------------------------------------------
// UI updates
// --------------------------------------------------

function updateMicrowaveControls() {

    if (!microwaveControls) {
        return;
    }

    microwaveControls.hidden =
        !state.logarithmicIntensity &&
        state.broadbandBand !== "microwave";
}


function updatePanelTitles() {

    if (skyPanelTitle) {

        if (state.broadbandBand === "microwave") {

            skyPanelTitle.textContent =
                `Milky Way — ${state.microwaveBand} GHz`;

        } else {

            skyPanelTitle.textContent =
                `Milky Way — ${formatBroadbandLabel(
                    state.broadbandBand
                )}`;
        }
    }

    if (spectrumPanelTitle) {

    if (state.relativeIntensity) {

        spectrumPanelTitle.textContent =
            "Present-Day Cosmic Photon Background — Relative Intensity";

    } else if (
        state.broadbandBand === "microwave"
    ) {

        spectrumPanelTitle.textContent =
            "CMB Spectrum and Planck Bandpass";

    } else {

        spectrumPanelTitle.textContent =
            `${formatBroadbandLabel(
                state.broadbandBand
            )} Instrument Response`;
    }
}
}

function updateSkyCredit() {

    if (!skyCredit) {
        return;
    }

    if (state.broadbandBand === "microwave") {

        skyCredit.textContent =
            microwaveCredit;

        return;
    }

    skyCredit.textContent =
        skyCredits[state.broadbandBand]
        ?? "";
}


function updateSkyImage() {

    if (!skyImage) {
        return;
    }

    let filename;

    if (
        state.broadbandBand ===
        "microwave"
    ) {

        filename =
            state.logarithmicIntensity
                ? planckLogarithmicSkyImages[
                    state.microwaveBand
                ]
                : planckSkyImages[
                    state.microwaveBand
                ];

        skyImage.alt =
            state.logarithmicIntensity
                ? `Planck ${state.microwaveBand} GHz logarithmic-intensity all-sky map`
                : `Planck ${state.microwaveBand} GHz all-sky map`;

    } else {

        filename =
            skyImages[
                state.broadbandBand
            ];

        skyImage.alt =
            `${formatBroadbandLabel(
                state.broadbandBand
            )} all-sky map`;
    }

    if (!filename) {

        skyImage.hidden = true;
        return;
    }

    skyImage.src = filename;
    skyImage.hidden = false;

    if (
        state.broadbandBand ===
        "microwave"
    ) {

        skyPanelTitle.textContent =
            state.logarithmicIntensity
                ? `Milky Way — ${state.microwaveBand} GHz — Logarithmic Intensity`
                : `Milky Way — ${state.microwaveBand} GHz`;
    }
}


function updateSpectrumPlaceholder() {

    if (!spectrumCanvas) {
        return;
    }

    /*
     * Leave the spectrum visually empty for now.
     * We will draw the synthetic spectrum in the next stage.
     */

    spectrumCanvas.dataset.broadbandBand =
        state.broadbandBand;

    spectrumCanvas.dataset.microwaveBand =
        String(state.microwaveBand);

    spectrumCanvas.dataset.relativeIntensity =
        String(state.relativeIntensity);
}


function updatePageDataAttributes() {

    /*
     * Useful later for CSS and debugging.
     */

    document.documentElement.dataset.broadbandBand =
        state.broadbandBand;

    document.documentElement.dataset.microwaveBand =
        String(state.microwaveBand);

    document.documentElement.dataset.relativeIntensity =
        String(state.relativeIntensity);

    document.documentElement.dataset.logarithmicIntensity =
        String(state.logarithmicIntensity);
}

function updateExperience() {

    syncStateFromControls();

    updateBroadbandControls();
    updateMicrowaveControls();
    updatePanelTitles();
    updateSkyImage();
    updateSkyIntensity();
    updateSkyCredit();
    updateSpectrumPlaceholder();
    updatePageDataAttributes();

    drawSpectrum();

    console.log(
        "Hidden Universe state:",
        { ...state }
    );
}


// --------------------------------------------------
// Events
// --------------------------------------------------

if (logarithmicIntensityCheckbox) {

    logarithmicIntensityCheckbox.addEventListener(
        "change",
        function () {

            if (
                logarithmicIntensityCheckbox.checked
            ) {

                /*
                 * Logarithmic Intensity is
                 * a Planck-only comparison.
                 */
                const microwaveBroadbandInput =
                    document.querySelector(
                        'input[name="broadbandBand"][value="microwave"]'
                    );

                if (microwaveBroadbandInput) {
                    microwaveBroadbandInput.checked = true;
                }

                if (relativeIntensityCheckbox) {
                    relativeIntensityCheckbox.checked = false;
                }
            }

            updateExperience();
        }
    );
}

broadbandInputs.forEach(function (input) {

    input.addEventListener(
        "change",
        updateExperience
    );
});


microwaveInputs.forEach(function (input) {

    input.addEventListener(
        "change",
        updateExperience
    );
});


if (relativeIntensityCheckbox) {

    relativeIntensityCheckbox.addEventListener(
        "change",
        function () {

            if (
                relativeIntensityCheckbox.checked &&
                logarithmicIntensityCheckbox
            ) {

                logarithmicIntensityCheckbox.checked = false;
            }

            updateExperience();
        }
    );
}


window.addEventListener(
    "resize",
    drawSpectrum
);


// --------------------------------------------------
// Initialize
// --------------------------------------------------

loadRelativeIntensityScales()
    .then(() => {
        updateExperience();
    });