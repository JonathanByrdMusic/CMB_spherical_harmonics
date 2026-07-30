/*
 * Navigation menu
 */

const menuButton =
    document.getElementById("menuButton");

const siteMenu =
    document.getElementById("siteMenu");

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

menuButton.addEventListener(
    "click",
    () => {
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
    event => {
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
    event => {
        if (event.key === "Escape") {
            closeSiteMenu();
            menuButton.focus();
        }
    }
);


/*
 * Reusable flipbook controller
 */

function createFlipbook({
    frames,
    imageId,
    captionId,
    counterId,
    previousButtonId,
    playButtonId,
    nextButtonId,
    frameDuration
}) {
    const image =
        document.getElementById(imageId);

    const caption =
        document.getElementById(captionId);

    const counter =
        document.getElementById(counterId);

    const previousButton =
        document.getElementById(
            previousButtonId
        );

    const playButton =
        document.getElementById(
            playButtonId
        );

    const nextButton =
        document.getElementById(
            nextButtonId
        );

    let frameIndex = 0;
    let timer = null;

    function showFrame(index) {
        frameIndex =
            (
                index +
                frames.length
            ) %
            frames.length;

        const frame =
            frames[frameIndex];

        image.src =
            frame.src;

        image.alt =
            frame.alt;

        caption.textContent =
            frame.caption;

        counter.textContent =
            `${frameIndex + 1} / ${frames.length}`;
    }

    function stopAnimation() {
        if (timer !== null) {
            clearInterval(timer);
            timer = null;
        }

        playButton.textContent =
            "Play";

        playButton.setAttribute(
            "aria-label",
            "Play animation"
        );
    }

    function startAnimation() {
        timer = setInterval(
            () => {
                showFrame(
                    frameIndex + 1
                );
            },
            frameDuration
        );

        playButton.textContent =
            "Pause";

        playButton.setAttribute(
            "aria-label",
            "Pause animation"
        );
    }

    previousButton.addEventListener(
        "click",
        () => {
            stopAnimation();

            showFrame(
                frameIndex - 1
            );
        }
    );

    nextButton.addEventListener(
        "click",
        () => {
            stopAnimation();

            showFrame(
                frameIndex + 1
            );
        }
    );

    playButton.addEventListener(
        "click",
        () => {
            if (timer === null) {
                startAnimation();
            } else {
                stopAnimation();
            }
        }
    );

    showFrame(0);
}


/*
 * Gradient flipbook
 */

const gradientFrames = [
    {
        src: "media/gradient_1.png",
        alt: "Side view of three hills",
        caption:
            "Begin with a side view of a hilly landscape."
    },
    {
        src: "media/gradient_2.png",
        alt: "A few gradient arrows appearing on the hills",
        caption:
            "At each point, the gradient points in the direction of steepest ascent."
    },
    {
        src: "media/gradient_3.png",
        alt: "Gradient arrows distributed across all hill slopes",
        caption:
            "On opposite sides of a hill, the arrows point in opposite directions—always uphill."
    },
    {
        src: "media/gradient_4.png",
        alt: "Oblique view of a hilly surface with gradient arrows",
        caption:
            "Rotating the view reveals the three-dimensional shape of the landscape."
    },
    {
        src: "media/gradient_5.png",
        alt: "Nearly top-down view of the surface and gradient field",
        caption:
            "From above, the changes in elevation are harder to see, but the vector field remains."
    },
    {
        src: "media/gradient_6.png",
        alt: "Top-down vector field with the landscape removed",
        caption:
            "Remove the visible surface, and what remains is the gradient vector field."
    }
];

createFlipbook({
    frames: gradientFrames,

    imageId:
        "gradientImage",

    captionId:
        "gradientCaption",

    counterId:
        "gradientFrameCounter",

    previousButtonId:
        "gradientPreviousButton",

    playButtonId:
        "gradientPlayButton",

    nextButtonId:
        "gradientNextButton",

    frameDuration: 3000
});


/*
 * Divergence flipbook
 */

const divergenceFrames = [
    {
        src: "media/divergence_1.png",
        alt: "Gradient arrows over a hilly landscape",
        caption:
            "Here is our hilly landscape with the gradient overlaid."
    },
    {
        src: "media/divergence_2.png",
        alt: "A small control volume highlighted on a hill",
        caption:
            "Now isolate a small region of the vector field."
    },
    {
        src: "media/divergence_3.png",
        alt: "Balanced gradient flow through a control volume",
        caption:
            "Divergence is zero here because the same amount of gradient enters and leaves the volume."
    },
    {
        src: "media/divergence_4.png",
        alt: "Gradient arrows spreading outward from a valley",
        caption:
            "Divergence is positive here because the gradient field is flowing mostly out of the volume."
    },
    {
        src: "media/divergence_5.png",
        alt: "Gradient arrows converging toward a smooth hilltop",
        caption:
            "Divergence is negative here because the gradient field is flowing mostly into the volume."
    },
    {
        src: "media/divergence_6.png",
        alt: "A grid of scalar values",
        caption:
            "At every point, divergence assigns a single number. The result is a scalar field. Look at the numbers. What shape is this?"
    }
];

createFlipbook({
    frames: divergenceFrames,

    imageId:
        "divergenceImage",

    captionId:
        "divergenceCaption",

    counterId:
        "divergenceFrameCounter",

    previousButtonId:
        "divergencePreviousButton",

    playButtonId:
        "divergencePlayButton",

    nextButtonId:
        "divergenceNextButton",

    frameDuration: 2200
});

/*
 * Copy buttons for code examples
 */

document.querySelectorAll(
    ".copyCodeButton"
).forEach(
    (button) => {
        button.addEventListener(
            "click",
            async () => {
                const targetId =
                    button.dataset.copyTarget;

                const codeElement =
                    document.getElementById(
                        targetId
                    );

                const codeExample =
                    button.closest(
                        ".codeExample"
                    );

                const statusElement =
                    codeExample.querySelector(
                        ".copyCodeStatus"
                    );

                const labelElement =
                    button.querySelector(
                        ".copyCodeLabel"
                    );

                if (!codeElement) {
                    return;
                }

                const code =
                    codeElement.textContent;

                try {
                    await navigator.clipboard.writeText(
                        code
                    );

                    button.classList.add(
                        "copied"
                    );

                    if (labelElement) {
                        labelElement.textContent =
                            "Copied";
                    }

                    statusElement.textContent =
                        "Python code copied to clipboard.";

                    window.setTimeout(
                        () => {
                            button.classList.remove(
                                "copied"
                            );

                            if (labelElement) {
                                labelElement.textContent =
                                    "Copy";
                            }

                            statusElement.textContent =
                                "";
                        },
                        1800
                    );
                } catch (error) {
                    /*
                     * Fallback for browsers that do not
                     * permit the Clipboard API.
                     */

                    const textArea =
                        document.createElement(
                            "textarea"
                        );

                    textArea.value = code;
                    textArea.setAttribute(
                        "readonly",
                        ""
                    );

                    textArea.style.position =
                        "fixed";

                    textArea.style.opacity =
                        "0";

                    document.body.appendChild(
                        textArea
                    );

                    textArea.select();

                    document.execCommand(
                        "copy"
                    );

                    textArea.remove();

                    statusElement.textContent =
                        "Python code copied to clipboard.";
                }
            }
        );
    }
);