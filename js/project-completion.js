
/* =========================================
   EXCABASE - PENYELESAIAN PROYEK
========================================= */

document.addEventListener("DOMContentLoaded", function () {
    const button = document.getElementById("completeProjectBtn");
    const title = document.getElementById("reportCompletionTitle");
    const description = document.getElementById("reportCompletionDescription");
    const checklist = document.getElementById("reportCompletionChecklist");
    const message = document.getElementById("reportCompletionMessage");

    if (!button || !title || !description || !checklist) return;

    function getProject() {
        try {
            if (typeof getExcabaseActiveProject === "function") {
                return getExcabaseActiveProject();
            }

            return JSON.parse(
                localStorage.getItem("excabase_active_project")
            );
        } catch (error) {
            console.error("Gagal membaca proyek:", error);
            return null;
        }
    }

    function hasData(value) {
        if (value == null) return false;

        if (Array.isArray(value)) {
            return value.length > 0;
        }

        if (typeof value === "object") {
            return Object.keys(value).length > 0;
        }

        if (typeof value === "string") {
            return value.trim().length > 0;
        }

        return true;
    }

    function getSteps(project) {
        const results = project?.results || {};

        return [
            {
                name: "Pekerjaan Tanah",
                done: hasData(results.earthwork)
            },
            {
                name: "Rekomendasi Alat",
                done: hasData(results.recommendation?.equipment)
            },
            {
                name: "Produktivitas",
                done: hasData(results.productivity)
            },
            {
                name: "Estimasi",
                done: isExcabaseEstimateCurrent(project)
            },
            {
                name: "Simulasi Armada",
                done: isExcabaseFleetCurrent(project) && hasData(results.fleet?.scenarios) &&
                      Boolean(results.fleet?.selectedScenario)
            }
        ];
    }

    function render() {
        const project = getProject();

        if (!project) {
            title.textContent = "Proyek Tidak Ditemukan";
            description.textContent =
                "Silakan buat atau pilih proyek terlebih dahulu.";
            button.disabled = true;
            return;
        }

        const steps = getSteps(project);
        const completed = steps.filter(step => step.done).length;
        const ready = steps.every(step => step.done);

        const finished = String(
            project.status || ""
        ).toLowerCase() === "selesai";

        checklist.className = "report-completion-checklist";
        checklist.replaceChildren();

        steps.forEach(step => {
            const item = document.createElement("span");
            item.textContent =
                (step.done ? "✓ " : "○ ") + step.name;

            if (step.done) {
                item.classList.add("done");
            }

            checklist.appendChild(item);
        });

        
if (finished) {
    title.textContent = "Proyek Telah Selesai";

    description.textContent =
        "Analisis proyek telah diselesaikan. " +
        "Batalkan penyelesaian jika ingin melakukan revisi.";

    button.textContent = "↶ Batalkan Penyelesaian";
    button.disabled = false;
    button.classList.add("cancel-completion");

    message.textContent =
        "Seluruh data proyek akan tetap tersimpan.";

    return;
}

button.classList.remove("cancel-completion");
button.textContent = "✓ Tandai Proyek Selesai";

        title.textContent = ready
            ? "Proyek Siap Diselesaikan"
            : "Analisis Belum Lengkap";

        description.textContent = ready
            ? "Seluruh tahapan wajib telah memiliki hasil. " +
              "Periksa laporan sebelum menyelesaikan proyek."
            : completed + " dari " + steps.length +
              " tahapan wajib sudah memiliki hasil.";

        button.disabled = !ready;

        message.textContent = ready
            ? "Klik tombol untuk menyimpan status selesai."
            : "Lengkapi tahapan yang belum tersedia.";
    }

    
button.addEventListener("click", function () {
    const project = getProject();

    if (!project) return;

    const finished =
        String(project.status || "").toLowerCase() === "selesai";

    // MEMBUKA KEMBALI PROYEK
    if (finished) {
        const confirmed = confirm(
            "Batalkan penyelesaian proyek ini?\n\n" +
            "Status proyek akan kembali aktif dan " +
            "seluruh data perhitungan tetap tersimpan."
        );

        if (!confirmed) return;

        project.status = "aktif";
        project.completedAt = null;

        try {
            if (typeof saveExcabaseProject !== "function") {
                throw new Error("Fungsi penyimpanan tidak tersedia.");
            }

            const berhasil = saveExcabaseProject(project);

if (!berhasil) {
    throw new Error("Status proyek gagal disimpan.");
}

render();

            alert(
                "Penyelesaian proyek berhasil dibatalkan!\n" +
                "Proyek sekarang kembali aktif."
            );
        } catch (error) {
            console.error(error);
            alert("Gagal membuka kembali proyek.");
        }

        return;
    }

    // MENYELESAIKAN PROYEK
    const ready = getSteps(project).every(step => step.done);

    if (!ready) {
        alert("Masih ada tahapan analisis yang belum lengkap.");
        render();
        return;
    }

    const confirmed = confirm(
        "Tandai proyek ini sebagai selesai?\n\n" +
        "Pastikan seluruh hasil analisis sudah diperiksa."
    );

    if (!confirmed) return;

    project.status = "selesai";
    project.completedAt = new Date().toISOString();

    try {
        if (typeof saveExcabaseProject !== "function") {
            throw new Error("Fungsi penyimpanan tidak tersedia.");
        }

        const berhasil = saveExcabaseProject(project);

if (!berhasil) {
    throw new Error("Status proyek gagal disimpan.");
}

render();

        alert("Proyek berhasil ditandai selesai!");
    } catch (error) {
        console.error(error);
        alert("Gagal menyelesaikan proyek.");
    }
});


    render();
});
