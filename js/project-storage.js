// ==========================================
// EXCABASE - MULTI PROJECT STORAGE
// ==========================================

// Mengambil proyek yang sedang aktif
function getExcabaseActiveProject() {
    try {
        return JSON.parse(
            localStorage.getItem("excabase_active_project") || "null"
        );
    } catch (error) {
        console.error("Gagal membaca proyek aktif:", error);
        return null;
    }
}

// Menyimpan proyek aktif sekaligus memperbarui daftar proyek
// Hasil estimasi adalah snapshot; perubahan produktivitas harus dikonfirmasi
// melalui Hitung Estimasi sebelum dipakai oleh simulasi.
function isExcabaseEstimateCurrent(project) {
    const equipment = project?.results?.estimate?.equipment;
    if (!Array.isArray(equipment) || equipment.length === 0) return false;
    return equipment.every(function (item) {
        const productivity = project.results?.productivity?.[item.type];
        return productivity && Number.isFinite(Number(productivity.hourly)) &&
            Number(productivity.hourly) > 0 &&
            Number(item.hourlyProductivity) === Number(productivity.hourly) &&
            item.volumeBasis === productivity.volumeBasis &&
            item.workVolumeBasis === item.volumeBasis &&
            Math.abs(Number(item.totalHourlyProductivity) -
                Number(item.hourlyProductivity) * Number(item.units)) <=
                1e-9 * Math.max(1, Number(item.totalHourlyProductivity));
    });
}

function getExcabaseEstimateSignature(project) {
    return JSON.stringify({
        targetDays: Number(project.targetDays) || 0,
        workingHours: Number(project.workHoursPerDay) || 8,
        equipment: (project.results?.estimate?.equipment || []).map(function (item) {
            return {
                type: item.type, units: Number(item.units),
                productivity: Number(item.totalHourlyProductivity),
                volume: Number(item.workVolume), basis: item.workVolumeBasis,
                cost: Number(item.costPerHour)
            };
        })
    });
}

function isExcabaseFleetCurrent(project) {
    return isExcabaseEstimateCurrent(project) &&
        project.results?.fleet?.estimateSignature === getExcabaseEstimateSignature(project);
}

function saveExcabaseProject(project) {

    if (!project || project.id === undefined || project.id === null) {
        console.error("Data proyek tidak valid.");
        return false;
    }

    try {
        const savedProjects = JSON.parse(
            localStorage.getItem("excabase_projects") || "[]"
        );

        if (!Array.isArray(savedProjects)) {
            throw new Error("Format daftar proyek tidak valid.");
        }

        const projects = savedProjects;

        const existingIndex = projects.findIndex(function (item) {
            return item &&
                String(item.id) === String(project.id);
        });

        const existingProject =
            existingIndex !== -1 ? projects[existingIndex] : null;

        // Proyek selesai hanya boleh dibuka kembali,
        // bukan langsung diubah hasil perhitungannya.
        if (
            existingProject &&
            String(existingProject.status || "").toLowerCase() === "selesai"
        ) {
            const reopening =
                String(project.status || "").toLowerCase() === "aktif";

            if (!reopening) {
                console.warn(
                    "Proyek sudah selesai. Batalkan penyelesaian " +
                    "sebelum melakukan perubahan."
                );
                return false;
            }

            // Saat membuka kembali, pertahankan hasil lama.
            project = {
                ...existingProject,
                status: "aktif",
                completedAt: null
            };
        }

        if (existingIndex !== -1) {
            projects[existingIndex] = project;
        } else {
            projects.push(project);
        }

        localStorage.setItem(
            "excabase_projects",
            JSON.stringify(projects)
        );

        localStorage.setItem(
            "excabase_active_project",
            JSON.stringify(project)
        );

        return true;

    } catch (error) {
        console.error("Gagal menyimpan proyek:", error);
        return false;
    }
}
