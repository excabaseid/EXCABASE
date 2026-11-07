document.addEventListener("DOMContentLoaded", function () {
    const params = new URLSearchParams(window.location.search);
    const fromProject = params.get("fromProject") === "1";

    // Hanya berjalan pada mode proyek
    if (!fromProject) return;

    const container = document.getElementById(
        "projectProductivityCalculators"
    );

    if (!container) {
        console.error("Container kalkulator proyek tidak ditemukan.");
        return;
    }

    let project;

    try {
        project = JSON.parse(
            localStorage.getItem("excabase_active_project")
        );
        if (!project) return;
        console.log("Data proyek aktif:", project);
        // Kunci penyimpanan produktivitas berdasarkan ID proyek
const productivityStorageKey = `excabase_productivity_${project.id}`;

// Membaca data produktivitas yang pernah disimpan
let savedProductivityData = {};

try {
    savedProductivityData = JSON.parse(
        localStorage.getItem(productivityStorageKey)
    ) || {};
} catch (error) {
    console.error("Gagal membaca data produktivitas:", error);
}
    } catch (error) {
        console.error("Data proyek tidak dapat dibaca:", error);
    }

    
const savedSelectedEquipment = project?.results?.selectedEquipment;

const equipmentOptions = Array.isArray(savedSelectedEquipment)
    ? savedSelectedEquipment.join(", ")
    : project?.results?.recommendation?.equipment;


    if (!equipmentOptions) {
        container.innerHTML = `
            <p class="empty-state">
                Belum ada Opsi Alat Berat.
                Silakan buka halaman Opsi Alat Berat terlebih dahulu.
            </p>
        `;
        return;
    }

    // Mengubah daftar alat menjadi array
    const equipmentList = equipmentOptions
        .toLowerCase()
        .replace(/,\s*dan\s*/g, ",")
        .replace(/\s+dan\s+/g, ",")
        .split(",")
        .map(item => item.trim())
        .filter(Boolean);

    // Pemetaan nama alat ke jenis kalkulator
    const equipmentMap = {
        "excavator": "excavator",
        "dump truck": "dumptruck",
        "dumptruck": "dumptruck",
        "wheel loader": "wheelloader",
        "wheelloader": "wheelloader",
        "motor grader": "motorgrader",
        "motorgrader": "motorgrader",
        "motor-grader": "motorgrader",
        "bulldozer": "bulldozer",
        "compactor": "compactor",
        "roller": "compactor"
    };

    const selectedCalculators = [];
    // Kunci penyimpanan produktivitas berdasarkan ID proyek
const productivityStorageKey = `excabase_productivity_${project.id}`;

// Membaca data produktivitas yang pernah disimpan
let savedProductivityData = {};

try {
    savedProductivityData = JSON.parse(
        localStorage.getItem(productivityStorageKey)
    ) || {};
} catch (error) {
    console.error("Gagal membaca data produktivitas:", error);
}

    equipmentList.forEach(function (equipment) {
        const matchedKey = Object.keys(equipmentMap).find(function (key) {
            return equipment.includes(key) || key.includes(equipment);
        });

        if (matchedKey) {
            const type = equipmentMap[matchedKey];

            if (!selectedCalculators.includes(type)) {
                selectedCalculators.push(type);
            }
        }
    });

    if (selectedCalculators.length === 0) {
        container.innerHTML = `
            <p class="empty-state">
                Opsi alat belum cocok dengan kalkulator yang tersedia.
            </p>
        `;
        return;
    }

    // Header halaman mode proyek
container.innerHTML = `
    <div class="page-header">
        <p>Alat berat yang dipilih untuk proyek: ${equipmentOptions}</p>
    </div>

    <div id="projectCalculatorList"></div>
`;

    const calculatorList = document.getElementById(
        "projectCalculatorList"
    );

    function canEdit() {
        try {
            const active = getExcabaseActiveProject();
            const projects = JSON.parse(localStorage.getItem("excabase_projects") || "[]");
            const stored = projects.find(item => String(item.id) === String(project.id));
            return active && String(active.id) === String(project.id) &&
                String(active.status || "").toLowerCase() !== "selesai" &&
                String(stored?.status || "").toLowerCase() !== "selesai";
        } catch { return false; }
    }

    mountProductivityCalculators({
        calculatorList, selectedCalculators, productivityStorageKey, savedProductivityData,
        canEdit,
        onInvalid(type) {
            if (!canEdit()) return;
            const active = getExcabaseActiveProject();
            if (!active?.results?.productivity?.[type]) return;
            delete active.results.productivity[type];
            saveExcabaseProject(active);
        },
        onInputs(data) {
            if (!canEdit()) return;
            const activeProject = getExcabaseActiveProject();
            if (activeProject && String(activeProject.id) === String(project.id)) {
                activeProject.results = activeProject.results || {};
                activeProject.results.productivityInputs = data;
                if (!saveExcabaseProject(activeProject)) {
                    console.error("Gagal menyinkronkan produktivitas ke daftar proyek.");
                }
            }
        },
        onResult(type, result) {
            if (!canEdit()) return;
            try {
                const activeProject = JSON.parse(localStorage.getItem("excabase_active_project"));
                if (activeProject) {
                    activeProject.results = activeProject.results || {};
                    activeProject.results.productivity = activeProject.results.productivity || {};
                    activeProject.results.productivity[type] = result;
                    saveExcabaseProject(activeProject);
                }
            } catch (error) {
                console.error("Gagal menyimpan hasil produktivitas:", error);
            }
        }
    });
});
