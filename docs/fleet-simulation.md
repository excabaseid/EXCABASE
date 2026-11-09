# EXCABASE Fleet Simulation — pengangkutan dan dorong tanah

Fitur opsional di dalam tahap **Simulasi Armada**; urutan enam tahapan proyek tidak berubah.

## Isolasi jenis alat dan diagnosis Canvas

Adapter visualisasi menormalisasi kapitalisasi, spasi, tanda hubung, dan garis bawah pada jenis alat tanpa mengubah snapshot sumber. Registry kapabilitas mengenali Excavator/Dump Truck serta Bulldozer. Wheel Loader, Motor Grader, Compactor, dan jenis tidak dikenal belum dioperasikan. Excavator–Dump Truck menjalankan penggalian/pengangkutan; Bulldozer menjalankan aktivitas dorong mandiri. Bila salah satu aktivitas valid, visualisasi dapat dibuka. Tanpa aktivitas valid, Canvas diganti pesan yang menjelaskan data yang kurang. Pemilihan skenario valid memulihkan tampilan.

Regresi browser sebelum perbaikan: kombinasi alat tambahan dengan ID standar tetap menggambar dan berjalan untuk Dasar/Hemat/Cepat. Kegagalan yang dapat direproduksi adalah snapshot dengan nama tampilan `Excavator` / `Dump Truck`: pencarian jenis secara persis gagal, adapter melempar error pasangan sebelum `renderer.setContext()`, sehingga Canvas belum digambar. Belum ada bukti bahwa penambahan Bulldozer dengan ID standar sendiri memicu kegagalan. Snapshot proyek yang mengalami masalah diperlukan jika gejala tersebut masih muncul. Validasi fingerprint dan kesesuaian Estimasi tetap berlaku pada seluruh proyek; perbaikan ini tidak melewati validasi data kedaluwarsa.

Pengujian regresi mencakup pasangan standar, Bulldozer, Wheel Loader, keempat alat tambahan, alias nama, pasangan tidak lengkap, perpindahan ke skenario valid, kesamaan konfigurasi operasional, Canvas berisi piksel, Play, serta data proyek yang tetap identik. Runner: `powershell -ExecutionPolicy Bypass -File tests/fleet-visualization-browser.ps1` (Chrome headless dengan profil sementara).

### Pemeriksaan integrasi lanjutan

Pengujian juga membuka halaman Simulasi Armada asli, menghitung ketiga skenario, memilih masing-masing skenario, mengklik tautan, membaca snapshot hasil aplikasi, lalu menerapkan parameter dan menjalankan Canvas. Input proyek pengujian tetap fixture; snapshot proyek pengguna yang bermasalah belum tersedia. Kombinasi Excavator–Bulldozer–Dump Truck melalui produsen asli berjalan pada pengujian ini, sehingga akar masalah proyek pengguna belum dapat dinyatakan terverifikasi.

Tautan sekarang meminta snapshot baru dari hasil perhitungan yang sedang aktif pada saat diklik. `handoffId` mengikat tautan dengan snapshot tab tersebut; snapshot yang tertimpa akan menghasilkan pesan khusus, bukan dianggap sebagai pasangan alat yang hilang. Identitas ini hanya metadata transfer dan tidak mengubah rumus, jumlah unit, atau hasil proyek. Tautan lama tanpa penanda tetap didukung. Format resmi produsen tetap `scenarios[key].equipment[]` dengan properti `type`, `units`, `workVolume`, dan `workVolumeBasis`. Adapter tidak menebak jumlah dari properti alternatif atau mengarang baris yang hilang.

Untuk memeriksa proyek aktual: buka **Diagnostik integrasi data → Unduh diagnostik JSON** pada halaman visualisasi yang bermasalah. Alternatif konsol baca-saja: `JSON.stringify(ExcabaseFleetView.getDiagnostics(), null, 2)`. Laporan menunjukkan tahap gagal, kecocokan proyek/fingerprint/penanda transfer, struktur dan nama properti baris alat dari Estimasi, snapshot tiap skenario, dan hasil tersimpan. Nama/ID proyek, biaya, input produktivitas, serta fingerprint mentah tidak disertakan. Ekspor tidak menghapus atau menulis localStorage/sessionStorage. Pada snapshot tidak valid, nama skenario tetap terlihat, angka yang belum valid ditampilkan sebagai `—`, dan pesan meminta Hitung Semua Skenario lalu membuka ulang visualisasi. Laporan aktual diperlukan untuk membedakan data yang hilang, format berbeda, atau snapshot lama tanpa mengubah proyek pengguna.

## Membuka fitur

1. Buka Proyek Aktif → Simulasi Armada, dengan Estimasi yang masih sesuai Produktivitas.
2. Klik **Hitung Semua Skenario**, lalu pilih Dasar, Hemat, atau Cepat. Hasil tersimpan yang masih cocok juga dapat langsung digunakan.
3. Klik **Visualisasikan Armada**. Tidak perlu menyimpan skenario hanya untuk melihatnya; penyimpanan pilihan resmi ke Laporan tetap melalui tombol lama.
4. Isi parameter yang belum tersedia: waktu bongkar/manuver **tanpa antrean** untuk pengangkutan, atau siklus efektif Bulldozer jika input siklus/efisiensi tidak tersedia. Periksa sumber yang tercantum di bawah setiap input.
5. Klik **Terapkan & reset simulasi**, lalu **Play**. Pause mempertahankan waktu dan muatan; Reset hanya mengatur ulang model. 1× berarti satu detik kerja model per detik pemutaran.

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

Bulldozer **tidak memuat Dump Truck**. Dorong tanah dan pengangkutan tidak dijumlahkan ke satu volume, satu produktivitas, atau satu persentase penyelesaian proyek. Pada kombinasi lengkap, kedua aktivitas dianggap pekerjaan terpisah tanpa ketergantungan urutan; belum menjadi model Bulldozer memasok Excavator atau meratakan setiap muatan di disposal. Jika proyek memerlukan pekerjaan berurutan, visualisasi ini tidak memprediksi durasi gabungannya. Jam simulasi berhenti ketika seluruh aktivitas aktif selesai dan alat kembali siaga; waktu masing-masing aktivitas tetap tersedia pada snapshot.

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
- Excavator–Dump Truck dan Bulldozer memiliki model operasional terpisah. Wheel Loader, Motor Grader, dan Compactor tetap disimpan dan disebutkan, tetapi belum disimulasikan.
- Belum memodelkan pergantian shift, kerusakan, batas berat payload, variasi material/cuaca, lalu lintas, tabrakan, kecepatan berdasarkan gradien jalan, atau beberapa material/disposal.
- Halaman memakai sidebar, logo, dan metallic background bersama. Glass terbatas pada panel informasi dengan fallback solid; blur panel dinonaktifkan pada layar kecil.

## Berkas

- `pages/fleet-visualization.html`: halaman visualisasi dalam tahap Simulasi.
- `css/fleet-visualization.css`: tata letak, kontrol, dan panel khusus fitur.
- `js/fleet-visualization-engine.js`: model murni, antrean event, konservasi volume.
- `js/fleet-visualization-bulldozer.js`: engine dorong mandiri dan orkestrator aktivitas; engine Excavator–Dump Truck tetap terpisah.
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
