(function (root) {
    function evaluate(method, values) {
        const numeric = {};
        for (const field of method.fields) {
            const raw = values[field.id];
            if (field.options) {
                if (!field.options.some(option => option[0] === raw)) throw new Error("Pilih " + field.label + ".");
            } else {
                const value = Number(raw);
                if (raw === "" || raw == null || !Number.isFinite(value) || value < field.min || (field.positive && value <= 0))
                    throw new Error("Periksa " + field.label + "; gunakan angka " + (field.positive ? "positif." : "nol atau positif."));
                numeric[field.id] = value;
            }
        }
        let result;
        if (method.kind === "range" || method.kind === "fixed") {
            const row = method.rows.find(row => row[0] === values.condition);
            result = method.kind === "fixed" ? row[2] : numeric.value;
            if (method.kind === "range" && (result < row[2] || result > row[3])) throw new Error("Nilai harus dalam rentang " + row[2] + "–" + row[3] + ".");
            if (method.unit === "lintasan" && !Number.isInteger(result)) throw new Error("Jumlah lintasan harus bilangan bulat.");
        } else {
            const travelMinutes = numeric.distance / 1000 * 60 * (1 / numeric.loadedSpeed + 1 / numeric.returnSpeed);
            if (method.kind === "truck-cycle") result = travelMinutes + numeric.loading + numeric.other;
            else if (method.kind === "loader-cycle") result = (travelMinutes + numeric.fixed) * 60;
            else if (method.kind === "dozer-cycle") result = (travelMinutes + (values.transmission === "dd" ? .1 : .05)) * 60;
            else throw new Error("Metode belum tersedia.");
        }
        if (!Number.isFinite(result) || result <= 0) throw new Error("Hasil parameter harus positif dan terbatas.");
        return result;
    }
    root.ProductivityParameterMethods = { evaluate };
    if (typeof module !== "undefined") module.exports = { evaluate };
})(typeof window === "undefined" ? globalThis : window);
