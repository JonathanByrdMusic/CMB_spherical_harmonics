"use strict";

const FINAL_AGE_YEARS = 454;
const YEARS_PER_SECOND = 150;
const ANIMATION_DURATION_MS =
    (FINAL_AGE_YEARS / YEARS_PER_SECOND) * 1000;

const viewer = document.getElementById("supernovaViewer");
const remnantTitle = document.getElementById("remnantTitle");

const lmaxSlider = document.getElementById("lmaxSlider");
const lmaxValue = document.getElementById("lmaxValue");

const mSlider = document.getElementById("mSlider");
const mValue = document.getElementById("mValue");

const distortionTitle = document.getElementById("distortionTitle");

/*
 * If your checkbox id is still "singleEllCheckbox"
 * in the HTML, change the line below accordingly.
 */
const singleModeCheckbox =
    document.getElementById("singleModeCheckbox");

const explodeButton = document.getElementById("explodeButton");
const newSeedButton = document.getElementById("newSeedButton");

let animationFrameId = null;
let animationStartTime = null;
let randomCoefficients = {};

let finalDistortionField = null;

let opacityLowCoefficients = {};
let opacityHighCoefficients = {};

let renderedFrameCount = 0;

const opacityCanvas = document.createElement("canvas");
opacityCanvas.width = 384;
opacityCanvas.height = 192;

const opacityContext = opacityCanvas.getContext("2d");

const opacityTexture = new THREE.CanvasTexture(opacityCanvas);
opacityTexture.wrapS = THREE.RepeatWrapping;
opacityTexture.wrapT = THREE.ClampToEdgeWrapping;

let sliderUpdateTimer = null;

const SLIDER_UPDATE_DELAY_MS = 90;

/*
 * Three.js scene
 */

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
    35,
    1,
    0.1,
    100
);

camera.position.set(0, 0, 6);

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
});

renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, 1.5)
);

viewer.appendChild(renderer.domElement);

/*
 * Lighting
 */

const ambientLight = new THREE.AmbientLight(
    0xffffff,
    1.7
);

scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(
    0xffffff,
    2.2
);

directionalLight.position.set(3, 2, 5);
scene.add(directionalLight);

/*
 * Initial spherical remnant
 */

const geometry = new THREE.SphereGeometry(
    1,
    96,
    48
);

const basePositions =
    geometry.attributes.position.array.slice();

const material = new THREE.MeshStandardMaterial({
    color: 0xff7a22,
    emissive: 0x7a1800,
    emissiveIntensity: 0.7,
    roughness: 0.8,
    metalness: 0,
    transparent: true,
    opacity: 0.92,
    alphaMap: opacityTexture,
    alphaTest: 0.12,
    depthWrite: false,
    side: THREE.DoubleSide
});

const remnant = new THREE.Mesh(
    geometry,
    material
);

const filamentMaterial =
    new THREE.MeshBasicMaterial({
        color: 0xffb067,
        wireframe: true,
        transparent: true,
        opacity: 0,
        depthWrite: false
    });

const filaments = new THREE.Mesh(
    geometry,
    filamentMaterial
);

remnant.rotation.set(-0.35, 0.8, 0.1);
filaments.rotation.copy(remnant.rotation);

scene.add(remnant);
scene.add(filaments);

const particleMaterial =
    new THREE.PointsMaterial({
        color: 0xffd0a0,
        size: 0.018,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0,
        depthWrite: false
    });

const particles = new THREE.Points(
    geometry,
    particleMaterial
);

particles.rotation.copy(remnant.rotation);

scene.add(particles);

/*
 * Math utilities
 */

const factorialCache = [1];

function factorial(n) {
    if (factorialCache[n] !== undefined) {
        return factorialCache[n];
    }

    let result =
        factorialCache[factorialCache.length - 1];

    for (
        let i = factorialCache.length;
        i <= n;
        i += 1
    ) {
        result *= i;
        factorialCache[i] = result;
    }

    return factorialCache[n];
}

const normalizationCache = new Map();

function getNormalization(ell, absM) {
    const key = `${ell},${absM}`;

    if (normalizationCache.has(key)) {
        return normalizationCache.get(key);
    }

    const value = Math.sqrt(
        ((2 * ell + 1) / (4 * Math.PI))
        *
        (
            factorial(ell - absM)
            /
            factorial(ell + absM)
        )
    );

    normalizationCache.set(key, value);

    return value;
}

function associatedLegendre(ell, m, x) {
    let pmm = 1;

    if (m > 0) {
        const root = Math.sqrt(
            Math.max(0, 1 - x * x)
        );

        let factor = 1;

        for (let i = 1; i <= m; i += 1) {
            pmm *= -factor * root;
            factor += 2;
        }
    }

    if (ell === m) {
        return pmm;
    }

    let pmmp1 = x * (2 * m + 1) * pmm;

    if (ell === m + 1) {
        return pmmp1;
    }

    let pll = 0;

    for (let currentEll = m + 2;
        currentEll <= ell;
        currentEll += 1) {

        pll = (
            (2 * currentEll - 1) * x * pmmp1
            -
            (currentEll + m - 1) * pmm
        ) / (currentEll - m);

        pmm = pmmp1;
        pmmp1 = pll;
    }

    return pll;
}

function realSphericalHarmonic(
    ell,
    m,
    theta,
    phi
) {
    const absM = Math.abs(m);

    const normalization =
    getNormalization(ell, absM);

    const legendre = associatedLegendre(
        ell,
        absM,
        Math.cos(theta)
    );

    if (m === 0) {
        return normalization * legendre;
    }

    if (m > 0) {
        return (
            Math.sqrt(2)
            *
            normalization
            *
            legendre
            *
            Math.cos(absM * phi)
        );
    }

    return (
        Math.sqrt(2)
        *
        normalization
        *
        legendre
        *
        Math.sin(absM * phi)
    );
}

/*
 * Random coefficient utilities
 */

function randomGaussian() {
    let u = 0;
    let v = 0;

    while (u === 0) {
        u = Math.random();
    }

    while (v === 0) {
        v = Math.random();
    }

    return Math.sqrt(-2 * Math.log(u))
        * Math.cos(2 * Math.PI * v);
}

function coefficientKey(ell, m) {
    return `${ell},${m}`;
}

function generateRandomCoefficients() {
    randomCoefficients = {};

    const maxGeneratedEll = Number(lmaxSlider.max);
    const spectralFalloffPower = 1.15;

    for (let ell = 1; ell <= maxGeneratedEll; ell += 1) {
        for (let m = -ell; m <= ell; m += 1) {
            const key = coefficientKey(ell, m);

            randomCoefficients[key] =
                randomGaussian()
                /
                Math.pow(ell + 1, spectralFalloffPower);
        }
    }
}

/*
 * Distortion field
 */

function evaluateDistortionField(theta, phi) {
    const selectedEll = Number(lmaxSlider.value);
    const selectedM = Number(mSlider.value);

    if (singleModeCheckbox.checked) {
        return realSphericalHarmonic(
            selectedEll,
            selectedM,
            theta,
            phi
        );
    }

    let fieldValue = 0;

    for (let ell = 1; ell <= selectedEll; ell += 1) {
        for (let m = -ell; m <= ell; m += 1) {
            const key = coefficientKey(ell, m);
            const coeff = randomCoefficients[key] || 0;

            fieldValue +=
                coeff
                *
                realSphericalHarmonic(
                    ell,
                    m,
                    theta,
                    phi
                );
        }
    }

    return fieldValue;
}

function precomputeDistortionField() {
    const vertexCount =
        basePositions.length / 3;

    finalDistortionField =
        new Float32Array(vertexCount);

    for (
        let vertexIndex = 0;
        vertexIndex < vertexCount;
        vertexIndex += 1
    ) {
        const i = vertexIndex * 3;

        const baseX = basePositions[i];
        const baseY = basePositions[i + 1];
        const baseZ = basePositions[i + 2];

        const baseRadius = Math.sqrt(
            baseX * baseX
            +
            baseY * baseY
            +
            baseZ * baseZ
        );

        /*
         * y is the polar axis.
         */
        const theta = Math.acos(
            Math.max(
                -1,
                Math.min(
                    1,
                    baseY / baseRadius
                )
            )
        );

        /*
         * Azimuth around the y-axis.
         */
        const phi = Math.atan2(
            baseZ,
            baseX
        );

        finalDistortionField[vertexIndex] =
            evaluateDistortionField(
                theta,
                phi
            );
    }
}

function deformSphere(
    distortionStrength,
    forceNormalUpdate = false
) {
    const positions =
        geometry.attributes.position.array;

    if (finalDistortionField === null) {
        precomputeDistortionField();
    }

    const visualAmplitude =
        singleModeCheckbox.checked
            ? distortionStrength * 0.75
            : distortionStrength * 1.7;

    const vertexCount =
        basePositions.length / 3;

    for (
        let vertexIndex = 0;
        vertexIndex < vertexCount;
        vertexIndex += 1
    ) {
        const i = vertexIndex * 3;

        const baseX = basePositions[i];
        const baseY = basePositions[i + 1];
        const baseZ = basePositions[i + 2];

        const baseRadius = Math.sqrt(
            baseX * baseX
            +
            baseY * baseY
            +
            baseZ * baseZ
        );

        const fieldValue =
            finalDistortionField[vertexIndex];

        const distortedRadius = Math.max(
            0.18,
            1
            +
            visualAmplitude
            *
            fieldValue
        );

        positions[i] =
            distortedRadius
            *
            baseX
            /
            baseRadius;

        positions[i + 1] =
            distortedRadius
            *
            baseY
            /
            baseRadius;

        positions[i + 2] =
            distortedRadius
            *
            baseZ
            /
            baseRadius;
    }

    geometry.attributes.position.needsUpdate = true;

renderedFrameCount += 1;

if (
    forceNormalUpdate
    ||
    renderedFrameCount % 3 === 0
) {
    geometry.computeVertexNormals();
    geometry.attributes.normal.needsUpdate = true;
}
}

function generateOpacityCoefficients() {
    opacityLowCoefficients = {};
    opacityHighCoefficients = {};

    /*
     * Low-ell clumps
     */
    for (let ell = 1; ell <= 4; ell += 1) {
        for (let m = -ell; m <= ell; m += 1) {
            const key = coefficientKey(ell, m);

            opacityLowCoefficients[key] =
                randomGaussian()
                / Math.pow(ell + 1, 1.0);
        }
    }

    /*
     * Higher-ell filament structure
     */
    for (let ell = 5; ell <= 10; ell += 1) {
        for (let m = -ell; m <= ell; m += 1) {
            const key = coefficientKey(ell, m);

            opacityHighCoefficients[key] =
                randomGaussian()
                / Math.pow(ell + 1, 0.7);
        }
    }
}

function evaluateOpacityField(theta, phi) {
    let clumpField = 0;
    let filamentField = 0;

    for (let ell = 1; ell <= 4; ell += 1) {
        for (let m = -ell; m <= ell; m += 1) {
            const key = coefficientKey(ell, m);

            clumpField +=
                (opacityLowCoefficients[key] || 0)
                *
                realSphericalHarmonic(
                    ell,
                    m,
                    theta,
                    phi
                );
        }
    }

    for (let ell = 5; ell <= 10; ell += 1) {
        for (let m = -ell; m <= ell; m += 1) {
            const key = coefficientKey(ell, m);

            filamentField +=
                (opacityHighCoefficients[key] || 0)
                *
                realSphericalHarmonic(
                    ell,
                    m,
                    theta,
                    phi
                );
        }
    }

    /*
     * Broad clumps mapped into [0,1]
     */
    const clump01 =
        0.5 + 0.5 * Math.tanh(1.5 * clumpField);

    /*
     * Turn a fluctuating field into thin ridge-like webs.
     * High when filamentField is near zero.
     */
    const filament01raw =
        0.5 + 0.5 * Math.tanh(2.0 * filamentField);

    const ridge =
        1 - Math.abs(2 * filament01raw - 1);

    const web =
        Math.pow(
            Math.max(0, ridge),
            5.0
        );

    /*
     * Combine clumps and webs
     */
    let alpha =
        0.18
        + 0.50 * clump01
        + 0.55 * web;

    alpha = Math.max(0, Math.min(1, alpha));

    return alpha;
}

function rebuildOpacityTexture() {
    const width = opacityCanvas.width;
    const height = opacityCanvas.height;

    const imageData =
        opacityContext.createImageData(width, height);

    const data = imageData.data;

    for (let y = 0; y < height; y += 1) {
        const v = y / (height - 1);
        const theta = Math.PI * v;

        for (let x = 0; x < width; x += 1) {
            const u = x / (width - 1);
            const phi = 2 * Math.PI * u - Math.PI;

            const alpha =
                evaluateOpacityField(theta, phi);

            const gray = Math.floor(255 * alpha);

            const index = 4 * (y * width + x);

            /*
             * Use grayscale RGB for alphaMap.
             */
            data[index] = gray;
            data[index + 1] = gray;
            data[index + 2] = gray;
            data[index + 3] = 255;
        }
    }

    opacityContext.putImageData(imageData, 0, 0);
    opacityTexture.needsUpdate = true;
}

/*
 * Renderer sizing
 */

function resizeRenderer() {
    const width = viewer.clientWidth;
    const height = viewer.clientHeight;

    if (width === 0 || height === 0) {
        return;
    }

    renderer.setSize(width, height, false);

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.render(scene, camera);
}

window.addEventListener("resize", resizeRenderer);

/*
 * Expansion law
 */

function expansionFraction(ageYears) {
    const normalizedAge =
        ageYears / FINAL_AGE_YEARS;

    const alpha = 0.6;

    return Math.pow(normalizedAge, alpha);
}

function renderAge(ageYears) {
    const radiusFraction =
        expansionFraction(ageYears);

    const normalizedAge =
        ageYears / FINAL_AGE_YEARS;

    /*
     * The initially dense ejecta become increasingly
     * transparent and filamentary as the remnant ages.
     */
    const diffusion =
        Math.pow(normalizedAge, 0.8);

    material.opacity =
        0.96 - 0.72 * diffusion;

    material.emissiveIntensity =
        1.0 - 0.55 * diffusion;

    /*
     * Increasing alphaTest removes more low-opacity
     * regions and opens visible holes in the shell.
     */
    material.alphaTest =
        0.04 + 0.16 * diffusion;

    filamentMaterial.opacity =
        0.03 + 0.28 * diffusion;

    particleMaterial.opacity =
        0.02 + 0.38 * diffusion;

    particleMaterial.size =
        0.008 + 0.018 * diffusion;

    /*
     * Distortion grows over time.
     */
    const distortionStrength =
        Math.pow(normalizedAge, 1.35);

    const isFinalFrame =
    ageYears >= FINAL_AGE_YEARS;

    deformSphere(
        distortionStrength,
        isFinalFrame
);

    const minimumScale = 0.015;
    const finalPanelScale = 0.72;

    const scale = Math.max(
        radiusFraction * finalPanelScale,
        minimumScale
    );

    remnant.scale.setScalar(scale);
    filaments.scale.setScalar(scale);
    particles.scale.setScalar(scale);

    const roundedAge = Math.min(
        Math.round(ageYears),
        FINAL_AGE_YEARS
    );

    remnantTitle.textContent =
        `Tycho-type remnant: age ${roundedAge} years`;

    renderer.render(scene, camera);
}

function animate(timestamp) {
    if (animationStartTime === null) {
        animationStartTime = timestamp;
    }

    const elapsed = timestamp - animationStartTime;

    const progress = Math.min(
        elapsed / ANIMATION_DURATION_MS,
        1
    );

    const ageYears = progress * FINAL_AGE_YEARS;

    renderAge(ageYears);

    if (progress < 1) {
        animationFrameId =
            requestAnimationFrame(animate);
    } else {
        animationFrameId = null;
        animationStartTime = null;

        renderAge(FINAL_AGE_YEARS);
    }
}

function startExplosion() {
    if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
    }

    animationFrameId = null;
    animationStartTime = null;

    renderAge(0);

    animationFrameId =
        requestAnimationFrame(animate);
}

/*
 * UI helpers
 */

function updateDistortionTitle() {
    const ell = Number(lmaxSlider.value);
    const m = Number(mSlider.value);

    if (singleModeCheckbox.checked) {
        distortionTitle.innerHTML =
            `Selected distortion: Y<sub>${ell}${m}</sub>`;
    } else {
        distortionTitle.innerHTML =
            `Surface distortion through &ell; = ${ell}`;
    }
}

function updateModeControls() {
    const ell = Number(lmaxSlider.value);
    let m = Number(mSlider.value);

    lmaxValue.textContent = String(ell);

    mSlider.min = String(-ell);
    mSlider.max = String(ell);

    if (m > ell) {
        m = ell;
    }

    if (m < -ell) {
        m = -ell;
    }

    mSlider.value = String(m);
    mValue.textContent = String(m);

    updateDistortionTitle();
}

function updateRemnantFromControls() {
    precomputeDistortionField();
    renderAge(FINAL_AGE_YEARS);
}

function scheduleRemnantUpdate() {
    if (sliderUpdateTimer !== null) {
        clearTimeout(sliderUpdateTimer);
    }

    sliderUpdateTimer = setTimeout(() => {
        sliderUpdateTimer = null;
        updateRemnantFromControls();
    }, SLIDER_UPDATE_DELAY_MS);
}

function finishRemnantUpdate() {
    if (sliderUpdateTimer !== null) {
        clearTimeout(sliderUpdateTimer);
        sliderUpdateTimer = null;
    }

    updateRemnantFromControls();
}

/*
 * Events
 */

lmaxSlider.addEventListener("input", () => {
    updateModeControls();
    scheduleRemnantUpdate();
});

lmaxSlider.addEventListener("change", () => {
    updateModeControls();
    finishRemnantUpdate();
});

mSlider.addEventListener("input", () => {
    mValue.textContent = mSlider.value;
    updateDistortionTitle();

    scheduleRemnantUpdate();
});

mSlider.addEventListener("change", () => {
    mValue.textContent = mSlider.value;
    updateDistortionTitle();

    finishRemnantUpdate();
});

singleModeCheckbox.addEventListener(
    "change",
    () => {
        updateDistortionTitle();
        precomputeDistortionField();
        renderAge(FINAL_AGE_YEARS);
    }
);

explodeButton.addEventListener("click", () => {
    startExplosion();
});

newSeedButton.addEventListener("click", () => {
    generateRandomCoefficients();
    generateOpacityCoefficients();
    precomputeDistortionField();
    rebuildOpacityTexture();
    startExplosion();
});

/*
 * Initialize
 */

generateRandomCoefficients();
generateOpacityCoefficients();
updateModeControls();
precomputeDistortionField();
rebuildOpacityTexture();
resizeRenderer();
startExplosion();