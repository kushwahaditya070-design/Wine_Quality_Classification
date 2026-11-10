
(() => {
    "use strict";

    // ==========================================
    // 01. DOM HELPERS
    // ==========================================

    const $ = (selector, root = document) =>
        root.querySelector(selector);

    const $$ = (selector, root = document) =>
        [...root.querySelectorAll(selector)];

    const form = $("#predictionForm");

    const charts = {};

    // ==========================================
    // 02. LOADER ANIMATION
    // ==========================================

    function initLoader() {
        const loader = $("#loader");

        if (!loader) return;

        const finish = () => {
            setTimeout(() => {
                loader.classList.add("done");
            }, 450);
        };

        if (document.readyState === "complete") {
            finish();
        } else {
            window.addEventListener("load", finish, {
                once: true
            });
        }

        setTimeout(finish, 2200);
    }


    // ==========================================
    // 03. SCROLL & GSAP ANIMATIONS
    // ==========================================

    function initMotion() {

        document.documentElement.classList.add("js-motion");

        const items = $$(".reveal");

        if ("IntersectionObserver" in window) {

            const observer = new IntersectionObserver(
                entries => {

                    entries.forEach(entry => {

                        if (entry.isIntersecting) {

                            entry.target.classList.add("visible");

                            observer.unobserve(entry.target);
                        }

                    });

                },
                {
                    threshold: 0.12,
                    rootMargin: "0px 0px -35px 0px"
                }
            );

            items.forEach(el => observer.observe(el));

        } else {

            items.forEach(el => {
                el.classList.add("visible");
            });

        }


        // GSAP animations

        if (
            window.gsap &&
            window.ScrollTrigger &&
            !window.matchMedia(
                "(prefers-reduced-motion: reduce)"
            ).matches
        ) {

            gsap.registerPlugin(ScrollTrigger);

            gsap.from(".hero-title .title-line", {
                y: 65,
                opacity: 0,
                duration: 1.15,
                stagger: 0.16,
                ease: "power3.out",
                delay: 0.2
            });

            gsap.from(".hero-art", {
                opacity: 0,
                scale: 0.92,
                duration: 1.5,
                ease: "power2.out",
                delay: 0.35
            });

            gsap.to(".hero-art", {
                y: 22,
                ease: "none",

                scrollTrigger: {
                    trigger: ".hero",
                    start: "top top",
                    end: "bottom top",
                    scrub: 1
                }
            });

        }
    }


    // ==========================================
    // 04. MOBILE NAVIGATION
    // ==========================================

    function initMenu() {

        const toggle = $("#menuToggle");
        const menu = $("#mobileMenu");

        if (!toggle || !menu) return;

        toggle.addEventListener("click", () => {

            const open = menu.classList.toggle("open");

            toggle.setAttribute(
                "aria-expanded",
                String(open)
            );

            toggle.setAttribute(
                "aria-label",
                open
                    ? "Close navigation"
                    : "Open navigation"
            );

        });


        $$("#mobileMenu a").forEach(link => {

            link.addEventListener("click", () => {

                menu.classList.remove("open");

                toggle.setAttribute(
                    "aria-expanded",
                    "false"
                );

                toggle.setAttribute(
                    "aria-label",
                    "Open navigation"
                );

            });

        });

    }


    // ==========================================
    // 05. PREDICTION INPUT FIELDS
    // ==========================================

    function initFields() {

        $$(".field").forEach(field => {

            const number = $(
                'input[type="number"]',
                field
            );

            const range = $(
                'input[type="range"]',
                field
            );

            if (!number || !range) return;


            // Number input updates slider

            number.addEventListener("input", () => {

                if (
                    number.value !== "" &&
                    Number.isFinite(Number(number.value))
                ) {

                    const value = Number(number.value);

                    const min = Number(range.min);
                    const max = Number(range.max);

                    if (value >= min && value <= max) {
                        range.value = value;
                    }

                }

            });


            // Slider updates number input

            range.addEventListener("input", () => {

                number.value = Number(range.value)
                    .toPrecision(5)
                    .replace(/\.?0+$/, "");

            });

        });


        // Reset all fields

        if (form) {

            form.addEventListener("reset", () => {

                setTimeout(() => {

                    $$(".field", form).forEach(field => {

                        const number = $(
                            'input[type="number"]',
                            field
                        );

                        const range = $(
                            'input[type="range"]',
                            field
                        );

                        if (number && range) {
                            range.value = number.value;
                        }

                    });

                }, 0);

            });

        }

    }


    // ==========================================
    // 06. CHART.JS DEFAULT CONFIGURATION
    // ==========================================

    function chartBase() {

        if (!window.Chart) return false;

        Chart.defaults.color = "#a99a8e";

        Chart.defaults.font.family =
            '"DM Sans", sans-serif';

        Chart.defaults.font.size = 10;

        Chart.defaults.plugins.legend.labels.usePointStyle =
            true;

        Chart.defaults.plugins.legend.labels.boxWidth = 7;

        return true;
    }


    // ==========================================
    // 07. PREMIUM CORRELATION HEATMAP
    // ==========================================

    function renderHeatmap(data) {

        const host = $("#heatmap");

        if (!host || !data.correlation) return;

        const labels = data.correlation.labels;
        const matrix = data.correlation.matrix;

        if (
            !Array.isArray(labels) ||
            !Array.isArray(matrix) ||
            !labels.length ||
            matrix.length !== labels.length
        ) {
            host.textContent =
                "Correlation data is unavailable.";

            return;
        }


        // Feature name formatting

        const shortLabels = labels.map(label => {

            const names = {

                "fixed acidity": "Fixed acid",

                "volatile acidity": "Volatile acid",

                "citric acid": "Citric acid",

                "residual sugar": "Residual sugar",

                "chlorides": "Chlorides",

                "free sulfur dioxide": "Free SO₂",

                "total sulfur dioxide": "Total SO₂",

                "density": "Density",

                "pH": "pH",

                "sulphates": "Sulphates",

                "alcohol": "Alcohol"

            };

            return names[label] || label;

        });


        // Clear old heatmap

        host.innerHTML = "";


        // Main wrapper

        const wrapper = document.createElement("div");

        wrapper.className = "heatmap-wrap";


        // Grid

        const grid = document.createElement("div");

        grid.className = "heat-grid";


        // Dynamic grid columns:
        // First column = row labels
        // Remaining columns = correlation values

        grid.style.gridTemplateColumns =
            `115px repeat(${labels.length}, minmax(48px, 1fr))`;


        // Empty top-left corner

        const corner = document.createElement("div");

        corner.className = "heat-corner";

        grid.appendChild(corner);


        // ======================================
        // COLUMN FEATURE LABELS
        // ======================================

        shortLabels.forEach((label, index) => {

            const heading = document.createElement("div");

            heading.className =
                "heat-label heat-col-label";

            heading.textContent = label;

            heading.title = labels[index];

            grid.appendChild(heading);

        });


        // ======================================
        // MATRIX ROWS
        // ======================================

        matrix.forEach((row, i) => {

            // Row feature name

            const rowLabel = document.createElement("div");

            rowLabel.className =
                "heat-label heat-row-label";

            rowLabel.textContent = shortLabels[i];

            rowLabel.title = labels[i];

            grid.appendChild(rowLabel);


            // Correlation values

            row.forEach((value, j) => {

                const v = Number(value);

                const cell = document.createElement("div");

                cell.className = "heat-cell";


                // Correlation color scale

                if (!Number.isFinite(v)) {

                    cell.style.background =
                        "rgba(125, 111, 99, 0.22)";

                    cell.textContent = "—";

                } else {

                    let background;

                    if (v > 0.05) {

                        const alpha = Math.min(
                            0.9,
                            0.16 + v * 0.72
                        );

                        background =
                            `rgba(184, 140, 109, ${alpha})`;

                    } else if (v < -0.05) {

                        const alpha = Math.min(
                            0.9,
                            0.16 + Math.abs(v) * 0.72
                        );

                        background =
                            `rgba(89, 116, 126, ${alpha})`;

                    } else {

                        background =
                            "rgba(125, 111, 99, 0.22)";

                    }

                    cell.style.background = background;

                    cell.textContent = v.toFixed(2);

                }


                // Tooltip

                cell.title =
                    `${labels[i]} × ${labels[j]}: ${
                        Number.isFinite(v)
                            ? v.toFixed(3)
                            : "Not available"
                    }`;

                cell.setAttribute(
                    "aria-label",
                    cell.title
                );


                // Append cell

                grid.appendChild(cell);

            });

        });


        // Add grid to wrapper

        wrapper.appendChild(grid);


        // Add wrapper to heatmap section

        host.appendChild(wrapper);

    }


    // ==========================================
    // 08. ANALYTICS CHARTS
    // ==========================================

    function renderCharts(data) {

        if (!chartBase()) return;

        const cream = "#e8ddcf";

        const gold = "#b88c6d";

        const muted = "#8b7568";

        const grid = "rgba(238,230,217,.09)";


        // Shared chart settings

        const common = {

            responsive: true,

            maintainAspectRatio: false,

            animation: {
                duration: 1100,
                easing: "easeOutQuart"
            },

            plugins: {

                legend: {
                    display: false
                },

                tooltip: {

                    backgroundColor: "#211714",

                    borderColor:
                        "rgba(238,230,217,.2)",

                    borderWidth: 1,

                    padding: 12,

                    titleColor: cream,

                    bodyColor: "#c5b6a8"

                }

            },

            scales: {

                x: {
                    grid: {
                        display: false
                    },

                    ticks: {
                        color: muted
                    }
                },

                y: {

                    grid: {
                        color: grid
                    },

                    ticks: {
                        color: muted
                    },

                    beginAtZero: true

                }

            }

        };


        // Destroy previous charts before rendering

        Object.values(charts).forEach(chart => {
            chart.destroy();
        });


        // ======================================
        // QUALITY DISTRIBUTION
        // ======================================

        const qualityCanvas = $("#qualityChart");

        if (
            qualityCanvas &&
            data.quality_distribution
        ) {

            charts.quality = new Chart(
                qualityCanvas,
                {

                    type: "bar",

                    data: {

                        labels:
                            data.quality_distribution.labels,

                        datasets: [{

                            data:
                                data.quality_distribution.values,

                            backgroundColor:
                                data.quality_distribution.labels.map(
                                    (_, i) =>
                                        i >= 3 ? gold : "#65403a"
                                ),

                            borderRadius: 3,

                            maxBarThickness: 42

                        }]

                    },

                    options: {

                        ...common,

                        plugins: {

                            ...common.plugins,

                            tooltip: {

                                ...common.plugins.tooltip,

                                callbacks: {

                                    label: c =>
                                        ` ${c.raw.toLocaleString()} wines`

                                }

                            }

                        },

                        scales: {

                            ...common.scales,

                            x: {

                                ...common.scales.x,

                                title: {

                                    display: true,

                                    text: "Original quality score",

                                    color: muted

                                }

                            },

                            y: {

                                ...common.scales.y,

                                title: {

                                    display: true,

                                    text: "Samples",

                                    color: muted

                                }

                            }

                        }

                    }

                }
            );

        }


        // ======================================
        // ALCOHOL DISTRIBUTION
        // ======================================

        const alcoholCanvas = $("#alcoholChart");

        if (
            alcoholCanvas &&
            data.alcohol
        ) {

            charts.alcohol = new Chart(
                alcoholCanvas,
                {

                    type: "bar",

                    data: {

                        labels: data.alcohol.labels,

                        datasets: [{

                            data: data.alcohol.values,

                            backgroundColor: gold,

                            borderRadius: 3,

                            maxBarThickness: 25

                        }]

                    },

                    options: {

                        ...common,

                        indexAxis: "y",

                        scales: {

                            x: {
                                ...common.scales.y
                            },

                            y: {
                                ...common.scales.x
                            }

                        }

                    }

                }
            );

        }


        // ======================================
        // ACIDITY ANALYSIS
        // ======================================

        const acidityCanvas = $("#acidityChart");

        if (
            acidityCanvas &&
            data.acidity
        ) {

            charts.acidity = new Chart(
                acidityCanvas,
                {

                    type: "bar",

                    data: {

                        labels: data.acidity.labels,

                        datasets: [{

                            data: data.acidity.values,

                            backgroundColor: [
                                "#9b6d5d",
                                "#bd8b70",
                                "#9c7965",
                                "#6e7770"
                            ],

                            borderRadius: 3,

                            maxBarThickness: 35

                        }]

                    },

                    options: {

                        ...common,

                        plugins: {

                            ...common.plugins,

                            tooltip: {

                                ...common.plugins.tooltip,

                                callbacks: {

                                    label: c =>
                                        ` Median: ${c.raw}`

                                }

                            }

                        }

                    }

                }
            );

        }


        // ======================================
        // CORRELATION HEATMAP
        // ======================================

        renderHeatmap(data);

    }


    // ==========================================
    // 09. LOAD DATASET ANALYTICS
    // ==========================================

    async function loadAnalytics() {

        try {

            const response = await fetch("/api/analytics");

            if (!response.ok) {
                throw new Error("Analytics unavailable");
            }

            const data = await response.json();


            // Update overview statistics

            if (data.overview) {

                Object.entries(data.overview).forEach(
                    ([key, value]) => {

                        const el = $(
                            `[data-count="${key}"]`
                        );

                        if (!el) return;

                        el.textContent =
                            key === "high_quality_pct"
                                ? `${value}%`
                                : Number(value).toLocaleString();

                    }
                );

            }


            // Render charts

            renderCharts(data);

        } catch (err) {

            console.error(
                "Analytics loading error:",
                err
            );

            const heatmap = $("#heatmap");

            if (heatmap) {
                heatmap.textContent =
                    "Unable to load correlation data.";
            }

        }

    }


    // ==========================================
    // 10. PREDICTION ERROR HANDLING
    // ==========================================

    function showError(message) {

        const placeholder = $("#resultPlaceholder");

        const content = $("#resultContent");

        const error = $("#resultError");

        if (placeholder) placeholder.hidden = true;

        if (content) content.hidden = true;

        if (error) {

            error.hidden = false;

            error.textContent = message;

        }

    }


    // ==========================================
    // 11. WINE QUALITY PREDICTION
    // ==========================================

    if (form) {

        form.addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                const button = $(".submit-button", form);

                if (!button) return;

                const original = button.innerHTML;


                // Collect model input features

                const payload = {};

                let invalid = false;

                $$(".field", form).forEach(field => {

                    const input = $(
                        'input[type="number"]',
                        field
                    );

                    if (!input) return;

                    const value = input.value.trim();

                    if (
                        value === "" ||
                        !Number.isFinite(Number(value))
                    ) {

                        input.setCustomValidity(
                            "Please enter a valid number."
                        );

                        input.reportValidity();

                        input.setCustomValidity("");

                        invalid = true;

                        return;

                    }

                    const number = Number(value);

                    if (
                        input.min !== "" &&
                        number < Number(input.min)
                    ) {
                        invalid = true;
                        input.reportValidity();
                        return;
                    }

                    if (
                        input.max !== "" &&
                        number > Number(input.max)
                    ) {
                        invalid = true;
                        input.reportValidity();
                        return;
                    }

                    payload[input.name] = number;

                });


                if (invalid) return;


                // Loading state

                button.disabled = true;

                button.innerHTML =
                    "<span>READING THE NOTES…</span><b>◌</b>";


                const error = $("#resultError");

                const placeholder = $("#resultPlaceholder");

                const content = $("#resultContent");

                if (error) error.hidden = true;

                if (placeholder) placeholder.hidden = true;

                if (content) content.hidden = true;


                try {

                    // Send prediction request

                    const response = await fetch(
                        "/api/predict",
                        {

                            method: "POST",

                            headers: {
                                "Content-Type": "application/json"
                            },

                            body: JSON.stringify(payload)

                        }
                    );


                    const result = await response.json();


                    if (!response.ok) {

                        throw new Error(
                            result.error ||
                            "Prediction could not be completed."
                        );

                    }


                    // Display prediction

                    const resultLabel = $("#resultLabel");

                    const resultDescription =
                        $("#resultDescription");

                    const resultConfidence =
                        $("#resultConfidence");

                    const confidenceBar =
                        $("#confidenceBar");


                    if (resultLabel) {
                        resultLabel.textContent = result.label;
                    }

                    if (resultDescription) {
                        resultDescription.textContent =
                            result.description;
                    }

                    if (resultConfidence) {

                        resultConfidence.textContent =
                            result.confidence === null
                                ? "Not available"
                                : `${result.confidence}%`;

                    }

                    if (confidenceBar) {

                        confidenceBar.style.width =
                            result.confidence === null
                                ? "0%"
                                : `${result.confidence}%`;

                    }


                    // Show result

                    if (content) {

                        content.hidden = false;

                        if (content.animate) {

                            content.animate(

                                [
                                    {
                                        opacity: 0,
                                        transform: "translateY(14px)"
                                    },

                                    {
                                        opacity: 1,
                                        transform: "translateY(0)"
                                    }

                                ],

                                {
                                    duration: 650,
                                    easing: "ease-out"
                                }

                            );

                        }

                    }

                } catch (error) {

                    showError(error.message);

                    console.error(
                        "Prediction error:",
                        error
                    );

                } finally {

                    // Restore button

                    button.disabled = false;

                    button.innerHTML = original;

                }

            }
        );

    }


    // ==========================================
    // 12. INITIALIZE WEBSITE
    // ==========================================

    function init() {

        initLoader();

        initMotion();

        initMenu();

        initFields();

        loadAnalytics();

    }


    // Run after DOM is ready

    if (document.readyState === "loading") {

        document.addEventListener(
            "DOMContentLoaded",
            init,
            { once: true }
        );

    } else {

        init();

    }

})();
