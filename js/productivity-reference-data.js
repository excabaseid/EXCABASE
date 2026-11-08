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
    // Keep existing option IDs so saved assistance inputs remain readable.
    const excavatorEfficiency = [["baik", "Baik — 0,83", .83], ["sedang", "Sedang — 0,75", .75],
        ["kurang", "Agak kurang — 0,67", .67], ["buruk", "Kurang — 0,58", .58]];
    // A.15: nominal blade length, effective width at 60°, effective width at 45° (m).
    const graderWidths = [[2.2,1.9,1.6],[2.5,2.2,1.8],[2.8,2.4,2],[3.05,2.6,2.2],
        [3.1,2.7,2.2],[3.4,2.9,2.4],[3.7,3.2,2.6],[4,3.5,2.8],[4.3,3.7,3],[4.9,4.2,3.5]];
    const compactorOverlaps = [["road","Road roller",.2],["tire","Tire roller",.15],
        ["vbesar","Vibrating roller besar",.2],["vkecil","Vibrating roller kecil",.1],
        ["soil","Soil compactor (lebar roda drive)",.2],["macadam","Macadam / three wheel roller",.2],
        ["tandem","Tandem roller",.15]];
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
    const truckSpeedGuide = {
        source:source(25,"Tabel A.9 — Kecepatan Tempuh Rata-rata Maksimum Dump Truck"), unit:"km/jam", kind:"maximum",
        note:"Tabel A.9 memberikan maksimum perkiraan umum, bukan rentang minimum–maksimum. Pilih kecepatan positif tidak melebihi maksimum menurut medan, jalan, cuaca, dan kondisi kendaraan. Medan isi dan kembali harus dipertimbangkan masing-masing; pilih kondisi untuk setiap arah perjalanan. Bukan kecepatan yang otomatis tercapai.",
        rows:[["datar","Datar",null,40,null,60],["menanjak","Menanjak",null,20,null,40],["menurun","Menurun",null,20,null,40]]
    };
    const loaderSpeedGuide = {
        source:source(42,"Tabel A.23 — Kecepatan Laju Wheel Loader"), unit:"km/jam", kind:"range",
        note:"Pilih sendiri nilai dalam rentang berdasarkan kondisi lintasan; tidak mengambil nilai tengah otomatis. Baik: permukaan keras/rata tanpa rintangan. Sedang: sedikit tidak rata dan ada 1–2 alat lain. Agak sulit: tidak rata dan banyak rintangan. Sulit: banyak gundukan dan alat lain bekerja.",
        rows:[["baik","Baik",10,23,12,24],["sedang","Sedang",10,18,11,19],["agak","Agak sulit",10,15,10,16],["sulit","Sulit",9,12,9,14]]
    };
    const methods = {
        excavator: [
            range("fill", "Pilih bucket fill factor", "fillFactor", "", source(28,"Tabel A.10"),
                [["mudah","Mudah: 1,10–1,20",1.1,1.2],["sedang","Sedang: 1,00–1,10",1,1.1],
                    ["agak","Agak sulit: 0,90–1,00",.9,1],["sulit","Sulit: 0,80–0,90",.8,.9]],
                "Rentang bukan angka tunggal. Pilih berdasarkan kondisi material. Rumus utama belum menerapkan koreksi kedalaman/dumping Fv secara eksplisit dan menggunakan asumsi Fv = 1 (Tabel A.12, halaman PDF 29)."),
            range("cycle", "Pilih waktu siklus standar", "cycleTime", "detik", source(29,"Tabel A.11"), cycleRows,
                "Rentang bergantung bucket, tanah dan swing. Batas kelas yang bersinggungan dipilih secara eksplisit; tidak mengambil rata-rata otomatis. Contoh numerik excavator dalam dokumen tidak konsisten dengan uraian parameternya."),
            fixed("efficiency", source(30,"Tabel A.13"), excavatorEfficiency)
        ],
        dumptruck: [
            {id:"loading",title:"Estimasi waktu muat dari produktivitas alat pemuat",target:"truckLoadingTime",targetHelper:"cycle",unit:"menit",kind:"truck-loading",
                source:source(22,"Waktu muat dari produktivitas alat pemuat; contoh Excavator PDF 22 dan Wheel Loader PDF 25"),
                fields:[number("loadVolume","Volume muatan lepas","m³ LCM"),number("loaderProductivity","Produktivitas efektif alat pemuat","m³ LCM/jam")],
                note:"Waktu muat = 60 × volume muatan LCM / produktivitas efektif alat pemuat LCM per jam. Bentuk volume setara dengan kapasitas ton dibagi berat isi lepas pada referensi PDF 22 dan 25. Gunakan volume muatan yang dapat diangkut sesuai batas payload, bukan otomatis seluruh bak. Produktivitas alat pemuat diisi pengguna; tidak diambil otomatis dari kalkulator lain. Hindari menghitung hambatan yang sama kembali sebagai antrean/efisiensi. Hasil hanya mengisi komponen waktu muat pada bantuan siklus, bukan waktu siklus total."},
            { id:"cycle", title:"Hitung siklus angkut", target:"truckCycleTime", unit:"menit", kind:"truck-cycle",
                speedGuide:truckSpeedGuide,
                source:source(22,"Bagian Dump Truck; persamaan (27), keterangan berlanjut pada halaman PDF 23; lihat juga persamaan (15), halaman PDF 9"),
                fields:[...travelFields,number("loading","Waktu muat (estimasi atau pengamatan)","menit"),number("other","Bongkar, manuver dan antrean","menit",0,false)],
                note:"Ts = waktu muat + 60L/vF + 60L/vR + waktu lain; L dikonversi m ke km. Untuk rencana, jelaskan dasar asumsi waktu lain; untuk aktual, gunakan pengamatan. Contoh dokumen 2,0 menit berbeda dari rentang waktu pasti 1,25–1,65 menit. Jangan hitung antrean dua kali." },
            fixed("truckEfficiency",source(24,"Tabel A.8"),[["baik","Baik — 0,83",.83],["sedang","Sedang — 0,80",.8],["kurang","Kurang baik — 0,75",.75],["buruk","Buruk — 0,70",.7]])
        ],
        wheelloader: [
            range("fill","Pilih bucket fill factor","loaderFillFactor","",source(39,"Tabel A.17 (kolom Wheel Loader)"),
                [["mudah","Mudah: 1,00–1,10",1,1.1],["sedang","Sedang: 0,85–0,95",.85,.95],["agak","Agak sulit: 0,80–0,85",.8,.85],["sulit","Sulit: 0,75–0,80",.75,.8]],
                "Kondisi penumpahan dijelaskan pada Tabel A.18, halaman PDF 40. Data track loader tidak digunakan."),
            ...loaderMethods,
            {id:"travel-cycle",title:"Hitung siklus perjalanan jauh",target:"loaderCycleTime",unit:"detik",kind:"loader-cycle",
                speedGuide:loaderSpeedGuide,
                source:source(42,"Persamaan (30e); Tabel A.23 untuk panduan kecepatan"),
                fields:[...travelFields,number("fixed","Waktu tetap Z","menit")],
                note:"Ts = L/vF + L/vR + Z setelah kecepatan menjadi m/menit; hasil menit dikali 60. Z referensi 0,60–0,75 menit atau hasil pengukuran. Isi kecepatan asumsi rencana yang dijelaskan atau hasil pengamatan; tidak menyalin contoh yang satuannya tidak konsisten."},
            fixed("loaderEfficiency",source(43,"Tabel A.24"),[["baik","Baik — 0,83",.83],["sedang","Sedang — 0,80",.8],["agak","Agak buruk — 0,75",.75],["buruk","Buruk — 0,70",.7]])
        ],
        motorgrader: [
            {id:"effective-width",title:"Pilih lebar efektif blade (Tabel A.15)",target:"graderWidth",unit:"m",kind:"grader-width",
                source:source(35,"Tabel A.15"), widths:graderWidths,
                fields:[choice("nominal","Panjang blade nominal (m)",graderWidths.map(row=>[String(row[0]),String(row[0])])),
                    choice("angle","Sudut blade",[["60","60°"],["45","45°"]])],
                note:"Lebar efektif diambil persis dari Tabel A.15 sesuai panjang nominal dan sudut 45° atau 60°. Tanpa interpolasi; panjang di luar tabel memakai input lebar efektif manual. Overlap antar lajur dan waktu manuver belum dimodelkan eksplisit dalam rumus utama."},
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
                "Tabel mencetak beberapa rentang dalam urutan menurun; rentang ditampilkan menaik. Rumus utama belum menerapkan faktor kemiringan Fm secara eksplisit dan menggunakan asumsi Fm = 1 (datar, 0%)."),
            {id:"cycle",title:"Hitung siklus dorong",target:"dozerCycleTime",unit:"detik",kind:"dozer-cycle",source:source(16,"Keterangan persamaan (23a–b)"),
                fields:[...travelFields,choice("transmission","Transmisi",[["dd","Direct Drive: Z 0,10 menit"],["tc","Torque Converter: Z 0,05 menit"]])],
                note:"Ts = perjalanan maju + mundur + Z. Jarak meter dikonversi ke kilometer sebelum dibagi km/jam; hasil menit dikali 60. Normalisasi satuan diperlukan pada rumus tercetak. Rumus utama menggunakan asumsi Fm = 1 (datar, 0%); faktor kemiringan belum diterapkan secara eksplisit."},
            fixed("dozerEfficiency",source(17,"Tabel A.6"),standardEfficiency)
        ],
        compactor: [
            {id:"effective-width",title:"Hitung lebar efektif pemadatan",target:"compactorWidth",unit:"m",kind:"compactor-width",
                source:source(47,"Tabel A.25"), overlaps:compactorOverlaps,
                fields:[choice("roller","Jenis alat pemadat",compactorOverlaps.map(row=>[row[0],row[1]])),
                    number("nominal","Lebar roda total / drum; khusus soil compactor: roda drive","m")],
                note:"be = b − overlap sesuai jenis alat pada Tabel A.25. Pilih jenis alat secara eksplisit, bukan dari merek. Jika jenis atau lebar acuannya belum pasti, isi lebar efektif secara manual pada input utama. Tebal lapisan menggunakan tebal akhir setelah pemadatan; hasil berbasis CCM."},
            range("speed","Pilih kecepatan pemadatan","compactorSpeed","km/jam",source(47,"Tabel A.25"),
                [["vbesar","Vibrating roller besar: 1,5–4",1.5,4],["vkecil","Vibrating roller kecil: 1–3",1,3],["soil","Soil compactor: 4–10",4,10]],
                "Pilih jenis pemadat sesuai alat, bukan hanya nama merek. Nilai aktual tetap harus sesuai kondisi lapangan."),
            range("passes","Pilih jumlah lintasan","compactorPasses","lintasan",source(47,"Tabel A.25"),
                [["road","Road roller: 3–5",3,5],["tire","Tire roller: 4–8",4,8],["vibratory","Vibrating roller / soil compactor: 4–12",4,12],["macadam","Macadam roller: 6–8",6,8],["tandem","Tandem: 2 awal + 4–8 akhir (total 6–10)",6,10]],
                "Bilangan bulat. Jumlah aktual harus dibuktikan dengan hasil pemadatan. Tebal akhir rencana perlu diverifikasi di lapangan; Tabel A.26 halaman PDF 48 memberi batas maksimum, bukan tebal otomatis. Gunakan lebar efektif setelah overlap pada rumus utama.")
        ]
    };
    // Practical explanations of the table context, not quotations or new selection rules.
    for (const method of methods.excavator) {
        if (!method.note.includes("Fv = 1")) method.note += " Rumus utama belum menerapkan koreksi kedalaman/dumping Fv secara eksplisit; asumsi Fv = 1 (Tabel A.12, halaman PDF 29).";
    }
    for (const method of methods.bulldozer) {
        if (!method.note.includes("Fm = 1")) method.note += " Rumus utama belum menerapkan faktor kemiringan Fm secara eksplisit; asumsi Fm = 1 (datar, 0%).";
    }
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
            buruk: "Kondisi operasi kurang pada Tabel A.13 menggunakan efisiensi 0,58; sesuaikan dengan hambatan penggalian dan penumpahan."
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
                    if (method.kind === "grader-width") {
                        text = field.id === "angle"
                            ? "Sudut blade " + key + "° memakai kolom yang bersesuaian pada Tabel A.15; bukan panjang blade nominal."
                            : "Panjang blade nominal " + key + " m pada Tabel A.15. Cocokkan dengan spesifikasi alat; nilai di luar tabel diisi manual tanpa interpolasi.";
                    } else if (method.kind === "compactor-width") {
                        const row = compactorOverlaps.find(row=>row[0]===key);
                        text = row[1] + " menggunakan overlap " + row[2] + " m pada Tabel A.25. Pastikan lebar acuan sesuai jenis roda alat.";
                    } else if (field.id === "transmission") {
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
