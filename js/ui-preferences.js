/* Apply the existing display preferences without reading or writing project data. */
(function () {
    "use strict";
    function read(key) {
        try { return localStorage.getItem(key); } catch { return null; }
    }
    function apply() {
        const dark = read("excabaseTheme") === "dark";
        document.documentElement.classList.toggle("excabase-dark", dark);
        if (document.body) document.body.classList.toggle("excabase-dark", dark);
        const name = read("excabaseAdminName")?.trim();
        document.querySelectorAll(".header .profile, #settingsProfile").forEach(function (profile) {
            profile.textContent = name || (profile.id === "settingsProfile" ? "Pengguna" : "Administrator");
        });
    }
    window.applyExcabasePreferences = apply;
    apply();
    document.addEventListener("DOMContentLoaded", apply);
    window.addEventListener("pageshow", apply);
    window.addEventListener("storage", function (event) {
        if (event.key === null || ["excabaseTheme", "excabaseAdminName"].includes(event.key)) apply();
    });
})();
