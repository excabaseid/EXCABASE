// EXCABASE - Main JavaScript

console.log("EXCABASE berhasil dijalankan!");


/* ===== PENCARIAN DAN FILTER KATALOG ===== */

const equipmentSearch = document.getElementById("equipmentSearch");
const equipmentFilter = document.getElementById("equipmentFilter");

if (equipmentSearch && equipmentFilter) {
    function filterEquipment() {
        const searchText = equipmentSearch.value.toLowerCase();
        const selectedCategory = equipmentFilter.value;
        const equipmentCards = document.querySelectorAll(".equipment-card");

        equipmentCards.forEach(function (card) {
            const equipmentName = card.querySelector("h3").textContent.toLowerCase();
            const equipmentDescription = card.querySelector("p").textContent.toLowerCase();
            const cardCategory = card.dataset.category;

            const matchesSearch =
                equipmentName.includes(searchText) ||
                equipmentDescription.includes(searchText);

            const matchesCategory =
                selectedCategory === "all" ||
                cardCategory === selectedCategory;

            card.style.display =
                matchesSearch && matchesCategory ? "" : "none";
        });
    }

    equipmentSearch.addEventListener("input", filterEquipment);
    equipmentFilter.addEventListener("change", filterEquipment);
}

/* ===== KALKULATOR PRODUKTIVITAS EXCAVATOR ===== */

const calculateBtn = document.getElementById("calculateBtn");

if (calculateBtn) {
    calculateBtn.addEventListener("click", function () {
        const bucket = Number(document.getElementById("bucket").value);
        const fillFactor = Number(document.getElementById("fillFactor").value);
        const cycleTime = Number(document.getElementById("cycleTime").value);
        const efficiency = Number(document.getElementById("efficiency").value);

        const productivityResult = document.getElementById("productivityResult");
        const calculationStatus = document.getElementById("calculationStatus");
        const workingHours = Number(document.getElementById("workingHours").value);
        // Validasi input
            if (
            bucket <= 0 ||
            fillFactor <= 0 ||
            fillFactor > 1 ||
            cycleTime <= 0 ||
            efficiency <= 0 ||
            efficiency > 1 ||       
            workingHours <= 0 ||
            workingHours > 24
            ) {
            productivityResult.textContent = "—";
            calculationStatus.textContent =
                "Periksa input. Semua nilai harus positif dan efisiensi maksimal 1.";
            return;
        }

        // Q = V × FF × 3600 × E / CT
        const productivity =
            (bucket * fillFactor * 3600 * efficiency) / cycleTime;

        const dailyProductivity = productivity * workingHours;

        const calculationDetails = document.getElementById("calculationDetails");

        calculationDetails.innerHTML = `
    <p><strong>Substitusi rumus:</strong></p>
    <p>Q = (${bucket} × ${fillFactor} × 3600 × ${efficiency}) / ${cycleTime}</p>
    <p>Q = ${productivity.toLocaleString("id-ID", {
        maximumFractionDigits: 2
    })} m³/jam</p>
`;
document.getElementById("dailyProductivity").innerHTML = `
    <p><strong>Estimasi produktivitas per hari (${workingHours} jam):</strong></p>
    <p>${dailyProductivity.toLocaleString("id-ID", {
        maximumFractionDigits: 2
    })} m³/hari</p>
`;
        productivityResult.textContent =
            productivity.toLocaleString("id-ID", {
                maximumFractionDigits: 2
            });

        calculationStatus.textContent =
            "Perhitungan berhasil. Hasil merupakan estimasi produktivitas.";
    });
}
/* ===== RESET KALKULATOR EXCAVATOR ===== */

const resetBtn = document.getElementById("resetBtn");

if (resetBtn) {
    resetBtn.addEventListener("click", function () {
        document.getElementById("bucket").value = 1.19;
        document.getElementById("fillFactor").value = 0.90;
        document.getElementById("cycleTime").value = 25;
        document.getElementById("efficiency").value = 0.83;

        document.getElementById("productivityResult").textContent = "—";
        document.getElementById("calculationStatus").textContent =
            "Masukkan data, lalu klik Hitung Produktivitas.";
        document.getElementById("calculationDetails").innerHTML = "";
        document.getElementById("dailyProductivity").innerHTML = "";
    });
}

/* ===== KALKULATOR PRODUKTIVITAS DUMP TRUCK ===== */

const calculateTruckBtn = document.getElementById("calculateTruckBtn");

if (calculateTruckBtn) {
    calculateTruckBtn.addEventListener("click", function () {
        const truckCapacity = Number(document.getElementById("truckCapacity").value);
        const cycleTime = Number(document.getElementById("cycleTime").value);
        const efficiency = Number(document.getElementById("efficiency").value);
        const workingHours = Number(document.getElementById("workingHours").value);

        const truckProductivityResult = document.getElementById("truckProductivityResult");
        const truckCalculationStatus = document.getElementById("truckCalculationStatus");

        if (
            truckCapacity <= 0 ||
            cycleTime <= 0 ||
            efficiency <= 0 ||
            efficiency > 1 ||
            workingHours <= 0 ||
            workingHours > 24
        ) {
            truckProductivityResult.textContent = "—";
            truckCalculationStatus.textContent =
                "Periksa input. Semua nilai harus positif, efisiensi maksimal 1, dan jam kerja maksimal 24.";
            return;
        }

        const productivity =
            (truckCapacity * 60 * efficiency) / cycleTime;

        const dailyProductivity = productivity * workingHours;

        truckProductivityResult.textContent =
            productivity.toLocaleString("id-ID", {
                maximumFractionDigits: 2
            });

        truckCalculationStatus.textContent =
            "Perhitungan berhasil. Hasil merupakan estimasi produktivitas.";

        document.getElementById("truckCalculationDetails").innerHTML = `
            <p><strong>Substitusi rumus:</strong></p>
            <p>Q = (${truckCapacity} × 60 × ${efficiency}) / ${cycleTime}</p>
            <p>Q = ${productivity.toLocaleString("id-ID", {
                maximumFractionDigits: 2
            })} m³/jam</p>
        `;

        document.getElementById("truckDailyProductivity").innerHTML = `
            <p><strong>Estimasi produktivitas per hari (${workingHours} jam):</strong></p>
            <p>${dailyProductivity.toLocaleString("id-ID", {
                maximumFractionDigits: 2
            })} m³/hari</p>
        `;
    });
}

/* ===== RESET KALKULATOR DUMP TRUCK ===== */

const resetTruckBtn = document.getElementById("resetTruckBtn");

if (resetTruckBtn) {
    resetTruckBtn.addEventListener("click", function () {
        document.getElementById("truckCapacity").value = 10;
        document.getElementById("cycleTime").value = 20;
        document.getElementById("efficiency").value = 0.83;
        document.getElementById("workingHours").value = 8;

        document.getElementById("truckProductivityResult").textContent = "—";
        document.getElementById("truckCalculationStatus").textContent =
            "Masukkan data, lalu klik Hitung Produktivitas.";
        document.getElementById("truckCalculationDetails").innerHTML = "";
        document.getElementById("truckDailyProductivity").innerHTML = "";
    });
}

/* ===== KALKULATOR PRODUKTIVITAS WHEEL LOADER ===== */

const calculateLoaderBtn = document.getElementById("calculateLoaderBtn");

if (calculateLoaderBtn) {
    calculateLoaderBtn.addEventListener("click", function () {
        const loaderBucket = Number(document.getElementById("loaderBucket").value);
        const loaderFillFactor = Number(document.getElementById("loaderFillFactor").value);
        const loaderCycleTime = Number(document.getElementById("loaderCycleTime").value);
        const loaderEfficiency = Number(document.getElementById("loaderEfficiency").value);
        const loaderWorkingHours = Number(document.getElementById("loaderWorkingHours").value);

        const loaderProductivityResult = document.getElementById("loaderProductivityResult");
        const loaderCalculationStatus = document.getElementById("loaderCalculationStatus");

        if (
            loaderBucket <= 0 ||
            loaderFillFactor <= 0 ||
            loaderFillFactor > 1 ||
            loaderCycleTime <= 0 ||
            loaderEfficiency <= 0 ||
            loaderEfficiency > 1 ||
            loaderWorkingHours <= 0 ||
            loaderWorkingHours > 24
        ) {
            loaderProductivityResult.textContent = "—";
            loaderCalculationStatus.textContent =
                "Periksa input. Nilai harus positif, fill factor dan efisiensi maksimal 1, serta jam kerja maksimal 24.";
            return;
        }

        const loaderProductivity =
            (loaderBucket * loaderFillFactor * 3600 * loaderEfficiency) / loaderCycleTime;

        const loaderDailyProductivity =
            loaderProductivity * loaderWorkingHours;

        loaderProductivityResult.textContent =
            loaderProductivity.toLocaleString("id-ID", {
                maximumFractionDigits: 2
            });

        loaderCalculationStatus.textContent =
            "Perhitungan berhasil. Hasil merupakan estimasi produktivitas.";

        document.getElementById("loaderCalculationDetails").innerHTML = `
            <p><strong>Substitusi rumus:</strong></p>
            <p>Q = (${loaderBucket} × ${loaderFillFactor} × 3600 × ${loaderEfficiency}) / ${loaderCycleTime}</p>
            <p>Q = ${loaderProductivity.toLocaleString("id-ID", {
                maximumFractionDigits: 2
            })} m³/jam</p>
        `;

        document.getElementById("loaderDailyProductivity").innerHTML = `
            <p><strong>Estimasi produktivitas per hari (${loaderWorkingHours} jam):</strong></p>
            <p>${loaderDailyProductivity.toLocaleString("id-ID", {
                maximumFractionDigits: 2
            })} m³/hari</p>
        `;
    });
}

/* ===== RESET KALKULATOR WHEEL LOADER ===== */

const resetLoaderBtn = document.getElementById("resetLoaderBtn");

if (resetLoaderBtn) {
    resetLoaderBtn.addEventListener("click", function () {
        document.getElementById("loaderBucket").value = 2.5;
        document.getElementById("loaderFillFactor").value = 0.90;
        document.getElementById("loaderCycleTime").value = 35;
        document.getElementById("loaderEfficiency").value = 0.83;
        document.getElementById("loaderWorkingHours").value = 8;

        document.getElementById("loaderProductivityResult").textContent = "—";
        document.getElementById("loaderCalculationStatus").textContent =
            "Masukkan data, lalu klik Hitung Produktivitas.";
        document.getElementById("loaderCalculationDetails").innerHTML = "";
        document.getElementById("loaderDailyProductivity").innerHTML = "";
    });
}


const calculateGraderBtn = document.getElementById("calculateGraderBtn");
const resetGraderBtn = document.getElementById("resetGraderBtn");

if (calculateGraderBtn) {
  calculateGraderBtn.addEventListener("click", function () {
    const bladeLength = parseFloat(document.getElementById("graderBladeLength").value);
    const speed = parseFloat(document.getElementById("graderSpeed").value);
    const efficiency = parseFloat(document.getElementById("graderEfficiency").value);
    const passes = parseFloat(document.getElementById("graderPasses").value);
    const layerThickness = parseFloat(document.getElementById("graderLayerThickness").value);

    const status = document.getElementById("graderCalculationStatus");
    const areaResult = document.getElementById("graderProductivityResult");
    const volumeResult = document.getElementById("graderVolumeResult");
    const details = document.getElementById("graderCalculationDetails");

    if (
      bladeLength <= 0 ||
      speed <= 0 ||
      efficiency <= 0 ||
      efficiency > 1 ||
      passes <= 0 ||
      layerThickness < 0
    ) {
      status.textContent = "Periksa kembali input. Nilai harus lebih besar dari 0, dan efisiensi maksimal 1.";
      areaResult.textContent = "— m²/jam";
      volumeResult.textContent = "— m³/jam";
      details.textContent = "";
      return;
    }

    // Produktivitas Motor Grader (m²/jam)
    const areaProductivity =
      (bladeLength * speed * 1000 * efficiency) / passes;

    // Produktivitas volume (m³/jam)
    const volumeProductivity = areaProductivity * layerThickness;

    areaResult.textContent =
      areaProductivity.toFixed(2) + " m²/jam";

    volumeResult.textContent =
      volumeProductivity.toFixed(2) + " m³/jam";

    status.textContent = "Perhitungan berhasil.";

    details.innerHTML = `
      <p><strong>Rumus produktivitas luas:</strong></p>
      <p>Q = (L × V × 1000 × E) / N</p>
      <p>Q = (${bladeLength} × ${speed} × 1000 × ${efficiency}) / ${passes}</p>
      <p>Q = ${areaProductivity.toFixed(2)} m²/jam</p>
      <p><strong>Rumus produktivitas volume:</strong></p>
      <p>Qv = Q × tebal lapisan</p>
      <p>Qv = ${areaProductivity.toFixed(2)} × ${layerThickness}</p>
      <p>Qv = ${volumeProductivity.toFixed(2)} m³/jam</p>
    `;
  });
}

if (resetGraderBtn) {
  resetGraderBtn.addEventListener("click", function () {
    document.getElementById("graderBladeLength").value = 3.5;
    document.getElementById("graderSpeed").value = 4;
    document.getElementById("graderEfficiency").value = 0.75;
    document.getElementById("graderPasses").value = 4;
    document.getElementById("graderLayerThickness").value = 0.2;

    document.getElementById("graderCalculationStatus").textContent =
      "Masukkan data pekerjaan, lalu klik Hitung Produktivitas.";
    document.getElementById("graderProductivityResult").textContent = "— m²/jam";
    document.getElementById("graderVolumeResult").textContent = "— m³/jam";
    document.getElementById("graderCalculationDetails").innerHTML = "";
  });
}


const calculateDozerBtn = document.getElementById("calculateDozerBtn");
const resetDozerBtn = document.getElementById("resetDozerBtn");

if (calculateDozerBtn) {
    calculateDozerBtn.addEventListener("click", function () {
        const bladeCapacity = parseFloat(document.getElementById("dozerBladeCapacity").value);
        const fillFactor = parseFloat(document.getElementById("dozerFillFactor").value);
        const cycleTime = parseFloat(document.getElementById("dozerCycleTime").value);
        const efficiency = parseFloat(document.getElementById("dozerEfficiency").value);
        const workingHours = parseFloat(document.getElementById("dozerWorkingHours").value);

        const status = document.getElementById("dozerCalculationStatus");
        const productivityResult = document.getElementById("dozerProductivityResult");
        const details = document.getElementById("dozerCalculationDetails");
        const dailyResult = document.getElementById("dozerDailyProductivity");

        if (
            bladeCapacity <= 0 ||
            fillFactor <= 0 || fillFactor > 1 ||
            cycleTime <= 0 ||
            efficiency <= 0 || efficiency > 1 ||
            workingHours <= 0 || workingHours > 24
        ) {
            status.textContent = "Periksa kembali input. Nilai harus positif dan faktor maksimal 1.";
            productivityResult.textContent = "—";
            details.innerHTML = "";
            dailyResult.textContent = "";
            return;
        }

        // Produktivitas Bulldozer (m³/jam)
        const productivity =
            (bladeCapacity * fillFactor * 3600 * efficiency) / cycleTime;

        // Produktivitas harian (m³/hari)
        const dailyProductivity = productivity * workingHours;

        productivityResult.textContent = productivity.toFixed(2);
        status.textContent = "Perhitungan berhasil.";

        details.innerHTML = `
            <p><strong>Rumus:</strong></p>
            <p>Q = (Vb × FF × 3600 × E) / CT</p>
            <p>Q = (${bladeCapacity} × ${fillFactor} × 3600 × ${efficiency}) / ${cycleTime}</p>
            <p>Q = ${productivity.toFixed(2)} m³/jam</p>
        `;

        dailyResult.innerHTML = `
            <p><strong>Produktivitas harian:</strong></p>
            <p>Qhari = Q × jam kerja</p>
            <p>Qhari = ${productivity.toFixed(2)} × ${workingHours}</p>
            <p><strong>${dailyProductivity.toFixed(2)} m³/hari</strong></p>
        `;
    });
}

if (resetDozerBtn) {
    resetDozerBtn.addEventListener("click", function () {
        document.getElementById("dozerBladeCapacity").value = 4.5;
        document.getElementById("dozerFillFactor").value = 0.80;
        document.getElementById("dozerCycleTime").value = 60;
        document.getElementById("dozerEfficiency").value = 0.83;
        document.getElementById("dozerWorkingHours").value = 8;

        document.getElementById("dozerCalculationStatus").textContent =
            "Masukkan data, lalu klik Hitung Produktivitas.";
        document.getElementById("dozerProductivityResult").textContent = "—";
        document.getElementById("dozerCalculationDetails").innerHTML = "";
        document.getElementById("dozerDailyProductivity").innerHTML = "";
    });
}


const calculateCompactorBtn = document.getElementById("calculateCompactorBtn");
const resetCompactorBtn = document.getElementById("resetCompactorBtn");

if (calculateCompactorBtn) {
    calculateCompactorBtn.addEventListener("click", function () {
        const width = parseFloat(document.getElementById("compactorWidth").value);
        const speed = parseFloat(document.getElementById("compactorSpeed").value);
        const efficiency = parseFloat(document.getElementById("compactorEfficiency").value);
        const passes = parseFloat(document.getElementById("compactorPasses").value);
        const layerThickness = parseFloat(document.getElementById("compactorLayerThickness").value);

        const status = document.getElementById("compactorCalculationStatus");
        const productivityResult = document.getElementById("compactorProductivityResult");
        const details = document.getElementById("compactorCalculationDetails");
        const volumeResult = document.getElementById("compactorVolumeResult");

        if (
            width <= 0 ||
            speed <= 0 ||
            efficiency <= 0 || efficiency > 1 ||
            passes <= 0 ||
            layerThickness < 0
        ) {
            status.textContent = "Periksa kembali input. Nilai harus positif dan efisiensi maksimal 1.";
            productivityResult.textContent = "—";
            details.innerHTML = "";
            volumeResult.textContent = "";
            return;
        }

        // Produktivitas luas (m²/jam)
        const areaProductivity =
            (width * speed * 1000 * efficiency) / passes;

        // Produktivitas volume (m³/jam)
        const volumeProductivity = areaProductivity * layerThickness;

        productivityResult.textContent = areaProductivity.toFixed(2);
        status.textContent = "Perhitungan berhasil.";

        details.innerHTML = `
            <p><strong>Rumus produktivitas luas:</strong></p>
            <p>Q = (W × V × 1000 × E) / N</p>
            <p>Q = (${width} × ${speed} × 1000 × ${efficiency}) / ${passes}</p>
            <p>Q = ${areaProductivity.toFixed(2)} m²/jam</p>
        `;

        volumeResult.innerHTML = `
            <p><strong>Produktivitas volume:</strong></p>
            <p>Qv = Q × tebal lapisan</p>
            <p>Qv = ${areaProductivity.toFixed(2)} × ${layerThickness}</p>
            <p><strong>${volumeProductivity.toFixed(2)} m³/jam</strong></p>
        `;
    });
}

if (resetCompactorBtn) {
    resetCompactorBtn.addEventListener("click", function () {
        document.getElementById("compactorWidth").value = 2.1;
        document.getElementById("compactorSpeed").value = 4;
        document.getElementById("compactorEfficiency").value = 0.75;
        document.getElementById("compactorPasses").value = 6;
        document.getElementById("compactorLayerThickness").value = 0.2;

        document.getElementById("compactorCalculationStatus").textContent =
            "Masukkan data, lalu klik Hitung Produktivitas.";
        document.getElementById("compactorProductivityResult").textContent = "—";
        document.getElementById("compactorCalculationDetails").innerHTML = "";
        document.getElementById("compactorVolumeResult").innerHTML = "";
    });
}


// ===============================
// OPSI ALAT BERAT
// ===============================

const recommendEquipmentBtn = document.getElementById("recommendEquipmentBtn");
const resetRecommendationBtn = document.getElementById("resetRecommendationBtn");

const recommendations = {
    "Pematangan Lahan": {
        name: "Bulldozer, Motor Grader, dan Compactor",
        reason: "Pematangan lahan umumnya memerlukan pembersihan dan pendorongan tanah, perataan permukaan, serta pemadatan sesuai spesifikasi pekerjaan."
    },
    "Galian dan Timbunan": {
        name: "Excavator, Dump Truck, Bulldozer, dan Compactor",
        reason: "Excavator digunakan untuk menggali, dump truck mengangkut material, bulldozer membantu penyebaran atau pendorongan tanah, dan compactor memadatkan timbunan."
    },
    "Pengangkutan Material": {
        name: "Dump Truck",
        reason: "Cocok untuk mengangkut material dari lokasi kerja menuju tempat pembuangan atau penimbunan."
    },
    "Perataan Tanah": {
        name: "Motor Grader",
        reason: "Cocok untuk meratakan dan membentuk permukaan tanah atau lapisan jalan."
    },
    "Pemadatan Tanah": {
        name: "Compactor / Roller",
        reason: "Cocok untuk pemadatan tanah, agregat, dan lapisan perkerasan."
    },
    "Pemuatan Material": {
        name: "Wheel Loader atau Excavator",
        reason: "Digunakan untuk memuat material ke dump truck. Pemilihan alat bergantung pada jenis material dan kondisi area kerja."
    },
    "Pekerjaan Jalan": {
        name: "Motor Grader dan Compactor / Roller",
        reason: "Motor grader membentuk dan meratakan permukaan, sedangkan compactor memadatkan lapisan pekerjaan jalan."
    }
};

function getActiveProjectForRecommendation() {
    try {
        return JSON.parse(localStorage.getItem("excabase_active_project")) || null;
    } catch (error) {
        return null;
    }
}

function saveRecommendationToProject(data) {
    const project = getActiveProjectForRecommendation();

    if (!project) return;

    if (!project.results) {
        project.results = {};
    }

    project.results.recommendation = data;

    // Simpan rekomendasi ke proyek aktif dan daftar proyek
const saved = saveExcabaseProject(project);

if (!saved) {
    console.error("Gagal menyimpan rekomendasi proyek.");
}
}

function getRecommendationMaterialNote(material) {
    if (material === "Batuan") {
        return "Untuk batuan keras, pertimbangkan excavator dengan attachment breaker atau alat khusus sesuai kondisi batuan.";
    }

    if (material === "Tanah lempung") {
        return "Tanah lempung dapat memengaruhi waktu siklus, faktor pengisian, dan kebutuhan pemadatan.";
    }

    if (material === "Tanah berpasir") {
        return "Pasir umumnya mudah dimuat, tetapi kadar air dan stabilitas material perlu diperhatikan.";
    }

    if (material === "Tanah keras") {
        return "Tanah keras dapat membutuhkan alat dengan tenaga gali lebih besar dan pemeriksaan kondisi lapangan.";
    }

    return "Produktivitas aktual dipengaruhi kondisi material, jarak kerja, operator, dan kondisi lapangan.";
}

function showRecommendation() {
    const workInput = document.getElementById("recommendationWork");
    const materialInput = document.getElementById("recommendationMaterial");
    const status = document.getElementById("recommendationStatus");
    const result = document.getElementById("recommendationResult");

    if (!workInput || !materialInput || !status || !result) return;

    const work = workInput.value;
    const material = materialInput.value;

    if (!work || !material) {
        status.textContent = "Lengkapi jenis pekerjaan dan material terlebih dahulu.";
        result.innerHTML = "";
        return;
    }

    const selected = recommendations[work];

    if (!selected) {
        status.textContent = "Opsi alat untuk jenis pekerjaan ini belum tersedia.";
        result.innerHTML = "";
        return;
    }

    const materialNote = getRecommendationMaterialNote(material);

    // Target otomatis dihitung jika halaman dibuka dari proyek aktif
    const project = getActiveProjectForRecommendation();
    let target = null;

    if (window.location.search.includes("fromProject=1") && project) {
        const volume = Number(project.soilVolumeBCM);
        const days = Number(project.targetDays);
        const hours = Number(project.workHoursPerDay);

        if (volume > 0 && days > 0 && hours > 0) {
            target = volume / (days * hours);
        }
    }

    status.textContent = "Opsi alat berat berhasil ditampilkan.";

    result.innerHTML = `
        <h3>${selected.name}</h3>
        <p><strong>Alasan:</strong> ${selected.reason}</p>
        <p><strong>Material:</strong> ${materialNote}</p>
        ${
            target !== null
                ? `<p><strong>Target produktivitas proyek:</strong> ${target.toFixed(2)} BCM/jam</p>`
                : ""
        }
        <p><em>Catatan: opsi ini merupakan rekomendasi awal. Kapasitas alat tetap perlu diperiksa berdasarkan data proyek dan kondisi lapangan.</em></p>
    `;

    saveRecommendationToProject({
        work: work,
        material: material,
        target: target,
        equipment: selected.name,
        reason: selected.reason,
        materialNote: materialNote,
        calculatedAt: new Date().toISOString()
    });
}

if (recommendEquipmentBtn) {
    recommendEquipmentBtn.addEventListener("click", showRecommendation);
}

// ===============================
// CHECKLIST REKOMENDASI ALAT BERAT
// ===============================

const useRecommendedEquipmentBtn =
    document.getElementById("useRecommendedEquipmentBtn");

const recommendedEquipmentMapping = {
    "Pematangan Lahan": ["bulldozer", "motorgrader", "compactor"],
    "Galian dan Timbunan": ["excavator", "dumptruck", "bulldozer", "compactor"],
    "Pengangkutan Material": ["dumptruck"],
    "Perataan Tanah": ["motorgrader"],
    "Pemadatan Tanah": ["compactor"],
    "Pemuatan Material": ["wheelloader", "excavator"],
    "Pekerjaan Jalan": ["motorgrader", "compactor"]
};

if (useRecommendedEquipmentBtn) {
    useRecommendedEquipmentBtn.addEventListener("click", function () {
        const work = document.getElementById("recommendationWork")?.value;
        const status = document.getElementById("equipmentSelectionStatus");

        const recommended = recommendedEquipmentMapping[work];

        if (!recommended) {
            if (status) {
                status.textContent = "Pilih jenis pekerjaan terlebih dahulu.";
            }
            return;
        }

        document.querySelectorAll(".equipment-choice").forEach(function (checkbox) {
            checkbox.checked = recommended.includes(checkbox.value);
        });

        if (status) {
            status.textContent =
                "Rekomendasi EXCABASE berhasil diterapkan. Anda masih dapat mengubah pilihan alat.";
        }
    });
}


 // ===============================
 // SIMPAN PILIHAN ALAT PENGGUNA
 // ===============================

const saveSelectedEquipmentBtn =
    document.getElementById("saveSelectedEquipmentBtn");

if (saveSelectedEquipmentBtn) {
    saveSelectedEquipmentBtn.addEventListener("click", function () {
        const status = document.getElementById("equipmentSelectionStatus");

        const selectedEquipment = Array.from(
            document.querySelectorAll(".equipment-choice:checked")
        ).map(function (checkbox) {
            return checkbox.value;
        });

        if (selectedEquipment.length === 0) {
            if (status) {
                status.textContent = "Pilih minimal satu alat berat terlebih dahulu.";
            }
            return;
        }

        const params = new URLSearchParams(window.location.search);

        if (params.get("fromProject") !== "1") {
            if (status) {
                status.textContent =
                    "Pilihan berhasil dibuat. Penyimpanan ke proyek hanya tersedia melalui Proyek Aktif.";
            }
            return;
        }

        const project = getActiveProjectForRecommendation();

        if (!project) {
            if (status) {
                status.textContent = "Proyek aktif tidak ditemukan.";
            }
            return;
        }

        if (!project.results) {
            project.results = {};
        }

        project.results.selectedEquipment = selectedEquipment;

        const saved = saveExcabaseProject(project);

        if (status) {
            status.textContent = saved
                ? "Pilihan alat berhasil disimpan ke proyek."
                : "Gagal menyimpan pilihan alat.";
        }
    });
}


 // ===============================
 // MUAT PILIHAN ALAT YANG TERSIMPAN
 // ===============================

if (new URLSearchParams(window.location.search).get("fromProject") === "1") {
    const project = getActiveProjectForRecommendation();
    const savedEquipment = project?.results?.selectedEquipment;

    
if (Array.isArray(savedEquipment)) {
    document.querySelectorAll(".equipment-choice").forEach(function (checkbox) {
        checkbox.checked = savedEquipment.includes(checkbox.value);
    });

    const status = document.getElementById("equipmentSelectionStatus");

    if (status) {
        status.textContent = savedEquipment.length > 0
            ? "Pilihan alat sebelumnya berhasil dimuat. Anda dapat mengubah pilihan dan menyimpannya kembali."
            : "Belum ada alat berat yang dipilih.";
    }
}
}


// ===============================
// DATA OTOMATIS DARI PROYEK AKTIF
// ===============================

const recommendationParams = new URLSearchParams(window.location.search);

if (recommendationParams.get("fromProject") === "1") {
    const project = getActiveProjectForRecommendation();

    const workInput = document.getElementById("recommendationWork");
    const materialInput = document.getElementById("recommendationMaterial");

    if (project && workInput && materialInput) {
        const workMapping = {
            "Pematangan Lahan": "Pematangan Lahan",
            "Galian dan Timbunan": "Galian dan Timbunan",
            "Pengangkutan Material": "Pengangkutan Material",
            "Perataan Tanah": "Perataan Tanah",
            "Pemadatan Tanah": "Pemadatan Tanah",
            "Pemuatan Material": "Pemuatan Material",
            "Pekerjaan Jalan": "Pekerjaan Jalan"
        };

        const materialMapping = {
            "Tanah biasa": "Tanah biasa",
            "Tanah lempung": "Tanah lempung",
            "Tanah berpasir": "Tanah berpasir",
            "Tanah keras": "Tanah keras",
            "Batuan": "Batuan"
        };

        const savedWork = (project.workType || "").trim();
        const savedSoil = (project.soilType || "").trim();

        if (workMapping[savedWork]) {
            workInput.value = workMapping[savedWork];
        }

        if (materialMapping[savedSoil]) {
            materialInput.value = materialMapping[savedSoil];
        }

        // Tampilkan opsi otomatis jika data proyek sudah tersedia
        if (workInput.value && materialInput.value) {
            showRecommendation();
        }
    }
}

// ===============================
// RESET OPSI ALAT
// ===============================

if (resetRecommendationBtn) {
    resetRecommendationBtn.addEventListener("click", function () {
        const workInput = document.getElementById("recommendationWork");
        const materialInput = document.getElementById("recommendationMaterial");
        const status = document.getElementById("recommendationStatus");
        const result = document.getElementById("recommendationResult");

        const fromProject = window.location.search.includes("fromProject=1");
        const project = getActiveProjectForRecommendation();

        if (!fromProject) {
            if (workInput) workInput.value = "";
            if (materialInput) materialInput.value = "";
        }

        if (status) {
            status.textContent = fromProject
                ? "Klik Tampilkan Opsi Alat untuk melihat opsi berdasarkan proyek."
                : "Pilih jenis pekerjaan dan material, lalu klik Tampilkan Opsi Alat.";
        }

        if (result) {
            result.innerHTML = "";
        }

        
if (project?.results?.recommendation) {
    if (
        fromProject &&
        String(project.status || "").toLowerCase() === "selesai"
    ) {
        if (status) {
            status.textContent =
                "Proyek sudah selesai. Batalkan penyelesaian " +
                "sebelum mengubah rekomendasi alat.";
        }
        return;
    }

    delete project.results.recommendation;

    if (fromProject) {
        const saved = saveExcabaseProject(project);

        if (!saved) {
            if (status) {
                status.textContent =
                    "Gagal menyimpan perubahan rekomendasi.";
            }
        }
    }
}

    });
}
// ==========================================
// ELEMEN KALKULATOR VOLUME TANAH (EARTHWORK)
// ==========================================

const earthworkBCMInput =
    document.getElementById("earthworkBCM");

const earthworkMaterialInput =
    document.getElementById("earthworkMaterial");

const earthworkSwellInput =
    document.getElementById("earthworkSwell");

const earthworkShrinkageInput =
    document.getElementById("earthworkShrinkage");

const earthworkSourceInput =
    document.getElementById("earthworkParameterSource");

const earthworkSourceNoteInput =
    document.getElementById("earthworkSourceNote");

const calculateEarthworkBtn =
    document.getElementById("calculateEarthworkBtn");

const resetEarthworkBtn =
    document.getElementById("resetEarthworkBtn");

const earthworkStatus =
    document.getElementById("earthworkCalculationStatus");

const earthworkDetails =
    document.getElementById("earthworkCalculationDetails");
// ------------------------------------------
// MUAT DATA PROYEK
// ------------------------------------------

const earthworkFromProject =
    new URLSearchParams(window.location.search).get("fromProject") === "1";

if (earthworkFromProject) {
    try {
        const activeProject = JSON.parse(
            localStorage.getItem("excabase_active_project")
        );

        if (activeProject) {
            // BCM mengikuti volume proyek
            if (
                earthworkBCMInput &&
                activeProject.soilVolumeBCM !== undefined
            ) {
                earthworkBCMInput.value = activeProject.soilVolumeBCM;
            }

            // Jenis material mengikuti data proyek
            if (earthworkMaterialInput && activeProject.soilType) {
                const soilType = String(activeProject.soilType).toLowerCase();

                const materialMapping = {
                    "tanah biasa": "tanah-biasa",
                    "tanah lempung": "tanah-lempung",
                    "tanah berpasir": "tanah-berpasir",
                    "tanah keras": "tanah-keras",
                    "batuan": "batuan",
                    "lainnya": "lainnya"
                };

                earthworkMaterialInput.value =
                    materialMapping[soilType] || soilType;

                // Tidak perlu memilih ulang material dari proyek
                earthworkMaterialInput.disabled = true;
            }

            // Muat parameter pekerjaan tanah yang pernah disimpan
            const savedEarthwork = activeProject.results?.earthwork;

            if (savedEarthwork) {
                if (earthworkSwellInput) {
                    earthworkSwellInput.value =
                        savedEarthwork.swellFactor ?? "";
                }

                if (earthworkShrinkageInput) {
                    earthworkShrinkageInput.value =
                        savedEarthwork.shrinkageFactor ?? "";
                }

                if (earthworkSourceInput) {
                    earthworkSourceInput.value =
                        savedEarthwork.parameterSource ?? "";
                }

                if (earthworkSourceNoteInput) {
                    earthworkSourceNoteInput.value =
                        savedEarthwork.sourceNote ?? "";
                }
            }
        }
    } catch (error) {
        console.error("Data proyek gagal dimuat:", error);
    }
}

// ------------------------------------------
// HITUNG VOLUME TANAH
// ------------------------------------------

if (calculateEarthworkBtn) {
    calculateEarthworkBtn.addEventListener("click", function () {
        const bcm = parseFloat(earthworkBCMInput?.value);
        const swell = parseFloat(earthworkSwellInput?.value);
        const shrinkage = parseFloat(earthworkShrinkageInput?.value);

        const material = earthworkMaterialInput?.value || "";
        const parameterSource = earthworkSourceInput?.value || "";
        const sourceNote = earthworkSourceNoteInput?.value.trim() || "";

        // Validasi input wajib
        if (
            !Number.isFinite(bcm) || bcm <= 0 ||
            !Number.isFinite(swell) || swell < 0 ||
            !Number.isFinite(shrinkage) ||
            shrinkage < 0 || shrinkage >= 100 ||
            !material ||
            !parameterSource
        ) {
            earthworkStatus.textContent =
                "Lengkapi semua input wajib. BCM harus lebih dari 0, swell tidak boleh negatif, dan shrinkage harus kurang dari 100%.";

            earthworkDetails.innerHTML = "";
            return;
        }

        // Perhitungan volume
        const lcm = bcm * (1 + swell / 100);
        const ccm = bcm * (1 - shrinkage / 100);

        earthworkStatus.textContent = "Perhitungan berhasil.";

        // ------------------------------------------
        // SIMPAN HASIL KE PROYEK AKTIF
        // ------------------------------------------

        if (earthworkFromProject) {
            try {
                const project = JSON.parse(
                    localStorage.getItem("excabase_active_project")
                );

                if (project) {
                    project.results = project.results || {};

                    project.results.earthwork = {
                        bcm: bcm,
                        lcm: lcm,
                        ccm: ccm,
                        material: material,
                        swellFactor: swell,
                        shrinkageFactor: shrinkage,
                        parameterSource: parameterSource,
                        sourceNote: sourceNote,
                        calculatedAt: new Date().toISOString()
                    };

                    // Simpan hasil pekerjaan tanah ke sistem multiproyek
const saved = saveExcabaseProject(project);

if (!saved) {
    console.error("Gagal menyinkronkan hasil pekerjaan tanah.");
}
                }
            } catch (error) {
                console.error(
                    "Hasil pekerjaan tanah gagal disimpan:",
                    error
                );
            }
        }

        // ------------------------------------------
        // TAMPILKAN HASIL
        // ------------------------------------------

        earthworkDetails.innerHTML = `
            <h3>1. Bank Cubic Meter (BCM)</h3>
            <p>Volume tanah dalam kondisi asli sebelum digali.</p>
            <p><strong>${bcm.toFixed(2)} m³</strong></p>

            <h3>2. Loose Cubic Meter (LCM)</h3>
            <p>LCM = BCM × (1 + Swell Factor / 100)</p>
            <p>LCM = ${bcm.toFixed(2)} × (1 + ${swell} / 100)</p>
            <p><strong>${lcm.toFixed(2)} m³</strong></p>

            <h3>3. Compacted Cubic Meter (CCM)</h3>
            <p>CCM = BCM × (1 − Shrinkage Factor / 100)</p>
            <p>CCM = ${bcm.toFixed(2)} × (1 − ${shrinkage} / 100)</p>
            <p><strong>${ccm.toFixed(2)} m³</strong></p>

            <h3>4. Informasi Parameter</h3>
            <p>Jenis material: <strong>${material}</strong></p>
            <p>Sumber parameter: <strong>${parameterSource}</strong></p>
            <p>Keterangan sumber: <strong>${sourceNote || "Tidak dicantumkan"}</strong></p>

            <p><em>Catatan: hasil bergantung pada nilai swell dan shrinkage yang dimasukkan. Pastikan parameter sesuai kondisi material dan pekerjaan.</em></p>
        `;
    });
}

// ------------------------------------------
// RESET KALKULATOR
// ------------------------------------------

if (resetEarthworkBtn) {
    resetEarthworkBtn.addEventListener("click", function () {
        if (earthworkBCMInput) earthworkBCMInput.value = "";
        if (earthworkSwellInput) earthworkSwellInput.value = "";
        if (earthworkShrinkageInput) earthworkShrinkageInput.value = "";
        if (earthworkSourceInput) earthworkSourceInput.value = "";
        if (earthworkSourceNoteInput) earthworkSourceNoteInput.value = "";

        // Mode mandiri: material dikosongkan
        // Mode proyek: material proyek tetap dipertahankan
        if (earthworkMaterialInput && !earthworkFromProject) {
            earthworkMaterialInput.value = "";
        }

        earthworkStatus.textContent =
            "Masukkan data, lalu klik Hitung Volume.";

        earthworkDetails.innerHTML = "";
    });
}


const calculateProjectBtn = document.getElementById("calculateProjectBtn");
const resetProjectBtn = document.getElementById("resetProjectBtn");
const isProjectEstimatePage =
    document.getElementById("projectName") !== null;

// ========================================
// 1. Isi data otomatis saat halaman dibuka
// ========================================
(function loadProjectEstimateData() {
    if (!isProjectEstimatePage) return;

    const params = new URLSearchParams(window.location.search);
    const fromProject = params.get("fromProject") === "1";

    if (!fromProject) return;

    try {
        const project = JSON.parse(
            localStorage.getItem("excabase_active_project")
        );

        if (!project) return;

        document.getElementById("projectName").value =
            project.name || "Proyek Pekerjaan Tanah";

        document.getElementById("projectVolume").value =
            project.results?.earthwork?.bcm ??
            project.soilVolumeBCM ??
            "";

        document.getElementById("projectHours").value =
            project.workHoursPerDay || 8;

            // Target durasi mengikuti data proyek aktif
        const targetDaysInput =
            document.getElementById("projectTargetDays");

        if (targetDaysInput) {
            targetDaysInput.value = project.targetDays ?? "";
            targetDaysInput.readOnly = true;
        }
        // ==========================================
// TAMPILKAN HASIL PRODUKTIVITAS ALAT
// ==========================================

const equipmentList =
    document.getElementById("projectEquipmentList");

const productivityData = project.results?.productivity || {};
// Jenis pekerjaan mengikuti data dari Buat Proyek
const projectWorkType = project.workType || "";
// Mengubah teks rekomendasi menjadi daftar jenis alat

const savedSelectedEquipment = project.results?.selectedEquipment;

const recommendedEquipmentText = Array.isArray(savedSelectedEquipment)
    ? savedSelectedEquipment.join(", ")
    : project.results?.recommendation?.equipment || "";



const equipmentTypeMapping = {
    "bulldozer": "bulldozer",
    "excavator": "excavator",
    "dump truck": "dumptruck",
    "dumptruck": "dumptruck",
    "wheel loader": "wheelloader",
    "wheelloader": "wheelloader",
    "motor grader": "motorgrader",
    "motorgrader": "motorgrader",
    "compactor": "compactor",
    "roller": "compactor"
};


const recommendedEquipment = Object.entries(equipmentTypeMapping)
    .filter(function ([name]) {
        return recommendedEquipmentText.toLowerCase().includes(name);
    })
    .map(function ([, type]) {
        return type;
    });
// Data volume berdasarkan hasil Earthwork
const earthworkData = project.results?.earthwork || {};

const projectVolumes = {
    bcm: Number(earthworkData.bcm) || 0,
    lcm: Number(earthworkData.lcm) || 0,
    ccm: Number(earthworkData.ccm) || 0
};
const volumeInfo = document.getElementById("projectVolumeInfo");

if (volumeInfo) {
    volumeInfo.innerHTML = `
        <p><strong>Volume Tanah Asli (BCM):</strong>
            ${projectVolumes.bcm.toLocaleString("id-ID")} m³
        </p>
        <p><strong>Volume Tanah Lepas (LCM):</strong>
            ${projectVolumes.lcm.toLocaleString("id-ID")} m³
        </p>
        <p><strong>Volume Tanah Padat (CCM):</strong>
            ${projectVolumes.ccm.toLocaleString("id-ID")} m³
        </p>
    `;
}

if (equipmentList) {
    const equipmentNames = {
        excavator: "Excavator",
        bulldozer: "Bulldozer",
        dumptruck: "Dump Truck",
        wheelloader: "Wheel Loader",
        motorgrader: "Motor Grader",
        compactor: "Compactor"
    };
    const missingEquipment = recommendedEquipment.filter(function (type) {
        const data = productivityData[type];

        return !data ||
            !Number.isFinite(data.hourly) ||
            data.hourly <= 0;
    });
    const equipmentHTML = Object.entries(productivityData)
    .filter(function ([type, data]) {
        return recommendedEquipment.includes(type) &&
            Number.isFinite(data?.hourly) &&
            data.hourly > 0;
    })
        .map(function ([type, data]) {
            const volume = Number(project.soilVolumeBCM) || 0;
const hoursPerDay = Number(project.workHoursPerDay) || 0;
const targetDays = Number(project.targetDays) || 0;

// Menentukan basis produktivitas alat yang tersimpan
const productivityBasis = data.volumeBasis;

// Mengambil volume pekerjaan sesuai basis produktivitas
const calculationVolume =
    productivityBasis === "lcm"
        ? Number(project.results?.earthwork?.lcm)
        : productivityBasis === "ccm"
            ? Number(project.results?.earthwork?.ccm)
            : productivityBasis === "bcm"
                ? Number(project.results?.earthwork?.bcm)
                : NaN;

// Menghitung kebutuhan jumlah alat berdasarkan target proyek
const requiredUnits =
    Number.isFinite(calculationVolume) &&
    calculationVolume > 0 &&
    Number.isFinite(data.hourly) &&
    data.hourly > 0 &&
    hoursPerDay > 0 &&
    targetDays > 0
        ? Math.max(
            1,
            Math.ceil(
                calculationVolume /
                (data.hourly * hoursPerDay * targetDays)
            )
        )
        : null;
        // Rekomendasi awal basis volume berdasarkan fungsi alat
const defaultVolumeBasis = {
    excavator: "lcm",
    dumptruck: "lcm",
    wheelloader: "lcm",
    bulldozer: "lcm",
    motorgrader: "lcm",
    compactor: "ccm"
};

const suggestedBasis = defaultVolumeBasis[type] || "";
return `
    <div class="detail-section estimate-equipment-card"
         style="margin-bottom: 20px;">

        <h3>${equipmentNames[type] || type}</h3>

        <div class="estimate-equipment-info">
            <p>
                <strong>Model:</strong>
                ${data.model || "Tidak diketahui"}
            </p>

            <p>
                <strong>Produktivitas:</strong>
                ${data.hourly.toLocaleString("id-ID", {
                    maximumFractionDigits: 2
                })} m³/jam (${String(data.volumeBasis || "basis belum ditentukan").toUpperCase()})
            </p>
        </div>

        <div class="estimate-equipment-form">

            <div class="form-group">
                <label for="estimate-basis-${type}">
                    Basis Volume Pekerjaan
                </label>

                <select
                    id="estimate-basis-${type}"
                    data-estimate-basis="${type}"
                >
                    <option value="">Pilih basis volume</option>

                    <option value="bcm"
                        ${suggestedBasis === "bcm" ? "selected" : ""}>
                        BCM - Tanah Asli
                    </option>

                    <option value="lcm"
                        ${suggestedBasis === "lcm" ? "selected" : ""}>
                        LCM - Tanah Lepas
                    </option>

                    <option value="ccm"
                        ${suggestedBasis === "ccm" ? "selected" : ""}>
                        CCM - Tanah Padat
                    </option>
                </select>
            </div>

            <div class="form-group">
                <label for="estimate-volume-${type}">
                    Volume Pekerjaan Alat (m³)
                </label>

                <input
                    type="number"
                    id="estimate-volume-${type}"
                    data-estimate-volume="${type}"
                    value="${projectVolumes[suggestedBasis] || ""}"
                    min="0.01"
                    step="any"
                    placeholder="Volume pekerjaan alat"
                >
            </div>

            <div class="form-group">
                <label for="estimate-units-${type}">
                    Jumlah Unit Digunakan
                </label>

                <input
                    type="number"
                    id="estimate-units-${type}"
                    data-estimate-units="${type}"
                    value="${requiredUnits ?? ""}"
                    min="1"
                    step="1"
                    placeholder="Masukkan jumlah unit"
                >
            </div>

            <div class="form-group">
                <label for="estimate-cost-${type}">
                    Biaya Operasional per Unit (Rp/jam)
                </label>

                <input
                    type="number"
                    id="estimate-cost-${type}"
                    data-estimate-cost="${type}"
                    min="0"
                    step="1000"
                    placeholder="Masukkan biaya operasional per jam"
                >
            </div>

        </div>

        <div class="estimate-equipment-footer">
            <p>
                <strong>Kebutuhan unit teoritis:</strong>
                ${requiredUnits !== null
                    ? `${requiredUnits} unit`
                    : "Data proyek belum lengkap"}
            </p>

            <small>
                Volume pekerjaan harus menggunakan basis yang
                sesuai dengan produktivitas alat.
            </small>
        </div>

    </div>
`;
        })
        .join("");

    const missingEquipmentHTML = missingEquipment.length > 0
    ? `
        <div class="detail-note" style="margin-top: 16px;">
            <p><strong>Produktivitas belum lengkap:</strong></p>
            <p>
                ${missingEquipment.map(function (type) {
                    return equipmentNames[type] || type;
                }).join(", ")}
            </p>
            <p>
                Hitung produktivitas alat tersebut terlebih dahulu
                sebelum melanjutkan estimasi proyek.
            </p>
        </div>
    `
    : "";

equipmentList.innerHTML =
    (equipmentHTML || "<p>Belum ada hasil produktivitas alat yang valid.</p>") +
    missingEquipmentHTML;
    // Memperbarui volume ketika basis volume diganti
equipmentList.querySelectorAll("[data-estimate-basis]").forEach(function (select) {
    select.addEventListener("change", function () {
        const type = select.dataset.estimateBasis;

        const volumeInput = equipmentList.querySelector(
            `[data-estimate-volume="${type}"]`
        );

        if (!volumeInput) return;

        const selectedBasis = select.value;

        volumeInput.value =
            selectedBasis && projectVolumes[selectedBasis] > 0
                ? projectVolumes[selectedBasis]
                : "";
    });
});
}

    } catch (error) {
        console.error("Gagal memuat data proyek:", error);
    }
})();


// ========================================
// 2. Hitung estimasi waktu dan biaya
// ========================================
if (calculateProjectBtn) {
    calculateProjectBtn.addEventListener("click", function () {
        const projectName =
            document.getElementById("projectName").value.trim();

        const volume = parseFloat(
            document.getElementById("projectVolume").value
        );

        const productivity = parseFloat(
            document.getElementById("projectProductivity").value
        );

        const equipmentCount = parseInt(
            document.getElementById("projectEquipmentCount").value
        );

        const hoursPerDay = parseFloat(
            document.getElementById("projectHours").value
        );

        const equipmentCostPerHour = parseFloat(
            document.getElementById("equipmentCostPerHour").value
        );

        const status = document.getElementById("projectCalculationStatus");
        const details = document.getElementById("projectCalculationDetails");
        // Membaca jumlah unit dan biaya operasional setiap alat
const equipmentInputs = document.querySelectorAll(
    "#projectEquipmentList [data-estimate-units]"
);

const equipmentEstimates = Array.from(equipmentInputs).map(function (input) {
    const type = input.dataset.estimateUnits;
    const volumeInput = document.querySelector(
    `[data-estimate-volume="${type}"]`
);

const basisInput = document.querySelector(
    `[data-estimate-basis="${type}"]`
);

const workVolume = volumeInput
    ? Number(volumeInput.value)
    : NaN;

const workVolumeBasis = basisInput
    ? basisInput.value
    : "";

    // Mengambil hasil produktivitas dari proyek aktif
    const activeProjectData = JSON.parse(
        localStorage.getItem("excabase_active_project") || "null"
    );

    const savedProductivity =
        activeProjectData?.results?.productivity?.[type];

    const hourlyProductivity = Number(savedProductivity?.hourly);

    // Mengambil biaya operasional alat
    const costInput = document.querySelector(
        `[data-estimate-cost="${type}"]`
    );

    return {
        type: type,
        units: Number(input.value),
        hourlyProductivity: hourlyProductivity,
        volumeBasis: savedProductivity?.volumeBasis || "unspecified",
        workVolume: workVolume,
        workVolumeBasis: workVolumeBasis,
        costPerHour: costInput
            ? Number(costInput.value)
            : 0
    };
});
// Validasi jumlah unit dan biaya operasional setiap alat
const invalidEquipment = equipmentEstimates.some(function (item) {
    const unitsInput = document.querySelector(
        `[data-estimate-units="${item.type}"]`
    );

    const costInput = document.querySelector(
        `[data-estimate-cost="${item.type}"]`
    );

    return (
    !unitsInput ||
    unitsInput.value.trim() === "" ||
    !Number.isInteger(item.units) ||
    item.units < 1 ||
    !costInput ||
    costInput.value.trim() === "" ||
    !Number.isFinite(item.costPerHour) ||
    item.costPerHour < 0 ||
    !Number.isFinite(item.hourlyProductivity) ||
    item.hourlyProductivity <= 0 ||
    !Number.isFinite(item.workVolume) ||
    item.workVolume <= 0 ||
    !["bcm", "lcm", "ccm"].includes(item.workVolumeBasis)
);
});

if (equipmentEstimates.length === 0 || invalidEquipment) {
    status.textContent =
        "Periksa jumlah unit, produktivitas, volume pekerjaan, basis volume, dan biaya operasional setiap alat.";

    details.innerHTML = "";
    return;
}
// Pastikan semua alat rekomendasi memiliki hasil produktivitas
const estimateParamsCheck = new URLSearchParams(window.location.search);

if (estimateParamsCheck.get("fromProject") === "1") {
    const activeProject = JSON.parse(
        localStorage.getItem("excabase_active_project") || "null"
    );

    const selectedEquipment = activeProject?.results?.selectedEquipment;

const recommendationText = (
    Array.isArray(selectedEquipment)
        ? selectedEquipment.join(", ")
        : String(activeProject?.results?.recommendation?.equipment || "")
).toLowerCase();

    const equipmentMapping = {
        excavator: "excavator",
        bulldozer: "bulldozer",
        "dump truck": "dumptruck",
        "dumptruck": "dumptruck",
        "wheel loader": "wheelloader",
        "wheelloader": "wheelloader",
        "motor grader": "motorgrader",
        "motorgrader": "motorgrader",
        compactor: "compactor",
        roller: "compactor"
    };

    const requiredTypes = Object.entries(equipmentMapping)
        .filter(function ([name]) {
            return recommendationText.includes(name);
        })
        .map(function ([, type]) {
            return type;
        });

    const estimatedTypes = equipmentEstimates.map(function (item) {
        return item.type;
    });

    const incompleteTypes = requiredTypes.filter(function (type) {
        return !estimatedTypes.includes(type);
    });

    if (requiredTypes.length === 0 || incompleteTypes.length > 0) {
        status.textContent =
            "Estimasi belum dapat dihitung. Lengkapi produktivitas seluruh alat rekomendasi terlebih dahulu.";

        details.innerHTML = "";
        return;
    }
}

        if (
            !projectName ||
            !Number.isFinite(volume) || volume <= 0 ||
            !Number.isFinite(productivity) || productivity <= 0 ||
            !Number.isFinite(equipmentCount) || equipmentCount < 1 ||
            !Number.isFinite(equipmentCostPerHour) ||
            equipmentCostPerHour < 0 ||
            !Number.isFinite(hoursPerDay) ||
            hoursPerDay <= 0 || hoursPerDay > 24
        ) {
            status.textContent = "Lengkapi data proyek dengan nilai yang valid.";
            details.innerHTML = "";
            return;
        }
        // Perhitungan estimasi proyek per alat masih disiapkan
const isEstimateProjectMode =
    new URLSearchParams(window.location.search)
        .get("fromProject") === "1";
        // Memeriksa kesesuaian basis produktivitas dan volume pekerjaan
const incompatibleEquipment = equipmentEstimates.filter(function (item) {
    return (
        item.volumeBasis === "unspecified" ||
        item.volumeBasis !== item.workVolumeBasis
    );
});

if (isEstimateProjectMode && incompatibleEquipment.length > 0) {
    status.textContent =
        "Basis produktivitas alat belum sesuai atau belum ditentukan. Estimasi durasi dan biaya total belum dapat dihitung.";

    details.innerHTML = "";
    return;
}
// Menghitung produktivitas, durasi, dan biaya setiap alat
const equipmentCalculations = equipmentEstimates.map(function (item) {

    const totalHourlyProductivity =
        item.hourlyProductivity * item.units;

    const totalHourlyCost =
        item.costPerHour * item.units;

    const dailyProductivity =
        totalHourlyProductivity * hoursPerDay;

    const dailyCost =
        totalHourlyCost * hoursPerDay;

    // Durasi pekerjaan berdasarkan volume dan produktivitas
    const durationHours =
        item.workVolume / totalHourlyProductivity;

    const durationDays =
        durationHours / hoursPerDay;

    // Total biaya operasional selama pekerjaan
    const totalOperatingCost =
        durationHours * totalHourlyCost;

    return {
        ...item,
        totalHourlyProductivity: totalHourlyProductivity,
        totalHourlyCost: totalHourlyCost,
        dailyProductivity: dailyProductivity,
        dailyCost: dailyCost,
        durationHours: durationHours,
        durationDays: durationDays,
        totalOperatingCost: totalOperatingCost
    };
});
if (isEstimateProjectMode) {
    try {
    const project = JSON.parse(
        localStorage.getItem("excabase_active_project")
    );

    if (project) {
        project.results = project.results || {};
        project.results.estimate = {
            equipment: equipmentCalculations,
            status: "partial",
            calculatedAt: new Date().toISOString()
        };
        project.workHoursPerDay = hoursPerDay;

        // Sinkronisasi estimasi per alat ke sistem multiproyek
const saved = saveExcabaseProject(project);

if (!saved) {
    console.error("Gagal menyinkronkan estimasi per alat.");
}
    }
} catch (error) {
    console.error("Gagal menyimpan estimasi per alat:", error);
}
    status.textContent =
        "Perhitungan kapasitas dan biaya operasional per alat berhasil.";
    

    details.innerHTML = equipmentCalculations.map(function (item) {
        const equipmentNames = {
            excavator: "Excavator",
            bulldozer: "Bulldozer",
            dumptruck: "Dump Truck",
            wheelloader: "Wheel Loader",
            motorgrader: "Motor Grader",
            compactor: "Compactor"
        };

        return `
    <div class="detail-section" style="margin-bottom: 20px;">
        <h3>${equipmentNames[item.type] || item.type}</h3>

        <p><strong>Jumlah alat:</strong>
            ${item.units} unit
        </p>

        <p><strong>Produktivitas gabungan:</strong>
            ${item.totalHourlyProductivity.toLocaleString("id-ID", {
                maximumFractionDigits: 2
            })} m³/jam (${item.workVolumeBasis.toUpperCase()})
        </p>

        <p><strong>Volume pekerjaan:</strong>
            ${item.workVolume.toLocaleString("id-ID", {
                maximumFractionDigits: 2
            })} ${item.workVolumeBasis.toUpperCase()}
        </p>

        <p><strong>Biaya operasional per jam:</strong>
            Rp${item.totalHourlyCost.toLocaleString("id-ID")}
        </p>

        <p><strong>Biaya operasional per hari:</strong>
            Rp${item.dailyCost.toLocaleString("id-ID")}
        </p>

        <hr>

        <p><strong>Estimasi durasi pekerjaan:</strong>
            ${item.durationHours.toLocaleString("id-ID", {
                maximumFractionDigits: 2
            })} jam
        </p>

        <p><strong>Estimasi durasi (hari kerja):</strong>
            ${item.durationDays.toLocaleString("id-ID", {
                maximumFractionDigits: 2
            })} hari
        </p>

        <p><strong>Total biaya operasional:</strong>
            Rp${item.totalOperatingCost.toLocaleString("id-ID", {
                maximumFractionDigits: 0
            })}
        </p>
    </div>
`;
       }).join("");

       // Menghitung total kebutuhan alat
const totalEquipmentUnits = equipmentCalculations.reduce(
    (total, item) => total + item.units,
    0
);

// Menghitung total biaya operasional proyek
const totalProjectOperatingCost = equipmentCalculations.reduce(
    (total, item) => total + item.totalOperatingCost,
    0
);
// Ringkasan total estimasi proyek
const summaryHTML = `
    <div class="detail-section estimate-summary">
        <h3>Ringkasan Estimasi Proyek</h3>

        <p>
            <strong>Total kebutuhan alat:</strong>
            <span class="estimate-summary-value">
                ${totalEquipmentUnits} unit
            </span>
        </p>

        <p>
            <strong>Total biaya operasional:</strong>
            <span class="estimate-summary-value">
                Rp${totalProjectOperatingCost.toLocaleString("id-ID", {
                    maximumFractionDigits: 0
                })}
            </span>
        </p>
    </div>
`;

// Menambahkan ringkasan di bawah kartu alat
details.insertAdjacentHTML("beforeend", summaryHTML);

return;
}

        // Produktivitas total seluruh alat
        const totalProductivity = productivity * equipmentCount;

        // Durasi pekerjaan
        const totalHours = volume / totalProductivity;
        const totalDays = totalHours / hoursPerDay;

        // Volume pekerjaan per hari
        const dailyVolume = totalProductivity * hoursPerDay;

        // Biaya operasional
        const totalCost =
            totalHours * equipmentCostPerHour * equipmentCount;

        const dailyCost =
            hoursPerDay * equipmentCostPerHour * equipmentCount;
            // Menghitung durasi pekerjaan berdasarkan volume tiap alat
const durationHours =
    item.workVolume / totalHourlyProductivity;

const durationDays =
    durationHours / hoursPerDay;

// Menghitung total biaya operasional
const totalOperatingCost =
    durationHours * totalHourlyCost;
        // Simpan hasil estimasi ke proyek aktif
const estimateParams = new URLSearchParams(window.location.search);

if (estimateParams.get("fromProject") === "1") {
    try {
        const project = JSON.parse(
            localStorage.getItem("excabase_active_project")
        );

        if (project) {
            if (!project.results) {
                project.results = {};
            }

            project.results.estimate = {
                productivity: productivity,
                equipmentCount: equipmentCount,
                totalProductivity: totalProductivity,
                totalHours: totalHours,
                totalDays: totalDays,
                dailyVolume: dailyVolume,
                equipmentCostPerHour: equipmentCostPerHour,
                totalCost: totalCost,
                dailyCost: dailyCost
            };

            // Sinkronisasi estimasi keseluruhan ke sistem multiproyek
const saved = saveExcabaseProject(project);

if (!saved) {
    console.error("Gagal menyinkronkan estimasi keseluruhan.");
}
        }
    } catch (error) {
        console.error("Gagal menyimpan hasil estimasi:", error);
    }
}
        status.textContent = "Estimasi berhasil dihitung.";

        details.innerHTML = `
            <h3>${projectName}</h3>

            <p><strong>Produktivitas total alat:</strong></p>
            <p>${productivity.toFixed(2)} × ${equipmentCount} alat</p>
            <p><strong>${totalProductivity.toFixed(2)} m³/jam</strong></p>

            <p><strong>Estimasi durasi:</strong></p>
            <p>Durasi = Volume pekerjaan / Produktivitas total</p>
            <p>Durasi = ${volume.toLocaleString("id-ID")} / ${totalProductivity.toFixed(2)}</p>
            <p><strong>${totalHours.toFixed(2)} jam</strong></p>
            <p><strong>${totalDays.toFixed(2)} hari kerja</strong></p>

            <p><strong>Estimasi volume per hari:</strong></p>
            <p>${totalProductivity.toFixed(2)} × ${hoursPerDay} jam</p>
            <p><strong>${dailyVolume.toLocaleString("id-ID")} m³/hari</strong></p>

            <p><strong>Estimasi biaya operasional:</strong></p>
            <p>${totalHours.toFixed(2)} jam × Rp${equipmentCostPerHour.toLocaleString("id-ID")}/jam × ${equipmentCount} alat</p>
            <p><strong>Rp${totalCost.toLocaleString("id-ID")}</strong></p>

            <p><strong>Estimasi biaya per hari:</strong></p>
            <p><strong>Rp${dailyCost.toLocaleString("id-ID")}/hari</strong></p>

            <p><em>Catatan: estimasi mengasumsikan seluruh alat memiliki produktivitas yang sama dan dapat bekerja bersamaan. Durasi aktual dipengaruhi kondisi lapangan, waktu tunggu, dan efisiensi armada.</em></p>
        `;
    });
}
// ========================================
// MEMULIHKAN HASIL ESTIMASI PROYEK
// ========================================

const restoreEstimateParams =
    new URLSearchParams(window.location.search);

if (isProjectEstimatePage && restoreEstimateParams.get("fromProject") === "1") {
    window.addEventListener("pageshow", function (event) {
        if (event.persisted) window.location.reload();
    });
}

if (restoreEstimateParams.get("fromProject") === "1") {
    try {
        const savedProject = JSON.parse(
            localStorage.getItem("excabase_active_project") || "null"
        );

        const savedEquipment =
            savedProject?.results?.estimate?.equipment;

            // Mengembalikan input estimasi dari data tersimpan
if (Array.isArray(savedEquipment)) {
    savedEquipment.forEach(function (item) {

        // Memulihkan biaya operasional per jam
        const costInput = document.querySelector(
            `[data-estimate-cost="${item.type}"]`
        );

        if (costInput && Number.isFinite(Number(item.costPerHour))) {
            costInput.value = item.costPerHour;
        }

        // Memulihkan jumlah unit alat
        const unitsInput = document.querySelector(
            `[data-estimate-units="${item.type}"]`
        );

        if (unitsInput) {
            unitsInput.value = item.units;
        }

        // Memulihkan volume pekerjaan
        const volumeInput = document.querySelector(
            `[data-estimate-volume="${item.type}"]`
        );

        if (volumeInput) {
            volumeInput.value = item.workVolume;
        }

        // Memulihkan basis volume
        const basisInput = document.querySelector(
            `[data-estimate-basis="${item.type}"]`
        );

        if (basisInput) {
            basisInput.value = item.workVolumeBasis;
        }

    });
}

        const estimateIsStale = savedProject &&
            String(savedProject.status || "").toLowerCase() !== "selesai" &&
            !isExcabaseEstimateCurrent(savedProject);

        if (estimateIsStale && Array.isArray(savedEquipment) && savedEquipment.length > 0) {
            document.getElementById("projectCalculationStatus").textContent =
                "Produktivitas berubah. Jumlah unit dan input Estimasi sebelumnya dipulihkan; klik Hitung Estimasi untuk menyimpan hasil terbaru sebelum Simulasi.";
            document.getElementById("projectCalculationDetails").innerHTML = "";
        }

        if (!estimateIsStale && Array.isArray(savedEquipment) && savedEquipment.length > 0) {

    const savedDetails = document.getElementById(
        "projectCalculationDetails"
    );

    const savedStatus = document.getElementById(
        "projectCalculationStatus"
    );

    if (savedDetails) {

        const equipmentNames = {
            excavator: "Excavator",
            bulldozer: "Bulldozer",
            dumptruck: "Dump Truck",
            wheelloader: "Wheel Loader",
            motorgrader: "Motor Grader",
            compactor: "Compactor"
        };

        const formatNumber = (value, digits = 2) =>
            Number(value).toLocaleString("id-ID", {
                maximumFractionDigits: digits
            });

        const formatRupiah = (value) =>
            "Rp" + formatNumber(value, 0);

        const cardsHTML = savedEquipment.map(function (item) {
            return `
                <div class="detail-section">
                    <h3>${equipmentNames[item.type] || item.type}</h3>

                    <p><strong>Jumlah alat:</strong>
                        ${item.units} unit
                    </p>

                    <p><strong>Produktivitas gabungan:</strong>
                        ${formatNumber(item.totalHourlyProductivity)}
                        m³/jam (${item.workVolumeBasis.toUpperCase()})
                    </p>

                    <p><strong>Volume pekerjaan:</strong>
                        ${formatNumber(item.workVolume)}
                        ${item.workVolumeBasis.toUpperCase()}
                    </p>

                    <p><strong>Biaya operasional per jam:</strong>
                        ${formatRupiah(item.totalHourlyCost)}
                    </p>

                    <p><strong>Biaya operasional per hari:</strong>
                        ${formatRupiah(item.dailyCost)}
                    </p>

                    <hr>

                    <p><strong>Estimasi durasi pekerjaan:</strong>
                        ${formatNumber(item.durationHours)} jam
                    </p>

                    <p><strong>Estimasi durasi (hari kerja):</strong>
                        ${formatNumber(item.durationDays)} hari
                    </p>

                    <p><strong>Total biaya operasional:</strong>
                        ${formatRupiah(item.totalOperatingCost)}
                    </p>
                </div>
            `;
        }).join("");

        const totalUnits = savedEquipment.reduce(
            (total, item) => total + Number(item.units),
            0
        );

        const totalCost = savedEquipment.reduce(
            (total, item) => total + Number(item.totalOperatingCost),
            0
        );

        savedDetails.innerHTML = cardsHTML + `
    <div class="detail-section estimate-summary">
        <h3>Ringkasan Estimasi Proyek</h3>

        <p>
            <strong>Total kebutuhan alat:</strong>
            <span class="estimate-summary-value">
                ${totalUnits} unit
            </span>
        </p>

        <p>
            <strong>Total biaya operasional:</strong>
            <span class="estimate-summary-value">
                ${formatRupiah(totalCost)}
            </span>
        </p>
    </div>
`;

        if (savedStatus) {
            savedStatus.textContent =
                "Hasil estimasi sebelumnya berhasil dimuat.";
        }
    }
}
    } catch (error) {
        console.error(
            "Gagal membaca hasil estimasi tersimpan:",
            error
        );
    }
}

// ========================================
// 3. Reset estimasi
// ========================================
if (resetProjectBtn) {
    resetProjectBtn.addEventListener("click", function () {
        document.getElementById("projectName").value =
            "Proyek Pekerjaan Tanah";

        document.getElementById("projectVolume").value = 10000;
        document.getElementById("projectProductivity").value = 100;
        document.getElementById("projectEquipmentCount").value = 2;
        document.getElementById("projectHours").value = 8;
        document.getElementById("equipmentCostPerHour").value = 350000;

        document.getElementById("projectCalculationStatus").textContent =
            "Masukkan data proyek, lalu klik Hitung Estimasi.";

        document.getElementById("projectCalculationDetails").innerHTML = "";
    });
}


// Isi data simulasi armada dari proyek aktif
(function loadFleetProjectData() {
    const params = new URLSearchParams(window.location.search);
    const fromProject = params.get("fromProject") === "1";

    if (!fromProject) return;

    // Pastikan kode hanya berjalan pada halaman simulasi armada
    const workingHoursInput = document.getElementById("fleetWorkingHours");
    const excavatorProductivityInput = document.getElementById(
        "fleetExcavatorProductivity"
    );

    if (!workingHoursInput || !excavatorProductivityInput) return;

    try {
        const project = JSON.parse(
            localStorage.getItem("excabase_active_project")
        );

        if (!project) return;

        workingHoursInput.value = project.workHoursPerDay || 8;

        const savedEstimate = project.results?.estimate;

        if (savedEstimate?.productivity) {
            excavatorProductivityInput.value =
                savedEstimate.productivity;
        }

    } catch (error) {
        console.error(
            "Gagal memuat data proyek untuk simulasi armada:",
            error
        );
    }
})();
const calculateFleetBtn = document.getElementById("calculateFleetBtn");
const resetFleetBtn = document.getElementById("resetFleetBtn");

if (calculateFleetBtn) {
    calculateFleetBtn.addEventListener("click", function () {
        const excavatorProductivity = parseFloat(
            document.getElementById("fleetExcavatorProductivity").value
        );
        const truckCapacity = parseFloat(
            document.getElementById("fleetTruckCapacity").value
        );
        const truckCycle = parseFloat(
            document.getElementById("fleetTruckCycle").value
        );
        const truckCount = parseInt(
            document.getElementById("fleetTruckCount").value
        );
        const efficiency = parseFloat(
            document.getElementById("fleetEfficiency").value
        );
        const workingHours = parseFloat(
            document.getElementById("fleetWorkingHours").value
        );

        const status = document.getElementById("fleetCalculationStatus");
        const details = document.getElementById("fleetCalculationDetails");

        if (
            !Number.isFinite(excavatorProductivity) || excavatorProductivity <= 0 ||
            !Number.isFinite(truckCapacity) || truckCapacity <= 0 ||
            !Number.isFinite(truckCycle) || truckCycle <= 0 ||
            !Number.isFinite(truckCount) || truckCount < 1 ||
            !Number.isFinite(efficiency) || efficiency <= 0 || efficiency > 1 ||
            !Number.isFinite(workingHours) || workingHours <= 0 || workingHours > 24
        ) {
            status.textContent = "Periksa kembali input armada. Masukkan nilai yang valid.";
            details.innerHTML = "";
            return;
        }

        // Produktivitas satu dump truck (m³/jam)
        const oneTruckProductivity =
            (truckCapacity * 60 / truckCycle) * efficiency;

        // Produktivitas seluruh dump truck
        const totalTruckProductivity =
            oneTruckProductivity * truckCount;

        // Produktivitas aktual sistem dibatasi alat dengan kapasitas lebih rendah
        const systemProductivity = Math.min(
            excavatorProductivity,
            totalTruckProductivity
        );

        // Kebutuhan dump truck teoritis untuk mengimbangi excavator
        const idealTruckCount =
            excavatorProductivity / oneTruckProductivity;

        // Estimasi volume harian
        const dailyProductivity = systemProductivity * workingHours;

        let balanceMessage = "";

        if (totalTruckProductivity < excavatorProductivity) {
            balanceMessage = "Dump truck menjadi faktor pembatas. Excavator berpotensi menunggu.";
        } else if (totalTruckProductivity > excavatorProductivity) {
            balanceMessage = "Kapasitas dump truck melebihi excavator. Sebagian dump truck berpotensi menunggu.";
        } else {
            balanceMessage = "Kapasitas excavator dan dump truck seimbang secara teoritis.";
        }

        status.textContent = "Simulasi berhasil dihitung.";

        details.innerHTML = `
            <h3>1. Produktivitas Dump Truck</h3>
            <p>Q = Kapasitas × 60 / Waktu siklus × Efisiensi</p>
            <p>Q = ${truckCapacity} × 60 / ${truckCycle} × ${efficiency}</p>
            <p><strong>${oneTruckProductivity.toFixed(2)} m³/jam per truck</strong></p>

            <h3>2. Produktivitas Total Dump Truck</h3>
            <p>${oneTruckProductivity.toFixed(2)} × ${truckCount} unit</p>
            <p><strong>${totalTruckProductivity.toFixed(2)} m³/jam</strong></p>

            <h3>3. Produktivitas Sistem Armada</h3>
            <p>Q sistem = nilai terkecil dari produktivitas excavator dan dump truck</p>
            <p><strong>${systemProductivity.toFixed(2)} m³/jam</strong></p>

            <h3>4. Keseimbangan Armada</h3>
            <p>${balanceMessage}</p>
            <p>Kebutuhan dump truck teoritis = ${idealTruckCount.toFixed(2)} unit</p>

            <h3>5. Estimasi Produktivitas Harian</h3>
            <p>${systemProductivity.toFixed(2)} × ${workingHours} jam</p>
            <p><strong>${dailyProductivity.toFixed(2)} m³/hari</strong></p>

            <p><em>Catatan: simulasi ini merupakan estimasi sederhana. Waktu siklus harus mencakup pemuatan, perjalanan bermuatan, dumping, dan perjalanan kembali. Efisiensi aktual bergantung pada kondisi lapangan.</em></p>
        `;
    });
}

if (resetFleetBtn) {
    resetFleetBtn.addEventListener("click", function () {
        document.getElementById("fleetExcavatorProductivity").value = 120;
        document.getElementById("fleetTruckCapacity").value = 10;
        document.getElementById("fleetTruckCycle").value = 20;
        document.getElementById("fleetTruckCount").value = 3;
        document.getElementById("fleetEfficiency").value = 0.83;
        document.getElementById("fleetWorkingHours").value = 8;

        document.getElementById("fleetCalculationStatus").textContent =
            "Masukkan data armada, lalu klik Simulasikan Armada.";
        document.getElementById("fleetCalculationDetails").innerHTML = "";
    });
}


const compareEquipmentBtn = document.getElementById("compareEquipmentBtn");

if (compareEquipmentBtn) {
    const equipmentComparisonData = {
        excavator: {
            name: "Excavator",
            capacity: "Bucket 1,19 m³",
            productivity: 128.04,
            unit: "m³/jam",
            application: "Penggalian dan pemuatan tanah"
        },
        bulldozer: {
            name: "Bulldozer",
            capacity: "Blade 4,5 m³",
            productivity: 199.44,
            unit: "m³/jam",
            application: "Pembersihan dan pemindahan tanah"
        },
        dumptruck: {
            name: "Dump Truck",
            capacity: "Bak 10 m³",
            productivity: 24.90,
            unit: "m³/jam",
            application: "Pengangkutan material"
        },
        wheelloader: {
            name: "Wheel Loader",
            capacity: "Bucket 2,5 m³",
            productivity: 192.09,
            unit: "m³/jam",
            application: "Pemuatan dan pemindahan material"
        },
        motorgrader: {
            name: "Motor Grader",
            capacity: "Panjang blade 3,5 m",
            productivity: 2625,
            unit: "m²/jam",
            application: "Perataan dan pembentukan permukaan"
        },
        compactor: {
            name: "Compactor / Roller",
            capacity: "Lebar pemadatan 2,1 m",
            productivity: 1050,
            unit: "m²/jam",
            application: "Pemadatan lapisan tanah"
        }
    };

    compareEquipmentBtn.addEventListener("click", function () {
        const equipment1 = document.getElementById("compareEquipment1").value;
        const equipment2 = document.getElementById("compareEquipment2").value;
        const result = document.getElementById("comparisonResult");

        const data1 = equipmentComparisonData[equipment1];
        const data2 = equipmentComparisonData[equipment2];

        if (equipment1 === equipment2) {
            result.innerHTML = `
                <p class="error-message">
                    Pilih dua jenis alat berat yang berbeda untuk dibandingkan.
                </p>
            `;
            return;
        }

        const productivityComparison =
            data1.productivity === data2.productivity
                ? "Produktivitas keduanya sama."
                : data1.productivity > data2.productivity
                    ? `${data1.name} memiliki angka produktivitas lebih besar.`
                    : `${data2.name} memiliki angka produktivitas lebih besar.`;

        result.innerHTML = `
            <h3>Hasil Perbandingan</h3>

            <div class="comparison-grid">
                <div class="comparison-item">
                    <h4>${data1.name}</h4>
                    <p><strong>Kapasitas:</strong> ${data1.capacity}</p>
                    <p><strong>Produktivitas:</strong>
                        ${data1.productivity.toLocaleString("id-ID")} ${data1.unit}
                    </p>
                    <p><strong>Fungsi:</strong> ${data1.application}</p>
                </div>

                <div class="comparison-item">
                    <h4>${data2.name}</h4>
                    <p><strong>Kapasitas:</strong> ${data2.capacity}</p>
                    <p><strong>Produktivitas:</strong>
                        ${data2.productivity.toLocaleString("id-ID")} ${data2.unit}
                    </p>
                    <p><strong>Fungsi:</strong> ${data2.application}</p>
                </div>
            </div>

            <p class="comparison-conclusion">
                <strong>Kesimpulan:</strong> ${productivityComparison}
            </p>

            <small>
                Catatan: angka produktivitas merupakan nilai estimasi dari parameter
                contoh kalkulator EXCABASE. Produktivitas aktual bergantung pada
                kondisi lapangan, material, operator, dan metode kerja.
            </small>
        `;
    });
}


const generateReportBtn = document.getElementById("generateReportBtn");

if (generateReportBtn) {
    const printReportBtn = document.getElementById("printReportBtn");
    const reportOutput = document.getElementById("reportOutput");

    generateReportBtn.addEventListener("click", function () {
        const projectName =
            document.getElementById("reportProjectName").value.trim() ||
            "Proyek Pekerjaan Tanah";

        const equipment =
            document.getElementById("reportEquipment").value;

        const volume =
            Number(document.getElementById("reportVolume").value);

        const productivity =
            Number(document.getElementById("reportProductivity").value);

        const workingHours =
            Number(document.getElementById("reportWorkingHours").value);

        const notes =
            document.getElementById("reportNotes").value.trim() ||
            "Tidak ada catatan tambahan.";

        if (
            volume <= 0 ||
            productivity <= 0 ||
            workingHours <= 0 ||
            !Number.isFinite(volume) ||
            !Number.isFinite(productivity) ||
            !Number.isFinite(workingHours)
        ) {
            reportOutput.innerHTML = `
                <p class="error-message">
                    Masukkan volume, produktivitas, dan jam kerja dengan nilai lebih dari 0.
                </p>
            `;
            printReportBtn.disabled = true;
            return;
        }

        const durationHours = volume / productivity;
        const durationDays = durationHours / workingHours;
        const dailyProductivity = productivity * workingHours;

        const formatNumber = (value) =>
            value.toLocaleString("id-ID", {
                maximumFractionDigits: 2
            });

        reportOutput.innerHTML = `
            <div id="technicalReport">
                <h2>LAPORAN ANALISIS TEKNIK EXCABASE</h2>
                <hr>

                <h3>1. Informasi Proyek</h3>
                <p><strong>Nama proyek:</strong> ${projectName}</p>
                <p><strong>Alat berat:</strong> ${equipment}</p>

                <h3>2. Data Perencanaan</h3>
                <p><strong>Volume pekerjaan:</strong> ${formatNumber(volume)} m³</p>
                <p><strong>Produktivitas:</strong> ${formatNumber(productivity)} m³/jam</p>
                <p><strong>Jam kerja:</strong> ${formatNumber(workingHours)} jam/hari</p>

                <h3>3. Perhitungan Durasi</h3>
                <p><strong>Durasi pekerjaan:</strong></p>
                <p>
                    T = Volume / Produktivitas<br>
                    T = ${formatNumber(volume)} / ${formatNumber(productivity)}<br>
                    T = <strong>${formatNumber(durationHours)} jam</strong>
                </p>

                <p><strong>Estimasi durasi dalam hari:</strong></p>
                <p>
                    Hari = Durasi / Jam kerja per hari<br>
                    Hari = ${formatNumber(durationHours)} / ${formatNumber(workingHours)}<br>
                    Hari = <strong>${formatNumber(durationDays)} hari kerja</strong>
                </p>

                <h3>4. Ringkasan Hasil</h3>
                <p><strong>Produktivitas harian:</strong>
                    ${formatNumber(dailyProductivity)} m³/hari</p>
                <p><strong>Estimasi waktu:</strong>
                    ${formatNumber(durationDays)} hari kerja</p>

                <h3>5. Catatan Teknik</h3>
                <p>${notes}</p>

                <hr>
                <small>
                    Laporan ini merupakan estimasi berdasarkan data dan asumsi yang dimasukkan.
                    Durasi aktual dapat berubah akibat kondisi lapangan, waktu tunggu,
                    cuaca, metode kerja, dan efisiensi alat.
                </small>
            </div>
        `;

        printReportBtn.disabled = false;
    });

    printReportBtn.addEventListener("click", function () {
        window.print();
    });
}


const saveHistoryBtn = document.getElementById("saveHistoryBtn");

if (saveHistoryBtn) {
    const historyList = document.getElementById("historyList");
    const historyMessage = document.getElementById("historyMessage");
    const historySearch = document.getElementById("historySearch");
    const clearHistoryBtn = document.getElementById("clearHistoryBtn");

    const historyStorageKey = "excabaseProjectHistory";

    function getProjectHistory() {
        try {
            return JSON.parse(localStorage.getItem(historyStorageKey)) || [];
        } catch (error) {
            return [];
        }
    }

    function saveProjectHistory(history) {
        localStorage.setItem(historyStorageKey, JSON.stringify(history));
    }

    function formatHistoryNumber(value) {
        return Number(value).toLocaleString("id-ID", {
            maximumFractionDigits: 2
        });
    }

    function renderProjectHistory() {
        const history = getProjectHistory();
        const searchText = historySearch.value.trim().toLowerCase();

        const filteredHistory = history.filter(item =>
            item.projectName.toLowerCase().includes(searchText) ||
            item.calculationType.toLowerCase().includes(searchText)
        );

        if (filteredHistory.length === 0) {
            historyList.innerHTML = `
                <p>
                    ${history.length === 0
                        ? "Belum ada riwayat yang tersimpan."
                        : "Tidak ada riwayat yang cocok dengan pencarian."}
                </p>
            `;
            return;
        }

        historyList.innerHTML = filteredHistory.map(item => `
            <div class="activity">
                <strong>${item.projectName}</strong>
                <small>${item.calculationType} • ${item.date}</small>
                <p>Volume: ${formatHistoryNumber(item.volume)} m³</p>
                <p>Produktivitas: ${formatHistoryNumber(item.productivity)} m³/jam</p>
                ${item.notes ? `<p>Catatan: ${item.notes}</p>` : ""}
                <button
                    class="delete-history-btn"
                    data-history-id="${item.id}"
                    type="button">
                    Hapus
                </button>
            </div>
        `).join("");
    }

    saveHistoryBtn.addEventListener("click", function () {
        const projectName =
            document.getElementById("historyProjectName").value.trim();

        const calculationType =
            document.getElementById("historyCalculationType").value;

        const volume =
            Number(document.getElementById("historyVolume").value);

        const productivity =
            Number(document.getElementById("historyProductivity").value);

        const notes =
            document.getElementById("historyNotes").value.trim();

        if (
            projectName === "" ||
            volume <= 0 ||
            productivity <= 0 ||
            !Number.isFinite(volume) ||
            !Number.isFinite(productivity)
        ) {
            historyMessage.innerHTML = `
                <p class="error-message">
                    Isi nama proyek serta nilai volume dan produktivitas lebih dari 0.
                </p>
            `;
            return;
        }

        const newHistory = {
            id: Date.now().toString(),
            projectName,
            calculationType,
            volume,
            productivity,
            notes,
            date: new Date().toLocaleString("id-ID")
        };

        const history = getProjectHistory();
        history.unshift(newHistory);
        saveProjectHistory(history);

        historyMessage.innerHTML = `
            <p>Riwayat <strong>${projectName}</strong> berhasil disimpan.</p>
        `;

        document.getElementById("historyProjectName").value = "";
        document.getElementById("historyVolume").value = "";
        document.getElementById("historyProductivity").value = "";
        document.getElementById("historyNotes").value = "";

        renderProjectHistory();
    });

    historySearch.addEventListener("input", renderProjectHistory);

    historyList.addEventListener("click", function (event) {
        const deleteButton = event.target.closest(".delete-history-btn");

        if (!deleteButton) return;

        const historyId = deleteButton.dataset.historyId;
        const updatedHistory = getProjectHistory().filter(
            item => item.id !== historyId
        );

        saveProjectHistory(updatedHistory);
        renderProjectHistory();
    });

    clearHistoryBtn.addEventListener("click", function () {
        const history = getProjectHistory();

        if (history.length === 0) {
            historyMessage.innerHTML = "<p>Belum ada riwayat untuk dihapus.</p>";
            return;
        }

        const confirmation = confirm(
            "Yakin ingin menghapus semua riwayat proyek?"
        );

        if (confirmation) {
            localStorage.removeItem(historyStorageKey);
            renderProjectHistory();
            historyMessage.innerHTML = "<p>Semua riwayat berhasil dihapus.</p>";
        }
    });

    renderProjectHistory();
}


const saveAdminNameBtn = document.getElementById("saveAdminNameBtn");

if (saveAdminNameBtn) {
    const adminNameInput = document.getElementById("adminName");
    const settingsProfile = document.getElementById("settingsProfile");
    const settingsMessage = document.getElementById("settingsMessage");

    const savedAdminName = localStorage.getItem("excabaseAdminName");

    if (savedAdminName) {
        adminNameInput.value = savedAdminName;
        settingsProfile.textContent = savedAdminName;
    }

    saveAdminNameBtn.addEventListener("click", function () {
        const adminName = adminNameInput.value.trim();

        if (adminName === "") {
            settingsMessage.innerHTML = `
                <p class="error-message">Nama pengguna tidak boleh kosong.</p>
            `;
            return;
        }

        localStorage.setItem("excabaseAdminName", adminName);
        settingsProfile.textContent = adminName;

        window.applyExcabasePreferences?.();

        settingsMessage.innerHTML = `
            <p>Nama pengguna berhasil disimpan: <strong>${adminName}</strong></p>
        `;
    });

    const themeSelect = document.getElementById("themeSelect");
    const saveThemeBtn = document.getElementById("saveThemeBtn");
    const themeMessage = document.getElementById("themeMessage");

    const savedTheme = localStorage.getItem("excabaseTheme") || "light";
    themeSelect.value = savedTheme;

    document.body.classList.toggle("excabase-dark", savedTheme === "dark");

    saveThemeBtn.addEventListener("click", function () {
        const selectedTheme = themeSelect.value;

        localStorage.setItem("excabaseTheme", selectedTheme);
        document.body.classList.toggle(
            "excabase-dark",
            selectedTheme === "dark"
        );

        themeMessage.innerHTML = `
            <p>Tema <strong>${selectedTheme === "dark" ? "gelap" : "terang"}</strong> berhasil diterapkan pada halaman ini.</p>
        `;
        window.applyExcabasePreferences?.();
    });

    const clearSettingsHistoryBtn =
        document.getElementById("clearSettingsHistoryBtn");

    const dataSettingsMessage =
        document.getElementById("dataSettingsMessage");

    clearSettingsHistoryBtn.addEventListener("click", function () {
        const confirmation = confirm(
            "Yakin ingin menghapus seluruh riwayat proyek? Data tidak dapat dikembalikan."
        );

        if (confirmation) {
            localStorage.removeItem("excabaseProjectHistory");

            dataSettingsMessage.innerHTML = `
                <p>Seluruh riwayat proyek berhasil dihapus.</p>
            `;
        }
    });
}


/* APPLY SAVED EXCABASE THEME ON EVERY PAGE */
(function () {
    const savedGlobalTheme = localStorage.getItem("excabaseTheme") || "light";

    document.body.classList.toggle(
        "excabase-dark",
        savedGlobalTheme === "dark"
    );
})();
// SIMULASI ARMADA PROYEK: BULLDOZER, MOTOR GRADER, COMPACTOR
(function () {
    const calculateProjectFleetBtn = document.getElementById(
        "calculateProjectFleetBtn"
    );

    if (!calculateProjectFleetBtn) return;

    calculateProjectFleetBtn.addEventListener("click", function () {
        const bulldozerProductivity = parseFloat(
            document.getElementById("fleetBulldozerProductivity")?.value
        );
        const bulldozerCount = parseInt(
            document.getElementById("fleetBulldozerCount")?.value
        );

        const graderProductivity = parseFloat(
            document.getElementById("fleetGraderProductivity")?.value
        );
        const graderCount = parseInt(
            document.getElementById("fleetGraderCount")?.value
        );

        const compactorProductivity = parseFloat(
            document.getElementById("fleetCompactorProductivity")?.value
        );
        const compactorCount = parseInt(
            document.getElementById("fleetCompactorCount")?.value
        );

        const workingHours = parseFloat(
            document.getElementById("projectFleetWorkingHours")?.value
        );

        const status = document.getElementById(
            "projectFleetCalculationStatus"
        );
        const details = document.getElementById(
            "projectFleetCalculationDetails"
        );

        if (
            !Number.isFinite(bulldozerProductivity) || bulldozerProductivity <= 0 ||
            !Number.isFinite(bulldozerCount) || bulldozerCount < 1 ||
            !Number.isFinite(graderProductivity) || graderProductivity <= 0 ||
            !Number.isFinite(graderCount) || graderCount < 1 ||
            !Number.isFinite(compactorProductivity) || compactorProductivity <= 0 ||
            !Number.isFinite(compactorCount) || compactorCount < 1 ||
            !Number.isFinite(workingHours) || workingHours <= 0 || workingHours > 24
        ) {
            status.textContent = "Periksa kembali input. Masukkan nilai yang valid.";
            details.innerHTML = "";
            return;
        }

        const bulldozerDaily =
            bulldozerProductivity * bulldozerCount * workingHours;

        const graderDaily =
            graderProductivity * graderCount * workingHours;

        const compactorDaily =
            compactorProductivity * compactorCount * workingHours;

        let project = null;

        try {
            project = JSON.parse(
                localStorage.getItem("excabase_active_project")
            );
        } catch (error) {
            console.error("Gagal membaca data proyek:", error);
        }

        const projectVolume =
            project?.results?.earthwork?.BCM ??
            project?.soilVolumeBCM ??
            0;

        const targetDays = parseFloat(project?.targetDays) || 0;

        const targetDailyVolume =
            targetDays > 0 ? projectVolume / targetDays : 0;

        let targetMessage = "";

        if (targetDailyVolume > 0) {
            const capacities = [
                { name: "Bulldozer", value: bulldozerDaily },
                { name: "Motor Grader", value: graderDaily },
                { name: "Compactor", value: compactorDaily }
            ];

            const bottleneck = capacities.reduce((lowest, current) =>
                current.value < lowest.value ? current : lowest
            );

            targetMessage = `
                <h3>4. Perbandingan dengan Target Proyek</h3>
                <p>Volume proyek: <strong>${projectVolume.toLocaleString("id-ID")} m³</strong></p>
                <p>Target durasi: <strong>${targetDays} hari</strong></p>
                <p>Target volume harian: <strong>${targetDailyVolume.toFixed(2)} m³/hari</strong></p>
                <p>Alat dengan kapasitas harian terendah: <strong>${bottleneck.name}</strong>
                (${bottleneck.value.toFixed(2)} m³/hari).</p>
                <p>${
                    bottleneck.value >= targetDailyVolume
                        ? "Kapasitas alat terendah memenuhi target harian secara teoritis."
                        : "Kapasitas alat terendah belum memenuhi target harian. Periksa jumlah unit atau produktivitas."
                }</p>
            `;
        } else {
            targetMessage = `
                <p><em>Target harian belum dapat dibandingkan. Pastikan volume proyek dan target durasi sudah diisi.</em></p>
            `;
        }

        status.textContent = "Simulasi armada proyek berhasil dihitung.";

        details.innerHTML = `
            <h3>1. Produktivitas Harian Bulldozer</h3>
            <p>${bulldozerProductivity} × ${bulldozerCount} unit × ${workingHours} jam</p>
            <p><strong>${bulldozerDaily.toFixed(2)} m³/hari</strong></p>

            <h3>2. Produktivitas Harian Motor Grader</h3>
            <p>${graderProductivity} × ${graderCount} unit × ${workingHours} jam</p>
            <p><strong>${graderDaily.toFixed(2)} m³/hari</strong></p>

            <h3>3. Produktivitas Harian Compactor</h3>
            <p>${compactorProductivity} × ${compactorCount} unit × ${workingHours} jam</p>
            <p><strong>${compactorDaily.toFixed(2)} m³/hari</strong></p>

            ${targetMessage}

            <p><em>Catatan: kapasitas tiap alat dibandingkan secara terpisah karena ketiganya menjalankan tahapan pekerjaan berbeda. Hasil merupakan estimasi teoritis dan perlu disesuaikan dengan kondisi lapangan.</em></p>
        `;
                // Simpan hasil simulasi armada ke proyek aktif
        if (project) {
            if (!project.results) {
                project.results = {};
            }

            project.results.fleet = {
                bulldozer: {
                    productivityPerHour: bulldozerProductivity,
                    count: bulldozerCount,
                    dailyProductivity: bulldozerDaily
                },
                grader: {
                    productivityPerHour: graderProductivity,
                    count: graderCount,
                    dailyProductivity: graderDaily
                },
                compactor: {
                    productivityPerHour: compactorProductivity,
                    count: compactorCount,
                    dailyProductivity: compactorDaily
                },
                workingHours,
                projectVolume,
                targetDays,
                targetDailyVolume,
                calculatedAt: new Date().toISOString()
            };

            // Sinkronisasi hasil simulasi armada ke sistem multiproyek
const saved = saveExcabaseProject(project);

if (!saved) {
    console.error("Gagal menyinkronkan hasil simulasi armada.");
}
        }
    });
})();
