# EXCABASE Fleet Simulation — versi pertama

Fitur opsional di dalam tahap **Simulasi Armada**; urutan enam tahapan proyek tidak berubah.

## Membuka fitur

1. Buka Proyek Aktif → Simulasi Armada, dengan Estimasi yang masih sesuai Produktivitas.
2. Klik **Hitung Semua Skenario**, lalu pilih Dasar, Hemat, atau Cepat. Hasil tersimpan yang masih cocok juga dapat langsung digunakan.
3. Klik **Visualisasikan Armada**. Tidak perlu menyimpan skenario hanya untuk melihatnya; penyimpanan pilihan resmi ke Laporan tetap melalui tombol lama.
4. Isi parameter yang belum tersedia, terutama waktu bongkar/manuver **tanpa antrean**. Periksa sumber yang tercantum di bawah setiap input.
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
- Hanya Excavator dan Dump Truck yang dioperasikan. Alat lain pada skenario tetap disimpan dan disebutkan, tetapi belum disimulasikan.
- Belum memodelkan pergantian shift, kerusakan, batas berat payload, variasi material/cuaca, lalu lintas, tabrakan, kecepatan berdasarkan gradien jalan, atau beberapa material/disposal.
- Halaman memakai sidebar, logo, dan metallic background bersama. Glass terbatas pada panel informasi dengan fallback solid; blur panel dinonaktifkan pada layar kecil.

## Berkas

- `pages/fleet-visualization.html`: halaman visualisasi dalam tahap Simulasi.
- `css/fleet-visualization.css`: tata letak, kontrol, dan panel khusus fitur.
- `js/fleet-visualization-engine.js`: model murni, antrean event, konservasi volume.
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

Pengujian browser Chromium tidak membuktikan performa smartphone fisik atau kompatibilitas Safari/Firefox. Uji perangkat fisik dan data proyek lapangan tetap diperlukan sebelum menjadikan model sebagai alat perencanaan operasional.
