/* Transcribed from the local PDFs. Page numbers are PDF pages, not printed pages. */
(function (root) {
    const documentName = "Lampiran II SE DJBK 47/SE/Dk/2026 — Acuan dalam Penyusunan AHSP";
    const pdf = "../references/Lampiran-II-SE-DJBK-No-47-Tahun-2026-Acuan-dalam-Penyusunan-AHSP.pdf";
    const source = (page, table) => ({ document: documentName, pdf, page, table });
    const choice = (id, label, options) => ({ id, label, options });
    const number = (id, label, unit, min = 0, positive = true) => ({ id, label, unit, min, positive });
    const range = (id, title, target, unit, reference, rows, note) => ({
        id, title, target, unit, source: reference, kind: "range", rows, note,
        fields: [choice("condition", "Kondisi referensi", rows.map(row => [row[0], row[1]])),
            number("value", "Nilai pilihan dalam rentang tabel", unit)]
    });
    const fixed = (target, reference, rows) => ({
        id: "efficiency", title: "Pilih efisiensi kerja", target, unit: "", kind: "fixed", rows,
        source: reference, note: "Pilih kondisi yang benar-benar sesuai operasi. Efisiensi berbeda dari fill factor; bukan nilai otomatis untuk semua pekerjaan.",
        fields: [choice("condition", "Kondisi operasi", rows.map(row => [row[0], row[1]]))]
    });
    const standardEfficiency = [["baik", "Baik — 0,83", .83], ["sedang", "Sedang — 0,75", .75],
        ["kurang", "Kurang baik — 0,67", .67], ["buruk", "Buruk — 0,58", .58]];
    const excavatorCycles = [
        [[10.8,14.6],[14.6,18.4],[13,17.5],[17.5,22.1],[16.6,22.4],[22.4,28.2]],
        [[14.4,18.2],[18.2,22.1],[18.3,23.3],[23.3,28.2],[22.3,28.3],[28.3,34.4]],
        [[16.6,20.4],[20.4,24.3],[21.2,26.1],[26.1,31],[25.8,31.8],[31.8,37.8]]
    ];
    const cycleRows = [];
    ["0,10–0,60 m³", "0,60–1,25 m³", "1,25–2,20 m³"].forEach((capacity, c) => {
        ["Pasir/kerikil/tanah lunak", "Tanah umum/lempung", "Lempung keras/tanah keras"].forEach((soil, s) => {
            ["45°–90°", "90°–180°"].forEach((swing, w) => {
                const limits = excavatorCycles[c][s * 2 + w];
                cycleRows.push([`${c}-${s}-${w}`, `${capacity}; ${soil}; swing ${swing}: ${limits.join("–")} detik`, ...limits]);
            });
        });
    });
    const loaderTimes = {
        v: [[.45,.55,.65],[.55,.65,.7],[.7,.7,.75],[.75,.75,.8]],
        cross: [[.4,.5,.6],[.5,.6,.65],[.65,.65,.7],[.7,.75,.75]]
    };
    const loaderMethods = Object.entries(loaderTimes).map(([pattern, times]) => {
        const rows = [];
        ["Mudah", "Sedang", "Agak sulit", "Sulit"].forEach((condition, i) => {
            ["≤ 3 m³", "3,1–5 m³", "≥ 5,1 m³"].forEach((capacity, j) =>
                rows.push([`${i}-${j}`, `${condition}; bucket ${capacity} — ${times[i][j]} menit`, times[i][j] * 60]));
        });
        return {
            id: "loader-" + pattern, title: "Siklus pendek " + (pattern === "v" ? "V-loading" : "cross-loading"),
            target: "loaderCycleTime", unit: "detik", kind: "fixed", rows,
            source: source(41, pattern === "v" ? "Tabel A.19" : "Tabel A.21"),
            note: "Khusus wheel loader, perjalanan pendek. Nilai tabel menit dikali 60 menjadi detik. Celah kelas kapasitas dan kondisi di luar tabel: gunakan pengukuran manual, tanpa interpolasi.",
            fields: [choice("condition", "Kondisi dan kelompok bucket", rows.map(row => [row[0],row[1]]))]
        };
    });
    const travelFields = [number("distance", "Jarak satu arah", "m", 0, false),
        number("loadedSpeed", "Kecepatan bermuatan/maju", "km/jam"),
        number("returnSpeed", "Kecepatan kosong/mundur", "km/jam")];
    const methods = {
        excavator: [
            range("fill", "Pilih bucket fill factor", "fillFactor", "", source(28,"Tabel A.10"),
                [["mudah","Mudah: 1,10–1,20",1.1,1.2],["sedang","Sedang: 1,00–1,10",1,1.1],
                    ["agak","Agak sulit: 0,90–1,00",.9,1],["sulit","Sulit: 0,80–0,90",.8,.9]],
                "Rentang bukan angka tunggal. Pilih berdasarkan kondisi material; tidak menerapkan Fv."),
            range("cycle", "Pilih waktu siklus standar", "cycleTime", "detik", source(29,"Tabel A.11"), cycleRows,
                "Rentang bergantung bucket, tanah dan swing. Batas kelas yang bersinggungan dipilih secara eksplisit; tidak mengambil rata-rata otomatis. Contoh numerik excavator dalam dokumen tidak konsisten dengan uraian parameternya."),
            fixed("efficiency", source(30,"Tabel A.13"), standardEfficiency)
        ],
        dumptruck: [
            { id:"cycle", title:"Hitung siklus angkut", target:"truckCycleTime", unit:"menit", kind:"truck-cycle",
                source:source(23,"Bagian Dump Truck; persamaan (27), komponen siklus; lihat juga persamaan (15), halaman PDF 9"),
                fields:[...travelFields,number("loading","Waktu muat aktual","menit"),number("other","Bongkar, manuver dan antrean","menit",0,false)],
                note:"Ts = waktu muat + 60L/vF + 60L/vR + waktu lain; L dikonversi m ke km. Waktu lain diukur; contoh dokumen 2,0 menit berbeda dari rentang waktu pasti 1,25–1,65 menit. Jangan hitung antrean dua kali." },
            fixed("truckEfficiency",source(24,"Tabel A.8"),[["baik","Baik — 0,83",.83],["sedang","Sedang — 0,80",.8],["kurang","Kurang baik — 0,75",.75],["buruk","Buruk — 0,70",.7]])
        ],
        wheelloader: [
            range("fill","Pilih bucket fill factor","loaderFillFactor","",source(39,"Tabel A.17 (kolom Wheel Loader)"),
                [["mudah","Mudah: 1,00–1,10",1,1.1],["sedang","Sedang: 0,85–0,95",.85,.95],["agak","Agak sulit: 0,80–0,85",.8,.85],["sulit","Sulit: 0,75–0,80",.75,.8]],
                "Kondisi penumpahan dijelaskan pada Tabel A.18, halaman PDF 40. Data track loader tidak digunakan."),
            ...loaderMethods,
            {id:"travel-cycle",title:"Hitung siklus perjalanan jauh",target:"loaderCycleTime",unit:"detik",kind:"loader-cycle",
                source:source(42,"Persamaan (30e); Tabel A.23 untuk panduan kecepatan"),
                fields:[...travelFields,number("fixed","Waktu tetap Z","menit")],
                note:"Ts = L/vF + L/vR + Z setelah kecepatan menjadi m/menit; hasil menit dikali 60. Z referensi 0,60–0,75 menit atau hasil pengukuran. Isi kecepatan aktual; tidak menyalin contoh yang satuannya tidak konsisten."},
            fixed("loaderEfficiency",source(43,"Tabel A.24"),[["baik","Baik — 0,83",.83],["sedang","Sedang — 0,80",.8],["agak","Agak buruk — 0,75",.75],["buruk","Buruk — 0,70",.7]])
        ],
        motorgrader: [
            range("speed","Pilih kecepatan operasi","graderSpeed","km/jam",source(35,"Tabel A.14"),
                [["jalan","Perbaikan jalan: 2–6",2,6],["tepi","Tepi sungai/saluran: 1,6–2,6",1.6,2.6],["bentuk","Membentuk permukaan: 1,6–4",1.6,4],["parit","Penggalian parit: 1,6–4",1.6,4],["rata","Perataan permukaan: 2–8",2,8]],
                "Kecepatan dipilih dalam rentang kondisi operasi. Metode grader, lebar blade, overlap, Fk dan basis volume tidak diubah."),
            fixed("graderEfficiency",source(36,"Tabel A.16; pembanding Permen PUPR 8/2023 PDF 86 salah berjudul A.13"),
                [["jalan","Perbaikan jalan/perataan — 0,8",.8],["pindah","Pemindahan — 0,7",.7],["sebar","Penyebaran/grading — 0,6",.6],["gali","Penggalian — 0,5",.5]]),
            range("passes","Pilih jumlah lintasan","graderPasses","lintasan",source(34,"Keterangan persamaan (30a)"),
                [["perataan","Perataan: 2–4 lintasan",2,4]],"Nilai bilangan bulat, satu lintasan adalah satu perjalanan kerja. Sesuaikan metode lapangan.")
        ],
        bulldozer: [
            range("fill","Pilih blade fill factor","dozerFillFactor","",source(17,"Tabel A.7"),
                [["mudah","Mudah: 0,90–1,10",.9,1.1],["sedang","Sedang: 0,70–0,90",.7,.9],["agak","Agak sulit: 0,60–0,70",.6,.7],["sulit","Sulit: 0,40–0,60",.4,.6]],
                "Tabel mencetak beberapa rentang dalam urutan menurun; rentang ditampilkan menaik. Tidak menerapkan Fm."),
            {id:"cycle",title:"Hitung siklus dorong",target:"dozerCycleTime",unit:"detik",kind:"dozer-cycle",source:source(16,"Keterangan persamaan (23a–b)"),
                fields:[...travelFields,choice("transmission","Transmisi",[["dd","Direct Drive: Z 0,10 menit"],["tc","Torque Converter: Z 0,05 menit"]])],
                note:"Ts = perjalanan maju + mundur + Z. Jarak meter dikonversi ke kilometer sebelum dibagi km/jam; hasil menit dikali 60. Normalisasi satuan diperlukan pada rumus tercetak. Faktor kemiringan Fm tidak diterapkan."},
            fixed("dozerEfficiency",source(17,"Tabel A.6"),standardEfficiency)
        ],
        compactor: [
            range("speed","Pilih kecepatan pemadatan","compactorSpeed","km/jam",source(47,"Tabel A.25"),
                [["vbesar","Vibrating roller besar: 1,5–4",1.5,4],["vkecil","Vibrating roller kecil: 1–3",1,3],["soil","Soil compactor: 4–10",4,10]],
                "Pilih jenis pemadat sesuai alat, bukan hanya nama merek. Nilai aktual tetap harus sesuai kondisi lapangan."),
            range("passes","Pilih jumlah lintasan","compactorPasses","lintasan",source(47,"Tabel A.25"),
                [["road","Road roller: 3–5",3,5],["tire","Tire roller: 4–8",4,8],["vibratory","Vibrating roller / soil compactor: 4–12",4,12],["macadam","Macadam roller: 6–8",6,8],["tandem","Tandem: 2 awal + 4–8 akhir (total 6–10)",6,10]],
                "Bilangan bulat. Jumlah aktual harus dibuktikan dengan hasil pemadatan. Tebal akhir tetap diukur; Tabel A.26 halaman PDF 48 memberi batas maksimum, bukan tebal otomatis. Overlap dan rumus utama tidak diubah.")
        ]
    };
    // Practical explanations of the table context, not quotations or new selection rules.
    const fillDescriptions = {
        excavator: {
            mudah: "Tanah atau material lepas mudah dikeruk dan dapat mengisi bucket hingga munjung tanpa tambahan daya gali yang besar.",
            sedang: "Material seperti tanah berpasir kering atau campuran tanah memerlukan usaha penggalian lebih besar, tetapi bucket masih dapat terisi hampir penuh.",
            agak: "Tanah berbatu, lempung keras atau material yang liat membuat bucket lebih sulit terisi penuh.",
            sulit: "Bongkah atau batu hasil peledakan menyisakan banyak ruang antarbutir sehingga pengisian bucket berkurang."
        },
        wheelloader: {
            mudah: "Material lepas di stockpile, seperti pasir atau agregat, mudah diambil sehingga bucket loader dapat terisi penuh.",
            sedang: "Pengambilan material timbunan atau tanah berpasir memerlukan usaha lebih besar, tetapi bucket loader masih dapat terisi hampir penuh.",
            agak: "Campuran kerikil, pasir atau material timbunan lebih sulit masuk dan memenuhi bucket loader.",
            sulit: "Batu pecah tidak beraturan, bongkah atau material bercampur batu membuat pengisian bucket loader kurang merata."
        },
        bulldozer: {
            mudah: "Material mudah didorong dan terkumpul di depan blade dengan kehilangan relatif kecil.",
            sedang: "Material cukup mudah didorong, tetapi sebagian dapat tercecer.",
            agak: "Material lebih sulit terkumpul di depan blade sehingga volume dorongan berkurang.",
            sulit: "Material sulit didorong atau banyak tercecer sehingga pengisian blade kurang optimal."
        }
    };
    const efficiencyDescriptions = {
        excavator: {
            baik: "Penggalian dan penumpahan excavator berlangsung lancar dengan sedikit gangguan operasi.",
            sedang: "Penggalian dan penumpahan excavator mengalami beberapa jeda sehingga waktu kerja efektif berkurang.",
            kurang: "Hambatan saat menggali, memutar atau menumpahkan material cukup sering mengurangi waktu efektif excavator.",
            buruk: "Gangguan operasi excavator dominan sehingga hanya sebagian kecil waktu tersedia yang digunakan secara efektif."
        },
        dumptruck: {
            baik: "Pemuatan, perjalanan dan pembongkaran dump truck terkoordinasi dengan sedikit gangguan di luar komponen siklus.",
            sedang: "Operasi angkut dump truck cukup lancar, tetapi masih terdapat gangguan yang mengurangi waktu kerja efektif.",
            kurang: "Gangguan operasi angkut cukup sering mengurangi waktu efektif dump truck; bedakan dari waktu antre yang sudah dicatat dalam siklus.",
            buruk: "Operasi angkut banyak terhambat sehingga waktu kerja efektif dump truck berkurang besar; hindari menghitung hambatan yang sama dua kali."
        },
        wheelloader: {
            baik: "Pengambilan dan pemuatan material oleh loader berjalan lancar dengan sedikit gangguan operasi.",
            sedang: "Loader masih dapat memuat secara teratur, tetapi terdapat jeda operasi yang mengurangi waktu efektif.",
            agak: "Gangguan saat mengambil, memindahkan atau menumpahkan material cukup sering mengurangi waktu efektif loader.",
            buruk: "Operasi pemuatan loader sering terhenti atau terganggu sehingga waktu efektifnya berkurang besar."
        },
        bulldozer: {
            baik: "Siklus dorong dan kembali bulldozer berlangsung lancar dengan sedikit gangguan operasi.",
            sedang: "Bulldozer masih bekerja cukup teratur, tetapi terdapat jeda yang mengurangi waktu dorong efektif.",
            kurang: "Gangguan pada siklus dorong dan kembali cukup sering mengurangi waktu kerja efektif bulldozer.",
            buruk: "Operasi bulldozer banyak terhambat sehingga waktu yang dapat digunakan untuk siklus kerja berkurang besar."
        },
        motorgrader: {
            jalan: "Efisiensi ini terkait pekerjaan perbaikan jalan dan perataan oleh grader; pilih berdasarkan jenis pekerjaan, bukan tingkat pengisian blade.",
            pindah: "Efisiensi ini digunakan untuk konteks pekerjaan pemindahan material oleh grader.",
            sebar: "Efisiensi ini terkait pekerjaan penyebaran material dan pembentukan permukaan dengan grader.",
            gali: "Efisiensi ini terkait pekerjaan penggalian parit dengan grader, yang pola operasinya berbeda dari perataan jalan."
        }
    };
    const graderSpeedDescriptions = {
        jalan: "Rentang untuk perbaikan permukaan jalan dengan motor grader. Sesuaikan pilihan kecepatan dengan kondisi permukaan dan kendali alat.",
        tepi: "Rentang untuk penyelesaian tepi sungai atau saluran; pekerjaan menuntut kendali posisi blade pada tepi area kerja.",
        bentuk: "Rentang untuk membentuk profil permukaan. Pilih kecepatan yang sesuai pengendalian bentuk dan sebaran material.",
        parit: "Rentang untuk penggalian parit dengan grader. Pertimbangkan kendali blade dan kondisi tanah pada lintasan parit.",
        rata: "Rentang untuk perataan permukaan. Sesuaikan kecepatan dengan kebutuhan kerataan dan kondisi hamparan."
    };
    const compactorDescriptions = {
        speed: {
            vbesar: "Rentang kecepatan untuk kelompok vibrating roller besar pada tabel; pastikan pengelompokan sesuai jenis alat yang digunakan.",
            vkecil: "Rentang kecepatan untuk kelompok vibrating roller kecil pada tabel; jangan memakai rentang roller besar hanya karena sama-sama bergetar.",
            soil: "Rentang kecepatan untuk soil compactor. Pilih berdasarkan jenis alat dan kondisi pemadatan tanah di lapangan."
        },
        passes: {
            road: "Jumlah lintasan pada kelompok road roller. Kecukupan lintasan tetap diperiksa terhadap hasil kepadatan lapangan.",
            tire: "Jumlah lintasan untuk tire roller dengan roda karet; gunakan kelompok ini sesuai jenis pemadat, bukan roller drum baja.",
            vibratory: "Jumlah lintasan untuk vibrating roller atau soil compactor. Efek getaran dan kondisi material perlu dicocokkan dengan hasil pemadatan.",
            macadam: "Jumlah lintasan untuk macadam atau three wheel roller. Pilihan mengikuti kelompok pemadat tersebut pada tabel.",
            tandem: "Jumlah yang dipilih adalah total lintasan pemadatan awal dan akhir untuk tandem roller; jangan menambahkan lintasan awal lagi pada nilai total."
        }
    };
    for (const [type, list] of Object.entries(methods)) {
        for (const method of list) {
            for (const field of method.fields.filter(field => field.options)) {
                field.descriptions = Object.fromEntries(field.options.map(([key]) => {
                    let text;
                    if (field.id === "transmission") {
                        text = key === "dd"
                            ? "Transmisi Direct Drive menggunakan waktu tetap untuk perpindahan/transmisi dalam siklus dorong. Pilih sesuai transmisi bulldozer yang digunakan."
                            : "Transmisi Torque Converter menggunakan waktu tetap yang berbeda dari Direct Drive. Pilih sesuai transmisi bulldozer yang digunakan.";
                    } else if (method.id === "fill") text = fillDescriptions[type][key];
                    else if (method.id === "efficiency") text = efficiencyDescriptions[type][key];
                    else if (type === "excavator" && method.id === "cycle") {
                        const [capacity, soil, swing] = key.split("-").map(Number);
                        const soils = ["Material pasir, kerikil atau tanah lunak", "Tanah umum atau lempung", "Lempung keras atau tanah keras"];
                        const capacities = ["kelompok bucket kecil pada tabel", "kelompok bucket menengah pada tabel", "kelompok bucket besar pada tabel"];
                        text = soils[soil] + " dengan " + capacities[capacity] + "; " +
                            (swing === 0 ? "sudut putar pada kelompok yang lebih kecil." : "sudut putar pada kelompok yang lebih besar, sehingga lintasan putar lebih panjang.") +
                            " Pilih waktu dalam rentang baris ini sesuai siklus penggalian dan penumpahan aktual.";
                    } else if (type === "wheelloader" && method.id.startsWith("loader-")) {
                        const [condition, capacity] = key.split("-").map(Number);
                        const conditions = ["Pengambilan material mudah dan bucket relatif mudah terisi", "Pengambilan material memerlukan usaha sedang", "Pengambilan material lebih sulit dan pengisian bucket lebih terhambat", "Pengambilan material sulit dan pengisian bucket kurang optimal"];
                        text = conditions[condition] + ". Siklus ini khusus " +
                            (method.id === "loader-v" ? "pola V-loading" : "pola cross-loading") + ", " +
                            ["kelompok bucket terkecil", "kelompok bucket menengah", "kelompok bucket terbesar"][capacity] +
                            " pada tabel, untuk perjalanan pendek.";
                    } else if (type === "motorgrader") text = method.id === "speed"
                        ? graderSpeedDescriptions[key]
                        : "Lintasan perataan grader dihitung sebagai satu perjalanan kerja. Tentukan jumlah sesuai kebutuhan perataan dan metode lapangan, bukan jumlah lajur pekerjaan.";
                    else if (type === "compactor") text = compactorDescriptions[method.id][key];
                    return [key, text];
                }));
            }
        }
    }
    root.ProductivityReferenceData = { methods, documentName };
    if (typeof module !== "undefined") module.exports = { methods, documentName };
})(typeof window === "undefined" ? globalThis : window);
