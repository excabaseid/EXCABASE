
/* =========================================
   EXCABASE - PROJECT READ ONLY
========================================= */

(function () {
    "use strict";

    function lockCompletedProject() {
        const params = new URLSearchParams(window.location.search);

        // Hanya berlaku untuk mode Proyek Aktif
        if (params.get("fromProject") !== "1") return;

        let project;

        try {
            project = JSON.parse(
                localStorage.getItem("excabase_active_project") || "null"
            );
        } catch (error) {
            console.error("Gagal membaca status proyek:", error);
            return;
        }

        if (!project || String(project.status || "").toLowerCase() !== "selesai") {
            return;
        }

        // Kunci semua input pada halaman perhitungan proyek
        document.querySelectorAll(
    "input, select, textarea, button:not([data-sidebar-control])"
).forEach(function (element) {
            element.disabled = true;
        });

        // Tampilkan informasi status proyek
        const main =
    document.querySelector("main") ||
    document.querySelector(".main-content") ||
    document.querySelector(".content");

        if (main && !document.getElementById("projectLockedNotice")) {
            const notice = document.createElement("div");
            notice.id = "projectLockedNotice";
            notice.style.cssText = `
                padding: 16px 20px;
                margin-bottom: 24px;
                background: #fff8e1;
                border: 1px solid #eab308;
                border-radius: 10px;
                color: #17324d;
                font-size: 14px;
                line-height: 1.6;
            `;

            notice.textContent =
                "🔒 Proyek ini sudah selesai. " +
                "Untuk mengubah perhitungan, buka halaman Analisis & Laporan " +
                "dan pilih Batalkan Penyelesaian.";

            main.prepend(notice);
        }
    }

    // Jalankan setelah halaman selesai dimuat
window.addEventListener("load", function () {
    lockCompletedProject();
});

// Jalankan kembali jika halaman dibuka dari cache browser
window.addEventListener("pageshow", function () {
    lockCompletedProject();
});
})();
