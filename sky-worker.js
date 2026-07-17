const SQRT_TWO = Math.sqrt(2);
const P00 = 1 / Math.sqrt(4 * Math.PI);

let thetaGrid = null;
let phiGrid = null;
let width = 0;
let height = 0;

/*
 * Stores coefficient a_(l,m) at a unique flat index.
 *
 * For a particular l, its coefficients occupy:
 *
 *     l² through (l + 1)² - 1
 *
 * m = -l begins at l².
 */
function lmIndex(l, m) {
    return l * l + (m + l);
}

self.addEventListener("message", function (event) {

    const message = event.data;

    if (message.type === "initialize") {

        width = message.width;
        height = message.height;

        thetaGrid = new Float32Array(message.thetaBuffer);
        phiGrid = new Float32Array(message.phiBuffer);

        self.postMessage({
            type: "initialized"
        });

        return;
    }

    if (message.type === "calculate") {

        let result;

        if (message.singleMode) {
            result = calculateSingleMode(
                message.selectedL,
                message.selectedM
            );
        } else {
            result = calculateSky(
                message.lmax,
                new Float64Array(message.coefficientBuffer),
                message.requestId
            );
        }

        self.postMessage(
            {
                type: "result",
                requestId: message.requestId,
                lmax: message.lmax,
                valuesBuffer: result.buffer
            },
            [result.buffer]
        );
    }
});

function calculateSky(lmax, coefficients, requestId) {

    const pixelCount = width * height;
    const values = new Float32Array(pixelCount);

    for (let pixel = 0; pixel < pixelCount; pixel++) {

        const theta = thetaGrid[pixel];
        const phi = phiGrid[pixel];

        // NaN marks a pixel outside the Mollweide ellipse.
        if (!Number.isFinite(theta)) {
            values[pixel] = 0;
            continue;
        }

        const x = Math.cos(theta);
        const sinTheta = Math.sqrt(
            Math.max(0, 1 - x * x)
        );

        const cosPhi = Math.cos(phi);
        const sinPhi = Math.sin(phi);

        /*
         * cosM and sinM will successively become:
         *
         * cos(m phi), sin(m phi)
         *
         * without repeatedly calling Math.cos(m * phi)
         * and Math.sin(m * phi).
         */
        let cosM = 1;
        let sinM = 0;

        /*
         * Fully normalized associated Legendre function:
         *
         * Pbar_0^0 = 1 / sqrt(4 pi)
         */
        let pmm = P00;

        let pixelValue = 0;

        for (let m = 0; m <= lmax; m++) {

            if (m > 0) {

                // Trigonometric recurrence
                const nextCosM =
                    cosM * cosPhi - sinM * sinPhi;

                const nextSinM =
                    sinM * cosPhi + cosM * sinPhi;

                cosM = nextCosM;
                sinM = nextSinM;

                /*
                 * Diagonal normalized recurrence:
                 *
                 * Pbar_m^m =
                 * -sqrt((2m+1)/(2m))
                 * sin(theta)
                 * Pbar_(m-1)^(m-1)
                 */
                pmm =
                    -Math.sqrt((2 * m + 1) / (2 * m)) *
                    sinTheta *
                    pmm;
            }

            // l = m
            pixelValue += contribution(
                m,
                m,
                pmm,
                cosM,
                sinM,
                coefficients
            );

            if (m === lmax) {
                continue;
            }

            /*
             * First off-diagonal term:
             *
             * Pbar_(m+1)^m =
             * sqrt(2m+3) x Pbar_m^m
             */
            let pPrevious = pmm;

            let pCurrent =
                Math.sqrt(2 * m + 3) *
                x *
                pmm;

            pixelValue += contribution(
                m + 1,
                m,
                pCurrent,
                cosM,
                sinM,
                coefficients
            );

            /*
             * General normalized recurrence:
             *
             * Pbar_l^m =
             * A_lm x Pbar_(l-1)^m
             * - B_lm Pbar_(l-2)^m
             */
            for (let l = m + 2; l <= lmax; l++) {

                const denominator =
                    l * l - m * m;

                const a = Math.sqrt(
                    (4 * l * l - 1) /
                    denominator
                );

                const b = Math.sqrt(
                    (
                        (2 * l + 1) *
                        ((l - 1) * (l - 1) - m * m)
                    ) /
                    (
                        (2 * l - 3) *
                        denominator
                    )
                );

                const pNext =
                    a * x * pCurrent -
                    b * pPrevious;

                pixelValue += contribution(
                    l,
                    m,
                    pNext,
                    cosM,
                    sinM,
                    coefficients
                );

                pPrevious = pCurrent;
                pCurrent = pNext;
            }
        }

        values[pixel] = pixelValue;

        // Occasional progress messages without flooding the main thread.
        if (
            pixel > 0 &&
            pixel % Math.max(width * 16, 1) === 0
        ) {
            self.postMessage({
                type: "progress",
                requestId: requestId,
                fraction: pixel / pixelCount
            });
        }
    }

    return values;
}

function calculateSingleMode(l, m) {

    const pixelCount = width * height;
    const values = new Float32Array(pixelCount);

    const absM = Math.abs(m);

    for (let pixel = 0; pixel < pixelCount; pixel++) {

        const theta = thetaGrid[pixel];
        const phi = phiGrid[pixel];

        if (!Number.isFinite(theta)) {
            values[pixel] = 0;
            continue;
        }

        const x = Math.cos(theta);
        const sinTheta = Math.sqrt(
            Math.max(0, 1 - x * x)
        );

        /*
         * Construct normalized Pbar_m^m.
         */
        let normalizedLegendre =
            1 / Math.sqrt(4 * Math.PI);

        for (let order = 1; order <= absM; order++) {
            normalizedLegendre *=
                -Math.sqrt(
                    (2 * order + 1) /
                    (2 * order)
                ) *
                sinTheta;
        }

        /*
         * Climb from degree absM to degree l while
         * keeping the order fixed.
         */
        if (l > absM) {

            let previous =
                normalizedLegendre;

            let current =
                Math.sqrt(2 * absM + 3) *
                x *
                previous;

            if (l === absM + 1) {
                normalizedLegendre = current;
            } else {

                for (
                    let degree = absM + 2;
                    degree <= l;
                    degree++
                ) {

                    const denominator =
                        degree * degree -
                        absM * absM;

                    const a = Math.sqrt(
                        (4 * degree * degree - 1) /
                        denominator
                    );

                    const b = Math.sqrt(
                        (
                            (2 * degree + 1) *
                            (
                                (degree - 1) *
                                (degree - 1) -
                                absM * absM
                            )
                        ) /
                        (
                            (2 * degree - 3) *
                            denominator
                        )
                    );

                    const next =
                        a * x * current -
                        b * previous;

                    previous = current;
                    current = next;
                }

                normalizedLegendre = current;
            }
        }

        if (m > 0) {
            values[pixel] =
                Math.sqrt(2) *
                normalizedLegendre *
                Math.cos(absM * phi);
        } else if (m < 0) {
            values[pixel] =
                Math.sqrt(2) *
                normalizedLegendre *
                Math.sin(absM * phi);
        } else {
            values[pixel] =
                normalizedLegendre;
        }
    }

    return values;
}

function contribution(
    l,
    m,
    normalizedLegendre,
    cosM,
    sinM,
    coefficients
) {

    if (m === 0) {
        return (
            coefficients[lmIndex(l, 0)] *
            normalizedLegendre
        );
    }

    /*
     * Real spherical-harmonic basis:
     *
     * m > 0  -> sqrt(2) Pbar_l^m cos(m phi)
     * m < 0  -> sqrt(2) Pbar_l^m sin(m phi)
     */
    const positiveCoefficient =
        coefficients[lmIndex(l, m)];

    const negativeCoefficient =
        coefficients[lmIndex(l, -m)];

    return (
        SQRT_TWO *
        normalizedLegendre *
        (
            positiveCoefficient * cosM +
            negativeCoefficient * sinM
        )
    );
}