
/* ==========================================
   EXCABASE - SIDEBAR MANAGER
========================================== */

(function () {
    "use strict";

    const params = new URLSearchParams(window.location.search);
    const fromProject = params.get("fromProject") === "1";

    const currentFile = window.location.pathname
        .split("/")
        .pop() || "index.html";

    const inPages = window.location.pathname
        .split("/")
        .includes("pages");

    const prefix = inPages ? "" : "pages/";
    const dashboardUrl = inPages ? "../index.html" : "index.html";
    const standaloneProductivity = /^produktivitas-(excavator|dumptruck|wheelloader|motorgrader|bulldozer|compactor|kombinasi)\.html$/.test(currentFile);

    // Record explicit project navigation only, never page rendering or refresh.
    document.addEventListener("click", function (event) {
        const openButton = currentFile === "proyek-aktif.html" && event.target.closest(".project-open-button");
        const projectLink = event.target.closest('a[href*="fromProject=1"]');
        if (event.defaultPrevented || (!openButton && !projectLink)) return;
        try {
            // The existing button handler has already selected the project.
            const project = JSON.parse(localStorage.getItem("excabase_active_project") || "null");
            if (project?.id == null) return;
            const stored = JSON.parse(localStorage.getItem("excabase_project_access") || "{}");
            const access = stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
            const latest = Object.values(access).filter(value => Number.isFinite(value));
            const time = latest.reduce((max, value) => Math.max(max, value), Date.now()) + 1;
            localStorage.setItem("excabase_project_access", JSON.stringify({ ...access, [String(project.id)]: time }));
        } catch (error) {
            console.warn("Waktu akses proyek tidak dapat disimpan:", error);
        }
    });

    const steps = [
        ["kalkulator-volume-tanah.html", "▤ Pekerjaan Tanah"],
        ["rekomendasi.html", "▣ Opsi Alat Berat"],
        ["produktivitas.html", "∑ Produktivitas"],
        ["estimasi-proyek.html", "▧ Estimasi Proyek"],
        ["simulasi-armada.html", "▥ Simulasi Armada"],
        ["analisis-laporan.html", "▤ Analisis & Laporan"]
    ];

    function link(file, label, projectMode = false) {
        const href = prefix + file +
            (projectMode ? "?fromProject=1" : "");

        const active = (currentFile === file && (projectMode === fromProject)) ||
            (standaloneProductivity && file === "produktivitas.html" && !projectMode);

        return `
            <a href="${href}" class="${active ? "active" : ""}">
                ${label}
            </a>
        `;
    }

    function renderSidebar() {
        const menu = document.querySelector(".sidebar .menu");
        if (!menu) return;

        let html = `
            <div class="menu-title">OVERVIEW</div>
            <a href="${dashboardUrl}"
               class="${currentFile === "index.html" ? "active" : ""}">
                ▦ Dashboard
            </a>

            <div class="menu-title">PROYEK</div>
            ${link("buat-proyek.html", "＋ Buat Proyek")}
            ${link("proyek-aktif.html", "▤ Proyek Aktif")}
        `;

        // Mode khusus enam tahapan proyek
        const isProjectStep = steps.some(function (step) {
            return step[0] === currentFile;
        });

        if (fromProject && isProjectStep) {
            html += `
                <div class="menu-title">TAHAPAN PROYEK</div>
            `;

            steps.forEach(function (step) {
                html += link(step[0], step[1], true);
            });

        } else {
            // Sidebar normal
            html += `
                <div class="menu-title">PERHITUNGAN MANDIRI</div>
                ${link("kalkulator-volume-tanah.html", "▤ Pekerjaan Tanah")}
                ${link("produktivitas.html", "∑ Produktivitas")}
                ${link("estimasi-proyek.html", "▧ Estimasi Proyek")}

                <div class="menu-title">REFERENSI ALAT</div>
                ${link("katalog.html", "▣ Katalog Alat Berat")}
            `;
        }

        html += `
            <div class="menu-title">PENGATURAN</div>
            ${link("pengaturan.html", "⚙ Pengaturan")}
        `;

        menu.innerHTML = html;
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", renderSidebar);
    } else {
        renderSidebar();
    }
})();
