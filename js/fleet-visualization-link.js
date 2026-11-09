(function () {
    'use strict';
    const link = document.getElementById('visualizeFleetLink');
    if (!link) return;
    const status = document.getElementById('fleetVisualizationStatus');
    const data = window.ExcabaseFleetData;
    let source = null;
    function accept(event) {
        source = event.detail;
        link.setAttribute('aria-disabled', String(!source));
        if (source) {
            link.href = 'fleet-visualization.html?fromProject=1&projectId=' + encodeURIComponent(source.projectId) + '&scenario=' + source.selected;
            status.textContent = 'Visualisasi opsional memakai skenario ' + data.names[source.selected] + ' yang sedang dipilih. Data proyek tidak diubah.';
        } else {
            link.href = '#';
            status.textContent = 'Hitung skenario terpilih terlebih dahulu. Visualisasi tidak wajib untuk melanjutkan ke Analisis & Laporan.';
        }
    }
    document.addEventListener('excabase:fleet-visualization', accept);
    link.addEventListener('click', event => {
        try {
            if (!source) throw new Error('Hasil skenario terpilih belum siap. Klik Hitung Semua Skenario.');
            data.verify(source, getExcabaseActiveProject());
            // A tab-local handoff, never a new project result or saved scenario.
            sessionStorage.setItem(data.SESSION_KEY, JSON.stringify(source));
        } catch (error) {
            event.preventDefault(); status.textContent = error.message;
        }
    });
    window.addEventListener('storage', event => {
        if (['excabase_active_project', 'excabase_projects'].includes(event.key) || event.key === null) accept({ detail: null });
    });
})();
