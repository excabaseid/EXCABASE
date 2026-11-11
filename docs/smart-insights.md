# EXCABASE Smart Insights 2.0

Dashboard tetap berada pada Simulasi Armada setelah hasil dan sebelum navigasi
Analisis & Laporan. Header ringkas memakai tombol Buka/Tutup, transisi ringan,
`inert`, dan `aria-hidden`. Detail tiap alat dapat diperluas. Tidak ada halaman,
menu, tautan kembali, atau panel PDF baru.

## Sumber dan konsistensi data

Panel tetap mendengarkan `excabase:fleet-visualization` dari `fleet-simulation.js`.
Envelope hasil kalkulasi terbaru disalin untuk UI; tidak ada pembacaan snapshot
sesi lama atau penulisan storage oleh Smart Insights. `ExcabaseFleetData.verify()`
memeriksa proyek, fingerprint, dan kesesuaian Estimasi. Panel disembunyikan bila
hasil tiga skenario belum valid, input berubah, atau proyek tidak cocok.

Pilihan skenario dashboard meneruskan event ke `fleetSelectedScenario` yang sudah
ada, sehingga tidak ada state skenario kedua. Metrik, pemuat, dan ambang hanya
berada dalam memori sesi halaman. Perubahan storage/fokus/pageshow/visibility
memicu pemeriksaan konteks. `ExcabaseSmartInsights.getState()` memberi salinan
model untuk diagnostik read-only.

| Indikator | Sumber |
|---|---|
| Durasi/biaya/unit overview | `scenarios[key].longestEquipmentDuration`, `totalCost`, `totalUnits` |
| Jenis dianalisis | Jenis unik yang dikenali pada daftar alat skenario aktif, bukan jumlah unit |
| Kapasitas total/per unit | `equipment[].totalProductivity`, `productivityPerUnit` |
| Unit/durasi/biaya alat | `equipment[].units`, `durationDays`, `totalCost` |
| Satuan | `equipment[].workVolumeBasis`: BCM, LCM, CCM, atau m2 |
| Model alat | `project.results.productivity[type].model` atau `productivityInputs[type].model` |
| Parameter lintasan/lapisan | `productivityInputs[type].fields`: graderPasses/graderThickness atau compactorPasses/compactorThickness |

Q total tidak dikalikan unit lagi. Efisiensi, lintasan, dan ketebalan tidak
diterapkan ulang. Data yang hilang ditulis belum tersedia, bukan diisi asumsi.

## Scenario Intelligence

Satu grafik memakai satu metrik/satuan: hari, Rp, atau unit. Batang relatif
terhadap maksimum metrik itu pada tiga skenario. Dasar adalah referensi:

- Delta absolut = nilai skenario dikurangi nilai Dasar.
- Delta persen = (nilai skenario - nilai Dasar) / nilai Dasar x 100%.
- Biaya tambahan per hari berkurang = tambahan biaya operasional / pengurangan
  durasi, hanya bila keduanya positif dan lingkup antar skenario sebanding.

Pembagi nol/data tidak valid menghasilkan keterangan, bukan NaN/Infinity.
Selisih dalam toleransi relatif 1e-9 dianggap nol pada interpretasi agar noise
floating point tidak menjadi perubahan fiktif. Nilai sumber tidak diubah.
Biaya seri disebutkan bersama; Cepat tidak diasumsikan lebih mahal.

## Fleet Balance Indicator

R = kapasitas angkut / kapasitas muat x 100%. Basis volume BCM/LCM/CCM harus sama
dan diketahui. Volume pekerjaan pasangan juga harus sama dalam toleransi relatif
1e-8. Tidak ada konversi otomatis atau penjumlahan baris alat ganda.

Hubungan pemuat-truk belum tersimpan secara eksplisit pada data skenario saat
ini. Satu jenis pemuat dinilai sebagai pasangan kapasitas potensial, dengan
catatan material/area harus sama. Jika Excavator dan Wheel Loader sama-sama ada,
pengguna harus mengonfirmasi pasangan analisis sesi. Kedua kapasitas tidak
dijumlahkan; pilihan ini tidak mengubah armada atau sumber pemuat Fleet Simulation.

### Ambang heuristik yang dapat dikonfigurasi

Default berikut adalah parameter heuristik tampilan/perencanaan, BUKAN standar
PUPR, ketentuan teknik resmi, atau pengukuran efisiensi:

| Warna dan status | Rentang R default |
|---|---|
| Hijau: Kapasitas relatif seimbang | 90-110% |
| Kuning: Perlu evaluasi | 70 sampai kurang dari 90%, atau lebih dari 110 sampai 140% |
| Merah: Potensi hambatan kapasitas | kurang dari 70% atau lebih dari 140% |
| Abu-abu: Data belum cukup | Pasangan, basis, atau data tidak valid/ambigu |

Pengaturan ada di detail Ambang heuristik perencanaan. Validasi:
0 < criticalLow < balancedLow <= 100 <= balancedHigh < criticalHigh.
Input tidak valid ditolak dengan pesan; pengaturan valid sebelumnya tetap
digunakan. Batas kategori memakai toleransi 1e-8 poin persen untuk noise numerik.

R < 100% menunjukkan kapasitas pengangkutan lebih rendah; R > 100% menunjukkan
kapasitas pemuatan lebih rendah. Minimum keduanya ditampilkan sebagai pembatas
potensial, bukan bottleneck lapangan yang terbukti. R setara menyebut keduanya
setara. Saran membedakan evaluasi truk/jarak/siklus/jalan dari pemuat/pola pelayanan.

Gauge memakai rentang visual 0-200%. Di atas 200%, lingkaran penuh tetapi angka
rasio tetap ditampilkan tanpa pembatasan. Diagram kapasitas relatif terhadap
kapasitas terbesar. Warna selalu disertai label. Rasio tidak membuktikan
utilisasi, efisiensi aktual, antrean, waktu tunggu, atau optimalitas.

## Equipment Performance dan Duration Driver

Kartu hanya dibuat untuk keenam jenis yang ada pada skenario aktif. Unit, Q
total, durasi, biaya, perubahan terhadap Dasar, dan status berada pada ringkasan;
model, Q per unit, mini grafik unit, parameter sumber, dan insight per fungsi
berada pada detail yang dapat diperluas. Luas m2 memakai m²/jam; volume tetap
mempertahankan BCM/LCM/CCM.

- Potensi pengurangan durasi: durasi alat turun terhadap alat yang sama pada
  Dasar dengan lingkup/basis sama. Perlu evaluasi kapasitas: durasi naik.
- Penentu durasi perencanaan: hanya bila seluruh durasi lengkap dan maksimum
  durasi alat cocok dengan longestEquipmentDuration tersimpan. Semua alat yang
  seri ditandai. Grafik memberi penanda kuning pada driver yang terverifikasi.
- Data Q/basis/durasi tidak cukup diberi abu-abu. Durasi yang sama mendapat label
  netral Durasi tetap. Baris ganda tidak dipilih/diagregasi diam-diam.
- Potensi hambatan kapasitas hanya mengikuti pasangan pemuat-truk yang relevan,
  bukan peringkat Q lintas pekerjaan.

Jika durasi tidak lengkap/tidak cocok, penentu model tidak diklaim dan nilai
sumber tidak diperbaiki. Model maksimum yang digunakan Simulasi Armada
mengasumsikan pekerjaan dapat paralel; hasil ini bukan jadwal definitif atau
analisis ketergantungan. Tidak dibuat urutan kerja baru.

Bulldozer tidak dianggap memuat truk. Grader mempertahankan basis luas/volume.
Lintasan/ketebalan Compactor tidak diubah; Q bukan bukti kepadatan tanah.
Smart Recommendations berupa kartu berikon berkategori waktu, biaya, kapasitas,
kinerja, dan keterbatasan yang relevan. Peringkat skenario hanya dibuat bila
jenis, volume, dan basis pekerjaan sama dan lengkap.

## Pengujian yang dijalankan

Semua data adalah fixture, bukan proyek pengguna. Browser membuka halaman
Simulasi Armada sebenarnya dan menghitung lewat produsen asli dalam profil
Chrome sementara. Unit test juga menguji batas/inkonsistensi yang belum tentu
dihasilkan kalkulator normal.

- tests/smart-insights.cjs: 200 assertion regresi model lama lulus.
- tests/smart-insights-v2.cjs: 143 assertion lulus. Empat warna, arah/nilai
  pembatas, rasio >200%, ambang/batas inklusif, enam alat dan alat tunggal,
  persentase perubahan, biaya Dasar nol, trade-off kondisional, model/parameter
  sumber, m², driver seri, duplikasi/inkonsistensi, dan noise floating point.
- tests/smart-insights-browser.ps1: 1.366 assertion lulus tanpa exception JS.
  Mencakup Ex-Truck, Loader-Truck, Bulldozer/Grader/Compactor tunggal, enam alat,
  Dasar/Hemat/Cepat, rasio rendah/setara/tinggi, konfirmasi pemuat, heuristik,
  overview, Q/durasi/biaya/unit, perubahan persen, panjang batang, mini grafik,
  driver durasi, ketidakcocokan durasi tanpa klaim model paralel, data tidak
  lengkap, basis berbeda/m², invalidasi/reset/pergantian
  proyek, dan storage tetap sama selama analisis. Viewport 1366/768/390/360 px
  lulus tanpa overflow, termasuk detail terbuka. Keadaan tertutup ringkas/inert
  serta screenshot desktop/mobile diperiksa.
- test-estimate-simulation.cjs: regresi perhitungan enam alat dan tiga skenario
  lulus, termasuk nilai Q/unit/biaya/durasi, stale data, dan proyek selesai.
- Hash 20 modul sumber/perhitungan/Fleet Visualization sama dengan sebelum upgrade.
- Regresi tests/fleet-visualization-browser.ps1: 15.581 assertion lulus, tanpa
  exception JavaScript. Handoff, skenario, enam alat, resize, dan kontrol hingga
  100x tetap berfungsi. Artefak regresi:
  C:\Users\ASUS\AppData\Local\Temp\excabase-fleet-4b6d195bc3124674aeb849571eeb7f66
- Pemeriksaan sintaks dan git diff --check juga lulus.

Artefak browser terakhir:
C:\Users\ASUS\AppData\Local\Temp\excabase-fleet-c81122d315ad48ba9755e5d87810809d

Uji viewport bukan pengujian smartphone fisik atau validasi operasi lapangan.
Tidak ada perubahan storage, commit, push, atau deployment otomatis.
