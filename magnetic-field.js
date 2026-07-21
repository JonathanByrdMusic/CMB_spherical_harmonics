"use strict";

const magneticViewer =
    document.getElementById("magneticViewer");

const magneticTitle =
    document.getElementById("magneticTitle");

const magneticLSlider =
    document.getElementById("magneticLSlider");

const magneticLValue =
    document.getElementById("magneticLValue");

const magneticMSlider =
    document.getElementById("magneticMSlider");

const magneticMValue =
    document.getElementById("magneticMValue");

const magneticSingleModeCheckbox =
    document.getElementById(
        "magneticSingleModeCheckbox"
    );

const buildMagneticFieldButton =
    document.getElementById(
        "buildMagneticFieldButton"
    );

const earthLikeFieldButton =
    document.getElementById(
        "earthLikeFieldButton"
    );

/*
 * Three.js scene
 */

const magneticScene = new THREE.Scene();

const magneticCamera =
    new THREE.PerspectiveCamera(
        35,
        1,
        0.1,
        100
    );

magneticCamera.position.set(0, 0, 9);

const magneticRenderer =
    new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });

magneticRenderer.setPixelRatio(
    Math.min(window.devicePixelRatio, 1.5)
);

magneticViewer.appendChild(
    magneticRenderer.domElement
);

/*
 * Earth sphere
 */

const earthGeometry =
    new THREE.SphereGeometry(
        1,
        96,
        48
    );

const earthVertexCount =
    earthGeometry.attributes.position.count;

const earthColors =
    new Float32Array(earthVertexCount * 3);

earthGeometry.setAttribute(
    "color",
    new THREE.BufferAttribute(
        earthColors,
        3
    )
);

const earthMaterial =
    new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.85,
        metalness: 0
    });

const earth =
    new THREE.Mesh(
        earthGeometry,
        earthMaterial
    );

earth.rotation.set(
    -0.25,
    0.35,
    0
);

magneticScene.add(earth);

const magneticFieldLineGroup =
    new THREE.Group();

magneticScene.add(
    magneticFieldLineGroup
);

/*
 * Lighting
 */

const magneticAmbientLight =
    new THREE.AmbientLight(
        0xffffff,
        1.6
    );

magneticScene.add(
    magneticAmbientLight
);

const magneticDirectionalLight =
    new THREE.DirectionalLight(
        0xffffff,
        2.2
    );

const magneticMLabel =
    document.getElementById(
        "magneticMLabel"
    );

magneticDirectionalLight.position.set(
    3,
    2,
    5
);

magneticScene.add(
    magneticDirectionalLight
);

let magneticBuildAnimationId = null;

let magneticActiveTermCount = null;

const MAGNETIC_TERM_DELAY_MS = 350;

function clearMagneticFieldLines() {
    while (
        magneticFieldLineGroup.children.length > 0
    ) {
        const object =
            magneticFieldLineGroup.children.pop();

        object.geometry?.dispose();
        object.material?.dispose();
    }
}

/*
 * Resize
 */

function resizeMagneticRenderer() {
    const width =
        magneticViewer.clientWidth;

    const height =
        magneticViewer.clientHeight;

    if (width === 0 || height === 0) {
        return;
    }

    magneticRenderer.setSize(
        width,
        height,
        false
    );

    magneticCamera.aspect =
        width / height;

    magneticCamera.updateProjectionMatrix();

    magneticRenderer.render(
        magneticScene,
        magneticCamera
    );
}

function cancelMagneticBuildAnimation() {
    if (magneticBuildAnimationId !== null) {
        clearTimeout(
            magneticBuildAnimationId
        );

        magneticBuildAnimationId = null;
    }
}

function animateMagneticFieldBuild() {
    cancelMagneticBuildAnimation();

    /*
     * A single mode contains only one term,
     * so animate it as one completed build.
     */
    if (magneticSingleModeCheckbox.checked) {
        magneticActiveTermCount = null;

        updateEarthSurfaceColors();
        buildHarmonicFieldLines();

        magneticTitle.textContent =
            `Magnetic mode built: ℓ = ${
                magneticLSlider.value
            }, m = ${
                magneticMSlider.value
            }`;

        return;
    }

    const allowedTerms =
        getAllowedEarthLikeTerms();

    if (allowedTerms.length === 0) {
        clearMagneticFieldLines();

        magneticRenderer.render(
            magneticScene,
            magneticCamera
        );

        return;
    }

    magneticActiveTermCount = 0;

    function addNextTerm() {
        magneticActiveTermCount += 1;

        const [
            ell,
            m
        ] =
            allowedTerms[
                magneticActiveTermCount - 1
            ];

        updateEarthSurfaceColors();
        buildHarmonicFieldLines();

        magneticTitle.textContent =
            `Building field: added ℓ = ${ell}, m = ${m}`
            +
            ` (${magneticActiveTermCount}/${allowedTerms.length})`;

        if (
            magneticActiveTermCount
            <
            allowedTerms.length
        ) {
            magneticBuildAnimationId =
                setTimeout(
                    addNextTerm,
                    MAGNETIC_TERM_DELAY_MS
                );
        } else {
            magneticBuildAnimationId = null;

            magneticActiveTermCount = null;

            updateEarthSurfaceColors();
            buildHarmonicFieldLines();

            magneticTitle.textContent =
                `Earth-like field built through ℓ = ${
                    magneticLSlider.value
                }, |m| ≤ ${
                    magneticMSlider.value
                }`;
        }
    }

    addNextTerm();
}

window.addEventListener(
    "resize",
    resizeMagneticRenderer
);

/*
 * Controls
 */

function updateMagneticControls() {
    const ell =
        Number(magneticLSlider.value);

    let m =
        Number(magneticMSlider.value);

    const showingSingleMode =
        magneticSingleModeCheckbox.checked;

    magneticLValue.textContent =
        String(ell);

    if (showingSingleMode) {
        magneticMSlider.min =
            String(-ell);

        magneticMSlider.max =
            String(ell);

        m = Math.max(
            -ell,
            Math.min(ell, m)
        );
    } else {
        magneticMSlider.min = "0";

        magneticMSlider.max =
            String(ell);

        m = Math.max(
            0,
            Math.min(
                ell,
                Math.abs(m)
            )
        );
    }

    magneticMSlider.value =
        String(m);

    magneticMValue.textContent =
        String(m);

    magneticMLabel.textContent =
        showingSingleMode
            ? "m:"
            : "max |m|:";

    if (showingSingleMode) {
        magneticTitle.textContent =
            ell === 1 && m === 0
                ? "Magnetic mode: dipole"
                : `Magnetic mode: ℓ = ${ell}, m = ${m}`;
    } else {
        magneticTitle.textContent =
            ell === 1
                ? `Earth-like field: dipole, |m| ≤ ${m}`
                : `Earth-like field through ℓ = ${ell}, |m| ≤ ${m}`;
    }

    cancelMagneticBuildAnimation();

    magneticActiveTermCount = null;

    updateEarthSurfaceColors();
}

/*
 * Spherical-harmonic mathematics
 */

const magneticFactorialCache = [1];

function factorial(n) {
    if (
        magneticFactorialCache[n]
        !== undefined
    ) {
        return magneticFactorialCache[n];
    }

    let result =
        magneticFactorialCache[
            magneticFactorialCache.length - 1
        ];

    for (
        let i = magneticFactorialCache.length;
        i <= n;
        i += 1
    ) {
        result *= i;
        magneticFactorialCache[i] = result;
    }

    return magneticFactorialCache[n];
}

const magneticNormalizationCache =
    new Map();

function getNormalization(ell, absM) {
    const key = `${ell},${absM}`;

    if (
        magneticNormalizationCache.has(key)
    ) {
        return magneticNormalizationCache.get(
            key
        );
    }

    const normalization = Math.sqrt(
        ((2 * ell + 1) / (4 * Math.PI))
        *
        (
            factorial(ell - absM)
            /
            factorial(ell + absM)
        )
    );

    magneticNormalizationCache.set(
        key,
        normalization
    );

    return normalization;
}

function associatedLegendre(
    ell,
    m,
    x
) {
    let pmm = 1;

    if (m > 0) {
        const root = Math.sqrt(
            Math.max(0, 1 - x * x)
        );

        let factor = 1;

        for (
            let i = 1;
            i <= m;
            i += 1
        ) {
            pmm *= -factor * root;
            factor += 2;
        }
    }

    if (ell === m) {
        return pmm;
    }

    let pmmp1 =
        x * (2 * m + 1) * pmm;

    if (ell === m + 1) {
        return pmmp1;
    }

    let pll = 0;

    for (
        let currentEll = m + 2;
        currentEll <= ell;
        currentEll += 1
    ) {
        pll = (
            (2 * currentEll - 1)
            * x
            * pmmp1
            -
            (currentEll + m - 1)
            * pmm
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

    const legendre =
        associatedLegendre(
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
 * Qualitative Earth-like geomagnetic model.
 *
 * Each entry contains:
 * [ell, m, coefficient]
 *
 * The dipole dominates, while progressively
 * higher modes have smaller amplitudes.
 */
const earthLikeMagneticTerms = [
    [1,  0,  1.000],

    [2,  0,  0.200],
    [2,  1, -0.140],
    [2, -2,  0.100],

    [3, -1,  0.090],
    [3,  2,  0.070],

    [4,  1,  0.050],
    [4, -3, -0.040],

    [5, -2,  0.034],
    [5,  3, -0.029],

    [6,  1,  0.024],
    [6, -4, -0.020],

    [7,  2,  0.016],
    [7, -5,  0.013],

    [8,  0,  0.011],
    [8,  6, -0.009]
];

function getAllowedEarthLikeTerms() {
    const maximumEll =
        Number(magneticLSlider.value);

    const maximumAbsM =
        Math.abs(
            Number(magneticMSlider.value)
        );

    const allowedTerms =
        earthLikeMagneticTerms.filter(
            ([ell, m]) => (
                ell <= maximumEll
                &&
                Math.abs(m) <= maximumAbsM
            )
        );

    if (magneticActiveTermCount === null) {
        return allowedTerms;
    }

    return allowedTerms.slice(
        0,
        magneticActiveTermCount
    );
}

function approximateEarthField(
    theta,
    phi
) {
    let field = 0;

    const activeTerms =
        getAllowedEarthLikeTerms();

    for (
        const [
            ell,
            m,
            coefficient
        ] of activeTerms
    ) {
        field +=
            coefficient
            *
            realSphericalHarmonic(
                ell,
                m,
                theta,
                phi
            );
    }

    return field;
}

function evaluateMagneticSurfaceField(
    theta,
    phi
) {
    const ell =
        Number(magneticLSlider.value);

    const m =
        Number(magneticMSlider.value);

    if (magneticSingleModeCheckbox.checked) {
        return realSphericalHarmonic(
            ell,
            m,
            theta,
            phi
        );
    }

    return approximateEarthField(
        theta,
        phi
    );
}

function mixColor(
    colorA,
    colorB,
    amount
) {
    return new THREE.Color(
        colorA.r
            + (colorB.r - colorA.r) * amount,
        colorA.g
            + (colorB.g - colorA.g) * amount,
        colorA.b
            + (colorB.b - colorA.b) * amount
    );
}

function updateEarthSurfaceColors() {
    const positions =
        earthGeometry.attributes.position;

    const colors =
        earthGeometry.attributes.color;

    const fieldValues =
        new Float32Array(
            positions.count
        );

    let maximumMagnitude = 0;

    for (
        let i = 0;
        i < positions.count;
        i += 1
    ) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const z = positions.getZ(i);

        const radius =
            Math.sqrt(
                x * x
                +
                y * y
                +
                z * z
            );

        const theta =
            Math.acos(
                Math.max(
                    -1,
                    Math.min(
                        1,
                        y / radius
                    )
                )
            );

        const phi =
            Math.atan2(z, x);

        const fieldValue =
            evaluateMagneticSurfaceField(
                theta,
                phi
            );

        fieldValues[i] = fieldValue;

        maximumMagnitude = Math.max(
            maximumMagnitude,
            Math.abs(fieldValue)
        );
    }

    const positiveColor =
        new THREE.Color(0xf26522);

    const negativeColor =
        new THREE.Color(0x2864c7);

    const neutralColor =
        new THREE.Color(0xe9edf2);

    for (
        let i = 0;
        i < positions.count;
        i += 1
    ) {
        const normalized =
            maximumMagnitude > 0
                ? fieldValues[i]
                    / maximumMagnitude
                : 0;

        let color;

        if (normalized >= 0) {
            color = mixColor(
                neutralColor,
                positiveColor,
                normalized
            );
        } else {
            color = mixColor(
                neutralColor,
                negativeColor,
                -normalized
            );
        }

        colors.setXYZ(
            i,
            color.r,
            color.g,
            color.b
        );
    }

    colors.needsUpdate = true;

    magneticRenderer.render(
        magneticScene,
        magneticCamera
    );

}

function evaluateMagneticPotential(
    radius,
    theta,
    phi
) {
    const selectedEll =
        Number(magneticLSlider.value);

    const selectedM =
        Number(magneticMSlider.value);

    /*
     * Show one selected spherical-harmonic mode.
     */
    if (magneticSingleModeCheckbox.checked) {
        return (
            realSphericalHarmonic(
                selectedEll,
                selectedM,
                theta,
                phi
            )
            /
            Math.pow(
                radius,
                selectedEll + 1
            )
        );
    }

    /*
     * Earth-like accumulated field:
     *
     * include all prescribed terms through
     * selectedEll and through |m| = |selectedM|.
     */
    const maximumAbsM =
        Math.abs(selectedM);

    let potential = 0;

    const activeTerms =
        getAllowedEarthLikeTerms();

    for (
        const [
            ell,
            m,
            coefficient
        ] of activeTerms
    ) {
        potential +=
            coefficient
            *
            realSphericalHarmonic(
                ell,
                m,
                theta,
                phi
            )
            /
            Math.pow(
                radius,
                ell + 1
            );
    }

    return potential;
}

function magneticPotentialAtPoint(position) {
    const x = position.x;
    const y = position.y;
    const z = position.z;

    const radius = Math.sqrt(
        x * x + y * y + z * z
    );

    if (radius < 1) {
        return 0;
    }

    const theta = Math.acos(
        Math.max(-1, Math.min(1, y / radius))
    );

    const phi = Math.atan2(z, x);

    return evaluateMagneticPotential(
        radius,
        theta,
        phi
    );
}

function magneticFieldAtPoint(position) {
    const h = 0.002;

    const dx = new THREE.Vector3(h, 0, 0);
    const dy = new THREE.Vector3(0, h, 0);
    const dz = new THREE.Vector3(0, 0, h);

    const dVdx = (
        magneticPotentialAtPoint(
            position.clone().add(dx)
        )
        -
        magneticPotentialAtPoint(
            position.clone().sub(dx)
        )
    ) / (2 * h);

    const dVdy = (
        magneticPotentialAtPoint(
            position.clone().add(dy)
        )
        -
        magneticPotentialAtPoint(
            position.clone().sub(dy)
        )
    ) / (2 * h);

    const dVdz = (
        magneticPotentialAtPoint(
            position.clone().add(dz)
        )
        -
        magneticPotentialAtPoint(
            position.clone().sub(dz)
        )
    ) / (2 * h);

    return new THREE.Vector3(
        -dVdx,
        -dVdy,
        -dVdz
    );
}

function traceMagneticFieldLine(
    seed,
    directionSign
) {
    const points = [];
    const position = seed.clone();

    const stepSize = 0.035;
    const maximumSteps = 320;
    const minimumRadius = 1.005;
    const maximumRadius = 5.5;

    for (
        let step = 0;
        step < maximumSteps;
        step += 1
    ) {
        const radius = position.length();

        if (
            radius < minimumRadius
            ||
            radius > maximumRadius
        ) {
            break;
        }

        points.push(position.clone());

        const field =
            magneticFieldAtPoint(position);

        if (
            !Number.isFinite(field.x)
            ||
            !Number.isFinite(field.y)
            ||
            !Number.isFinite(field.z)
            ||
            field.lengthSq() < 1e-12
        ) {
            break;
        }

        field.normalize();

        position.addScaledVector(
            field,
            directionSign * stepSize
        );
    }

    return points;
}

function createHarmonicFieldLine(seed) {
    const backwardPoints =
        traceMagneticFieldLine(
            seed,
            -1
        );

    const forwardPoints =
        traceMagneticFieldLine(
            seed,
            1
        );

    /*
     * Join the two trajectories at the seed.
     * Remove one duplicate seed point.
     */
    backwardPoints.reverse();

    const points = [
        ...backwardPoints,
        ...forwardPoints.slice(1)
    ];

    if (points.length < 4) {
        return null;
    }

    const curve =
        new THREE.CatmullRomCurve3(
            points
        );

    const geometry =
        new THREE.TubeGeometry(
            curve,
            Math.max(
                24,
                points.length * 2
            ),
            0.009,
            5,
            false
        );

    /*
     * Color according to the field polarity
     * at the seed point.
     */
    const radius = seed.length();

    const theta = Math.acos(
        Math.max(
            -1,
            Math.min(
                1,
                seed.y / radius
            )
        )
    );

    const phi =
        Math.atan2(seed.z, seed.x);

    const surfaceValue =
        evaluateMagneticSurfaceField(
            theta,
            phi
        );

    const color =
        surfaceValue >= 0
            ? 0xf2a522
            : 0x4db6e8;

    const material =
        new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.72,
            depthWrite: false
        });

    return new THREE.Mesh(
        geometry,
        material
    );
}

function buildHarmonicFieldLines() {
    clearMagneticFieldLines();

    /*
     * Seed curves just outside Earth's surface.
     * Several latitudes and azimuths provide a
     * three-dimensional field architecture.
     */
    const northernThetas = [
        0.48,
        0.68,
        0.88,
        1.08,
        1.30
    ];

    const seedThetas = [
        ...northernThetas,
        ...northernThetas.map(
            theta => Math.PI - theta
        )
    ];

    const azimuthCount = 10;
    const seedRadius =
        magneticSingleModeCheckbox.checked
            ? 1.08
            : 1.025;

    for (
        let azimuthIndex = 0;
        azimuthIndex < azimuthCount;
        azimuthIndex += 1
    ) {
        const phi =
            2
            *
            Math.PI
            *
            azimuthIndex
            /
            azimuthCount;

        for (
            const theta of seedThetas
        ) {
            const sinTheta =
                Math.sin(theta);

            const seed =
                new THREE.Vector3(
                    seedRadius
                        * sinTheta
                        * Math.cos(phi),

                    seedRadius
                        * Math.cos(theta),

                    seedRadius
                        * sinTheta
                        * Math.sin(phi)
                );

            const fieldLine =
                createHarmonicFieldLine(
                    seed
                );

            if (fieldLine !== null) {
                magneticFieldLineGroup.add(
                    fieldLine
                );
            }
        }
    }

    magneticFieldLineGroup.rotation.copy(
        earth.rotation
    );

    magneticRenderer.render(
        magneticScene,
        magneticCamera
    );
}

magneticLSlider.addEventListener(
    "input",
    updateMagneticControls
);

magneticMSlider.addEventListener(
    "input",
    () => {
        magneticMValue.textContent =
            magneticMSlider.value;

        updateMagneticControls();
    }
);

buildMagneticFieldButton.addEventListener(
    "click",
    animateMagneticFieldBuild
);

earthLikeFieldButton.addEventListener(
    "click",
    () => {
        magneticLSlider.value = "8";
        magneticMSlider.value = "8";

        magneticSingleModeCheckbox.checked =
            false;

        updateMagneticControls();
        animateMagneticFieldBuild();
    }
);

magneticSingleModeCheckbox.addEventListener(
    "change",
    updateMagneticControls
);

/*
 * Initialize
 */

resizeMagneticRenderer();
updateMagneticControls();
clearMagneticFieldLines();