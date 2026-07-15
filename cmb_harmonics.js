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

let seed = 12345;
let modeMaps = [];
let coefficients = [];
let mask = [];
let planckSpectrum = [];
let planckPower = new Float64Array(3001);
let planckLoaded = false;

const width = canvas.width;
const height = canvas.height;
const maxLPrecomputed = parseInt(slider.max);

// -----------------------------
// Random numbers
// -----------------------------

function random() {
    seed = (1664525 * seed + 1013904223) % 4294967296;
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

    // First pass: find the largest absolute Y_lm value.
    // This lets us normalize the colors across the full blue-to-orange range.
    let maxAbsY = 0;

    for (let i = 0; i <= thetaSteps; i++) {
        let theta = Math.PI * i / thetaSteps;

        for (let j = 0; j <= phiSteps; j++) {
            let phi = 2 * Math.PI * j / phiSteps;

            let y = sphericalHarmonicReal(l, m, theta, phi);

            if (Math.abs(y) > maxAbsY) {
                maxAbsY = Math.abs(y);
            }
        }
    }

    if (maxAbsY === 0) {
        maxAbsY = 1;
    }

    // Second pass: build the 3D surface and assign matching colors.
    for (let i = 0; i <= thetaSteps; i++) {
        let theta = Math.PI * i / thetaSteps;

        for (let j = 0; j <= phiSteps; j++) {
            let phi = 2 * Math.PI * j / phiSteps;

            let y = sphericalHarmonicReal(l, m, theta, phi);

            // Shape is based on the magnitude of Y_lm.
            let r = 0.45 + 1.5 * Math.abs(y);

            let x3 = r * Math.sin(theta) * Math.cos(phi);
            let y3 = r * Math.cos(theta);
            let z3 = r * Math.sin(theta) * Math.sin(phi);

            vertices.push(x3, y3, z3);

            // Color is based on the signed value of Y_lm.
            let normalizedY = y / maxAbsY;
            let rgb = colorMap(normalizedY);

            colors.push(
                rgb[0] / 255,
                rgb[1] / 255,
                rgb[2] / 255
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
        shininess: 60,
        side: THREE.DoubleSide
    });

    orbitalMesh = new THREE.Mesh(geometry, material);
    orbitalMesh.rotation.x = 0.35;
    orbitalMesh.rotation.y = -0.6;

    orbitalScene.add(orbitalMesh);
    orbitalRenderer.render(orbitalScene, orbitalCamera);
}

// -----------------------------
// Precompute geometry + modes
// -----------------------------

function buildMaskAndCoordinates() {

    mask = new Array(width * height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {

            let nx = (x - width / 2) / (width / 2);
            let ny = (y - height / 2) / (height / 2);

            let inside = (nx * nx + ny * ny) <= 1;

            let i = y * width + x;

            if (!inside) {
                mask[i] = null;
                continue;
            }

            let phi = Math.PI * nx;
            let theta = Math.PI * (ny + 1) / 2;

            mask[i] = {
                theta: theta,
                phi: phi
            };
        }
    }
}

function precomputeModes() {

    buildMaskAndCoordinates();

    modeMaps = [];

    for (let l = 1; l <= maxLPrecomputed; l++) {

        let ellModes = [];

        for (let m = -l; m <= l; m++) {

            let arr = new Float64Array(width * height);

            let maxAbs = 0;

            for (let i = 0; i < width * height; i++) {

                if (mask[i] === null) {
                    arr[i] = 0;
                    continue;
                }

                let theta = mask[i].theta;
                let phi = mask[i].phi;

                let value = sphericalHarmonicReal(l, m, theta, phi);

                arr[i] = value;

                if (Math.abs(value) > maxAbs) {
                    maxAbs = Math.abs(value);
                }
            }

            // Normalize each mode image so no single mode dominates
            if (maxAbs > 0) {
                for (let i = 0; i < arr.length; i++) {
                    arr[i] /= maxAbs;
                }
            }

            ellModes.push({
                l: l,
                m: m,
                values: arr
            });
        }

        modeMaps[l] = ellModes;
    }
}

// -----------------------------
// Coefficients
// -----------------------------

function generateCoefficients() {

    coefficients = [];

    for (let l = 1; l <= maxLPrecomputed; l++) {

        let ellCoeffs = [];
        let power = planckPower[l] || 0;

        // Planck data does not include ℓ = 1 because the observed dipole is removed.
        // Add a teaching-only dipole so ℓ = 1 is visible.
        if (l === 1) {
            power = planckPower[2] || 1;
}

let amp = Math.sqrt(power);

        for (let m = -l; m <= l; m++) {
            ellCoeffs.push(gaussianRandom() * amp);
        }

        coefficients[l] = ellCoeffs;
    }
}

// -----------------------------
// Draw
// -----------------------------

function drawSky() {

    let lmax = parseInt(slider.value);
    lmaxValue.textContent = lmax;

    let image = ctx.createImageData(width, height);
    let data = image.data;

    let values = new Float64Array(width * height);
    let maxAbs = 0;

    let startL = singleEllCheckbox.checked ? lmax : 1;
    let endL = lmax;

    for (let l = startL; l <= endL; l++) {

        let ellModes = modeMaps[l];
        let ellCoeffs = coefficients[l];

        for (let mi = 0; mi < ellModes.length; mi++) {

            let coeff = ellCoeffs[mi];
            let mode = ellModes[mi].values;

            for (let i = 0; i < values.length; i++) {
                values[i] += coeff * mode[i];
            }
        }
    }

    for (let i = 0; i < values.length; i++) {
        if (mask[i] === null) continue;
        maxAbs = Math.max(maxAbs, Math.abs(values[i]));
    }

    if (maxAbs === 0) maxAbs = 1;

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

function updateMSlider() {
    let l = parseInt(slider.value);

    mSlider.min = -l;
    mSlider.max = l;

    if (parseInt(mSlider.value) < -l) mSlider.value = -l;
    if (parseInt(mSlider.value) > l) mSlider.value = l;

    mValue.textContent = mSlider.value;
}

// -----------------------------
// Events
// -----------------------------

slider.addEventListener("input", function () {

    lmaxValue.textContent = slider.value;

    updateMSlider();
    drawOrbital();
    drawSky();

});

mSlider.addEventListener("input", function() {
    mValue.textContent = mSlider.value;
    drawOrbital();
});

singleEllCheckbox.addEventListener("change", function() {
    drawOrbital();
    drawSky();
});

newSeedButton.addEventListener("click", function() {
    seed = Math.floor(Math.random() * 4294967296);
    generateCoefficients();
    drawOrbital();
    drawSky();
});

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

    planckSpectrum = text
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

    console.log("Loaded Planck spectrum rows:", planckSpectrum.length);
    console.log(planckSpectrum.slice(0, 5));

    // Build a fast lookup table indexed by ℓ
    for (const row of planckSpectrum) {

        let ell = Math.round(row.ell);

        if (ell >= 0 && ell < planckPower.length) {
            planckPower[ell] = row.Dl;
        }
    }

console.log("Power at ℓ=2:", planckPower[2]);
console.log("Power at ℓ=220:", planckPower[220]);

planckLoaded = true;
}

loadPlanckSpectrum().then(function() {
    precomputeModes();
    generateCoefficients();
    setupOrbitalViewer();
    updateMSlider();
    drawOrbital();
    drawSky();
});