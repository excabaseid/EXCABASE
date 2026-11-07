
/* ==========================================
   EXCABASE - NAVIGASI ALUR PROYEK
========================================== */

(function () {
    "use strict";

    // Hanya aktif saat dibuka melalui alur proyek
    const params = new URLSearchParams(window.location.search);

    if (params.get("fromProject") !== "1") return;

    // Urutan tahapan Proyek Aktif
    const steps = [
        {
            name: "Pekerjaan Tanah",
            file: "kalkulator-volume-tanah.html"
        },
        {
            name: "Rekomendasi Alat",
            file: "rekomendasi.html"
        },
        {
            name: "Produktivitas",
            file: "produktivitas.html"
        },
        {
            name: "Estimasi Kebutuhan Alat",
            file: "estimasi-proyek.html"
        },
        {
            name: "Simulasi Armada",
            file: "simulasi-armada.html"
        },
        {
            name: "Analisis & Laporan",
            file: "analisis-laporan.html"
        }
    ];

    function renderProjectNavigation() {
        const currentFile = window.location.pathname
            .split("/")
            .pop()
            .toLowerCase();

        const currentIndex = steps.findIndex(function (step) {
            return step.file.toLowerCase() === currentFile;
        });

        if (currentIndex === -1) return;

        const container = document.querySelector(
            ".main-content, main, .content"
        );

        if (!container) return;

        // Hapus navigasi lama agar tidak duplikat
        document.querySelectorAll(".project-step-navigation")
            .forEach(function (element) {
                element.remove();
            });

        // Sembunyikan tautan Kembali ke Dashboard
        document.querySelectorAll(".back-link")
            .forEach(function (link) {
                if (link.textContent.includes("Kembali ke Dashboard")) {
                    link.remove();
                }
            });

        const navigation = document.createElement("div");
        navigation.className = "project-step-navigation";

        const previous = steps[currentIndex - 1];
        const next = steps[currentIndex + 1];

        if (previous) {
            navigation.innerHTML += `
                <a href="${previous.file}?fromProject=1"
                   class="project-nav-btn">
                    <span>← Sebelumnya</span>
                    <small>${previous.name}</small>
                </a>
            `;
        }

        if (next) {
            navigation.innerHTML += `
                <a href="${next.file}?fromProject=1"
                   class="project-nav-btn project-nav-next">
                    <span>Selanjutnya →</span>
                    <small>${next.name}</small>
                </a>
            `;
        }

        container.appendChild(navigation);
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            renderProjectNavigation
        );
    } else {
        renderProjectNavigation();
    }
})();
