/* Shared UI and unchanged project productivity formulas. Storage belongs to each mode. */
window.mountProductivityCalculators = function (options) {
    const { calculatorList, selectedCalculators, productivityStorageKey } = options;
    let savedProductivityData = options.savedProductivityData || {};
    const canEdit = () => !options.canEdit || options.canEdit();
    // Konfigurasi input setiap kalkulator
    const calculatorConfig = {
        excavator: {
            title: "Excavator",
            description: "Kapasitas bucket mengikuti model yang dipilih dari katalog. Bucket fill factor, waktu siklus, dan efisiensi kerja perlu disesuaikan dengan kondisi lapangan. Koreksi kedalaman/dumping Fv belum diterapkan eksplisit; asumsi Fv = 1. Jam kerja mengikuti rencana proyek.",

            models: equipmentData.find(item => item.id === "excavator")?.models || [],

            fields: [
                {
                    id: "bucket",
                    label: "Kapasitas bucket (katalog)",
                    unit: "m³",
                    value: "",
                    min: 0.01,
                    step: 0.01,
                    placeholder: "Mengikuti model yang dipilih"
                },
                {
                    id: "fillFactor",
                    label: "Bucket fill factor (input pengguna)",
                    unit: "",
                    value: "",
                    min: 0.01,
                    max: 1.2,
                    step: 0.01,
                    placeholder: "Masukkan fill factor (maks. 1.2)"
                },
                {
                    id: "cycleTime",
                    label: "Waktu siklus (input pengguna)",
                    unit: "detik",
                    value: "",
                    min: 1,
                    step: 1,
                    placeholder: "Masukkan waktu siklus (detik)"
                },
                {
                    id: "efficiency",
                    label: "Efisiensi kerja (input pengguna)",
                    unit: "",
                    value: "",
                    min: 0.01,
                    max: 1,
                    step: 0.01,
                    placeholder: "Masukkan efisiensi (0–1)"
                },
                {
                    id: "workingHours",
                    label: "Jam kerja per hari (input proyek)",
                    unit: "jam",
                    value: "",
                    min: 0.1,
                    step: 0.1,
                    placeholder: "Masukkan jam kerja per hari"
                }
            ]
        },

        dumptruck: {
            title: "Dump Truck",
            description: "Kapasitas bak mengikuti model yang dipilih dari katalog. Waktu siklus total, efisiensi kerja, dan jam kerja per hari disesuaikan dengan kondisi operasi dan rencana proyek.",

            models: equipmentData.find(item => item.id === "dumptruck")?.models || [],

            fields: [
                {
                    id: "truckCapacity",
                    label: "Kapasitas bak (katalog)",
                    unit: "m³",
                    value: "",
                    min: 0.01,
                    step: 0.1,
                    placeholder: "Mengikuti model yang dipilih"
                },
                {
                    id: "truckCycleTime",
                    label: "Waktu siklus total (input pengguna)",
                    unit: "menit",
                    value: "",
                    min: 0.1,
                    step: 0.1,
                    placeholder: "Masukkan waktu siklus total"
                },
                {
                    id: "truckEfficiency",
                    label: "Efisiensi kerja (input pengguna)",
                    unit: "",
                    value: "",
                    min: 0.01,
                    max: 1,
                    step: 0.01,
                    placeholder: "Masukkan efisiensi (0–1)"
                },
                {
                    id: "truckWorkingHours",
                    label: "Jam kerja per hari (input proyek)",
                    unit: "jam",
                    value: "",
                    min: 0.1,
                    step: 0.1,
                    placeholder: "Masukkan jam kerja per hari"
                }
            ]
        },

        wheelloader: {
            title: "Wheel Loader",
            description: "Kapasitas bucket mengikuti model yang dipilih dari katalog. Bucket fill factor, waktu siklus, dan efisiensi kerja disesuaikan dengan kondisi lapangan. Jam kerja mengikuti rencana proyek.",

            models: equipmentData.find(item => item.id === "wheelloader")?.models || [],

            fields: [
                {
                    id: "loaderBucket",
                    label: "Kapasitas bucket (katalog)",
                    unit: "m³",
                    value: "",
                    min: 0.01,
                    step: 0.1,
                    placeholder: "Mengikuti model yang dipilih"
                },
                {
                    id: "loaderFillFactor",
                    label: "Bucket fill factor (input pengguna)",
                    unit: "",
                    value: "",
                    min: 0.01,
                    max: 1.1,
                    step: 0.01,
                    placeholder: "Masukkan fill factor (maks. 1.1)"
                },
                {
                    id: "loaderCycleTime",
                    label: "Waktu siklus (input pengguna)",
                    unit: "detik",
                    value: "",
                    min: 1,
                    step: 1,
                    placeholder: "Masukkan waktu siklus (detik)"
                },
                {
                    id: "loaderEfficiency",
                    label: "Efisiensi kerja (input pengguna)",
                    unit: "",
                    value: "",
                    min: 0.01,
                    max: 1,
                    step: 0.01,
                    placeholder: "Masukkan efisiensi (0–1)"
                },
                {
                    id: "loaderWorkingHours",
                    label: "Jam kerja per hari (input proyek)",
                    unit: "jam",
                    value: "",
                    min: 0.1,
                    step: 0.1,
                    placeholder: "Masukkan jam kerja per hari"
                }
            ]
        },

        motorgrader: {
            title: "Motor Grader",
            description: "Panjang blade katalog adalah ukuran nominal. Tentukan lebar efektif melalui Bantu Hitung (Tabel A.15, sudut 45°/60°) atau input manual. Overlap antar lajur dan waktu manuver belum dimodelkan eksplisit. Jam kerja mengikuti rencana proyek.",
            models: equipmentData.find(item => item.id === "motorgrader")?.models || [],
            fields: [
                {
                    id: "graderWidth",
                    label: "Lebar efektif blade (manual / hasil bantuan)",
                    unit: "m",
                    value: "",
                    min: 0.01,
                    step: 0.1,
                    placeholder: "Tentukan dari sudut blade atau isi manual"
                },
                {
                    id: "graderSpeed",
                    label: "Kecepatan grading (input pengguna)",
                    unit: "km/jam",
                    value: "",
                    min: 0.01,
                    step: 0.1,
                    placeholder: "Masukkan kecepatan kerja"
                },
                {
                    id: "graderEfficiency",
                    label: "Efisiensi kerja (input pengguna)",
                    unit: "",
                    value: "",
                    min: 0.01,
                    max: 1,
                    step: 0.01,
                    placeholder: "Masukkan efisiensi (0–1)"
                },
                {
                    id: "graderPasses",
                    label: "Jumlah lintasan (input pengguna)",
                    unit: "lintasan",
                    value: "",
                    min: 1,
                    step: 1,
                    placeholder: "Masukkan jumlah lintasan"
                },
                {
                    id: "graderThickness",
                    label: "Tebal lapisan material lepas (input proyek)",
                    unit: "m",
                    value: "",
                    min: 0.01,
                    step: 0.01,
                    placeholder: "Masukkan tebal lapisan"
                },
                {
                    id: "graderWorkingHours",
                    label: "Jam kerja per hari (input proyek)",
                    unit: "jam",
                    value: "",
                    min: 0.1,
                    step: 0.1,
                    placeholder: "Masukkan jam kerja per hari"
                }
            ]
        },

        bulldozer: {
            title: "Bulldozer",
            description: "Kapasitas blade mengikuti model yang dipilih dari katalog. Fill factor, waktu siklus, dan efisiensi perlu disesuaikan dengan kondisi lapangan. Faktor kemiringan Fm belum diterapkan eksplisit; asumsi Fm = 1 (datar, 0%). Jam kerja mengikuti rencana proyek.",
            models: equipmentData.find(item => item.id === "bulldozer")?.models || [],
            fields: [
                {
                    id: "dozerCapacity",
                    label: "Kapasitas blade nominal (m³, sesuai spesifikasi model)",
                    unit: "m³",
                    value: 4.5,
                    min: 0.01,
                    step: 0.1
                },
                
                {
                    id: "dozerFillFactor",
                    label: "Blade fill factor (input pengguna)",
                    unit: "",
                    value: "",
                    min: 0.01,
                    max: 1.1,
                    step: 0.01,
                    placeholder: "Masukkan fill factor (maks. 1.1)"
                },
                {
                    id: "dozerCycleTime",
                    label: "Waktu siklus (input pengguna)",
                    unit: "detik",
                    value: "",
                    min: 1,
                    step: 1,
                    placeholder: "Masukkan waktu siklus (detik)"
                },
                {
                    id: "dozerEfficiency",
                    label: "Efisiensi kerja (input pengguna)",
                    unit: "",
                    value: "",
                    min: 0.01,
                    max: 1,
                    step: 0.01,
                    placeholder: "Masukkan efisiensi (0–1)"
                },
                {
                    id: "dozerWorkingHours",
                    label: "Jam kerja per hari (input proyek)",
                    unit: "jam",
                    value: "",
                    min: 0.1,
                    step: 0.1,
                    placeholder: "Masukkan jam kerja per hari"
                }
            ]
        },

        compactor: {
            title: "Compactor / Roller",
            description: "Lebar katalog belum dikurangi overlap. Pilih jenis alat pada Bantu Hitung (Tabel A.25) atau isi lebar efektif secara manual. Tebal lapisan adalah tebal akhir setelah pemadatan. Jam kerja mengikuti rencana proyek.",
            models: equipmentData.find(item => item.id === "compactor")?.models || [],
            fields: [
                {
                    id: "compactorWidth",
                    label: "Lebar efektif pemadatan setelah overlap (manual / hasil bantuan)",
                    unit: "m",
                    value: "",
                    min: 0.01,
                    step: 0.1,
                    placeholder: "Pilih jenis alat pada bantuan atau isi lebar efektif"
                },
                {
                    id: "compactorSpeed",
                    label: "Kecepatan pemadatan (input pengguna)",
                    unit: "km/jam",
                    value: "",
                    min: 0.01,
                    step: 0.1,
                    placeholder: "Masukkan kecepatan kerja"
                },
                {
                    id: "compactorEfficiency",
                    label: "Efisiensi kerja (input pengguna)",
                    unit: "",
                    value: "",
                    min: 0.01,
                    max: 1,
                    step: 0.01,
                    placeholder: "Masukkan efisiensi (0–1)"
                },
                {
                    id: "compactorPasses",
                    label: "Jumlah lintasan (input pengguna)",
                    unit: "lintasan",
                    value: "",
                    min: 1,
                    step: 1,
                    placeholder: "Masukkan jumlah lintasan"
                },
                {
                    id: "compactorThickness",
                    label: "Tebal akhir lapisan setelah pemadatan (input proyek)",
                    unit: "m",
                    value: "",
                    min: 0.01,
                    step: 0.01,
                    placeholder: "Masukkan tebal lapisan"
                },
                {
                    id: "compactorWorkingHours",
                    label: "Jam kerja per hari (input proyek)",
                    unit: "jam",
                    value: "",
                    min: 0.1,
                    step: 0.1,
                    placeholder: "Masukkan jam kerja per hari"
                }
            ]
        }
    };

    // Membuat bagian kalkulator sesuai alat yang dipilih
    selectedCalculators.forEach(function (type) {
        const config = calculatorConfig[type];

        if (!config) return;

        const section = document.createElement("section");
        section.className = "detail-section project-calculator-section";
        section.style.marginBottom = "32px";
        section.dataset.calculator = type;

        const modelsHTML =
    type === "bulldozer" ||
    type === "excavator" ||
    type === "dumptruck" ||
    type === "wheelloader" ||
    type === "motorgrader" ||
    type === "compactor"
        ? `
            <div class="form-group">
                <label for="${type}-model">
                    Pilih model ${config.title}
                </label>

                <select id="${type}-model" data-model>
                    ${config.models.map(function (model, index) {
                        return `
                            <option value="${index}">
                                ${model.manufacturer} ${model.model}
                            </option>
                        `;
                    }).join("")}

                    <option value="custom">Input alat sendiri</option>
                </select>
            </div>

            <div class="form-group" data-custom-model hidden>
                <label for="${type}-custom-model">
                    Merek dan model alat
                </label>

                <input
                    type="text"
                    id="${type}-custom-model"
                    data-custom-model-name
                    placeholder="Contoh: Komatsu D85"
                >
            </div>
        `
        : "";
        const fieldsHTML = config.fields.map(function (field) {

    let inputHTML = "";

    if (field.type === "select") {

        inputHTML = `
            <select
                id="${type}-${field.id}"
                data-field="${field.id}"
            >
                ${field.options.map(function (option) {
                    return `
                        <option
                            value="${option.value}"
                            ${option.value === field.value ? "selected" : ""}
                        >
                            ${option.label}
                        </option>
                    `;
                }).join("")}
            </select>
        `;

    } else {

        inputHTML = `
            <input
                type="number"
                id="${type}-${field.id}"
                data-field="${field.id}"
                value="${field.value}"
                ${field.placeholder ? `placeholder="${field.placeholder}"` : ""}
                ${field.min !== undefined ? `min="${field.min}"` : ""}
                ${field.max !== undefined ? `max="${field.max}"` : ""}
                ${field.step !== undefined ? `step="${field.step}"` : ""}
            >
        `;

    }

    return `
        <div class="form-group">
            <label for="${type}-${field.id}">
                ${field.label}
                ${field.unit ? `(${field.unit})` : ""}
            </label>

            ${inputHTML}
        </div>
    `;

}).join("");

        section.innerHTML = `
            <h2>${config.title}</h2>
            ${config.description ? `<p class="calculator-description">${config.description}</p>` : ""}

            <div class="calculator-grid">
                <div class="calculator-card">
                    <h3>Data Perhitungan</h3>

                    <div class="calculator-form">
                        ${modelsHTML}
                        ${fieldsHTML}
                    </div>

                    <div class="calculator-buttons">
                        <button
                            type="button"
                            class="btn btn-primary"
                            data-action="calculate"
                        >
                            Hitung Ulang
                        </button>
                    </div>
                </div>

                <div class="calculator-result">
                    <h3>Hasil Produktivitas</h3>

                    <div class="result-item">
                        <span>Produktivitas per jam</span>
                        <strong data-result="hourly">-</strong>
                    </div>

                    <div class="result-item">
                        <span>Produktivitas per hari</span>
                        <strong data-result="daily">-</strong>
                    </div>

                    <div class="result-item">
                        <span>Rumus</span>
                        <p data-result="formula">-</p>
                    </div>

                    <p class="calculation-status" data-result="status">
                        Hasil dihitung otomatis berdasarkan nilai awal.
                    </p>
                </div>
            </div>
        `;

        if (options.standalone) {
            section.querySelector(".calculator-description").textContent =
                config.description.replace(/Jam kerja mengikuti rencana proyek\./g,
                    "Jam kerja diisi secara mandiri.").replace(/rencana proyek/g, "rencana kerja");
            section.querySelectorAll("label").forEach(label => {
                label.textContent = label.textContent.replace(/input proyek/g, "input pengguna");
            });
            const reset = document.createElement("button");
            reset.type = "button";
            reset.textContent = "Reset";
            reset.className = "btn";
            reset.addEventListener("click", () => {
                if (!canEdit()) return;
                delete savedProductivityData[type];
                localStorage.setItem(productivityStorageKey, JSON.stringify(savedProductivityData));
                options.onReset?.(type);
                window.location.reload();
            });
            section.querySelector(".calculator-buttons").appendChild(reset);
            const details = document.createElement("div");
            details.className = "detail-note";
            details.dataset.standaloneDetails = "";
            section.querySelector(".calculator-result").appendChild(details);
            // Run after model listeners have applied the capacity/custom mode.
            section.addEventListener("change", event => {
                if (!event.target.matches("[data-field], [data-model], [data-custom-model-name]")) return;
                saveProductivityData();
                calculateProductivity(section, type);
            });
        }
        calculatorList.appendChild(section);
        // Mengambil data kalkulator yang pernah disimpan
const savedData = savedProductivityData[type];
section.parameterHelp = savedData?.parameterHelp || {};
// Fungsi menyimpan data kalkulator
function saveProductivityData() {
    if (!canEdit()) return;
    const modelSelect = section.querySelector("[data-model]");
    const customModelNameInput = section.querySelector(
        "[data-custom-model-name]"
    );

    const fields = {};

    section.querySelectorAll("[data-field]").forEach(function (input) {
        fields[input.dataset.field] = input.value;
        const help = section.parameterHelp[input.dataset.field];
        if (help && Number(input.value) !== help.value) help.overriddenManually = true;
    });

    options.onInvalid?.(type);

    savedProductivityData[type] = {
        model: modelSelect ? modelSelect.value : null,
        customModelName: customModelNameInput
            ? customModelNameInput.value
            : "",
        fields: fields,
        parameterHelp: section.parameterHelp
    };
    if (type === "motorgrader" || type === "compactor") {
        savedProductivityData[type].effectiveWidthVersion = 1;
        const review = section.querySelector("[data-width-review]");
        if (review && Number(fields[type === "motorgrader" ? "graderWidth" : "compactorWidth"]) > 0) review.hidden = true;
    }

    localStorage.setItem(
        productivityStorageKey,
        JSON.stringify(savedProductivityData)
    );
    options.onInputs?.(savedProductivityData);
}

// Simpan otomatis saat input angka atau nama model berubah
section.querySelectorAll("[data-field], [data-custom-model-name]").forEach(
    function (input) {
        input.addEventListener("input", saveProductivityData);
        input.addEventListener("change", saveProductivityData);
    }
);

// Simpan otomatis saat pilihan model berubah
const modelSelectForSave = section.querySelector("[data-model]");

if (modelSelectForSave) {
    modelSelectForSave.addEventListener("change", saveProductivityData);
}

if (savedData) {
    // Mengembalikan pilihan model
    const modelSelect = section.querySelector("[data-model]");

    if (modelSelect && savedData.model !== undefined) {
        modelSelect.value = savedData.model;
    }

    // Mengembalikan nama model manual
    const customModelNameInput = section.querySelector(
        "[data-custom-model-name]"
    );

    if (customModelNameInput && savedData.customModelName !== undefined) {
        customModelNameInput.value = savedData.customModelName;
    }

    // Mengembalikan nilai semua input
    section.querySelectorAll("[data-field]").forEach(function (input) {
        if (savedData.fields && savedData.fields[input.dataset.field] !== undefined) {
            input.value = savedData.fields[input.dataset.field];
        }
    });
}
// Older saved widths may be nominal catalog dimensions. Preserve their metadata,
// but require editable calculations to confirm an effective width before reuse.
const effectiveWidthField = type === "motorgrader" ? "graderWidth" : type === "compactor" ? "compactorWidth" : null;
if (effectiveWidthField) {
    const widthInput = section.querySelector('[data-field="' + effectiveWidthField + '"]');
    if (savedData && savedData.effectiveWidthVersion !== 1 && canEdit()) {
        widthInput.value = "";
    }
    const widthNote = document.createElement("small");
    widthNote.dataset.widthNominal = "";
    widthInput.closest(".form-group").appendChild(widthNote);
    if (savedData && savedData.effectiveWidthVersion !== 1) {
        const review = document.createElement("small");
        review.dataset.widthReview = "";
        review.textContent = "Lebar tersimpan versi lama belum dikonfirmasi sebagai lebar efektif. Tentukan ulang melalui bantuan atau input manual.";
        widthInput.closest(".form-group").appendChild(review);
    }
}
if (
    type === "bulldozer" ||
    type === "excavator" ||
    type === "dumptruck" ||
    type === "wheelloader" || 
    type === "motorgrader" ||
    type === "compactor"
) {
    const modelSelect = section.querySelector("[data-model]");
    const customModelInput = section.querySelector("[data-custom-model]");
const customModelNameInput = section.querySelector("[data-custom-model-name]");

function updateCustomModelInput() {
    if (modelSelect.value === "custom") {
        customModelInput.hidden = false;
    } else {
        customModelInput.hidden = true;
        customModelNameInput.value = "";
    }
}

modelSelect.addEventListener("change", updateCustomModelInput);
updateCustomModelInput();
    

    const capacityField =
    type === "bulldozer"
        ? "dozerCapacity"
        : type === "excavator"
            ? "bucket"
            : type === "dumptruck"
                ? "truckCapacity"
                : type === "wheelloader"
                    ? "loaderBucket"
                    : type === "motorgrader"
                        ? "graderWidth"
                        : "compactorWidth";

    const capacityInput = section.querySelector(
        `[data-field="${capacityField}"]`
    );

    function updateEquipmentCapacity(event) {
    if (effectiveWidthField) {
        const model = config.models[Number(modelSelect.value)];
        const text = modelSelect.value === "custom" ? "" :
            (type === "motorgrader" ? model?.specifications?.bladeWidth : model?.specifications?.compactionWidth) || "";
        const match = text.match(/[\d.,]+/);
        const nominal = match ? Number(match[0].replace(",", ".")) : null;
        const note = section.querySelector("[data-width-nominal]");
        note.dataset.nominal = nominal || "";
        note.textContent = (nominal ? "Ukuran nominal katalog: " + nominal.toLocaleString("id-ID") + " m. " : "Ukuran nominal katalog belum tersedia. ") +
            "Lebar efektif harus ditentukan melalui bantuan atau input manual.";
        capacityInput.readOnly = false;
        if (event) {
            capacityInput.value = "";
            const help = section.parameterHelp[effectiveWidthField];
            if (help) help.contextChanged = true;
        }
        calculateProductivity(section, type);
        return;
    }
    // Jika pengguna memilih input alat sendiri
    if (modelSelect.value === "custom") {
        capacityInput.value = "";
        capacityInput.readOnly = false;
        capacityInput.placeholder =
            type === "bulldozer"
                ? "Masukkan kapasitas blade"
                : type === "wheelloader"
                    ? "Masukkan kapasitas loader"
                    : type === "motorgrader"
                        ? "Masukkan lebar blade"
                        : type === "compactor"
                            ? "Masukkan lebar pemadatan"
                            : "Masukkan kapasitas";

        calculateProductivity(section, type);
        return;
    }

    // Jika memilih model dari katalog
    const selectedModel = config.models[Number(modelSelect.value)];

    const capacityText =
        type === "bulldozer"
            ? selectedModel?.specifications?.bladeCapacity || ""
            : type === "excavator"
                ? selectedModel?.specifications?.bucketCapacity || ""
                : type === "dumptruck"
                    ? selectedModel?.specifications?.bodyCapacity || selectedModel?.specifications?.truckCapacity || ""
                    : type === "wheelloader"
                        ? selectedModel?.specifications?.bucketCapacity || ""
                        : type === "motorgrader"
                            ? selectedModel?.specifications?.bladeWidth || ""
                            : type === "compactor"
                                ? selectedModel?.specifications?.compactionWidth || ""
                                : "";

    const capacityMatch = capacityText.match(/[\d.,]+/);

    
if (capacityMatch) {
    const capacity = Number(
        capacityMatch[0].replace(",", ".")
    );

    capacityInput.value = capacity;
    capacityInput.readOnly = true;
} else {
    // Gunakan kapasitas yang pernah disimpan jika
    // katalog tidak menyediakan spesifikasi kapasitas.
    const savedCapacity =
        savedData?.fields?.[capacityField];

    if (
        savedCapacity !== undefined &&
        savedCapacity !== "" &&
        Number(savedCapacity) > 0 &&
        (type !== "dumptruck" || savedData?.model === modelSelect.value)
    ) {
        capacityInput.value = savedCapacity;
    } else {
        capacityInput.value = "";
    }

    capacityInput.readOnly = false;

        capacityInput.placeholder =
            type === "bulldozer"
                ? "Masukkan kapasitas blade"
                : type === "wheelloader"
                    ? "Masukkan kapasitas loader"
                    : type === "motorgrader"
                        ? "Masukkan lebar blade"
                        : "Masukkan kapasitas bucket";
    }

    calculateProductivity(section, type);
}

    modelSelect.addEventListener("change", updateEquipmentCapacity);

// Atur tampilan dan kapasitas berdasarkan model yang dipulihkan
updateCustomModelInput();

if (modelSelect.value === "custom" && !effectiveWidthField) {
    capacityInput.readOnly = false;
    capacityInput.placeholder = "Masukkan kapasitas alat";
} else {
    updateEquipmentCapacity();
}

// Hitung ulang berdasarkan nilai input yang sudah dipulihkan
calculateProductivity(section, type);
    // Effective widths stay editable and are never overwritten by nominal dimensions.
}
        mountProductivityParameterHelper({
            section, type, canEdit,
            onApply(field, metadata) {
                if (!canEdit()) return;
                section.parameterHelp[field] = metadata;
                saveProductivityData();
                calculateProductivity(section, type);
            }
        });
        // Save model changes after capacity and custom-model listeners finish.
        section.querySelector("[data-model]").addEventListener("change", () => {
            if (!canEdit()) return;
            saveProductivityData();
            calculateProductivity(section, type);
        });
        // Menghitung otomatis saat kalkulator dibuat
        calculateProductivity(section, type);
    });

    // Fungsi membaca nilai input
    function getValue(section, fieldId) {
        const input = section.querySelector(
            `[data-field="${fieldId}"]`
        );

        return input ? Number(input.value) : 0;
    }

    // Fungsi format angka
    function formatNumber(value) {
        return value.toLocaleString("id-ID", {
            maximumFractionDigits: 2
        });
    }

    // Fungsi membaca nilai input teks atau dropdown
function getTextValue(section, fieldId) {
    const input = section.querySelector(
        `[data-field="${fieldId}"]`
    );

    return input ? input.value : "";
}

    // Fungsi perhitungan setiap jenis alat
    function calculateProductivity(section, type) {
        const invalid = [...section.querySelectorAll("[data-field]")].find(input => {
            const value = Number(input.value);
            const field = input.dataset.field;
            if (!input.value.trim() || !Number.isFinite(value) || value <= 0) return true;
            if (/efficiency/i.test(field) && value > 1) return true;
            if (/fillFactor/i.test(field) && value > (type === "excavator" ? 1.2 : 1.1)) return true;
            if (/workingHours/i.test(field) && value > 24) return true;
            return /passes/i.test(field) && !Number.isInteger(value);
        });
        if (invalid) {
            section.querySelector('[data-result="hourly"]').textContent = "-";
            section.querySelector('[data-result="daily"]').textContent = "-";
            section.querySelector('[data-result="formula"]').textContent = "-";
            section.querySelector('[data-result="status"]').textContent =
                "Periksa " + (section.querySelector('label[for="' + invalid.id + '"]')?.textContent.trim() || invalid.dataset.field) +
                ". Nilai wajib positif; efisiensi ≤ 1, fill factor ≤ " + (type === "excavator" ? "1,2" : "1,1") +
                ", jam kerja ≤ 24, dan lintasan harus bilangan bulat.";
            const details = section.querySelector("[data-standalone-details]");
            if (details) details.textContent = "";
            if (canEdit()) options.onInvalid?.(type);
            return;
        }
        let hourly = 0;
        let daily = 0;
        let formula = "";

        if (type === "excavator") {
            const V = getValue(section, "bucket");
            const FF = getValue(section, "fillFactor");
            const CT = getValue(section, "cycleTime");
            const E = getValue(section, "efficiency");
            const H = getValue(section, "workingHours");

            hourly = (V * FF * 3600 * E) / CT;
            daily = hourly * H;

            formula = "Q = (V × FF × 3600 × E) / CT";
        }

        else if (type === "dumptruck") {
            const V = getValue(section, "truckCapacity");
            const CT = getValue(section, "truckCycleTime");
            const E = getValue(section, "truckEfficiency");
            const H = getValue(section, "truckWorkingHours");

            hourly = (V * 60 * E) / CT;
            daily = hourly * H;

            formula = "Q = (Kapasitas × 60 × E) / Waktu siklus";
        }

        else if (type === "wheelloader") {
            const V = getValue(section, "loaderBucket");
            const FF = getValue(section, "loaderFillFactor");
            const CT = getValue(section, "loaderCycleTime");
            const E = getValue(section, "loaderEfficiency");
            const H = getValue(section, "loaderWorkingHours");

            hourly = (V * FF * 3600 * E) / CT;
            daily = hourly * H;

            formula = "Q = (V × FF × 3600 × E) / CT";
        }

        else if (type === "bulldozer") {
            const V = getValue(section, "dozerCapacity");
            const FF = getValue(section, "dozerFillFactor");
            const CT = getValue(section, "dozerCycleTime");
            const E = getValue(section, "dozerEfficiency");
            const H = getValue(section, "dozerWorkingHours");

            hourly = (V * FF * 3600 * E) / CT;
            daily = hourly * H;

            formula = "Q = (Vb × FF × 3600 × E) / CT";
        }

        else if (type === "motorgrader") {
            const L = getValue(section, "graderWidth");
            const V = getValue(section, "graderSpeed");
            const E = getValue(section, "graderEfficiency");
            const N = getValue(section, "graderPasses");
            const T = getValue(section, "graderThickness");
            const H = getValue(section, "graderWorkingHours");

            const areaHourly = (L * V * 1000 * E) / N;

            hourly = areaHourly * T;
            daily = hourly * H;

            formula = "Q = (L × V × 1000 × E / N) × Tebal lapisan";
        }

        else if (type === "compactor") {
            const L = getValue(section, "compactorWidth");
            const V = getValue(section, "compactorSpeed");
            const E = getValue(section, "compactorEfficiency");
            const N = getValue(section, "compactorPasses");
            const T = getValue(section, "compactorThickness");
            const H = getValue(section, "compactorWorkingHours");

            const areaHourly = (L * V * 1000 * E) / N;

            hourly = areaHourly * T;
            daily = hourly * H;

            formula = "Q = (L × V × 1000 × E / N) × Tebal lapisan";
        }

        if (options.standalone) {
            const details = section.querySelector("[data-standalone-details]");
            const values = calculatorConfig[type].fields.map(field =>
                field.label.replace(/input proyek/g, "input pengguna") + ": " +
                section.querySelector('[data-field="' + field.id + '"]').value +
                (field.unit ? " " + field.unit : ""));
            details.textContent = values.join(" · ");
            if (type === "motorgrader" || type === "compactor") {
                const thickness = getValue(section, type === "motorgrader"
                    ? "graderThickness" : "compactorThickness");
                if (thickness > 0 && Number.isFinite(hourly) && hourly > 0)
                    details.textContent += " · Produktivitas luas: " +
                        formatNumber(hourly / thickness) + " m²/jam";
            }
        }
        // Menampilkan hasil
        const hourlyResult = section.querySelector(
            '[data-result="hourly"]'
        );

        const dailyResult = section.querySelector(
            '[data-result="daily"]'
        );

        const formulaResult = section.querySelector(
            '[data-result="formula"]'
        );

        const statusResult = section.querySelector(
            '[data-result="status"]'
        );

        if (
            !Number.isFinite(hourly) ||
            !Number.isFinite(daily) ||
            hourly <= 0 ||
            daily <= 0
        ) {
            hourlyResult.textContent = "-";
            dailyResult.textContent = "-";

            if (type === "bulldozer") {
                statusResult.textContent =
                    "Lengkapi kapasitas blade, fill factor, waktu siklus, efisiensi kerja, dan jam kerja per hari dengan nilai lebih besar dari 0.";
            } else {
                statusResult.textContent =
                    "Periksa kembali input. Semua nilai harus lebih besar dari 0.";
            }

            return;
        }

        const unit = type === "motorgrader" || type === "compactor"
            ? "m³"
            : "m³";

        hourlyResult.textContent =
            `${formatNumber(hourly)} ${unit}/jam (${type === "compactor" ? "CCM" : "LCM"})`;

        dailyResult.textContent =
            `${formatNumber(daily)} ${unit}/hari (${type === "compactor" ? "CCM" : "LCM"})`;

        formulaResult.textContent = formula;

        statusResult.textContent =
            "Estimasi produktivitas berdasarkan parameter dan asumsi; bukan jaminan hasil aktual." +
            (type === "excavator" ? " Koreksi Fv belum diterapkan secara eksplisit; asumsi Fv = 1 (Tabel A.12)." : "") +
            (type === "bulldozer" ? " Koreksi kemiringan Fm belum diterapkan secara eksplisit; asumsi Fm = 1 (datar, 0%)." : "");
            // ==========================================
// SIMPAN HASIL PRODUKTIVITAS KE PROYEK AKTIF
// ==========================================

        const modelSelect = section.querySelector("[data-model]");
        const customModelInput = section.querySelector("[data-custom-model-name]");
        const selectedModel = calculatorConfig[type]?.models?.[Number(modelSelect?.value)];
        const modelName = modelSelect?.value === "custom"
            ? customModelInput?.value.trim() || "Alat sendiri"
            : selectedModel ? selectedModel.manufacturer + " " + selectedModel.model : "";
        if (canEdit()) options.onResult?.(type, {
            type, model: modelName, hourly, daily, unit: "m³",
            volumeBasis: type === "compactor" ? "ccm" : "lcm",
            calculatedAt: new Date().toISOString()
        });
    }
    // Tombol Hitung Ulang untuk semua kalkulator
    calculatorList.addEventListener("click", function (event) {
        console.log("Tombol kalkulator diklik");
        const button = event.target.closest(
            '[data-action="calculate"]'
        );

        if (!button) return;

        const section = button.closest(
            ".project-calculator-section"
        );

        const type = section.dataset.calculator;

        console.log("Jenis alat:", type);
        console.log("Section:", section);
        console.log("Nilai input:", [...section.querySelectorAll("[data-field]")].map(input => ({
            id: input.dataset.field,
            value: input.value
        })));

        calculateProductivity(section, type);
    });
};
