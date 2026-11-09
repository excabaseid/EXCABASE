# EXCABASE Fleet Simulation — enam alat, aktivitas terpisah

Fitur opsional di dalam tahap **Simulasi Armada**; urutan enam tahapan proyek tidak berubah.

## Isolasi jenis alat dan diagnosis Canvas

Adapter visualisasi menormalisasi kapitalisasi, spasi, tanda hubung, dan garis bawah pada jenis alat tanpa mengubah snapshot sumber. Registry mengenali Excavator, Dump Truck, Bulldozer, Wheel Loader, Motor Grader, dan Compactor. Excavator/Wheel Loader adalah pemuat; Bulldozer mendorong tanah; Grader dan Compactor bekerja pada luas/petak/lintasan. Bila salah satu aktivitas memiliki Q/target yang valid, visualisasi dapat dibuka untuk melengkapi parameter operasional. Tanpa aktivitas valid, Canvas diganti pesan diagnostik. Jenis di luar registry tetap dijelaskan sebagai belum didukung.

Validasi fingerprint, identitas handoff, dan kesesuaian Estimasi tetap berlaku pada seluruh proyek. Data tidak lengkap tidak diubah menjadi jumlah, Q, volume, atau konversi satuan palsu. Jika Q/target alat tambahan tidak valid tetapi aktivitas lain valid, alat tersebut dijelaskan sebagai belum dapat dioperasikan. Geometri/siklus yang belum tersedia tetap berupa kolom wajib yang dapat diisi pengguna sebagai asumsi lokal.

Pengujian regresi mencakup pasangan standar, Bulldozer, Wheel Loader, keempat alat tambahan, alias nama, pasangan tidak lengkap, perpindahan ke skenario valid, kesamaan konfigurasi operasional, Canvas berisi piksel, Play, serta data proyek yang tetap identik. Runner: `powershell -ExecutionPolicy Bypass -File tests/fleet-visualization-browser.ps1` (Chrome headless dengan profil sementara).

### Pemeriksaan integrasi lanjutan

Pengujian juga membuka halaman Simulasi Armada asli, menghitung ketiga skenario, memilih masing-masing skenario, mengklik tautan, membaca snapshot hasil aplikasi, lalu menerapkan parameter dan menjalankan Canvas. Input proyek pengujian tetap fixture; snapshot proyek pengguna yang bermasalah belum tersedia. Kombinasi Excavator–Bulldozer–Dump Truck melalui produsen asli berjalan pada pengujian ini, sehingga akar masalah proyek pengguna belum dapat dinyatakan terverifikasi.

Tautan sekarang meminta snapshot baru dari hasil perhitungan yang sedang aktif pada saat diklik. `handoffId` mengikat tautan dengan snapshot tab tersebut; snapshot yang tertimpa akan menghasilkan pesan khusus, bukan dianggap sebagai pasangan alat yang hilang. Identitas ini hanya metadata transfer dan tidak mengubah rumus, jumlah unit, atau hasil proyek. Tautan lama tanpa penanda tetap didukung. Format resmi produsen tetap `scenarios[key].equipment[]` dengan properti `type`, `units`, `workVolume`, dan `workVolumeBasis`. Adapter tidak menebak jumlah dari properti alternatif atau mengarang baris yang hilang.

Untuk memeriksa proyek aktual: buka **Diagnostik integrasi data → Unduh diagnostik JSON** pada halaman visualisasi yang bermasalah. Alternatif konsol baca-saja: `JSON.stringify(ExcabaseFleetView.getDiagnostics(), null, 2)`. Laporan menunjukkan tahap gagal, kecocokan proyek/fingerprint/penanda transfer, struktur dan nama properti baris alat dari Estimasi, snapshot tiap skenario, dan hasil tersimpan. Nama/ID proyek, biaya, input produktivitas, serta fingerprint mentah tidak disertakan. Ekspor tidak menghapus atau menulis localStorage/sessionStorage. Pada snapshot tidak valid, nama skenario tetap terlihat, angka yang belum valid ditampilkan sebagai `—`, dan pesan meminta Hitung Semua Skenario lalu membuka ulang visualisasi. Laporan aktual diperlukan untuk membedakan data yang hilang, format berbeda, atau snapshot lama tanpa mengubah proyek pengguna.

## Membuka fitur

1. Buka Proyek Aktif → Simulasi Armada, dengan Estimasi yang masih sesuai Produktivitas.
2. Klik **Hitung Semua Skenario**, lalu pilih Dasar, Hemat, atau Cepat. Hasil tersimpan yang masih cocok juga dapat langsung digunakan.
3. Klik **Visualisasikan Armada**. Tidak perlu menyimpan skenario hanya untuk melihatnya; penyimpanan pilihan resmi ke Laporan tetap melalui tombol lama.
4. Jika kedua pemuat tersedia, pilih **Pemuat armada truk**: Excavator (awal) atau Wheel Loader. Pemuat lain siaga; target material yang sama tidak dijalankan sebagai pekerjaan tambahan.
5. Isi parameter yang belum tersedia: waktu bongkar/manuver **tanpa antrean**, siklus efektif pemuat/Bulldozer, atau lebar/lintasan/tebal petak Grader/Compactor. Sumber dan asumsi tercantum di bawah setiap input.
6. Klik **Terapkan & reset simulasi**, lalu **Play**. Pause mempertahankan waktu dan muatan; Reset hanya mengatur ulang model. 1× berarti satu detik kerja model per detik pemutaran. **Tampilan zona** hanya memfokuskan kamera; semua aktivitas lain tetap mengikuti jam simulasi.

Mengubah skenario di halaman visualisasi mengatur ulang konfigurasi dan meminta penerapan ulang. Perubahan parameter visualisasi tidak disimpan ke proyek dan hilang saat memuat ulang. Tautan kembali ke Simulasi dan menuju Analisis & Laporan tetap tersedia.

## Sumber data dan penyimpanan

| Informasi | Sumber |
| --- | --- |
| Nama, identitas, jam kerja | Proyek aktif melalui `getExcabaseActiveProject()` |
| Jumlah setiap alat, volume kerja | Hasil skenario yang dipilih, tanpa menghitung ulang hasil resmi |
| Bucket, fill factor, siklus, efisiensi, kapasitas bak | `project.results.productivityInputs[type].fields` |
| Input proyek lama | Fallback baca `excabase_productivity_<id>`, hanya jika input jenis alat belum terdapat di proyek |
| Komponen muat dan rasio perjalanan | Metadata `parameterHelp.truckCycleTime` yang masih cocok dan tidak ditimpa manual / berubah konteks |
| Rasio BCM/CCM ke LCM | `project.results.earthwork` |
| Waktu bongkar/manuver | Input tambahan pengguna; tidak diisi dengan angka proyek palsu |

Satu snapshot sementara dikirim melalui `sessionStorage.excabase_fleet_visualization_v1`. Snapshot memuat ID proyek, fingerprint data sumber, hasil skenario yang sudah dihitung, dan pilihan skenario. Ini bukan struktur hasil proyek baru. Jika snapshot tidak tersedia, halaman dapat membaca `results.fleet.scenarios` yang tersimpan dan tanda tangan Estimasinya cocok.

Visualisasi tidak memanggil `saveExcabaseProject()`. Perubahan proyek, Estimasi, Produktivitas, atau hasil skenario tersimpan akan membuat snapshot tidak berlaku; playback dihentikan dan pengguna diarahkan untuk membuka hasil terbaru. Proyek selesai dapat ditinjau tanpa membuka kunci atau mengubah hasilnya. Preferensi sidebar tetap ditangani kode sidebar yang sudah ada.

## Model deterministik

### Wheel Loader: bucket, loading, dan pemindahan pendek

- Q per unit dan jumlah unit dibaca dari hasil skenario. Target dan Q dinormalisasi bersama ke LCM dengan rasio aktual Pekerjaan Tanah, sehingga durasi acuannya tidak berubah. Tidak menganggap BCM/CCM = LCM.
- Siklus efektif awal = `loaderCycleTime / loaderEfficiency` dari input produktivitas bila tersedia. Jika tidak, pengguna wajib memasukkan asumsi siklus efektif. Payload acuan = `Q efektif × siklus efektif / 3600`; tidak mengalikan efisiensi lagi. Jika input asli konsisten, payload ini sama dengan bucket × fill factor. Jika pengguna mengganti siklus, payload menjadi kalibrasi Q, bukan klaim kapasitas bucket fisik.
- Fase visual adalah **10% mendekati material, 15% mengambil, 10% mengangkat, 20% membawa ke tujuan, 10% dumping, 35% kembali**. Ini adalah asumsi animasi, bukan geometri atau kecepatan lapangan.
- Reservasi bersama membatasi tanah yang dapat diambil. Pada akhir mengambil, material berpindah ke bucket; pada akhir dumping, bucket berpindah ke bak truk. Truk tidak dapat terisi sebelum dumping. Kapasitas truk membatasi bucket terakhir, dan volume terakhir boleh parsial. FIFO: satu truk dilayani satu loader, tanpa menggabungkan dua pemuat ke truk yang sama.
- Dengan truk, loader menahan/melayani truk sampai penuh atau target habis, lalu truk mengangkut, membongkar, dan kembali. Saat menunggu truk Q aktual dapat lebih rendah dari Q acuan. **Diambil = bucket loader + muatan truk + volume disposal**. Volume loading tidak ditambahkan lagi ke disposal.
- Tanpa truk, bucket ditumpahkan ke stockpile tujuan pada zona yang sama sebagai pekerjaan pemindahan pendek; volume ini tidak disebut volume angkut/disposal truk. Panjang perjalanan visual tetap ilustratif, bukan jarak survei.
- Jika Excavator dan Wheel Loader tersedia bersama truk, pemilihan sumber pemuat menentukan satu engine loading/hauling yang aktif. Pemuat lain terlihat siaga. Pilihan awal tetap Excavator jika targetnya cocok; bila hanya target Wheel Loader yang cocok dengan truk, adapter memilih loader. Validasi volume pemuat yang tidak aktif tidak menghalangi pasangan loader–truk yang valid. Pilihan eksplisit terhadap pasangan yang tidak cocok tetap ditolak dengan pesan. Belum ada model campuran beberapa sumber pemuat/pool truk atau pekerjaan loader tambahan dengan target terpisah dalam satu skenario.

### Motor Grader dan Compactor: luas, lapisan, dan pass

- Rumus proyek tidak diubah. EXCABASE saat ini menghitung `areaHourly = lebar × kecepatan × 1000 × efisiensi / lintasan`, kemudian `hourly = areaHourly × tebal`. Untuk snapshot volume, adapter menggunakan **luas target = volume / tebal**, **Q luas = Q volume / tebal**. Tebal yang kosong wajib dilengkapi, bukan ditebak.
- Snapshot yang memang berbasis `m2`/`m²` langsung memakai Q m²/jam dan target m². Tidak dikonversi seolah-olah merupakan m³. Tanpa model lapisan volume ekuivalen tidak ditampilkan.
- Grader memakai basis volume pekerjaan aslinya. Compactor memakai **CCM**. Jika sumber Compactor berupa BCM/LCM, volume dan Q keduanya dikonversi memakai rasio earthwork aktual ke CCM; tanpa rasio yang valid aktivitas ditolak dengan alasan yang jelas. Tebal Compactor adalah tebal akhir lapisan padat.
- Lebar efektif (setelah overlap), jumlah pass, dan tebal diambil dari input masing-masing alat. Jika tidak ada, menjadi parameter tambahan wajib. Panjang petak awal **20 m** adalah asumsi yang dapat diubah. Kecepatan dan efisiensi sumber ditampilkan sebagai konteks; Q skenario tetap menjadi acuan, tidak dihitung ulang atau dikalikan faktor yang sama dua kali.
- Petak maksimum = lebar efektif × panjang, dibatasi sisa luas yang belum ditugaskan. Setiap unit mendapat petak tersendiri dan mengerjakan seluruh N pass sebelum luas petak itu dinyatakan selesai. Akumulasi luas-lintasan adalah luas petak × pass yang telah dilalui. Penghitung pass mencatat perjalanan selesai, bukan jumlah petak.
- Durasi per pass = `luas petak / Q luas × 3600 / N`. N telah tercakup dalam Q, sehingga tidak memperlambat Q untuk kedua kalinya. Fase visual setiap pass **10% masuk, 80% bekerja, 10% berputar/kembali**. Perubahan lebar/panjang/pass lokal mengubah pembagian petak/lintasan berdasarkan Q acuan, bukan menghitung ulang laju fisik dari kecepatan kendaraan. Ini kalibrasi produktivitas, bukan simulator kinematika terukur.
- Permukaan grading bertahap menjadi lebih rata; permukaan pemadatan berubah sesuai cakupan pass. **Progres area selesai**, **cakupan luas-lintasan**, **jumlah perjalanan pass**, dan **volume ekuivalen area selesai × tebal** dilaporkan terpisah. Satu pass tidak menyelesaikan petak yang memerlukan beberapa pass.
- Compactor tidak mengukur kadar air, energi getaran, hasil uji kepadatan, atau derajat pemadatan. `densityCertified: false` pada snapshot menegaskan bahwa jumlah lintasan animasi **bukan bukti kepadatan teknis tercapai**.

### Batas hubungan antarpekerjaan

Stockpile/loading, grading, pemadatan, galian/disposal, dan dorong memiliki zona terpisah. Tidak ada penjumlahan Q berbeda satuan atau volume aktivitas ke satu total proyek. Grading dan pemadatan tidak otomatis menerima material hasil truk atau menunggu Bulldozer/Grader menyelesaikan zona yang sama. Urutan pasokan antar-tahap dan lokasi yang sama belum dimodelkan. Jam gabungan berhenti setelah semua aktivitas aktif selesai; ini bukan pengganti durasi resmi proyek.

### Bulldozer mandiri

- Jumlah unit, target volume/basis, dan `productivityPerUnit` dibaca dari hasil skenario Dasar/Hemat/Cepat. Jika adapter menerima baris Estimasi langsung, `hourlyProductivity` menjadi sumber Q. Tidak menggunakan total produktivitas semua alat. Volume Bulldozer tetap pada basis pekerjaan aslinya (BCM/LCM/CCM), terpisah dari volume angkut LCM.
- Rumus Produktivitas EXCABASE tetap `Q = dozerCapacity × dozerFillFactor × 3600 × dozerEfficiency / dozerCycleTime`. Modul visualisasi tidak mengubah atau menghitung ulang hasil resmi.
- Jika `dozerCycleTime` dan `dozerEfficiency` tersedia, siklus efektif awal = siklus proyek ÷ efisiensi. Jika tidak, kolom kosong dan wajib diisi pengguna sebagai asumsi tambahan. Q efektif skenario menjadi acuan tetap; volume acuan per unit per siklus = `Q × siklus efektif / 3600`. Efisiensi tidak dikalikan lagi. Volume ini merupakan kalibrasi produktivitas, bukan klaim kapasitas blade fisik ketika pengguna mengubah asumsi siklus.
- Pembagian fase awal **10% maju, 50% dorong, 30% mundur, 10% jeda** adalah asumsi animasi yang dilabeli dan dapat disesuaikan. Tiga bagian pertama harus positif dengan jumlah di bawah 100%; sisanya menjadi jeda. Posisi/jarak tetap ilustratif, tanpa klaim kecepatan atau jarak lapangan.
- Pada awal siklus, unit mencadangkan paling banyak volume acuan dan sisa target yang belum dicadangkan. Volume selesai bertambah sekali di akhir dorong. Material yang sedang dikerjakan termasuk sisa target, bukan tambahan volume. Siklus terakhir boleh parsial, dengan waktu siklus penuh sampai mundur/jeda selesai. Karena diskretisasi ini, waktu akhir dapat dibulatkan ke siklus terakhir; laju acuan armada adalah `jumlah unit × Q`, bukan produktivitas baru hasil animasi.
- Semua Bulldozer mulai bersama pada lajur terpisah. Target dibagi melalui cadangan bersama; jumlah unit memengaruhi laju secara logis dan target tidak dilampaui. Tidak ada tabrakan, interaksi blade, atau gangguan antarunit yang dimodelkan.

### Kombinasi aktivitas

| Alat skenario | Aktivitas visualisasi |
| --- | --- |
| Excavator + Dump Truck | Antrean muat, angkut, bongkar, kembali |
| Bulldozer | Maju, dorong, mundur, jeda |
| Bulldozer + Dump Truck | Bulldozer bekerja; truk tetap siaga dengan penjelasan tidak ada pemuat |
| Excavator + Bulldozer + Dump Truck | Kedua aktivitas berjalan pada satu jam simulasi, dengan target dan progres terpisah |
| Wheel Loader tanpa truk | Pemindahan pendek stockpile → area tujuan |
| Wheel Loader + Dump Truck | Bucket → truk → disposal; target pemuat dan truk harus cocok |
| Motor Grader | Grading luas/petak dengan jumlah lintasan yang ditentukan |
| Compactor | Pemadatan luas/petak, pass, dan volume CCM terpisah |
| Enam alat | Pemuat dipilih untuk armada truk; dorong, grading, dan pemadatan berjalan di zona terpisah |

Bulldozer **tidak memuat Dump Truck**. Dorong tanah dan pengangkutan tidak dijumlahkan ke satu volume, satu produktivitas, atau satu persentase penyelesaian proyek. Pada kombinasi Excavator–Bulldozer–Dump Truck, kedua aktivitas dianggap pekerjaan terpisah tanpa ketergantungan urutan; belum menjadi model Bulldozer memasok Excavator atau meratakan setiap muatan di disposal. Jika proyek memerlukan pekerjaan berurutan, visualisasi ini tidak memprediksi durasi gabungannya. Jam simulasi berhenti ketika seluruh aktivitas aktif selesai dan alat kembali siaga; waktu masing-masing aktivitas tetap tersedia pada snapshot.

Jika data Bulldozer tidak valid tetapi pasangan angkut valid, pekerjaan angkut tetap berjalan dan Bulldozer dijelaskan sebagai belum dapat dioperasikan. Jika tidak ada aktivitas yang dapat dijalankan, tampilkan diagnostik dan jangan mengarang Q, jumlah, volume, atau mekanisme pemuatan. Kontrol Play/Pause/Reset/1×–10× berlaku pada jam kedua aktivitas; perubahan kecepatan tidak mengubah konfigurasi/Q.

### Penggalian dan pengangkutan

- Satuan internal: **m³ LCM** dan **detik kerja**. Volume Excavator dan Dump Truck harus cocok setelah konversi. Rasio konversi tidak diasumsikan jika hasil Pekerjaan Tanah belum tersedia.
- Satu Excavator melayani satu Dump Truck. Antrean FIFO bersama; beberapa Excavator dapat bekerja bersamaan. Semua unit Excavator dan Dump Truck pada skenario menjadi aktor model dan dirender, bukan sampel dekoratif.
- Muatan per bucket = kapasitas bucket × fill factor, dibatasi sisa kapasitas truk dan tanah yang belum digali. Bucket dan truk terakhir boleh bermuatan parsial.
- Waktu satu bucket = siklus Excavator ÷ efisiensi Excavator. Scoop terakhir tetap membutuhkan satu siklus penuh, walaupun parsial.
- Truk penuh / muatan terakhir → perjalanan bermuatan → bongkar → perjalanan kosong → antrean. Setiap durasi perjalanan dan bongkar dibagi efisiensi truk **sekali**. Waktu pemuatan tetap ditentukan Excavator; tidak dikalikan efisiensi truk lagi.
- Volume digali adalah total muatan yang sudah masuk armada. Volume dipindahkan bertambah **hanya saat bongkar selesai**. `digali = dibongkar + jumlah semua muatan truk`. Sisa pekerjaan = target − dibongkar, termasuk material yang masih di armada.
- Selesai berarti target telah dibongkar dan truk terakhir sudah kembali. Waktu merupakan waktu kerja kontinu; hari ekuivalen = waktu / jam kerja harian.

### Menghindari hitung ganda siklus Dump Truck

Kalkulator EXCABASE menyimpan `truckCycleTime` sebagai waktu siklus **total** (menit), bukan waktu tempuh saja. Bantuan siklus yang sudah ada juga mencakup waktu muat dan komponen bongkar/manuver/antrean.

Mode **total** menghitung:

```text
perjalanan total = siklus TOTAL − muat acuan − antrean acuan − bongkar/manuver
perjalanan bermuatan = perjalanan total × persentase bermuatan
perjalanan kosong = sisanya
```

Setelah komponen lama dikeluarkan, model menghitung muat dan antrean aktual berdasarkan interaksi unit. Sisa perjalanan harus positif. Referensi muat dari metadata digunakan jika tersedia; jika tidak, nilai awal diturunkan dari `ceil(kapasitas bak / muatan bucket) × siklus Excavator` tanpa efisiensi. Nilai ini diberi label turunan dan dapat diperbaiki pengguna bila definisi waktu muat sumber berbeda. Tombol bantu memungkinkan menghitungnya lagi setelah parameter bucket berubah.

Asumsi awal yang ditampilkan secara eksplisit: antrean acuan **0 menit**, rasio perjalanan **50:50** jika komponennya tidak tersedia. Pengguna harus mengoreksi antrean lama bila sudah tercakup dalam siklus total. Waktu bongkar tidak ditebak. Mode **rincian perjalanan** mengabaikan siklus total/muat/antrean acuan dan memakai waktu perjalanan yang dimasukkan langsung.

Model interaksi ini sengaja tidak dipaksa menghasilkan durasi yang sama dengan perhitungan produktivitas independen tiap alat. Biaya dan durasi skenario resmi tidak diubah.

## Rendering dan batasan

- Canvas 2D dengan proyeksi isometrik konsisten, balok alat bertingkat, boom Excavator berartikulasi, bak truk terangkat saat bongkar, jalan angkut, galian, dan tumpukan disposal mengikuti progres material.
- Posisi sepanjang jalan mengikuti proporsi waktu pada state engine. Panjang jalan visual tidak menyatakan jarak survei atau kecepatan fisik. Tidak ada klaim simulasi geometri jalan lapangan.
- Latar dirender ke canvas cache; layar dibatasi 30 fps, 15 fps di atas 120 unit, 8 fps di atas 500 unit. DPR dibatasi 2, atau 1 pada armada besar. Ketika dijeda tidak ada loop render; tab tersembunyi otomatis dijeda.
- Maksimal 2.000 aktor gabungan. Konfigurasi lebih besar ditolak dengan pesan, tidak dipotong diam-diam. Banyak unit diperkecil agar seluruh armada tetap tampak.
- Keenam jenis alat dikenali. Pemuat dipilih untuk satu armada truk; aktivitas lainnya mempunyai engine dan buku progres sendiri. Fokus kamera per zona membantu membaca alat di layar sempit tanpa mengubah waktu/konfigurasi.
- Belum memodelkan pergantian shift, kerusakan, batas berat payload, variasi material/cuaca, lalu lintas, tabrakan, kecepatan berdasarkan gradien jalan, atau beberapa material/disposal.
- Halaman memakai sidebar, logo, dan metallic background bersama. Glass terbatas pada panel informasi dengan fallback solid; blur panel dinonaktifkan pada layar kecil.

## Berkas

- `pages/fleet-visualization.html`: halaman visualisasi dalam tahap Simulasi.
- `css/fleet-visualization.css`: tata letak, kontrol, dan panel khusus fitur.
- `js/fleet-visualization-engine.js`: model murni, antrean event, konservasi volume.
- `js/fleet-visualization-bulldozer.js`: engine dorong mandiri; orkestrasi sekarang dipisah ke modul fleet.
- `js/fleet-visualization-loader.js`: reservasi bucket, loading truk, pemindahan pendek, dan konservasi material.
- `js/fleet-visualization-passes.js`: scheduler petak/lintasan yang dibagikan tanpa menyamakan satuan aktivitas.
- `js/fleet-visualization-grader.js`, `js/fleet-visualization-compactor.js`: model/validasi masing-masing alat.
- `js/fleet-visualization-fleet.js`: orkestrator satu jam; engine asli Excavator–Dump Truck tetap digunakan tanpa perubahan rumus.
- `js/fleet-visualization-operations-data.js`: adapter tambahan, pilihan pemuat, normalisasi Q/target dan geometri.
- `js/fleet-visualization-operations-scene.js`: zona, kamera, dan mesh tiga alat baru.
- `js/fleet-visualization-operations-ui.js`: parameter/progres lokal per aktivitas.
- `js/fleet-visualization-data.js`: adapter satuan, sumber parameter, validasi snapshot, pemisahan siklus.
- `js/fleet-visualization-renderer.js`: renderer Canvas; hanya membaca model.
- `js/fleet-visualization.js`: form, kontrol, panel, dan pengaturan frame.
- `js/fleet-visualization-link.js`: handoff tab lokal dari tahap Simulasi.
- `pages/simulasi-armada.html` dan `js/fleet-simulation.js`: penambahan tautan dan event snapshot; rumus lama tetap sama.

## Pengujian

Windows dengan Chrome terpasang, tanpa Node/npm:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tests/fleet-visualization-browser.ps1 -CapturePreviews
```

`ExecutionPolicy Bypass` hanya berlaku bagi proses pengujian tersebut. Runner membuat profil Chrome terpisah di folder temporer, menjalankan audit dengan waktu browser nyata melalui DevTools, menyimpan `result.json` dan screenshot 390/1366 px, lalu menghentikan browser milik runner. Folder artefak ditampilkan pada output. Tidak memakai profil Chrome pengguna.

Audit mencakup mass balance, muatan parsial, determinisme antar-langkah waktu, antrean dan pengaruh jumlah unit, validasi input, tiga skenario dan perubahan konfigurasi, penyimpanan skenario resmi, Play/Pause/Reset/kecepatan, perubahan Canvas nyata, progres, ketahanan data lama/stale, proyek selesai, laporan, dan lebar 360/390/768/1366/1920 px. Skrip `tests/fleet-visualization-tests.js` dan halaman runner HTML juga tersedia; **jangan menjalankan fixture pada origin/profil yang berisi data produksi**. Harness memulihkan kunci storage setelah selesai, tetapi profil terpisah tetap menjadi cara yang dianjurkan.

`tests/fleet-bulldozer-tests.js` menambahkan konservasi cadangan/volume dorong, fase siklus, siklus parsial, determinisme, pengaruh jumlah unit, independensi model gabungan, serta keempat kombinasi melalui halaman Simulasi asli untuk Dasar/Hemat/Cepat. Memeriksa Canvas berubah, truk tanpa pemuat tetap siaga, asumsi siklus yang hilang, batas volume, Pause/Reset, kecepatan, dan data proyek tetap identik. Input tes adalah fixture; data aktual proyek **TES 2** tidak tersedia di workspace. Runner memantau exception JavaScript melalui DevTools, termasuk error saat skrip dimuat.

Pengujian browser Chromium tidak membuktikan performa smartphone fisik atau kompatibilitas Safari/Firefox. Uji perangkat fisik dan data proyek lapangan tetap diperlukan sebelum menjadikan model sebagai alat perencanaan operasional.

### Pengembangan tiga tahap

Regresi Chrome dijalankan setelah masing-masing tahap: A Wheel Loader **14.579 assertion**, B Motor Grader **14.733 assertion**, C Compactor **15.228 assertion**. Semua tahap ini lulus tanpa exception JavaScript. `tests/fleet-operations-tests.js` mempertahankan uji tahap sebelumnya dan menambahkan kombinasi tunggal, dua alat, tiga alat, tanpa Excavator, serta enam alat melalui produsen snapshot halaman Simulasi Armada asli. Target, Q, satuan, payload, lintasan, Pause/Reset/kecepatan, dan storage proyek diperiksa. Uji lanjutan kamera/validasi serta screenshot tersedia melalui runner `-CapturePreviews`.

Verifikasi akhir dengan `-CapturePreviews`: **15.254 assertion lulus**, `browserExceptions: []`. Tiga alat baru mencakup **39 alur integrasi skenario** (9 loader, 18 grading termasuk sumber m²/volume, 12 compactor/kombinasi), ditambah seluruh regresi lama dan uji model murni. Pemeriksaan meliputi pemilihan pemuat alternatif saat volume Excavator berbeda, kamera yang tidak mengubah konfigurasi, geometri yang hilang tidak diisi palsu, serta konversi CCM yang tidak diasumsikan. Screenshot seluruh zona dan fokus alat ditinjau pada 390/1366 px; ini pengujian viewport browser, bukan perangkat smartphone fisik.

Seluruh perubahan implementasi berada pada modul Fleet Visualization, halaman/CSS-nya, tes, dan dokumentasi ini. `js/fleet-simulation.js`, `js/productivity-calculator.js`, `js/main.js`, dan penyimpanan proyek tidak diubah dalam pengembangan tiga alat ini. Kunci handoff sessionStorage yang sudah ada dipertahankan; tidak ada kunci hasil proyek baru atau reset data pengguna.

Input proyek pengujian adalah fixture pada profil Chrome sementara. Snapshot proyek pengguna tidak tersedia dalam workspace, sehingga hasil tersebut tidak dinyatakan sebagai pengujian data proyek aktual. Tidak ada commit, push, atau deployment otomatis dari workflow pengembangan ini.
