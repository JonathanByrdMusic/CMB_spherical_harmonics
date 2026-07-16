const orbitalViewer = document.getElementById("orbitalViewer");

let orbitalScene;
let orbitalCamera;
let orbitalRenderer;
let orbitalMesh;

const singleEllCheckbox = document.getElementById("singleEllCheckbox");
const canvas = document.getElementById("cmbCanvas");
const ctx = canvas.getContext("2d");

const slider = document.getElementById("lmaxSlider");
const lmaxValue = document.getElementById("lmaxValue");
const newSeedButton = document.getElementById("newSeedButton");

const mSlider = document.getElementById("mSlider");
const mValue = document.getElementById("mValue");

const buildUniverseButton =
    document.getElementById("buildUniverseButton");

const skyTitle =
    document.getElementById("skyTitle");

let buildTimer = null;
let buildIsRunning = false;
let sliderDrawTimer = null;

let seed = 12345;
let modeMaps = [];
let coefficients = [];
let mask = [];
let planckPower = new Float64Array(3001);

const width = canvas.width;
const height = canvas.height;
const maxL = Number(slider.max);

// -----------------------------
// Random numbers
// -----------------------------

function random() {
    seed =
        (Math.imul(1664525, seed) + 1013904223) >>> 0;

    return seed / 4294967296;
}

function gaussianRandom() {
    let u = 1 - random();
    let v = 1 - random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

// -----------------------------
// Approximate spherical harmonics
// -----------------------------

function factorial(n) {
    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return result;
}

function doubleFactorial(n) {
    if (n <= 0) return 1;

    let result = 1;
    for (let i = n; i >= 1; i -= 2) {
        result *= i;
    }

    return result;
}

function associatedLegendre(l, m, x) {

    m = Math.abs(m);

    if (m > l) return 0;

    let pmm = Math.pow(-1, m) *
              doubleFactorial(2 * m - 1) *
              Math.pow(Math.max(0, 1 - x * x), m / 2);

    if (l === m) return pmm;

    let pmmp1 = x * (2 * m + 1) * pmm;

    if (l === m + 1) return pmmp1;

    let pll = 0;

    for (let n = m + 2; n <= l; n++) {
        pll = ((2 * n - 1) * x * pmmp1 - (n + m - 1) * pmm) / (n - m);
        pmm = pmmp1;
        pmmp1 = pll;
    }

    return pll;
}

function sphericalHarmonicReal(l, m, theta, phi) {

    let absM = Math.abs(m);
    let x = Math.cos(theta);

    let norm = Math.sqrt(
        ((2 * l + 1) / (4 * Math.PI)) *
        (factorial(l - absM) / factorial(l + absM))
    );

    let legendre = associatedLegendre(l, absM, x);

    if (m > 0) {
        return Math.sqrt(2) * norm * legendre * Math.cos(absM * phi);
    } else if (m < 0) {
        return Math.sqrt(2) * norm * legendre * Math.sin(absM * phi);
    } else {
        return norm * legendre;
    }
}

// -----------------------------
// Color map
// -----------------------------

function colorMap(v) {
    v = Math.max(-1, Math.min(1, v));

    let r, g, b;

    if (v < 0) {
        let t = v + 1;

        r = 20 + 180 * t;
        g = 80 + 160 * t;
        b = 255;
    } else {
        let t = v;

        r = 255;
        g = 240 - 120 * t;
        b = 180 - 160 * t;
    }

    return [r, g, b];
}

function orbitalColorMap(v) {

    v = Math.max(-1, Math.min(1, v));

    // Rich ultramarine
    const cold = [0.00, 0.18, 0.95];

    // Warm cream near the nodal surface
    const neutral = [1.00, 0.88, 0.58];

    // Vivid orange
    const hot = [1.00, 0.38, 0.00];

    let start;
    let end;
    let t;

    if (v < 0) {
        start = cold;
        end = neutral;
        t = v + 1;
    } else {
        start = neutral;
        end = hot;
        t = v;
    }

    return [
        start[0] + (end[0] - start[0]) * t,
        start[1] + (end[1] - start[1]) * t,
        start[2] + (end[2] - start[2]) * t
    ];
}

function setupOrbitalViewer() {

    orbitalScene = new THREE.Scene();

    orbitalCamera = new THREE.PerspectiveCamera(
        35,
        orbitalViewer.clientWidth / orbitalViewer.clientHeight,
        0.1,
        100
    );

    orbitalCamera.position.z = 5;

    orbitalRenderer = new THREE.WebGLRenderer({ antialias: true });
    orbitalRenderer.setSize(orbitalViewer.clientWidth, orbitalViewer.clientHeight);
    orbitalRenderer.setClearColor(0x000000);

    orbitalViewer.appendChild(orbitalRenderer.domElement);

    let light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(2, 2, 3);
    orbitalScene.add(light);

    let ambient = new THREE.AmbientLight(0xffffff, 1.7);
    orbitalScene.add(ambient);
}

function drawOrbital() {

    if (!orbitalRenderer) return;

    let l = parseInt(slider.value);
    let m = parseInt(mSlider.value);

    if (orbitalMesh) {
        orbitalScene.remove(orbitalMesh);
        orbitalMesh.geometry.dispose();
        orbitalMesh.material.dispose();
    }

    let geometry = new THREE.BufferGeometry();

    let vertices = [];
    let colors = [];
    let indices = [];

    let thetaSteps = 80;
    let phiSteps = 160;

    for (let i = 0; i <= thetaSteps; i++) {
        let theta = Math.PI * i / thetaSteps;

        for (let j = 0; j <= phiSteps; j++) {
            let phi = 2 * Math.PI * j / phiSteps;

            let y = sphericalHarmonicReal(l, m, theta, phi);

            let r = 0.45 + 1.5 * Math.abs(y);

            let x3 = r * Math.sin(theta) * Math.cos(phi);
            let y3 = r * Math.cos(theta);
            let z3 = r * Math.sin(theta) * Math.sin(phi);

            vertices.push(x3, y3, z3);

            let normalizedY = Math.tanh(3 * y);
let rgb = orbitalColorMap(normalizedY);

colors.push(
    rgb[0],
    rgb[1],
    rgb[2]
);
        }
    }

    for (let i = 0; i < thetaSteps; i++) {
        for (let j = 0; j < phiSteps; j++) {
            let a = i * (phiSteps + 1) + j;
            let b = a + phiSteps + 1;

            indices.push(a, b, a + 1);
            indices.push(b, b + 1, a + 1);
        }
    }

    geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(vertices, 3)
    );

    geometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(colors, 3)
    );

    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    let material = new THREE.MeshPhongMaterial({
    vertexColors: true,
    shininess: 100,
    side: THREE.DoubleSide
});

    orbitalMesh = new THREE.Mesh(geometry, material);
    orbitalMesh.rotation.x = 0.35;
    orbitalMesh.rotation.y = -0.6;

    orbitalScene.add(orbitalMesh);

orbitalRenderer.render(orbitalScene, orbitalCamera);
}

function buildMaskAndCoordinates() {

    mask = new Array(width * height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {

            // Normalize the canvas to an ellipse:
            // nx runs approximately from -1 to +1
            // ny runs approximately from -1 to +1
            let nx = (x - width / 2) / (width / 2);
            let ny = (height / 2 - y) / (height / 2);

            let inside = (nx * nx + ny * ny) <= 1;

            let i = y * width + x;

            if (!inside) {
                mask[i] = null;
                continue;
            }

            /*
             * Inverse Mollweide projection
             *
             * Canvas coordinates correspond to:
             *
             * X = 2√2 nx
             * Y = √2 ny
             *
             * Since Y = √2 sin(gamma),
             * gamma = asin(ny).
             */

            let gamma = Math.asin(
                Math.max(-1, Math.min(1, ny))
            );

            /*
             * Recover latitude:
             *
             * sin(latitude)
             *     = [2gamma + sin(2gamma)] / pi
             */

            let sinLatitude =
                (2 * gamma + Math.sin(2 * gamma)) / Math.PI;

            sinLatitude = Math.max(
                -1,
                Math.min(1, sinLatitude)
            );

            let latitude = Math.asin(sinLatitude);

            /*
             * Recover longitude:
             *
             * longitude = pi nx / cos(gamma)
             */

            let cosGamma = Math.cos(gamma);
            let longitude;

            if (Math.abs(cosGamma) < 1e-10) {
                // At the poles, longitude is physically irrelevant.
                longitude = 0;
            } else {
                longitude = Math.PI * nx / cosGamma;
            }

            // Numerical protection near the curved boundary.
            longitude = Math.max(
                -Math.PI,
                Math.min(Math.PI, longitude)
            );

            // sphericalHarmonicReal() expects colatitude theta:
            // theta = 0 at the north pole and pi at the south pole.
            let theta = Math.PI / 2 - latitude;
            let phi = longitude;

            mask[i] = {
                theta: theta,
                phi: phi
            };
        }
    }
}

function initializeModeCache() {
    buildMaskAndCoordinates();
    modeMaps = [];
}

function computeModesForL(l) {

    // Already calculated—reuse the cached result.
    if (modeMaps[l]) {
        return;
    }

    let ellModes = [];

    for (let m = -l; m <= l; m++) {

        // Float32 uses half as much memory as Float64 and is
        // more than precise enough for screen rendering.
        let arr = new Float32Array(width * height);

        for (let i = 0; i < width * height; i++) {

            if (mask[i] === null) {
                arr[i] = 0;
                continue;
            }

            let theta = mask[i].theta;
            let phi = mask[i].phi;

            arr[i] = sphericalHarmonicReal(
                l,
                m,
                theta,
                phi
            );
        }

        ellModes.push({
            l: l,
            m: m,
            values: arr
        });
    }

    modeMaps[l] = ellModes;
}

function ensureModesThrough(lmax) {

    for (let l = 1; l <= lmax; l++) {
        computeModesForL(l);
    }
}

// -----------------------------
// Coefficients
// -----------------------------

function generateCoefficients() {

    coefficients = [];

    for (let l = 1; l <= maxL; l++) {

        let ellCoeffs = [];

        // Planck table stores D_l
        let Dl = planckPower[l] || 0;

        // Convert to C_l
        let Cl = 0;

        if (l > 0) {
            Cl = (2 * Math.PI * Dl) / (l * (l + 1));
        }

        // Planck removes the observed dipole, so borrow the quadrupole
        // simply so ℓ = 1 has a visible amplitude.
        if (l === 1) {
            let D2 = planckPower[2] || 1;
            Cl = (2 * Math.PI * D2) / (2 * 3);
        }

        let amp = Math.sqrt(Math.max(Cl, 0));

        for (let m = -l; m <= l; m++) {
            ellCoeffs.push(gaussianRandom() * amp);
        }

        coefficients[l] = ellCoeffs;
    }
}

// -----------------------------
// Draw
// -----------------------------

function drawSky(temporaryLmax = null) {

    let lmax =
        temporaryLmax === null
            ? parseInt(slider.value)
            : temporaryLmax;

    let image = ctx.createImageData(width, height);
    let data = image.data;

    let values = new Float32Array(width * height);
    let maxAbs = 0;

    let startL = singleEllCheckbox.checked ? lmax : 1;
    let endL = lmax;

    let selectedM = parseInt(mSlider.value);

    // First build the complete unsmoothed field.
    for (let l = startL; l <= endL; l++) {

        let ellModes = modeMaps[l];
        let ellCoeffs = coefficients[l];

        if (singleEllCheckbox.checked) {

            let mi = selectedM + l;

            if (ellModes[mi]) {
                let mode = ellModes[mi].values;

                for (let i = 0; i < values.length; i++) {
                    values[i] += mode[i];
                }
            }

        } else {

            for (let mi = 0; mi < ellModes.length; mi++) {

                let coeff = ellCoeffs[mi];
                let mode = ellModes[mi].values;

                for (let i = 0; i < values.length; i++) {
                    values[i] += coeff * mode[i];
                }
            }
        }
    }

    // Find the largest displayed magnitude for the color stretch.
    for (let i = 0; i < values.length; i++) {

        if (mask[i] === null) continue;

        maxAbs = Math.max(
            maxAbs,
            Math.abs(values[i])
        );
    }

    if (maxAbs === 0) {
        maxAbs = 1;
    }

    // Convert the field into canvas colors.
    for (let i = 0; i < values.length; i++) {

        let p = 4 * i;

        if (mask[i] === null) {
            data[p] = 0;
            data[p + 1] = 0;
            data[p + 2] = 0;
            data[p + 3] = 255;
            continue;
        }

        let v = values[i] / maxAbs;
        let rgb = colorMap(v);

        data[p] = rgb[0];
        data[p + 1] = rgb[1];
        data[p + 2] = rgb[2];
        data[p + 3] = 255;
    }

    ctx.putImageData(image, 0, 0);
}

function startBuildUniverse() {

    if (sliderDrawTimer !== null) {
    clearTimeout(sliderDrawTimer);
    sliderDrawTimer = null;
}

    if (buildIsRunning) {
        stopBuildUniverse();
        return;
    }

    buildIsRunning = true;
    buildUniverseButton.textContent = "Stop building";

    // The animation should show the cumulative universe,
    // not a single selected harmonic.
    singleEllCheckbox.checked = false;

    const finalL = parseInt(slider.value);

    let currentL = 1;

    function buildNextShell() {

        computeModesForL(currentL);

        skyTitle.textContent =
            `Building universe: ℓ = ${currentL}`;

        drawSky(currentL);

        if (currentL >= finalL) {
            stopBuildUniverse();
            skyTitle.textContent =
                `Accumulated sky through ℓ = ${finalL}`;
            return;
        }

        currentL++;

        buildTimer = setTimeout(
            buildNextShell,
            450
        );
    }

    buildNextShell();
}

function cancelBuildIfRunning() {
    if (buildIsRunning) {
        stopBuildUniverse();
        skyTitle.textContent = "Accumulated sky";
    }
}

function stopBuildUniverse() {

    buildIsRunning = false;
    buildUniverseButton.textContent =
        "Build universe";

    if (buildTimer !== null) {
        clearTimeout(buildTimer);
        buildTimer = null;
    }
}

function updateMSlider() {
    let l = parseInt(slider.value);

    mSlider.min = -l;
    mSlider.max = l;

    if (parseInt(mSlider.value) < -l) mSlider.value = -l;
    if (parseInt(mSlider.value) > l) mSlider.value = l;

    mValue.textContent = mSlider.value;
}

function updateSliderFill(sliderElement) {
    const min = Number(sliderElement.min);
    const max = Number(sliderElement.max);
    const value = Number(sliderElement.value);

    const percentage =
        ((value - min) / (max - min)) * 100;

    sliderElement.style.setProperty(
        "--slider-background",
        `linear-gradient(
            to right,
            var(--slider-color) 0%,
            var(--slider-color) ${percentage}%,
            #eeeeee ${percentage}%,
            #eeeeee 100%
        )`
    );
}

function updateSkyTitle() {
    if (singleEllCheckbox.checked) {
        skyTitle.textContent =
            `Selected harmonic: (ℓ, m) = (${slider.value}, ${mSlider.value})`;
    } else {
        skyTitle.textContent =
            `Accumulated sky through ℓ = ${slider.value}`;
    }
}

// -----------------------------
// Events
// -----------------------------

slider.addEventListener("input", function () {
    cancelBuildIfRunning();

    lmaxValue.textContent = slider.value;

    updateMSlider();

    updateSliderFill(slider);
    updateSliderFill(mSlider);

    // The single orbital is inexpensive enough to update immediately.
    drawOrbital();

    skyTitle.textContent =
    `Calculating sky through ℓ = ${slider.value}`;

    // Cancel any pending expensive sky calculation.
    if (sliderDrawTimer !== null) {
        clearTimeout(sliderDrawTimer);
    }

    // Wait until the slider has paused before computing missing modes.
    sliderDrawTimer = setTimeout(function () {
        const selectedL = parseInt(slider.value);

        ensureModesThrough(selectedL);
        drawSky();
        updateSkyTitle();

        sliderDrawTimer = null;
    }, 150);
});

mSlider.addEventListener("input", function () {
    cancelBuildIfRunning();
    mValue.textContent = mSlider.value;
    updateSliderFill(mSlider);
    drawOrbital();
    drawSky();
});

singleEllCheckbox.addEventListener("change", function() {
    cancelBuildIfRunning();
    drawSky();
});

newSeedButton.addEventListener("click", function() {
    cancelBuildIfRunning();

    seed = Math.floor(Math.random() * 4294967296);
    generateCoefficients();
    drawSky();
});

buildUniverseButton.addEventListener(
    "click",
    startBuildUniverse
);

// -----------------------------
// Initialize
// -----------------------------

async function loadPlanckSpectrum() {
    let response = await fetch("data/COM_PowerSpect_CMB-TT-full_R3.01.txt");

    if (!response.ok) {
        console.error("Could not load Planck file:", response.status);
        return;
    }

    let text = await response.text();

    const planckSpectrum = text
        .split("\n")
        .map(line => line.trim())
        .filter(line => line && !line.startsWith("#"))
        .map(line => {
            let parts = line.split(/\s+/).map(Number);

            return {
                ell: parts[0],
                Dl: parts[1]
            };
        })
        .filter(row =>
            Number.isFinite(row.ell) &&
            Number.isFinite(row.Dl) &&
            row.ell > 0 &&
            row.Dl >= 0
        );

    // Build a fast lookup table indexed by ℓ
    for (const row of planckSpectrum) {

        let ell = Math.round(row.ell);

        if (ell >= 0 && ell < planckPower.length) {
            planckPower[ell] = row.Dl;
        }
    }

}

loadPlanckSpectrum().then(function() {

    // Build only the Mollweide coordinate lookup initially.
    initializeModeCache();

    // The page starts at ℓ = 1, so initially calculate only ℓ = 1.
    ensureModesThrough(parseInt(slider.value));

    generateCoefficients();
    setupOrbitalViewer();

    updateMSlider();
    updateSliderFill(slider);
    updateSliderFill(mSlider);

    drawOrbital();
    drawSky();
});