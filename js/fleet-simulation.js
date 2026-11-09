
document.addEventListener("DOMContentLoaded", function () {
    "use strict";

    const $ = (id) => document.getElementById(id);
    const scenarioKeys = ["dasar", "hemat", "cepat"];

    const scenarioNames = {
        dasar: "Dasar",
        hemat: "Hemat",
        cepat: "Cepat"
    };

    const equipmentNames = {
        excavator: "Excavator",
        bulldozer: "Bulldozer",
        dumptruck: "Dump Truck",
        wheelloader: "Wheel Loader",
        motorgrader: "Motor Grader",
        compactor: "Compactor"
    };

    const containers = {
        dasar: $("fleetEquipmentDasar"),
        hemat: $("fleetEquipmentHemat"),
        cepat: $("fleetEquipmentCepat")
    };

    const totalElements = {
        dasar: $("fleetTotalDasar"),
        hemat: $("fleetTotalHemat"),
        cepat: $("fleetTotalCepat")
    };

    const status = $("fleetDataStatus");
    const saveStatus = $("fleetSaveStatus");
    const evaluation = $("fleetEvaluationDetails");
    const selectedInput = $("fleetSelectedScenario");

    const formatNumber = (value) =>
        Number(value).toLocaleString("id-ID", {
            maximumFractionDigits: 2
        });

    const formatRupiah = (value) =>
        "Rp" + Number(value).toLocaleString("id-ID", {
            maximumFractionDigits: 0
        });

    // ========================================
    // 1. MEMBACA DATA PROYEK
    // ========================================

    if (
        typeof getExcabaseActiveProject !== "function" ||
        typeof saveExcabaseProject !== "function"
    ) {
        status.textContent =
            "Sistem penyimpanan proyek tidak tersedia.";
        return;
    }

    const project = getExcabaseActiveProject();

    if (!project) {
        status.textContent =
            "Proyek aktif tidak ditemukan. Buka melalui Proyek Aktif.";
        return;
    }

    const equipment = project.results?.estimate?.equipment;

    if (String(project.status || "").toLowerCase() !== "selesai" &&
        Array.isArray(equipment) && equipment.length > 0 &&
        !isExcabaseEstimateCurrent(project)) {
        status.textContent =
            "Produktivitas telah berubah. Hitung dan simpan Estimasi terbaru sebelum menggunakan Simulasi.";
        ["calculateFleetScenarioBtn", "resetFleetScenarioBtn", "saveFleetScenarioBtn"]
            .forEach(id => { $(id).disabled = true; });
        return;
    }

    if (!Array.isArray(equipment) || equipment.length === 0) {
        status.textContent =
            "Data Estimasi belum tersedia. Selesaikan Estimasi Waktu & Biaya.";
        return;
    }

    const targetDays = Number(project.targetDays) || 0;
    const workingHours = Number(project.workHoursPerDay) || 8;

    const totalBaseUnits = equipment.reduce(
        (sum, item) => sum + Number(item.units),
        0
    );

    const totalBaseCost = equipment.reduce(
        (sum, item) => sum + Number(item.totalOperatingCost),
        0
    );

    $("fleetTargetDays").textContent =
        targetDays > 0
            ? formatNumber(targetDays) + " hari"
            : "Belum diatur";

    $("fleetBaseUnits").textContent =
        formatNumber(totalBaseUnits) + " unit";

    $("fleetBaseCost").textContent =
        formatRupiah(totalBaseCost);

    // ========================================
    // 2. VALIDASI DATA ESTIMASI
    // ========================================

    const invalidEquipment = equipment.find(function (item) {
        return (
            !item.type ||
            !Number.isInteger(Number(item.units)) ||
            Number(item.units) < 1 ||
            !Number.isFinite(Number(item.totalHourlyProductivity)) ||
            Number(item.totalHourlyProductivity) <= 0 ||
            !Number.isFinite(Number(item.workVolume)) ||
            Number(item.workVolume) <= 0 ||
            !Number.isFinite(Number(item.costPerHour)) ||
            Number(item.costPerHour) < 0
        );
    });

    if (invalidEquipment) {
        status.textContent =
            "Terdapat data produktivitas, volume, jumlah alat, " +
            "atau biaya yang tidak valid pada hasil Estimasi.";
        return;
    }

    // Identitas data Estimasi untuk mendeteksi perubahan
    const estimateSignature = getExcabaseEstimateSignature(project);

    status.textContent =
        "Data Estimasi berhasil dimuat. " +
        "Konfigurasi ketiga skenario siap digunakan.";

    // ========================================
    // 3. KONFIGURASI SKENARIO
    // ========================================

    const scenarioUnits = {
        dasar: {},
        hemat: {},
        cepat: {}
    };

    const scenarioResults = {};

    // Optional read-only visualization handoff; scenario calculations stay unchanged.
    function publishVisualization() {
        if (!window.ExcabaseFleetData) return;
        const latest = getExcabaseActiveProject();
        const ready = latest && window.ExcabaseFleetData.fingerprint(latest) === window.ExcabaseFleetData.fingerprint(project) &&
            scenarioResults[selectedInput.value];
        document.dispatchEvent(new CustomEvent("excabase:fleet-visualization", {
            detail: ready ? window.ExcabaseFleetData.envelope(project, scenarioResults, selectedInput.value) : null
        }));
    }
    selectedInput.addEventListener("change", publishVisualization);

    equipment.forEach(function (item) {
        const units = Number(item.units);

        scenarioUnits.dasar[item.type] = units;
        scenarioUnits.hemat[item.type] =
            Math.max(1, units - 1);
        scenarioUnits.cepat[item.type] = units + 1;
    });

    function defaultUnits(scenario, item) {
        const units = Number(item.units);

        if (scenario === "hemat") {
            return Math.max(1, units - 1);
        }

        if (scenario === "cepat") {
            return units + 1;
        }

        return units;
    }

    function updateCardTotal(scenario) {
        const total = equipment.reduce(function (sum, item) {
            return sum + Number(
                scenarioUnits[scenario][item.type]
            );
        }, 0);

        totalElements[scenario].textContent =
            formatNumber(total) + " unit";
    }

    function renderFleetEquipment() {
        scenarioKeys.forEach(function (scenario) {
            const isDasar = scenario === "dasar";

            containers[scenario].innerHTML =
                equipment.map(function (item) {
                    const type = item.type;
                    const name = equipmentNames[type] || type;

                    const units =
                        scenarioUnits[scenario][type];

                    const productivityPerUnit =
                        Number(item.totalHourlyProductivity) /
                        Number(item.units);

                    const basis =
                        String(item.workVolumeBasis || "m³")
                            .toUpperCase();

                    return `
                        <div class="fleet-equipment-item">
                            <h4>${name}</h4>

                            <p>
                                Produktivitas/unit:
                                <strong>
                                    ${formatNumber(productivityPerUnit)}
                                    m³/jam (${basis})
                                </strong>
                            </p>

                            <p>
                                Biaya/unit:
                                <strong>
                                    ${formatRupiah(item.costPerHour)}/jam
                                </strong>
                            </p>

                            <label for="fleet-${scenario}-${type}">
                                Jumlah Alat (unit)
                            </label>

                            <input
                                type="number"
                                id="fleet-${scenario}-${type}"
                                data-scenario="${scenario}"
                                data-type="${type}"
                                min="1"
                                step="1"
                                value="${units}"
                                ${isDasar ? "disabled" : ""}
                            >
                        </div>
                    `;
                }).join("");

            updateCardTotal(scenario);
        });
    }

    // ========================================
    // 4. PERHITUNGAN SIMULASI
    // ========================================

    function calculateScenario(scenario) {
        const results = equipment.map(function (item) {
            const units =
                Number(scenarioUnits[scenario][item.type]);

            const baseUnits = Number(item.units);

            const productivityPerUnit =
                Number(item.totalHourlyProductivity) /
                baseUnits;

            const totalProductivity =
                productivityPerUnit * units;

            const durationHours =
                Number(item.workVolume) /
                totalProductivity;

            const durationDays =
                durationHours / workingHours;

            const hourlyCost =
                Number(item.costPerHour) * units;

            const totalCost =
                durationHours * hourlyCost;

            return {
                type: item.type,
                units,
                productivityPerUnit,
                totalProductivity,
                durationHours,
                durationDays,
                hourlyCost,
                totalCost,
                workVolume: Number(item.workVolume),
                workVolumeBasis: item.workVolumeBasis
            };
        });

        return {
            equipment: results,

            totalUnits: results.reduce(
                (sum, item) => sum + item.units,
                0
            ),

            totalCost: results.reduce(
                (sum, item) => sum + item.totalCost,
                0
            ),

            longestEquipmentDuration: Math.max(
                ...results.map(item => item.durationDays)
            )
        };
    }

    // ========================================
    // 5. TABEL PERBANDINGAN
    // ========================================

    function renderComparison() {
        const body = $("fleetComparisonBody");

        function cell(scenario, formatter) {
            const result = scenarioResults[scenario];

            return result
                ? formatter(result)
                : "Belum dihitung";
        }

        function row(label, formatter) {
            return `
                <tr>
                    <td><strong>${label}</strong></td>
                    ${scenarioKeys.map(function (scenario) {
                        return `
                            <td>
                                ${cell(scenario, formatter)}
                            </td>
                        `;
                    }).join("")}
                </tr>
            `;
        }

        const unitsRow = row(
            "Jumlah Alat",
            result => formatNumber(result.totalUnits) + " unit"
        );

        const costRow = row(
            "Biaya Operasional",
            result => formatRupiah(result.totalCost)
        );

        const durationRow = row(
            "Durasi Alat Terlama",
            result =>
                formatNumber(result.longestEquipmentDuration) +
                " hari"
        );

        const targetRow = `
            <tr>
                <td><strong>Evaluasi Target Durasi</strong></td>

                ${scenarioKeys.map(function (scenario) {
                    const result = scenarioResults[scenario];

                    if (!result || targetDays <= 0) {
                        return `
                            <td>Belum dapat dievaluasi</td>
                        `;
                    }

                    const memenuhi =
                        result.longestEquipmentDuration <=
                        targetDays;

                    return `
                        <td>
                            <strong style="
                                color: ${memenuhi
                                    ? "#15803d"
                                    : "#b91c1c"};
                            ">
                                ${memenuhi
                                    ? "Memenuhi target"
                                    : "Belum memenuhi target"}
                            </strong>
                        </td>
                    `;
                }).join("")}
            </tr>
        `;

        body.innerHTML =
            unitsRow + costRow + durationRow + targetRow;
        publishVisualization();
    }

    
    // ========================================
    // 6. EVALUASI DAN REKOMENDASI
    // ========================================

    function evaluateFleetScenarios() {
        const allCalculated = scenarioKeys.every(
            key => scenarioResults[key]
        );

        if (!allCalculated) {
            evaluation.textContent =
                "Hitung seluruh skenario untuk melihat " +
                "evaluasi dan rekomendasi terbaru.";
            return;
        }

        const scenarios = scenarioKeys.map(function (key) {
            return {
                key,
                ...scenarioResults[key]
            };
        });

        // Pemeriksaan target durasi indikatif
        const feasible = targetDays > 0
            ? scenarios.filter(item =>
                item.longestEquipmentDuration <= targetDays
            )
            : [];

        const costTolerance = 1;

        // REKOMENDASI EFISIENSI
        // Prioritas: memenuhi target, biaya, jumlah alat
        const efficiencyCandidates =
            targetDays > 0 && feasible.length > 0
                ? feasible
                : scenarios;

        const efficient = [...efficiencyCandidates].sort(
            function (a, b) {
                const costDifference =
                    a.totalCost - b.totalCost;

                if (Math.abs(costDifference) > costTolerance) {
                    return costDifference;
                }

                return a.totalUnits - b.totalUnits ||
                    a.longestEquipmentDuration -
                    b.longestEquipmentDuration;
            }
        )[0];

        // REKOMENDASI WAKTU TERCEPAT
        const fastest = [...scenarios].sort(
            function (a, b) {
                return (
                    a.longestEquipmentDuration -
                    b.longestEquipmentDuration
                ) || (a.totalUnits - b.totalUnits);
            }
        )[0];

        const efficientMeetsTarget =
            targetDays > 0 &&
            efficient.longestEquipmentDuration <= targetDays;

        const fastestMeetsTarget =
            targetDays > 0 &&
            fastest.longestEquipmentDuration <= targetDays;

        function targetText(meetsTarget) {
            if (targetDays <= 0) {
                return "Target durasi belum ditentukan";
            }

            return meetsTarget
                ? "Memenuhi indikator target durasi"
                : "Belum memenuhi indikator target durasi";
        }

        function recommendationCard(title, result, description, meetsTarget) {
            return `
                <div class="fleet-recommendation-card">
                    <h4>${title}</h4>

                    <h3>
                        Skenario ${scenarioNames[result.key]}
                    </h3>

                    <div class="fleet-recommendation-stats">
                        <div>
                            <span>Jumlah Alat</span>
                            <strong>
                                ${formatNumber(result.totalUnits)} unit
                            </strong>
                        </div>

                        <div>
                            <span>Biaya Operasional</span>
                            <strong>
                                ${formatRupiah(result.totalCost)}
                            </strong>
                        </div>

                        <div>
                            <span>Durasi Alat Terlama</span>
                            <strong>
                                ${formatNumber(
                                    result.longestEquipmentDuration
                                )} hari
                            </strong>
                        </div>
                    </div>

                    <p class="fleet-recommendation-target">
                        ${targetText(meetsTarget)}
                    </p>

                    <p>${description}</p>
                </div>
            `;
        }

        const efficiencyDescription =
            targetDays > 0 && feasible.length === 0
                ? "Belum ada skenario yang memenuhi indikator " +
                  "target durasi. Alternatif ini dipilih " +
                  "berdasarkan biaya dan jumlah alat, " +
                  "tetapi masih memerlukan penyesuaian."
                : "Dipilih berdasarkan biaya operasional " +
                  "terendah dan jumlah alat lebih sedikit " +
                  "apabila biaya setara, dengan tetap " +
                  "mempertimbangkan target durasi.";

        const fastestDescription =
            "Memiliki durasi alat terlama paling singkat " +
            "di antara seluruh skenario yang dihitung. " +
            "Jumlah alat dan kebutuhan biaya tetap " +
            "perlu dipertimbangkan.";

        evaluation.innerHTML = `
            <div class="fleet-recommendation-grid">
                ${recommendationCard(
                    "REKOMENDASI EFISIENSI",
                    efficient,
                    efficiencyDescription,
                    efficientMeetsTarget
                )}

                ${recommendationCard(
                    "REKOMENDASI WAKTU TERCEPAT",
                    fastest,
                    fastestDescription,
                    fastestMeetsTarget
                )}
            </div>

            <p class="fleet-recommendation-note">
                <strong>Catatan:</strong>
                Rekomendasi bersifat indikatif.
                Durasi alat terlama bukan durasi keseluruhan proyek.
                Perhitungan belum memperhitungkan waktu tunggu,
                interaksi antaralat, dan biaya tambahan.
                Pemilihan skenario akhir tetap dilakukan pengguna.
            </p>
        `;
    }


    // ========================================
    // 7. PERUBAHAN INPUT
    // ========================================

    function markUnsaved() {
        saveStatus.textContent =
            "Konfigurasi berubah. Hitung ulang dan " +
            "simpan untuk memperbarui rencana proyek.";

        evaluation.textContent =
            "Konfigurasi telah berubah. " +
            "Klik Hitung Semua Skenario untuk " +
            "memperbarui rekomendasi.";
    }

    function handleInput(event) {
        const input = event.target.closest(
            "input[data-scenario][data-type]"
        );

        if (!input) return;

        const scenario = input.dataset.scenario;
        const type = input.dataset.type;

        if (scenario === "dasar") return;

        // Nilai kosong atau tidak valid tidak disimpan
        if (input.value.trim() === "") {
            delete scenarioResults[scenario];
            markUnsaved();
            renderComparison();
            return;
        }

        const units = Number(input.value);

        if (!Number.isInteger(units) || units < 1) {
            delete scenarioResults[scenario];
            markUnsaved();
            renderComparison();
            return;
        }

        if (scenarioUnits[scenario][type] !== units) {
            scenarioUnits[scenario][type] = units;

            delete scenarioResults[scenario];

            updateCardTotal(scenario);
            renderComparison();
            markUnsaved();
        }
    }

    ["hemat", "cepat"].forEach(function (scenario) {
        containers[scenario].addEventListener(
            "input",
            handleInput
        );
    });

    function validateInputs() {
        for (const scenario of scenarioKeys) {
            const inputs = containers[scenario]
                .querySelectorAll(
                    "input[data-scenario][data-type]"
                );

            for (const input of inputs) {
                const units = Number(input.value);

                if (
                    input.value.trim() === "" ||
                    !Number.isInteger(units) ||
                    units < 1
                ) {
                    alert(
                        "Jumlah alat harus bilangan bulat minimal 1."
                    );

                    input.focus();
                    return false;
                }

                scenarioUnits[scenario][input.dataset.type] =
                    units;
            }
        }

        return true;
    }

    // ========================================
    // 8. HITUNG SEMUA SKENARIO
    // ========================================

    $("calculateFleetScenarioBtn")
        .addEventListener("click", function () {
            const latest = getExcabaseActiveProject();
            if (!latest || String(latest.id) !== String(project.id) ||
                String(latest.status || "").toLowerCase() === "selesai" ||
                !isExcabaseEstimateCurrent(latest) ||
                JSON.stringify(latest.results.estimate) !== JSON.stringify(project.results.estimate) ||
                latest.workHoursPerDay !== project.workHoursPerDay ||
                latest.targetDays !== project.targetDays) {
                saveStatus.textContent =
                    "Data proyek berubah atau proyek selesai. Muat ulang halaman sebelum menyimpan Simulasi.";
                return;
            }
            if (!validateInputs()) return;

            scenarioKeys.forEach(function (scenario) {
                scenarioResults[scenario] =
                    calculateScenario(scenario);

                updateCardTotal(scenario);
            });

            renderComparison();
            evaluateFleetScenarios();

            saveStatus.textContent =
                "Hasil terbaru siap disimpan. " +
                "Pilih skenario akhir di bagian bawah.";
        });

    // ========================================
    // 9. RESET KONFIGURASI
    // ========================================

    $("resetFleetScenarioBtn")
        .addEventListener("click", function () {
            equipment.forEach(function (item) {
                scenarioKeys.forEach(function (scenario) {
                    scenarioUnits[scenario][item.type] =
                        defaultUnits(scenario, item);
                });
            });

            scenarioKeys.forEach(function (scenario) {
                delete scenarioResults[scenario];
            });

            renderFleetEquipment();
            renderComparison();

            evaluation.textContent =
                "Konfigurasi telah dikembalikan " +
                "ke nilai awal. Klik Hitung Semua Skenario.";

            saveStatus.textContent =
                "Konfigurasi direset, tetapi belum disimpan.";
        });

    // ========================================
    // 10. SIMPAN SKENARIO TERPILIH
    // ========================================

    $("saveFleetScenarioBtn")
        .addEventListener("click", function () {
            const latest = getExcabaseActiveProject();
            if (!latest || String(latest.id) !== String(project.id) ||
                String(latest.status || "").toLowerCase() === "selesai" ||
                !isExcabaseEstimateCurrent(latest) ||
                JSON.stringify(latest.results.estimate) !== JSON.stringify(project.results.estimate) ||
                latest.workHoursPerDay !== project.workHoursPerDay ||
                latest.targetDays !== project.targetDays) {
                saveStatus.textContent =
                    "Data proyek berubah atau proyek selesai. Muat ulang halaman sebelum menyimpan Simulasi.";
                return;
            }
            if (!validateInputs()) return;

            if (!scenarioKeys.every(
                key => scenarioResults[key]
            )) {
                saveStatus.textContent =
                    "Hitung seluruh skenario terlebih dahulu.";
                return;
            }

            const selected = selectedInput.value;

            if (!scenarioKeys.includes(selected)) {
                saveStatus.textContent =
                    "Pilih skenario yang valid.";
                return;
            }

            project.results = project.results || {};

            project.results.fleet = {
                selectedScenario: selected,

                scenarios: {
                    dasar: scenarioResults.dasar,
                    hemat: scenarioResults.hemat,
                    cepat: scenarioResults.cepat
                },

                configurations: {
                    dasar: { ...scenarioUnits.dasar },
                    hemat: { ...scenarioUnits.hemat },
                    cepat: { ...scenarioUnits.cepat }
                },

                targetDays,
                workHoursPerDay: workingHours,
                estimateSignature,
                calculatedAt: new Date().toISOString()
            };

            // Pertahankan perubahan tahap lain yang tidak memengaruhi simulasi.
            latest.results.fleet = project.results.fleet;
            if (!saveExcabaseProject(latest)) {
                saveStatus.textContent = "Simulasi gagal disimpan.";
                return;
            }

            saveStatus.textContent =
                "Skenario " +
                scenarioNames[selected] +
                " berhasil disimpan ke proyek.";
            publishVisualization();
        });

    // ========================================
    // 11. MEMUAT DATA TERSIMPAN
    // ========================================

    const savedFleet = project.results?.fleet;

    if (
        savedFleet &&
        savedFleet.configurations &&
        savedFleet.estimateSignature === estimateSignature
    ) {
        scenarioKeys.forEach(function (scenario) {
            if (scenario === "dasar") return;

            const savedConfig =
                savedFleet.configurations[scenario];

            if (!savedConfig) return;

            equipment.forEach(function (item) {
                const savedUnits =
                    Number(savedConfig[item.type]);

                if (
                    Number.isInteger(savedUnits) &&
                    savedUnits >= 1
                ) {
                    scenarioUnits[scenario][item.type] =
                        savedUnits;
                }
            });
        });

        // Hitung ulang menggunakan data Estimasi terkini
        scenarioKeys.forEach(function (scenario) {
            scenarioResults[scenario] =
                calculateScenario(scenario);
        });

        if (
            scenarioKeys.includes(
                savedFleet.selectedScenario
            )
        ) {
            selectedInput.value =
                savedFleet.selectedScenario;
        }

        renderFleetEquipment();
        renderComparison();
        evaluateFleetScenarios();

        saveStatus.textContent =
            "Konfigurasi dan hasil simulasi " +
            "sebelumnya berhasil dimuat.";
    } else {
        // Pertahankan pilihan alternatif sebagai input, bukan hasil terbaru.
        ["hemat", "cepat"].forEach(function (scenario) {
            equipment.forEach(function (item) {
                const units = Number(savedFleet?.configurations?.[scenario]?.[item.type]);
                if (Number.isInteger(units) && units >= 1) {
                    scenarioUnits[scenario][item.type] = units;
                }
            });
        });
        renderFleetEquipment();
        renderComparison();

        if (savedFleet) {
            status.textContent =
                "Data Estimasi berbeda atau berasal dari " +
                "versi simulasi sebelumnya. " +
                "Pilihan unit Hemat/Cepat dipertahankan sebagai input. Hitung ulang sebelum menyimpan.";
        }
    }
});

// Navigasi kembali dapat memulihkan DOM lama tanpa DOMContentLoaded.
window.addEventListener("pageshow", function (event) {
    if (event.persisted) window.location.reload();
});
