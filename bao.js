const menuButton =
    document.getElementById("menuButton");

const siteMenu =
    document.getElementById("siteMenu");

const q1Slider =
    document.getElementById("q1Slider");

const q2Slider =
    document.getElementById("q2Slider");

const rSlider =
    document.getElementById("rSlider");

const q1Value =
    document.getElementById("q1Value");

const q2Value =
    document.getElementById("q2Value");

const rValue =
    document.getElementById("rValue");

const coulombCalculation =
    document.getElementById("coulombCalculation");

const leftForceArrow =
    document.getElementById("leftForceArrow");

const rightForceArrow =
    document.getElementById("rightForceArrow");

const positiveCharge =
    document.getElementById("positiveCharge");

const negativeCharge =
    document.getElementById("negativeCharge");

const positiveChargeLabel =
    document.getElementById("positiveChargeLabel");

const negativeChargeLabel =
    document.getElementById("negativeChargeLabel");

const fieldLines =
    document.getElementById("fieldLines");


function closeSiteMenu() {

    menuButton.setAttribute(
        "aria-expanded",
        "false"
    );

    menuButton.setAttribute(
        "aria-label",
        "Open navigation menu"
    );

    siteMenu.hidden = true;
}


function openSiteMenu() {

    menuButton.setAttribute(
        "aria-expanded",
        "true"
    );

    menuButton.setAttribute(
        "aria-label",
        "Close navigation menu"
    );

    siteMenu.hidden = false;
}


function formatCharge(value) {

    return Number(value).toFixed(1);
}


function formatDistance(value) {

    return Number(value).toFixed(1);
}


function formatForce(force) {

    const magnitude =
        Math.abs(force);

    if (magnitude >= 1000) {
        return force.toExponential(2);
    }

    if (magnitude >= 10) {
        return force.toFixed(1);
    }

    return force.toFixed(2);
}


function signLabel(value) {

    if (value > 0) {
        return "+";
    }

    if (value < 0) {
        return "−";
    }

    return "0";
}


function setChargeAppearance(
    circle,
    label,
    value
) {

    if (value > 0) {

        circle.setAttribute(
            "fill",
            "url(#positiveChargeGradient)"
        );

        label.textContent = "+";

    } else if (value < 0) {

        circle.setAttribute(
            "fill",
            "url(#negativeChargeGradient)"
        );

        label.textContent = "−";

    } else {

        circle.setAttribute(
            "fill",
            "#7a7a7a"
        );

        label.textContent = "0";
    }
}


function setChargePositions(r) {

    /*
     * Map the distance slider range 1–8 m
     * onto a visual separation range.
     *
     * r = 1  -> charges close together
     * r = 8  -> charges far apart
     */

    const minSeparation = 150;
    const maxSeparation = 360;

    const t =
        (r - 1) / (8 - 1);

    const separation =
        minSeparation +
        t * (maxSeparation - minSeparation);

    const centerX = 360;

    const leftX =
        centerX - separation / 2;

    const rightX =
        centerX + separation / 2;

    positiveCharge.setAttribute(
        "cx",
        leftX
    );

    negativeCharge.setAttribute(
        "cx",
        rightX
    );

    positiveChargeLabel.setAttribute(
        "x",
        leftX
    );

    negativeChargeLabel.setAttribute(
        "x",
        rightX
    );

    return {
        leftX: leftX,
        rightX: rightX
    };
}


function setForceArrows(
    q1,
    q2,
    r,
    leftX,
    rightX
) {

    const product =
        q1 * q2;

    const magnitude =
        Math.abs(
            8.99 * q1 * q2 / (r * r)
        );

    const arrowLength =
        Math.min(
            110,
            18 + 42 * Math.sqrt(magnitude)
        );

    const halfArrow =
        arrowLength / 2;

    if (product < 0) {

        /*
         * Attraction:
         * left arrow points right
         * right arrow points left
         */

        leftForceArrow.setAttribute(
            "x1",
            leftX - halfArrow
        );

        leftForceArrow.setAttribute(
            "x2",
            leftX + halfArrow
        );

        rightForceArrow.setAttribute(
            "x1",
            rightX + halfArrow
        );

        rightForceArrow.setAttribute(
            "x2",
            rightX - halfArrow
        );

    } else if (product > 0) {

        /*
         * Repulsion:
         * left arrow points left
         * right arrow points right
         */

        leftForceArrow.setAttribute(
            "x1",
            leftX + halfArrow
        );

        leftForceArrow.setAttribute(
            "x2",
            leftX - halfArrow
        );

        rightForceArrow.setAttribute(
            "x1",
            rightX - halfArrow
        );

        rightForceArrow.setAttribute(
            "x2",
            rightX + halfArrow
        );

    } else {

        /*
         * Zero force:
         * collapse arrows to a point above each charge
         */

        leftForceArrow.setAttribute(
            "x1",
            leftX
        );

        leftForceArrow.setAttribute(
            "x2",
            leftX
        );

        rightForceArrow.setAttribute(
            "x1",
            rightX
        );

        rightForceArrow.setAttribute(
            "x2",
            rightX
        );
    }
}


function updateFieldLines(
    leftX,
    rightX
) {

    /*
     * Keep the field-line curves connected
     * to the moving charges.
     */

    const leftEdge =
        leftX + 55;

    const rightEdge =
        rightX - 55;

    const midX =
        (leftX + rightX) / 2;

    fieldLineUpper.setAttribute(
        "d",
        `M ${leftEdge} 205
         C ${midX - 45} 140
           ${midX + 45} 140
           ${rightEdge} 205`
    );

    fieldLineMiddle.setAttribute(
        "d",
        `M ${leftEdge} 210
         C ${midX - 45} 210
           ${midX + 45} 210
           ${rightEdge} 210`
    );

    fieldLineLower.setAttribute(
        "d",
        `M ${leftEdge} 215
         C ${midX - 45} 280
           ${midX + 45} 280
           ${rightEdge} 215`
    );
}


function updateDiagram(
    q1,
    q2,
    r
) {

    setChargeAppearance(
        positiveCharge,
        positiveChargeLabel,
        q1
    );

    setChargeAppearance(
        negativeCharge,
        negativeChargeLabel,
        q2
    );

    const positions =
        setChargePositions(r);

    setForceArrows(
        q1,
        q2,
        r,
        positions.leftX,
        positions.rightX
    );

    updateFieldLines(
        positions.leftX,
        positions.rightX
    );

    const product =
        q1 * q2;

    if (product < 0) {

        fieldLines.style.opacity =
            "0.42";

    } else if (product > 0) {

        fieldLines.style.opacity =
            "0.28";

    } else {

        fieldLines.style.opacity =
            "0.12";
    }
}


function typesetCalculation() {

    if (
        window.MathJax &&
        typeof window.MathJax.typesetPromise === "function"
    ) {

        window.MathJax
            .typesetPromise([coulombCalculation])
            .catch(function (error) {

                console.error(
                    "MathJax typesetting failed:",
                    error
                );
            });
    }
}


function updateCoulombWidget() {

    const q1 =
        Number(q1Slider.value);

    const q2 =
        Number(q2Slider.value);

    const r =
        Number(rSlider.value);

    const k =
        8.99;

    const force =
        k * q1 * q2 / (r * r);

    q1Value.textContent =
        formatCharge(q1);

    q2Value.textContent =
        formatCharge(q2);

    rValue.textContent =
        formatDistance(r);

    coulombCalculation.innerHTML =
        "\\[" +
        "F" +
        "=" +
        "k\\frac{q_1q_2}{r^2}" +
        "=" +
        "\\frac{" +
        k.toFixed(2) +
        "(" +
        formatCharge(q1) +
        ")" +
        "(" +
        formatCharge(q2) +
        ")}{" +
        formatDistance(r) +
        "^2}" +
        "=" +
        formatForce(force) +
        "\\,\\mathrm{N}" +
        "\\]";

        updateDiagram(
        q1,
        q2,
        r
    );


    typesetCalculation();
}


menuButton.addEventListener(
    "click",
    function () {

        const isOpen =
            menuButton.getAttribute(
                "aria-expanded"
            ) === "true";

        if (isOpen) {
            closeSiteMenu();
        } else {
            openSiteMenu();
        }
    }
);


document.addEventListener(
    "click",
    function (event) {

        const clickedInsideMenu =
            event.target.closest(
                ".menuContainer"
            );

        if (!clickedInsideMenu) {
            closeSiteMenu();
        }
    }
);


document.addEventListener(
    "keydown",
    function (event) {

        if (event.key === "Escape") {

            closeSiteMenu();

            menuButton.focus();
        }
    }
);


[
    q1Slider,
    q2Slider,
    rSlider
].forEach(function (slider) {

    slider.addEventListener(
        "input",
        updateCoulombWidget
    );
});


updateCoulombWidget();