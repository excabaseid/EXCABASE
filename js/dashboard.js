
/* =========================================
   EXCABASE - DASHBOARD DATA PROYEK
========================================= */

(function () {
    "use strict";

    const $ = id => document.getElementById(id);
    const emptyProjectState = $("dashboardProjectList")?.querySelector(".dashboard-empty-project")?.cloneNode(true);

    function readStorage(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (error) {
            console.warn("Gagal membaca:", key, error);
            return fallback;
        }
    }

    function getProjects() {
        const stored = readStorage("excabase_projects", []);
        const active = readStorage("excabase_active_project", null);

        const projects = Array.isArray(stored)
            ? stored.filter(p => p && typeof p === "object")
            : [];

        if (active && typeof active === "object") {
            const index = projects.findIndex(p =>
                p.id != null &&
                active.id != null &&
                String(p.id) === String(active.id)
            );

            if (index >= 0) {
                // Versi proyek aktif diprioritaskan
                projects[index] = active;
            } else {
                projects.push(active);
            }
        }

        // Hindari proyek ber-ID sama dihitung dua kali
        const seen = new Set();

        return projects.filter(project => {
            if (project.id == null) return true;

            const id = String(project.id);
            if (seen.has(id)) return false;

            seen.add(id);
            return true;
        });
    }

    function isCompleted(project) {
        const status = String(
            project.status || ""
        ).trim().toLowerCase();

        return [
            "selesai",
            "completed",
            "complete",
            "finished"
        ].includes(status);
    }

    
function getProgress(project) {
    const results = project.results || {};

    const steps = [
        Boolean(results.earthwork),
        Boolean(results.recommendation),
        Boolean(
            results.productivity &&
            Object.keys(results.productivity).length
        ),
        Boolean(results.estimate),
        Boolean(results.fleet)
    ];

    const completed = steps.filter(Boolean).length;

    return {
        completed,
        total: steps.length,
        percent: Math.round(
            (completed / steps.length) * 100
        )
    };
}


    function createElement(tag, className, text) {
        const el = document.createElement(tag);

        if (className) el.className = className;

        if (text !== undefined) {
            el.textContent = String(text);
        }

        return el;
    }

    function renderStats(projects) {
        const total = projects.length;
        const completed = projects.filter(isCompleted).length;
        const active = total - completed;

        if ($("totalProjects")) {
            $("totalProjects").textContent = total;
        }

        if ($("activeProjects")) {
            $("activeProjects").textContent = active;
        }

        if ($("completedProjects")) {
            $("completedProjects").textContent = completed;
        }
    }

    function renderProjectList(projects) {
        const container = $("dashboardProjectList");
        if (!container) return;

        if (!projects.length) {
            // Restore the original empty state when returning through browser history.
            container.replaceChildren();
            if (emptyProjectState) container.appendChild(emptyProjectState.cloneNode(true));
            return;
        }

        container.replaceChildren();

        const access = readStorage("excabase_project_access", {});
        function timestamp(value) {
            const time = typeof value === "number" ? value : Date.parse(value);
            return Number.isFinite(time) && time > 0 ? time : 0;
        }
        function lastAccess(project) {
            return timestamp(access?.[String(project.id)]) ||
                timestamp(project.lastAccessedAt) || timestamp(project.lastOpenedAt) ||
                timestamp(project.updatedAt) || timestamp(project.createdAt);
        }
        const sorted = [...projects].sort((a, b) => lastAccess(b) - lastAccess(a));

        sorted.slice(0, 2).forEach(project => {
            const completed = isCompleted(project);
            const progress = getProgress(project);

            const card = createElement(
                "div", "dashboard-live-project"
            );

            const header = createElement(
                "div", "dashboard-live-header"
            );

            const title = createElement(
                "h4",
                "",
                project.name || "Proyek Tanpa Nama"
            );

            const badge = createElement(
                "span",
                completed
                    ? "dashboard-live-badge completed"
                    : "dashboard-live-badge",
                completed ? "Selesai" : "Dalam Analisis"
            );

            header.append(title, badge);

            const details = createElement(
                "p",
                "dashboard-live-details",
                [
                    project.workType,
                    project.location
                ].filter(Boolean).join(" • ") ||
                "Proyek pekerjaan tanah"
            );

            const progressInfo = createElement(
                "div", "dashboard-live-progress-info"
            );

            progressInfo.append(
                createElement("span", "", "Tahapan analisis"),
                createElement(
                    "strong",
                    "",
                    progress.completed + " / " + progress.total
                )
            );

            const track = createElement(
                "div", "dashboard-live-track"
            );

            const fill = createElement(
                "div", "dashboard-live-fill"
            );

            fill.style.width = progress.percent + "%";
            track.appendChild(fill);

            const footer = createElement(
                "div", "dashboard-live-footer"
            );

            footer.appendChild(
                createElement(
                    "span",
                    "",
                    progress.percent + "% tahapan tercatat"
                )
            );

            
const link = createElement(
    "a", "", "Lihat Proyek →"
);

// Pilih proyek yang diklik sebelum membuka halaman
link.href = "pages/analisis-laporan.html?fromProject=1";

link.addEventListener("click", function () {
    localStorage.setItem(
        "excabase_active_project",
        JSON.stringify(project)
    );
    try {
        const stored = readStorage("excabase_project_access", {});
        const access = stored && typeof stored === "object" && !Array.isArray(stored) ? stored : {};
        const latest = Object.values(access).filter(value => Number.isFinite(value));
        const time = latest.reduce((max, value) => Math.max(max, value), Date.now()) + 1;
        localStorage.setItem("excabase_project_access", JSON.stringify({ ...access, [String(project.id)]: time }));
    } catch (error) {
        console.warn("Waktu akses proyek tidak dapat disimpan:", error);
    }
});

            footer.appendChild(link);

            card.append(
                header,
                details,
                progressInfo,
                track,
                footer
            );

            container.appendChild(card);
        });
    }

    function initDashboard() {
        const projects = getProjects();

        renderStats(projects);
        renderProjectList(projects);
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            initDashboard
        );
    } else {
        initDashboard();
    }

    // Perbarui saat pengguna kembali ke tab dashboard
    window.addEventListener("pageshow", initDashboard);
})();
