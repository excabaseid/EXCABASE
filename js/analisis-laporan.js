
document.addEventListener("DOMContentLoaded", function () {
    "use strict";

    const $ = id => document.getElementById(id);

    const equipmentNames = {
        excavator: "Excavator",
        dumptruck: "Dump Truck",
        wheelloader: "Wheel Loader",
        motorgrader: "Motor Grader",
        bulldozer: "Bulldozer",
        compactor: "Compactor"
    };

    const scenarioNames = {
        dasar: "Dasar",
        hemat: "Hemat",
        cepat: "Cepat"
    };

    const scenarioKeys = ["dasar", "hemat", "cepat"];

    function number(value) {
        if (value === null || value === undefined || value === "") {
            return NaN;
        }
        return Number(value);
    }

    function valid(value) {
        return Number.isFinite(number(value));
    }

    function formatNumber(value) {
        return valid(value)
            ? number(value).toLocaleString("id-ID", {
                maximumFractionDigits: 2
            })
            : "—";
    }

    function formatRupiah(value) {
        return valid(value)
            ? "Rp" + number(value).toLocaleString("id-ID", {
                maximumFractionDigits: 0
            })
            : "—";
    }

    function setText(id, value) {
        const element = $(id);
        if (element) element.textContent = value;
    }

    function equipmentName(type) {
        return equipmentNames[type] || type || "Alat";
    }

    function createElement(tag, className, content) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (content !== undefined) el.textContent = content;
        return el;
    }

    function addTableRow(body, values) {
        const row = document.createElement("tr");

        values.forEach(value => {
            row.appendChild(
                createElement("td", "", String(value ?? "—"))
            );
        });

        body.appendChild(row);
    }

    
    // ========================================
    // GRAFIK VERTIKAL
    // ========================================

    function renderVerticalChart(id, items, unit) {
        const root = $(id);
        if (!root) return;

        root.replaceChildren();

        const data = items.filter(
            item => valid(item.value) && number(item.value) >= 0
        );

        if (!data.length) {
            root.textContent = "Data grafik belum tersedia.";
            return;
        }

        const maxValue = Math.max(
            1,
            ...data.map(item => number(item.value))
        );

        const chart = createElement(
            "div", "report-vertical-chart"
        );

        // Sumbu Y grafik vertikal
        const axis = createElement(
            "div", "report-y-axis"
        );

        for (let i = 4; i >= 0; i--) {
            axis.appendChild(
                createElement(
                    "span",
                    "",
                    formatNumber(maxValue * i / 4)
                )
            );
        }

        const plot = createElement(
            "div", "report-plot"
        );

        data.forEach((item, index) => {
            const column = createElement(
                "div", "report-column"
            );

            const valueLabel = createElement(
                "div",
                "report-column-value",
                formatNumber(item.value)
            );

            const bar = createElement(
                "div", "report-column-bar"
            );

            bar.style.height =
                (number(item.value) / maxValue * 100) + "%";

            bar.style.background =
                index % 2 === 0 ? "#17324d" : "#eab308";

            const label = createElement(
                "div",
                "report-column-label",
                item.label
            );

            column.append(valueLabel, bar, label);
            plot.appendChild(column);
        });

        chart.append(axis, plot);
        root.appendChild(chart);

        if (unit) {
            root.appendChild(
                createElement(
                    "p",
                    "report-note",
                    "Satuan: " + unit
                )
            );
        }
    }

    // ========================================
    // GRAFIK DURASI DAN BIAYA ARMADA
    // ========================================

    function renderCombinedChart(fleet) {
        const root = $("durationCostChart");
        if (!root) return;

        root.replaceChildren();

        const items = scenarioKeys
            .filter(key => fleet.scenarios?.[key])
            .map(key => ({
                key: key,
                name: scenarioNames[key],
                days: number(
                    fleet.scenarios[key].longestEquipmentDuration
                ),
                cost: number(
                    fleet.scenarios[key].totalCost
                )
            }))
            .filter(item =>
                Number.isFinite(item.days) &&
                Number.isFinite(item.cost) &&
                item.days >= 0 &&
                item.cost >= 0
            );

        if (!items.length) {
            root.textContent =
                "Hasil simulasi armada belum tersedia.";
            return;
        }

        const maxDays = Math.max(
            1,
            ...items.map(item => item.days)
        );

        const maxCost = Math.max(
            1,
            ...items.map(item => item.cost)
        );

        const chart = createElement(
            "div", "report-vertical-chart"
        );

        // ====================================
        // SUMBU KIRI: DURASI (HARI)
        // ====================================

        const leftAxis = createElement(
            "div", "report-y-axis"
        );

        for (let i = 4; i >= 0; i--) {
            leftAxis.appendChild(
                createElement(
                    "span",
                    "",
                    formatNumber(maxDays * i / 4)
                )
            );
        }

        // ====================================
        // AREA BATANG GRAFIK
        // ====================================

        const plot = createElement(
            "div", "report-plot"
        );

        items.forEach(item => {
            const group = createElement(
                "div", "report-column"
            );

            group.style.maxWidth = "180px";
            group.style.flexDirection = "row";
            group.style.alignItems = "flex-end";
            group.style.gap = "10px";

            // Batang navy: durasi
            const durationBar = createElement(
                "div", "report-column-bar"
            );

            durationBar.style.width = "42%";
            durationBar.style.minWidth = "15px";
            durationBar.style.height =
                (item.days / maxDays * 100) + "%";
            durationBar.style.background = "#17324d";

            durationBar.title =
                item.name + ": " +
                formatNumber(item.days) + " hari";

            // Batang kuning: biaya
            const costBar = createElement(
                "div", "report-column-bar"
            );

            costBar.style.width = "42%";
            costBar.style.minWidth = "15px";
            costBar.style.height =
                (item.cost / maxCost * 100) + "%";
            costBar.style.background = "#eab308";

            costBar.title =
                item.name + ": " +
                formatRupiah(item.cost);

            const label = createElement(
                "div",
                "report-column-label",
                item.name
            );

            group.append(durationBar, costBar, label);
            plot.appendChild(group);
        });

        // ====================================
        // SUMBU KANAN: BIAYA (RUPIAH)
        // ====================================

        const rightAxis = createElement(
            "div", "report-y-axis"
        );

        rightAxis.classList.add("report-cost-axis");

        for (let i = 4; i >= 0; i--) {
            const value = maxCost * i / 4;

            let label;

            if (value >= 1000000000) {
                label = "Rp" +
                    formatNumber(value / 1000000000) +
                    " M";
            } else if (value >= 1000000) {
                label = "Rp" +
                    formatNumber(value / 1000000) +
                    " jt";
            } else if (value >= 1000) {
                label = "Rp" +
                    formatNumber(value / 1000) +
                    " rb";
            } else {
                label = "Rp" + formatNumber(value);
            }

            rightAxis.appendChild(
                createElement("span", "", label)
            );
        }

        // Susunan akhir: kiri - grafik - kanan
        chart.append(leftAxis, plot, rightAxis);
        root.appendChild(chart);

        // ====================================
        // LEGENDA
        // ====================================

        const legend = createElement(
            "div", "report-dual-legend"
        );

        [
            ["#17324d", "Durasi (hari) — sumbu kiri"],
            ["#eab308", "Biaya (Rp) — sumbu kanan"]
        ].forEach(([color, label]) => {
            const item = createElement("span");

            const dot = createElement(
                "span", "report-legend-dot"
            );

            dot.style.background = color;

            item.append(
                dot,
                document.createTextNode(label)
            );

            legend.appendChild(item);
        });

        root.appendChild(legend);

        // ====================================
        // CATATAN TEKNIS
        // ====================================

        const note = createElement(
            "p",
            "report-note",
            "Durasi menunjukkan durasi alat terlama, " +
            "bukan durasi keseluruhan proyek. " +
            "Biaya dan durasi menggunakan skala " +
            "yang berbeda."
        );

        root.appendChild(note);
    }


    // ========================================
    // KARTU SKENARIO TERPILIH
    // ========================================

    function renderSelectedScenario(fleet) {
        let card = $("reportSelectedScenario");

        if (!card) {
            card = createElement("div", "report-selected");
            card.id = "reportSelectedScenario";

            const section = $("detailFleet")
                ?.closest(".report-section");

            if (section) section.before(card);
        }

        card.replaceChildren();

        const key = fleet.selectedScenario;
        const result = fleet.scenarios?.[key];

        if (!scenarioNames[key] || !result) {
            card.appendChild(
                createElement(
                    "p", "",
                    "Belum ada skenario akhir yang dipilih."
                )
            );
            return;
        }

        card.appendChild(
            createElement(
                "h3", "",
                "SKENARIO PILIHAN PENGGUNA"
            )
        );

        card.appendChild(
            createElement(
                "strong", "",
                "Skenario " + scenarioNames[key]
            )
        );

        card.appendChild(
            createElement(
                "p", "",
                formatNumber(result.totalUnits) +
                " unit alat • " +
                formatNumber(result.longestEquipmentDuration) +
                " hari (alat terlama) • " +
                formatRupiah(result.totalCost)
            )
        );
    }

    // ========================================
    // TABEL PERBANDINGAN
    // ========================================

    function renderScenarioComparison(fleet, targetDays) {
        let section = $("reportFleetComparison");

        if (!section) {
            section = createElement(
                "section", "report-section"
            );

            section.id = "reportFleetComparison";

            const anchor = $("detailFleet")
                ?.closest(".report-section");

            if (anchor) anchor.before(section);
        }

        section.replaceChildren();

        section.appendChild(
            createElement(
                "h2", "",
                "Perbandingan Skenario Armada"
            )
        );

        if (!scenarioKeys.every(
            key => fleet.scenarios?.[key]
        )) {
            section.appendChild(
                createElement(
                    "p", "report-note",
                    "Tiga skenario belum tersimpan."
                )
            );
            return;
        }

        const wrapper = createElement("div");
        wrapper.style.overflowX = "auto";

        const table = createElement(
            "table", "report-table"
        );

        const thead = document.createElement("thead");
        const heading = document.createElement("tr");

        ["Parameter", "Dasar", "Hemat", "Cepat"]
            .forEach(label => {
                heading.appendChild(
                    createElement("th", "", label)
                );
            });

        thead.appendChild(heading);
        table.appendChild(thead);

        const tbody = document.createElement("tbody");

        const rows = [
            [
                "Jumlah alat",
                r => formatNumber(r.totalUnits) + " unit"
            ],
            [
                "Biaya operasional",
                r => formatRupiah(r.totalCost)
            ],
            [
                "Durasi alat terlama",
                r => formatNumber(
                    r.longestEquipmentDuration
                ) + " hari"
            ],
            [
                "Indikator target",
                r => targetDays > 0
                    ? number(r.longestEquipmentDuration) <=
                      targetDays
                        ? "Memenuhi"
                        : "Belum memenuhi"
                    : "Belum ditentukan"
            ]
        ];

        rows.forEach(([label, formatter]) => {
            addTableRow(tbody, [
                label,
                ...scenarioKeys.map(key =>
                    formatter(fleet.scenarios[key])
                )
            ]);
        });

        table.appendChild(tbody);
        
        // Menandai kolom skenario pilihan pengguna
        const selectedIndex =
            scenarioKeys.indexOf(fleet.selectedScenario);

        if (selectedIndex !== -1) {
            const columnIndex = selectedIndex + 1;

            table.querySelectorAll("tr").forEach(function (row) {
                const cell = row.children[columnIndex];

                if (cell) {
                    cell.classList.add("selected-scenario");
                }
            });
        }

        wrapper.appendChild(table);
        section.appendChild(wrapper);
    }

    // ========================================
    // MEMBACA DATA LAPORAN
    // ========================================

    function loadReport() {
        let project = null;

        try {
            project =
                typeof getExcabaseActiveProject === "function"
                    ? getExcabaseActiveProject()
                    : JSON.parse(
                        localStorage.getItem(
                            "excabase_active_project"
                        ) || "null"
                    );
        } catch (error) {
            console.error("Gagal membaca proyek:", error);
        }

        if (!project) {
            setText(
                "reportConclusion",
                "Belum ada proyek aktif."
            );
            return;
        }

        const results = project.results || {};
        const rawEarth = results.earthwork || {};

        const earth = {
            BCM: rawEarth.BCM ?? rawEarth.bcm ??
                project.soilVolumeBCM,
            LCM: rawEarth.LCM ?? rawEarth.lcm,
            CCM: rawEarth.CCM ?? rawEarth.ccm
        };

        const estimate = results.estimate || {};
        const productivity = results.productivity || {};

function getEquipmentModel(type) {
    const savedModel = productivity[type]?.model;

    if (
        typeof savedModel === "string" &&
        savedModel.trim()
    ) {
        return savedModel.trim();
    }

    return "Model belum tercatat";
}

        const completed = String(project.status || "").toLowerCase() === "selesai";
        const estimateCurrent = completed || isExcabaseEstimateCurrent(project);
        const fleetCurrent = completed || isExcabaseFleetCurrent(project);
        const equipment = estimateCurrent && Array.isArray(estimate.equipment)
            ? estimate.equipment
            : [];

        const fleet = fleetCurrent ? results.fleet || {} : {};

        const targetDays = number(project.targetDays);
        const workingHours = number(
            project.workHoursPerDay
        );

        // Alat yang benar-benar masuk estimasi terbaru
        const actualEquipment = [
            ...new Set(
                equipment.map(item => equipmentName(item.type))
            )
        ];

        const equipmentText = actualEquipment.length
            ? actualEquipment.join(" dan ")
            : "Belum tersedia";

        const totalUnits = equipment.length
            ? equipment.reduce(
                (sum, item) => sum + number(item.units),
                0
            )
            : NaN;

        const totalCost = equipment.length
            ? equipment.reduce(
                (sum, item) =>
                    sum + number(item.totalOperatingCost),
                0
            )
            : NaN;

        const longestDuration = equipment.length
            ? Math.max(
                ...equipment.map(item =>
                    number(item.durationDays)
                )
            )
            : NaN;

        const selectedKey = fleet.selectedScenario;
        const selected = fleet.scenarios?.[selectedKey];

        // RINGKASAN
        setText(
            "reportTitle",
            "Laporan: " + (project.name || "Proyek Aktif")
        );

        setText(
            "reportSubtitle",
            !estimateCurrent && estimate.equipment?.length
                ? "Produktivitas berubah. Hitung dan simpan Estimasi lalu Simulasi terbaru. Hasil lama tetap tersimpan."
                : !fleetCurrent && results.fleet
                    ? "Estimasi berubah. Hitung dan simpan Simulasi terbaru. Hasil Simulasi lama tetap tersimpan."
                    : "Analisis teknis pekerjaan tanah dan alat berat"
        );

        setText("summaryProjectName", project.name || "—");
        setText(
            "summaryProjectLocation",
            project.location || "—"
        );
        setText(
            "summaryWorkType",
            project.workType || "—"
        );

        setText(
            "summaryVolume",
            formatNumber(earth.BCM) + " BCM"
        );

        setText(
            "summaryTargetDays",
            formatNumber(targetDays) + " hari"
        );

        setText(
            "summaryWorkingHours",
            formatNumber(workingHours) + " jam/hari"
        );

        setText(
            "summaryLCM",
            formatNumber(earth.LCM) + " LCM"
        );

        setText(
            "summaryCCM",
            formatNumber(earth.CCM) + " CCM"
        );

        setText("summaryEquipment", equipmentText);

        const recommendation = results.recommendation || {};

        setText(
            "summaryRecommendedProductivity",
            valid(recommendation.target)
                ? formatNumber(recommendation.target) +
                  " m³/jam"
                : "Lihat produktivitas per alat"
        );

        setText(
            "summaryEstimateDuration",
            valid(longestDuration)
                ? formatNumber(longestDuration) +
                  " hari (alat terlama)"
                : "Belum dihitung"
        );

        setText(
            "summaryEstimateCost",
            formatRupiah(totalCost)
        );

        // DETAIL TEKNIS
        setText(
            "detailEarthwork",
            "Volume asli " + formatNumber(earth.BCM) +
            " BCM, volume lepas " +
            formatNumber(earth.LCM) +
            " LCM, dan volume padat " +
            formatNumber(earth.CCM) + " CCM."
        );

        const equipmentDetails = equipment.map(item => {
            return (
                equipmentName(item.type) + ": " +
                formatNumber(item.units) + " unit, " +
                "produktivitas total " +
                formatNumber(item.totalHourlyProductivity) +
                " m³/jam (" + (item.workVolumeBasis || "basis belum ditentukan").toUpperCase() +
                "), biaya operasional " +
                formatRupiah(item.totalOperatingCost)
            );
        });

        setText(
            "detailRecommendation",
            equipmentDetails.length
                ? equipmentDetails.join("; ") + "."
                : "Belum ada hasil estimasi alat."
        );

        setText(
            "detailEstimate",
            equipment.length
                ? "Jumlah alat " + formatNumber(totalUnits) +
                  " unit, biaya operasional " +
                  formatRupiah(totalCost) +
                  ", durasi alat terlama " +
                  formatNumber(longestDuration) + " hari."
                : "Estimasi belum tersedia."
        );

        setText(
            "detailFleet",
            selected
                ? "Skenario " +
                  scenarioNames[selectedKey] +
                  " dipilih pengguna, menggunakan " +
                  formatNumber(selected.totalUnits) +
                  " unit alat, biaya operasional " +
                  formatRupiah(selected.totalCost) +
                  ", durasi alat terlama " +
                  formatNumber(
                      selected.longestEquipmentDuration
                  ) + " hari."
                : "Skenario akhir belum disimpan."
        );

        
        // ========================================
        // TABEL REKAPITULASI ALAT BERAT
        // ========================================

        const tbody = $("reportResultsTable");

        if (tbody) {
            const title = tbody.closest(".report-section")?.querySelector("h2");
            if (title) title.textContent = "Rekapitulasi Alat Berat — Estimasi";
            const table = tbody.closest("table");

            if (table) {
                table.classList.add("report-equipment-table");

                const header = table.querySelector("thead");

                if (header) {
                    header.innerHTML = `
                        <tr>
                            <th>Jenis Alat</th>
                            <th>Merek / Model</th>
                            <th>Jumlah</th>
                            <th>Produktivitas Total</th>
                            <th>Durasi</th>
                            <th>Biaya Operasional</th>
                        </tr>
                    `;
                }
            }

            tbody.replaceChildren();

            equipment.forEach(function (item) {
                const row = document.createElement("tr");

                const values = [
                    equipmentName(item.type),
                    getEquipmentModel(item.type),
                    formatNumber(item.units) + " unit",
                    formatNumber(item.units) + " × " +
                        formatNumber(item.hourlyProductivity) + " = " +
                        formatNumber(item.totalHourlyProductivity) +
                        " m³/jam (" +
                        (item.workVolumeBasis || "basis belum ditentukan").toUpperCase() + ")",
                    formatNumber(item.durationDays) + " hari",
                    formatRupiah(item.totalOperatingCost)
                ];

                values.forEach(function (value) {
                    const td = document.createElement("td");
                    td.textContent = value;
                    row.appendChild(td);
                });

                tbody.appendChild(row);
            });

            if (equipment.length) {
                const totalRow = document.createElement("tr");
                totalRow.className = "report-equipment-total";

                const totalLabel = document.createElement("td");
                totalLabel.colSpan = 2;
                totalLabel.textContent = "TOTAL ESTIMASI";

                const totalUnitCell = document.createElement("td");
                totalUnitCell.textContent =
                    formatNumber(totalUnits) + " unit";

                const emptyProductivity = document.createElement("td");
                emptyProductivity.textContent = "—";

                const durationCell = document.createElement("td");
                durationCell.textContent =
                    formatNumber(longestDuration) + " hari*";

                const costCell = document.createElement("td");
                costCell.textContent = formatRupiah(totalCost);

                totalRow.append(
                    totalLabel,
                    totalUnitCell,
                    emptyProductivity,
                    durationCell,
                    costCell
                );

                tbody.appendChild(totalRow);
            }
        }


        // GRAFIK VERTIKAL
        renderVerticalChart(
            "earthworkChart",
            [
                { label: "BCM", value: earth.BCM },
                { label: "LCM", value: earth.LCM },
                { label: "CCM", value: earth.CCM }
            ],
            "m³"
        );

        const productivitySource = selected?.equipment ||
            equipment.map(item => ({
                type: item.type,
                totalProductivity:
                    item.totalHourlyProductivity,
                workVolumeBasis: item.workVolumeBasis
            }));

        renderVerticalChart(
            "fleetChart",
            productivitySource.map(item => ({
                label: equipmentName(item.type) +
                    " (" +
                    "m³/jam, " + (item.workVolumeBasis || "basis belum ditentukan").toUpperCase() +
                    ")",
                value: item.totalProductivity
            })),
            "Produktivitas per jam, sesuai basis volume alat"
        );

        renderCombinedChart(fleet);
        renderScenarioComparison(fleet, targetDays);
        renderSelectedScenario(fleet);

        // KESIMPULAN
        const parts = [];

        parts.push(
            "Proyek " + (project.name || "ini") +
            (project.location
                ? " yang berlokasi di " + project.location
                : "") +
            " merupakan pekerjaan " +
            (project.workType || "tanah") +
            " dengan volume tanah asli " +
            formatNumber(earth.BCM) + " BCM."
        );

        if (equipment.length) {
            parts.push(
                "Berdasarkan hasil estimasi terbaru, " +
                "alat berat yang dianalisis adalah " +
                equipmentText +
                " dengan jumlah awal " +
                formatNumber(totalUnits) + " unit."
            );
        }

        if (selected) {
            parts.push(
                "Pengguna memilih Skenario " +
                scenarioNames[selectedKey] +
                " yang menggunakan " +
                formatNumber(selected.totalUnits) +
                " unit alat dengan biaya operasional " +
                formatRupiah(selected.totalCost) +
                " dan durasi alat terlama " +
                formatNumber(
                    selected.longestEquipmentDuration
                ) + " hari."
            );

            if (targetDays > 0) {
                const meetsTarget =
                    number(selected.longestEquipmentDuration)
                    <= targetDays;

                parts.push(
                    meetsTarget
                        ? "Indikator durasi alat terlama " +
                          "memenuhi target " +
                          formatNumber(targetDays) + " hari."
                        : "Indikator durasi alat terlama " +
                          "belum memenuhi target " +
                          formatNumber(targetDays) + " hari."
                );
            }
        } else {
            parts.push(
                "Skenario akhir belum dipilih dan disimpan."
            );
        }

        parts.push(
            "Hasil perhitungan merupakan estimasi awal. " +
            "Durasi alat terlama tidak mewakili " +
            "durasi keseluruhan proyek. " +
            "Jumlah alat, keseimbangan produktivitas, " +
            "tahapan pekerjaan, waktu tunggu, " +
            "kondisi lapangan, serta biaya tambahan " +
            "perlu dievaluasi sebelum pelaksanaan."
        );

        setText("reportConclusion", parts.join(" "));
    }

    // TOMBOL
    $("refreshReportBtn")?.addEventListener(
        "click", loadReport
    );

    $("printReportBtn")?.addEventListener(
        "click", function () {
            window.print();
        }
    );

    loadReport();
    window.addEventListener("pageshow", function (event) {
        if (event.persisted) loadReport();
    });
    window.addEventListener("storage", function (event) {
        if (event.key === "excabase_active_project") loadReport();
    });
});
