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

const magneticModelGroup =
    new THREE.Group();

magneticModelGroup.rotation.set(
    -0.25,
    0.35,
    0
);

magneticScene.add(
    magneticModelGroup
);

magneticModelGroup.add(
    earth
);

const magneticFieldLineGroup =
    new THREE.Group();

magneticModelGroup.add(
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

let magneticSliderUpdateTimer = null;

const MAGNETIC_SLIDER_UPDATE_DELAY_MS = 120;

function clearMagneticFieldLines() {
    while (
        magneticFieldLineGroup.children.length > 0
    ) {
        const object =
            magneticFieldLineGroup.children[0];

        magneticFieldLineGroup.remove(
            object
        );

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

function scheduleMagneticFieldLineUpdate() {
    if (magneticSliderUpdateTimer !== null) {
        clearTimeout(
            magneticSliderUpdateTimer
        );
    }

    magneticSliderUpdateTimer =
        setTimeout(
            () => {
                magneticSliderUpdateTimer = null;

                buildHarmonicFieldLines();
            },
            MAGNETIC_SLIDER_UPDATE_DELAY_MS
        );
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
    scheduleMagneticFieldLineUpdate();
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

function finishMagneticFieldLineUpdate() {
    if (magneticSliderUpdateTimer !== null) {
        clearTimeout(
            magneticSliderUpdateTimer
        );

        magneticSliderUpdateTimer = null;
    }

    buildHarmonicFieldLines();
}

/*
 * Qualitative, dipole-dominated Earth-like model.
 *
 * These are illustrative coefficients, not measured
 * IGRF or geomagnetic Gauss coefficients.
 *
 * Each entry contains:
 * [ell, m, coefficient]
 */
const earthLikeMagneticTerms = [
    [1,  0,  1.000],

    [2,  0,  0.200],
    [2,  1, -0.140],
    [2, -2,  0.100],

    [3,  0,  0.070],
    [3, -1,  0.090],
    [3,  2,  0.070],

    [4,  0, -0.045],
    [4,  1,  0.050],
    [4, -3, -0.040],

    [5,  0,  0.030],
    [5, -2,  0.034],
    [5,  3, -0.029],

    [6,  0, -0.022],
    [6,  1,  0.024],
    [6, -4, -0.020],

    [7,  0,  0.015],
    [7,  2,  0.016],
    [7, -5,  0.013],

    [8,  0,  0.011],
    [8,  6, -0.009], 
    [8,  7,  0.007],
    [8, -8, -0.005]
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

/*
 * Analytic magnetic field
 *
 * For one exterior spherical-harmonic term,
 *
 *     V = coefficient * Y_lm(theta, phi) / r^(ell + 1)
 *
 * and
 *
 *     B = -grad(V)
 *
 * We calculate the spherical components directly,
 * then convert them to Cartesian coordinates.
 */


/*
 * Return P_ell^m(x), treating ell < m as zero.
 *
 * This is useful in the derivative recurrence when
 * ell = m and P_(ell - 1)^m does not exist as a
 * regular associated Legendre function.
 */
function associatedLegendreSafe(
    ell,
    m,
    x
) {
    if (ell < m) {
        return 0;
    }

    return associatedLegendre(
        ell,
        m,
        x
    );
}


/*
 * Evaluate one real spherical harmonic together with
 * its theta and phi derivatives.
 */
function realSphericalHarmonicWithDerivatives(
    ell,
    m,
    theta,
    phi
) {
    const absM =
        Math.abs(m);

    const cosTheta =
        Math.cos(theta);

    const sinTheta =
        Math.sin(theta);

    /*
     * Avoid division by exactly zero at the coordinate
     * singularities. The field-line seeds do not begin
     * at the poles, but a trajectory may approach one.
     */
    const safeSinTheta =
        Math.max(
            Math.abs(sinTheta),
            1e-10
        );

    const normalization =
        getNormalization(
            ell,
            absM
        );

    const legendre =
        associatedLegendreSafe(
            ell,
            absM,
            cosTheta
        );

    const previousLegendre =
        associatedLegendreSafe(
            ell - 1,
            absM,
            cosTheta
        );

    /*
     * Associated-Legendre derivative:
     *
     * dP_l^m(cos(theta)) / dtheta
     *
     *     =
     *
     * [l cos(theta) P_l^m
     *  - (l + m) P_(l-1)^m]
     * / sin(theta)
     */
    const legendreThetaDerivative =
        (
            ell
            *
            cosTheta
            *
            legendre
            -
            (ell + absM)
            *
            previousLegendre
        )
        /
        safeSinTheta;

    let angularFactor;
    let phiDerivativeFactor;

    if (m === 0) {
        angularFactor = 1;
        phiDerivativeFactor = 0;
    } else if (m > 0) {
        angularFactor =
            Math.sqrt(2)
            *
            Math.cos(
                absM * phi
            );

        phiDerivativeFactor =
            Math.sqrt(2)
            *
            (
                -absM
                *
                Math.sin(
                    absM * phi
                )
            );
    } else {
        angularFactor =
            Math.sqrt(2)
            *
            Math.sin(
                absM * phi
            );

        phiDerivativeFactor =
            Math.sqrt(2)
            *
            (
                absM
                *
                Math.cos(
                    absM * phi
                )
            );
    }

    const value =
        normalization
        *
        legendre
        *
        angularFactor;

    const thetaDerivative =
        normalization
        *
        legendreThetaDerivative
        *
        angularFactor;

    const phiDerivative =
        normalization
        *
        legendre
        *
        phiDerivativeFactor;

    return {
        value,
        thetaDerivative,
        phiDerivative
    };
}


/*
 * Add one exterior multipole term to a magnetic-field
 * vector expressed in spherical components.
 */
function addMagneticFieldTerm(
    components,
    ell,
    m,
    coefficient,
    radius,
    theta,
    phi
) {
    const harmonic =
        realSphericalHarmonicWithDerivatives(
            ell,
            m,
            theta,
            phi
        );

    const radialFactor =
        coefficient
        /
        Math.pow(
            radius,
            ell + 2
        );

    /*
     * B_r =
     *
     *     (ell + 1) Y_lm / r^(ell + 2)
     */
    components.radial +=
        radialFactor
        *
        (ell + 1)
        *
        harmonic.value;

    /*
     * B_theta =
     *
     *     -(dY_lm / dtheta) / r^(ell + 2)
     */
    components.theta -=
        radialFactor
        *
        harmonic.thetaDerivative;

    /*
     * B_phi =
     *
     *     -(dY_lm / dphi)
     *     /
     *     [r^(ell + 2) sin(theta)]
     */
    const sinTheta =
        Math.sin(theta);

    const safeSinTheta =
        Math.max(
            Math.abs(sinTheta),
            1e-10
        );

    components.phi -=
        radialFactor
        *
        harmonic.phiDerivative
        /
        safeSinTheta;
}


/*
 * Calculate B directly at a Cartesian point.
 */
function magneticFieldAtPoint(position) {
    const x = position.x;
    const y = position.y;
    const z = position.z;

    const radius =
        Math.sqrt(
            x * x
            +
            y * y
            +
            z * z
        );

    if (
        !Number.isFinite(radius)
        ||
        radius <= 1
    ) {
        return new THREE.Vector3(
            0,
            0,
            0
        );
    }

    /*
     * This project uses y as the polar axis.
     */
    const cosTheta =
        Math.max(
            -1,
            Math.min(
                1,
                y / radius
            )
        );

    const theta =
        Math.acos(
            cosTheta
        );

    const phi =
        Math.atan2(
            z,
            x
        );

    const components = {
        radial: 0,
        theta: 0,
        phi: 0
    };

    if (magneticSingleModeCheckbox.checked) {
        const ell =
            Number(
                magneticLSlider.value
            );

        const m =
            Number(
                magneticMSlider.value
            );

        addMagneticFieldTerm(
            components,
            ell,
            m,
            1,
            radius,
            theta,
            phi
        );
    } else {
        const activeTerms =
            getAllowedEarthLikeTerms();

        for (
            const [
                ell,
                m,
                coefficient
            ] of activeTerms
        ) {
            addMagneticFieldTerm(
                components,
                ell,
                m,
                coefficient,
                radius,
                theta,
                phi
            );
        }
    }

    /*
     * Spherical unit vectors for the convention
     *
     * x = r sin(theta) cos(phi)
     * y = r cos(theta)
     * z = r sin(theta) sin(phi)
     */

    const sinTheta =
        Math.sin(theta);

    const cosPhi =
        Math.cos(phi);

    const sinPhi =
        Math.sin(phi);

    const radialUnit =
        new THREE.Vector3(
            sinTheta * cosPhi,
            cosTheta,
            sinTheta * sinPhi
        );

    const thetaUnit =
        new THREE.Vector3(
            cosTheta * cosPhi,
            -sinTheta,
            cosTheta * sinPhi
        );

    const phiUnit =
        new THREE.Vector3(
            -sinPhi,
            0,
            cosPhi
        );

    return new THREE.Vector3()
        .addScaledVector(
            radialUnit,
            components.radial
        )
        .addScaledVector(
            thetaUnit,
            components.theta
        )
        .addScaledVector(
            phiUnit,
            components.phi
        );
}

function magneticFieldDirectionAtPoint(
    position,
    directionSign
) {
    const field =
        magneticFieldAtPoint(position);

    if (
        !Number.isFinite(field.x)
        ||
        !Number.isFinite(field.y)
        ||
        !Number.isFinite(field.z)
        ||
        field.lengthSq() < 1e-24
    ) {
        return null;
    }

    return field
        .normalize()
        .multiplyScalar(directionSign);
}


function advanceMagneticFieldLineRK4(
    position,
    stepSize,
    directionSign
) {
    const k1 =
        magneticFieldDirectionAtPoint(
            position,
            directionSign
        );

    if (k1 === null) {
        return null;
    }

    const k2 =
        magneticFieldDirectionAtPoint(
            position
                .clone()
                .addScaledVector(
                    k1,
                    stepSize / 2
                ),
            directionSign
        );

    if (k2 === null) {
        return null;
    }

    const k3 =
        magneticFieldDirectionAtPoint(
            position
                .clone()
                .addScaledVector(
                    k2,
                    stepSize / 2
                ),
            directionSign
        );

    if (k3 === null) {
        return null;
    }

    const k4 =
        magneticFieldDirectionAtPoint(
            position
                .clone()
                .addScaledVector(
                    k3,
                    stepSize
                ),
            directionSign
        );

    if (k4 === null) {
        return null;
    }

    return position
        .clone()
        .addScaledVector(
            k1,
            stepSize / 6
        )
        .addScaledVector(
            k2,
            stepSize / 3
        )
        .addScaledVector(
            k3,
            stepSize / 3
        )
        .addScaledVector(
            k4,
            stepSize / 6
        );
}

function traceMagneticFieldLine(
    seed,
    directionSign
) {
    const points = [];
    const position = seed.clone();

    /*
     * Smaller steps give smoother and more accurate
     * trajectories. More steps allow long lines to
     * continue until they return to Earth.
     */
    const stepSize = 0.025;
    const maximumSteps = 1600;

    const minimumRadius = 1.002;

    /*
     * This is now only an emergency limit for genuinely
     * open or numerically unstable trajectories. It is
     * independent of the visible simulator window.
     */
    const maximumRadius = 14;

    for (
        let step = 0;
        step < maximumSteps;
        step += 1
    ) {
        const radius = position.length();

        /*
         * Do not immediately stop at the seed, which is
         * already close to Earth's surface. Wait until
         * at least one step has been completed.
         */
        if (
            step > 0
            &&
            radius <= minimumRadius
        ) {
            /*
             * Project the final point onto Earth's surface
             * so the line visibly meets the sphere rather
             * than ending slightly above it.
             */
            const surfacePoint =
                position
                    .clone()
                    .normalize()
                    .multiplyScalar(1.001);

            points.push(surfacePoint);

            break;
        }

        if (radius > maximumRadius) {
            return [];
        }

        points.push(position.clone());

        const nextPosition =
            advanceMagneticFieldLineRK4(
                position,
                stepSize,
                directionSign
            );

        if (nextPosition === null) {
            break;
        }

        position.copy(nextPosition);
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

    const tubularSegments =
        Math.min(
            1200,
            Math.max(
                48,
                points.length
            )
        );

    const geometry =
        new THREE.TubeGeometry(
            curve,
            tubularSegments,
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

    const seedField =
        magneticFieldAtPoint(
            seed
        );

    const radialDirection =
        seed
            .clone()
            .normalize();

    const radialField =
        seedField.dot(
            radialDirection
        );

    const color =
        radialField >= 0
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

    const selectedEll =
        Number(magneticLSlider.value);

    const selectedM =
        Number(magneticMSlider.value);

    const absM =
        Math.abs(selectedM);

    const thetaCount =
        magneticSingleModeCheckbox.checked
            ? Math.min(
                12,
                Math.max(
                    8,
                    selectedEll + 4
                )
            )
            : 10;

    const seedThetas =
        Array.from(
            {
                length: thetaCount
            },
            (
                _,
                thetaIndex
            ) => (
                (thetaIndex + 0.5)
                *
                Math.PI
                /
                thetaCount
            )
        );

    const azimuthCount =
        magneticSingleModeCheckbox.checked
            ? Math.min(
                20,
                Math.max(
                    10,
                    2 * absM
                )
            )
            : 10;

    const phaseOffset =
        magneticSingleModeCheckbox.checked
        &&
        selectedM < 0
        &&
        absM > 0
            ? Math.PI / (2 * absM)
            : 0;

    const seedRadius = 1.025;

    for (
        let azimuthIndex = 0;
        azimuthIndex < azimuthCount;
        azimuthIndex += 1
    ) {
        const phi =
            (
                2
                *
                Math.PI
                *
                azimuthIndex
                /
                azimuthCount
            )
            +
            phaseOffset;

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

    magneticRenderer.render(
        magneticScene,
        magneticCamera
    );
}

function enableDragRotation(
    viewer,
    objects,
    renderScene
) {
    let dragging = false;
    let previousX = 0;
    let previousY = 0;

    const rotationSpeed = 0.006;

    viewer.style.cursor = "grab";
    viewer.style.touchAction = "none";

    viewer.addEventListener(
        "pointerdown",
        event => {
            dragging = true;

            previousX = event.clientX;
            previousY = event.clientY;

            viewer.style.cursor = "grabbing";

            viewer.setPointerCapture(
                event.pointerId
            );
        }
    );

    viewer.addEventListener(
        "pointermove",
        event => {
            if (!dragging) {
                return;
            }

            const deltaX =
                event.clientX - previousX;

            const deltaY =
                event.clientY - previousY;

            previousX = event.clientX;
            previousY = event.clientY;

            for (const object of objects) {
                object.rotation.y +=
                    deltaX * rotationSpeed;

                object.rotation.x +=
                    deltaY * rotationSpeed;
            }

            renderScene();
        }
    );

    function stopDragging(event) {
        dragging = false;
        viewer.style.cursor = "grab";

        if (
            viewer.hasPointerCapture(
                event.pointerId
            )
        ) {
            viewer.releasePointerCapture(
                event.pointerId
            );
        }
    }

    viewer.addEventListener(
        "pointerup",
        stopDragging
    );

    viewer.addEventListener(
        "pointercancel",
        stopDragging
    );
}

magneticLSlider.addEventListener(
    "input",
    updateMagneticControls
);

magneticLSlider.addEventListener(
    "change",
    finishMagneticFieldLineUpdate
);

magneticMSlider.addEventListener(
    "input",
    () => {
        magneticMValue.textContent =
            magneticMSlider.value;

        updateMagneticControls();
    }
);

magneticMSlider.addEventListener(
    "change",
    finishMagneticFieldLineUpdate
);

magneticSingleModeCheckbox.addEventListener(
    "change",
    () => {
        updateMagneticControls();
        finishMagneticFieldLineUpdate();
    }
);

buildMagneticFieldButton.addEventListener(
    "click",
    animateMagneticFieldBuild
);

earthLikeFieldButton.addEventListener(
    "click",
    () => {
        magneticSingleModeCheckbox.checked =
            false;

        magneticLSlider.value = "8";

        magneticMSlider.min = "0";
        magneticMSlider.max = "8";
        magneticMSlider.value = "6";

        updateMagneticControls();

        if (magneticSliderUpdateTimer !== null) {
            clearTimeout(
                magneticSliderUpdateTimer
            );

            magneticSliderUpdateTimer = null;
        }

        animateMagneticFieldBuild();
    }
);

enableDragRotation(
    magneticViewer,
    [
        magneticModelGroup
    ],
    () => {
        magneticRenderer.render(
            magneticScene,
            magneticCamera
        );
    }
);

/*
 * Initialize
 */

resizeMagneticRenderer();
updateMagneticControls();