function CMBAudio() {

    // ---------------------------------------------------------
    // Core audio state
    // ---------------------------------------------------------

    this.context = null;
    this.masterGain = null;

    this.temperatureBus = null;
    this.polarizationBus = null;

    this.masterVolume = 0.5;
    this.observationMode = "temperature";


    // ---------------------------------------------------------
    // Temperature sonification
    // ---------------------------------------------------------

    this.noiseSource = null;

    this.dryGain = null;
    this.invertedGain = null;
    this.filters = [];

    this.blueNoiseSource = null;
    this.blueNoiseGain = null;

    this.hotness = 0.5;


    // ---------------------------------------------------------
    // Polarization sonification
    // ---------------------------------------------------------

    this.polarizationSource = null;
    this.polarizationGain = null;
    this.polarizationFilters = [];

    this.polarizationChorusDelay = null;
    this.polarizationChorusLFO = null;
    this.polarizationChorusDepth = null;

    this.polarizationChorusDryGain = null;
    this.polarizationChorusWetGain = null;

    this.polarizationStrength = 0.0;
    this.polarizationCoherence = 0.5;

    /*
    * Largest coherence encountered during testing.
    * Used to map the naturally occurring range
    * onto 0...1 for the sonification.
    */
    this.polarizationCoherenceReference =
        0.6762396219877641;


    // ---------------------------------------------------------
    // EQ settings
    // ---------------------------------------------------------

    this.filterCount = 5;

    this.temperatureEQSettings = [
        { frequency: 220,  gain: 12.0, q: 2.3 },
        { frequency: 537,  gain: 8.6,  q: 5.1 },
        { frequency: 810,  gain: 8.4,  q: 7.4 },
        { frequency: 1120, gain: 5.2,  q: 9.3 },
        { frequency: 1440, gain: 3.5,  q: 11.0 }
    ];

    this.polarizationEQSettings = [
        { frequency: 1000, gain: 0, q: 1 },
        { frequency: 1000, gain: 0, q: 1 },
        { frequency: 1000, gain: 0, q: 1 },
        { frequency: 1000, gain: 0, q: 1 },
        { frequency: 1000, gain: 0, q: 1 }
    ];

    this.polarizationReady = false;


    // =========================================================
    // NOISE GENERATORS
    // =========================================================

    this.createPinkNoiseBuffer = function() {

        let bufferSize =
            2 * this.context.sampleRate;

        let buffer =
            this.context.createBuffer(
                1,
                bufferSize,
                this.context.sampleRate
            );

        let output =
            buffer.getChannelData(0);

        let b0 = 0;
        let b1 = 0;
        let b2 = 0;
        let b3 = 0;
        let b4 = 0;
        let b5 = 0;
        let b6 = 0;

        for (
            let i = 0;
            i < bufferSize;
            i++
        ) {

            let white =
                Math.random() * 2 - 1;

            b0 =
                0.99886 * b0 +
                white * 0.0555179;

            b1 =
                0.99332 * b1 +
                white * 0.0750759;

            b2 =
                0.96900 * b2 +
                white * 0.1538520;

            b3 =
                0.86650 * b3 +
                white * 0.3104856;

            b4 =
                0.55000 * b4 +
                white * 0.5329522;

            b5 =
                -0.7616 * b5 -
                white * 0.0168980;

            output[i] =
                b0 +
                b1 +
                b2 +
                b3 +
                b4 +
                b5 +
                b6 +
                white * 0.5362;

            output[i] *= 0.08;

            b6 =
                white * 0.115926;
        }

        return buffer;
    };


    this.createBlueNoiseBuffer = function() {

        let bufferSize =
            2 * this.context.sampleRate;

        let buffer =
            this.context.createBuffer(
                1,
                bufferSize,
                this.context.sampleRate
            );

        let output =
            buffer.getChannelData(0);

        let previousWhite = 0;

        for (
            let i = 0;
            i < bufferSize;
            i++
        ) {

            let white =
                Math.random() * 2 - 1;

            output[i] =
                (
                    white -
                    previousWhite
                ) *
                0.08;

            previousWhite =
                white;
        }

        return buffer;
    };


    // =========================================================
    // EQ HELPERS
    // =========================================================

    this.normalizedEQSettings = function(
        settings
    ) {

        var normalized = [];

        settings =
            settings || [];

        for (
            var i = 0;
            i < this.filterCount;
            i++
        ) {

            if (
                i < settings.length
            ) {

                normalized.push({
                    frequency:
                        settings[i].frequency,

                    gain:
                        settings[i].gain,

                    q:
                        settings[i].q
                });

            } else {

                normalized.push({
                    frequency: 1000,
                    gain: 0,
                    q: 1
                });
            }
        }

        return normalized;
    };


    this.createEQChain = function(
        source,
        cents,
        filterStore,
        settings
    ) {

        var previous =
            source;

        var pitchRatio =
            Math.pow(
                2,
                cents / 1200
            );

        settings =
            this.normalizedEQSettings(
                settings
            );

        for (
            var i = 0;
            i < this.filterCount;
            i++
        ) {

            var setting =
                settings[i];

            var filter =
                this.context.createBiquadFilter();

            filter.type =
                "peaking";

            filter.frequency.value =
                setting.frequency *
                pitchRatio;

            filter.gain.value =
                setting.gain;

            filter.Q.value =
                setting.q;

            previous.connect(
                filter
            );

            previous =
                filter;

            filterStore.push(
                filter
            );
        }

        return previous;
    };


    this.updateFilterBank = function(
        filters,
        settings,
        cents
    ) {

        if (
            !this.context ||
            !filters ||
            filters.length === 0
        ) {
            return;
        }

        var normalized =
            this.normalizedEQSettings(
                settings
            );

        var now =
            this.context.currentTime;

        var rampTime =
            0.15;

        var pitchRatio =
            Math.pow(
                2,
                cents / 1200
            );

        for (
            var i = 0;
            i < filters.length;
            i++
        ) {

            var setting =
                normalized[i];

            filters[i].frequency
                .cancelScheduledValues(
                    now
                );

            filters[i].gain
                .cancelScheduledValues(
                    now
                );

            filters[i].Q
                .cancelScheduledValues(
                    now
                );

            filters[i].frequency
                .setTargetAtTime(
                    setting.frequency *
                        pitchRatio,
                    now,
                    rampTime
                );

            filters[i].gain
                .setTargetAtTime(
                    setting.gain,
                    now,
                    rampTime
                );

            filters[i].Q
                .setTargetAtTime(
                    setting.q,
                    now,
                    rampTime
                );
        }
    };

    this.createPolarizationVoice = function(
        buffer
    ) {

        var source =
            this.context.createBufferSource();

        source.buffer =
            buffer;

        source.loop =
            true;


        var dryGain =
            this.context.createGain();

        dryGain.gain.value =
            1.0;


        var invertedGain =
            this.context.createGain();

        invertedGain.gain.value =
            -1.0;


        var sumGain =
            this.context.createGain();

        sumGain.gain.value =
            1.0;


        this.polarizationGain =
            this.context.createGain();

        this.polarizationGain.gain.value =
            this.polarizationStrength;

        /*
        * Mono chorus stage.
        *
        * The polarization signal is mixed with a slightly
        * delayed copy of itself. A slow LFO varies the delay.
        *
        * Coherence controls how far the delay moves:
        *
        * high coherence -> little motion
        * low coherence  -> stronger swirling chorus
        */

        this.polarizationChorusDelay =
            this.context.createDelay(
                0.05
            );

        this.polarizationChorusDelay.delayTime.value =
            0.012;


        this.polarizationChorusDryGain =
            this.context.createGain();

        this.polarizationChorusDryGain.gain.value =
            0.70;


        this.polarizationChorusWetGain =
            this.context.createGain();

        this.polarizationChorusWetGain.gain.value =
            0.35;


        this.polarizationChorusLFO =
            this.context.createOscillator();

        this.polarizationChorusLFO.type =
            "sine";

        this.polarizationChorusLFO.frequency.value =
            0.35;


        this.polarizationChorusDepth =
            this.context.createGain();

        this.polarizationChorusDepth.gain.value =
            0.0;


        /*
        * The LFO modulates the delay time directly.
        */
        this.polarizationChorusLFO.connect(
            this.polarizationChorusDepth
        );

        this.polarizationChorusDepth.connect(
            this.polarizationChorusDelay.delayTime
        );


        /*
        * Dry branch
        */
        source.connect(
            dryGain
        );

        dryGain.connect(
            sumGain
        );


        /*
        * EE-filtered, polarity-inverted branch
        */
        var filteredOutput =
            this.createEQChain(
                source,
                0,
                this.polarizationFilters,
                this.polarizationEQSettings
            );

        filteredOutput.connect(
            invertedGain
        );

        invertedGain.connect(
            sumGain
        );


        /*
        * Dry chorus branch
        */
        sumGain.connect(
            this.polarizationChorusDryGain
        );

        this.polarizationChorusDryGain.connect(
            this.polarizationGain
        );


        /*
        * Delayed chorus branch
        */
        sumGain.connect(
            this.polarizationChorusDelay
        );

        this.polarizationChorusDelay.connect(
            this.polarizationChorusWetGain
        );

        this.polarizationChorusWetGain.connect(
            this.polarizationGain
        );


        /*
        * Both branches are summed back to mono here.
        */
        this.polarizationGain.connect(
            this.polarizationBus
        );


        return source;
    };


    // =========================================================
    // START AUDIO
    // =========================================================

    this.startTone = function() {

        if (
            this.context
        ) {
            return;
        }


        this.context =
            new (
                window.AudioContext ||
                window.webkitAudioContext
            )();


        // -----------------------------------------------------
        // Master output
        // -----------------------------------------------------

        this.masterGain =
            this.context.createGain();

        this.masterGain.gain.value =
            this.masterVolume;

        this.masterGain.connect(
            this.context.destination
        );


        // -----------------------------------------------------
        // Temperature / Polarization buses
        // -----------------------------------------------------

        this.temperatureBus =
            this.context.createGain();

        this.polarizationBus =
            this.context.createGain();


        this.temperatureBus.gain.value =
            (
                this.observationMode ===
                "temperature"
            )
                ? 1.0
                : 0.0;


        this.polarizationBus.gain.value =
            (
                this.observationMode ===
                "polarization"
            )
                ? 1.0
                : 0.0;


        this.temperatureBus.connect(
            this.masterGain
        );

        this.polarizationBus.connect(
            this.masterGain
        );


        // -----------------------------------------------------
        // One shared pink-noise realization
        // -----------------------------------------------------

        var pinkNoiseBuffer =
            this.createPinkNoiseBuffer();


        // =====================================================
        // TEMPERATURE
        // =====================================================

        this.noiseSource =
            this.context.createBufferSource();

        this.noiseSource.buffer =
            pinkNoiseBuffer;

        this.noiseSource.loop =
            true;


        this.dryGain =
            this.context.createGain();

        this.dryGain.gain.value =
            1.0;


        this.invertedGain =
            this.context.createGain();

        this.invertedGain.gain.value =
            -1.0;


        this.filters =
            [];


        // Dry pink noise
        this.noiseSource.connect(
            this.dryGain
        );

        this.dryGain.connect(
            this.temperatureBus
        );


        // EQ-shaped pink noise, polarity inverted
        var temperatureFilteredOutput =
            this.createEQChain(
                this.noiseSource,
                0,
                this.filters,
                this.temperatureEQSettings
            );

        temperatureFilteredOutput.connect(
            this.invertedGain
        );

        this.invertedGain.connect(
            this.temperatureBus
        );


        // Existing temperature "hotness" layer
        this.blueNoiseSource =
            this.context.createBufferSource();

        this.blueNoiseSource.buffer =
            this.createBlueNoiseBuffer();

        this.blueNoiseSource.loop =
            true;


        this.blueNoiseGain =
            this.context.createGain();

        this.blueNoiseGain.gain.value =
            0.0;


        this.blueNoiseSource.connect(
            this.blueNoiseGain
        );

        this.blueNoiseGain.connect(
            this.temperatureBus
        );


        // =====================================================
        // POLARIZATION
        // =====================================================

        this.polarizationFilters =
            [];

        this.polarizationSource =
            this.createPolarizationVoice(
                pinkNoiseBuffer
            );

        this.setPolarizationCoherence(
            this.polarizationCoherence
        );


        // -----------------------------------------------------
        // Start all sources together
        // -----------------------------------------------------

        var startTime =
            this.context.currentTime +
            0.05;


        this.noiseSource.start(
            startTime
        );

        this.blueNoiseSource.start(
            startTime
        );

        this.polarizationSource.start(
            startTime
        );

        this.polarizationChorusLFO.start(
            startTime
        );


        this.setHotness(
            this.hotness
        );
    };


    // =========================================================
    // STOP AUDIO
    // =========================================================

    this.stopTone = function() {

        var sources = [
            this.noiseSource,
            this.blueNoiseSource,
            this.polarizationSource,
            this.polarizationChorusLFO
        ];


        for (
            var i = 0;
            i < sources.length;
            i++
        ) {

            if (
                sources[i]
            ) {

                try {

                    sources[i].stop();

                } catch (e) {

                    // Source may already have stopped.
                }
            }
        }


        this.noiseSource =
            null;

        this.blueNoiseSource =
            null;

        this.blueNoiseGain =
            null;


        this.dryGain =
            null;

        this.invertedGain =
            null;

        this.filters =
            [];


        this.polarizationSource =
            null;

        this.polarizationGain =
            null;

        this.polarizationFilters =
            [];

        this.polarizationChorusDelay =
            null;

        this.polarizationChorusLFO =
            null;

        this.polarizationChorusDepth =
            null;

        this.polarizationChorusDryGain =
            null;

        this.polarizationChorusWetGain =
            null;


        this.temperatureBus =
            null;

        this.polarizationBus =
            null;

        this.masterGain =
            null;

        this.context =
            null;
    };


    // =========================================================
// POLARIZATION COHERENCE -> FILTER Q
// =========================================================

this.updatePolarizationFilters = function() {

    if (
        !this.context ||
        !this.polarizationFilters ||
        this.polarizationFilters.length === 0
    ) {
        return;
    }


    var now =
        this.context.currentTime;

    var rampTime =
        0.15;


    for (
        var i = 0;
        i < this.polarizationFilters.length;
        i++
    ) {

        var setting =
            this.polarizationEQSettings[i];


        this.polarizationFilters[i].frequency
            .cancelScheduledValues(
                now
            );

        this.polarizationFilters[i].gain
            .cancelScheduledValues(
                now
            );

        this.polarizationFilters[i].Q
            .cancelScheduledValues(
                now
            );


        this.polarizationFilters[i].frequency
            .setTargetAtTime(
                setting.frequency,
                now,
                rampTime
            );


        this.polarizationFilters[i].gain
            .setTargetAtTime(
                setting.gain,
                now,
                rampTime
            );


        /*
         * Q now comes only from the EE-spectrum
         * sonification itself.
         */
        this.polarizationFilters[i].Q
            .setTargetAtTime(
                setting.q,
                now,
                rampTime
            );
    }
};


// =========================================================
// SET POLARIZATION COHERENCE
// =========================================================

this.setPolarizationCoherence = function(
    coherence
) {

    this.polarizationCoherence =
        Math.max(
            0,
            Math.min(
                1,
                coherence
            )
        );


    /*
     * Map the naturally occurring coherence range
     * onto 0...1.
     */
    var normalizedCoherence =
        this.polarizationCoherence /
        this.polarizationCoherenceReference;


    normalizedCoherence =
        Math.max(
            0,
            Math.min(
                1,
                normalizedCoherence
            )
        );


    /*
     * Decoherence controls chorus depth.
     */
    var decoherence =
        1.0 -
        normalizedCoherence;


    /*
     * Delay modulation:
     *
     * high coherence -> nearly fixed 12 ms delay
     * low coherence  -> delay swings by up to ±6 ms
     *
     * Web Audio delayTime is measured in seconds.
     */
    var modulationDepth =
        0.006 *
        decoherence;


    if (
        !this.context ||
        !this.polarizationChorusDepth
    ) {
        return;
    }


    var now =
        this.context.currentTime;


    this.polarizationChorusDepth.gain
        .cancelScheduledValues(
            now
        );


    this.polarizationChorusDepth.gain
        .setTargetAtTime(
            modulationDepth,
            now,
            0.20
        );


    console.log(
        "Audio coherence:",
        this.polarizationCoherence,
        "normalized:",
        normalizedCoherence,
        "chorus depth:",
        modulationDepth
    );
};


// =========================================================
// SPECTRUM -> AUDIO EQ
// =========================================================

this.setSpectrumEQ = function(
    settings
) {

    if (
        this.observationMode ===
        "polarization"
    ) {

        this.polarizationEQSettings =
            this.normalizedEQSettings(
                settings
            );

        this.updatePolarizationFilters();

        this.polarizationReady =
            true;


        if (
            this.context &&
            this.polarizationBus
        ) {

            var now =
                this.context.currentTime;

            this.polarizationBus.gain
                .cancelScheduledValues(
                    now
                );

            this.polarizationBus.gain
                .setTargetAtTime(
                    1.0,
                    now,
                    0.05
                );
        }

        return;
    }


    this.temperatureEQSettings =
        this.normalizedEQSettings(
            settings
        );


    this.updateFilterBank(
        this.filters,
        this.temperatureEQSettings,
        0
    );
};


    // =========================================================
    // TEMPERATURE HOTNESS
    // =========================================================

    this.setHotness = function(
        hotness
    ) {

        this.hotness =
            Math.max(
                0,
                Math.min(
                    1,
                    hotness
                )
            );


        if (
            !this.context ||
            !this.blueNoiseGain
        ) {
            return;
        }


        var now =
            this.context.currentTime;

        var rampTime =
            0.2;


        var blueLevel =
            0.18 *
            Math.max(
                0,
                this.hotness -
                0.5
            ) *
            2;


        blueLevel =
            Math.max(
                0,
                Math.min(
                    0.18,
                    blueLevel
                )
            );


        this.blueNoiseGain.gain
            .cancelScheduledValues(
                now
            );


        this.blueNoiseGain.gain
            .setTargetAtTime(
                blueLevel,
                now,
                rampTime
            );
    };


    this.testHotness = function() {

        this.setHotness(
            1.0
        );
    };


    this.resetHotness = function() {

        this.setHotness(
            0.5
        );
    };


    // =========================================================
    // POLARIZATION STRENGTH -> VOLUME
    // =========================================================

    this.setPolarizationStrength = function(
        strength
    ) {

        this.polarizationStrength =
            Math.max(
                0,
                Math.min(
                    1,
                    strength
                )
            );


        if (
            !this.context ||
            !this.polarizationGain
        ) {
            return;
        }


        var now =
            this.context.currentTime;


        this.polarizationGain.gain
            .cancelScheduledValues(
                now
            );


        this.polarizationGain.gain
            .setTargetAtTime(
                this.polarizationStrength,
                now,
                0.20
            );
    };


    // =========================================================
    // TEMPERATURE / POLARIZATION AUDIO MODE
    // =========================================================

    this.setObservationMode = function(
        mode
    ) {

        if (
            mode !== "temperature" &&
            mode !== "polarization"
        ) {
            return;
        }


        this.observationMode =
            mode;

        if (
            mode ===
            "polarization"
        ) {

            this.polarizationReady =
                false;
        }

        if (
            !this.context ||
            !this.temperatureBus ||
            !this.polarizationBus
        ) {
            return;
        }


        var now =
            this.context.currentTime;

        var rampTime =
            0.05;


        var temperatureLevel =
            (
                mode ===
                "temperature"
            )
                ? 1.0
                : 0.0;


        var polarizationLevel =
            (
                mode ===
                    "polarization" &&
                this.polarizationReady
            )
                ? 1.0
                : 0.0;


        this.temperatureBus.gain
            .cancelScheduledValues(
                now
            );


        this.polarizationBus.gain
            .cancelScheduledValues(
                now
            );


        this.temperatureBus.gain
            .setTargetAtTime(
                temperatureLevel,
                now,
                rampTime
            );


        this.polarizationBus.gain
            .setTargetAtTime(
                polarizationLevel,
                now,
                rampTime
            );
    };


    // =========================================================
    // TEST / RESET EQ
    // =========================================================

    this.testEQ = function() {

        this.setSpectrumEQ([
            {
                frequency: 220,
                gain: 20,
                q: 2
            },
            {
                frequency: 537,
                gain: 0,
                q: 5
            },
            {
                frequency: 810,
                gain: 0,
                q: 5
            },
            {
                frequency: 1120,
                gain: 0,
                q: 5
            },
            {
                frequency: 1440,
                gain: 0,
                q: 5
            }
        ]);
    };


    this.resetEQ = function() {

        this.setSpectrumEQ([
            {
                frequency: 220,
                gain: 12.0,
                q: 2.3
            },
            {
                frequency: 537,
                gain: 8.6,
                q: 5.1
            },
            {
                frequency: 810,
                gain: 8.4,
                q: 7.4
            },
            {
                frequency: 1120,
                gain: 5.2,
                q: 9.3
            },
            {
                frequency: 1440,
                gain: 3.5,
                q: 11.0
            }
        ]);
    };


    // =========================================================
    // MASTER VOLUME
    // =========================================================

    this.setVolume = function(
        value
    ) {

        value =
            Math.max(
                0,
                Math.min(
                    1,
                    value
                )
            );


        this.masterVolume =
            value;


        if (
            this.masterGain
        ) {

            this.masterGain.gain.value =
                this.masterVolume;
        }
    };


    /*
     * Retained for compatibility with simulator.js.
     */
    this.setAmplitudes = function(
        amplitudes
    ) {};
}