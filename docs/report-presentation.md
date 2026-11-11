# Analisis & Laporan — penyajian dan verifikasi

Perubahan ini hanya membaca hasil tersimpan. Modul produktivitas, konversi tanah,
Estimasi, Simulasi Armada, Fleet Visualization, penyimpanan, dan navigasi tidak diubah.

- Section Detail Analisis Teknik beserta pengisian DOM-nya dihapus. Grafik,
  perbandingan skenario, skenario pilihan, dan ringkasan tetap tersedia.
- Rekapitulasi menampilkan `totalHourlyProductivity` tersimpan, dua desimal dengan
  format Indonesia, tanpa perkalian atau penjumlahan produktivitas lintas pekerjaan.
- `report-narrative.js` menghasilkan 2–3 paragraf analisis dan dua paragraf
  kesimpulan. Fungsi ini tidak menulis ke objek proyek atau storage.
- Durasi alat terlama dijelaskan sebagai pendekatan paralel, bukan jadwal definitif.
  Ketergantungan pekerjaan harus dianalisis terpisah; laporan tidak membuat jadwal baru.
- Peringkat biaya/durasi hanya muncul jika tiga skenario memiliki angka lengkap,
  jenis pekerjaan, volume pekerjaan, dan basis volume tersimpan yang sama.
  Nilai seri dilaporkan bersama. Data tidak lengkap menghasilkan penjelasan keterbatasan.
- PDF tetap memakai `window.print()` sehingga sumber tabel dan narasi sama dengan
  halaman. CSS cetak mengatur kolom, pengulangan header tabel, margin A4, serta
  pemisahan paragraf. Kontainer penyelesaian proyek disembunyikan saat cetak agar
  tidak menghasilkan halaman kosong.

## Pengujian yang dijalankan

Pada 11 November 2026:

1. `node tests/report-narrative.cjs`: **32 pemeriksaan lulus**, mencakup satu/beberapa
   alat, basis campuran, tanpa simulasi, nilai hilang, skenario parsial, lingkup
   berbeda, nilai seri, dan objek input tidak berubah.
2. `powershell -ExecutionPolicy Bypass -File tests/report-browser.ps1`:
   **100 pemeriksaan lulus** pada halaman sebenarnya dengan fixture satu alat,
   beberapa alat, tiga skenario, skenario parsial, biaya/durasi hilang, dan BCM/LCM/CCM.
   Pemeriksaan geometri tambahan lulus pada 1366, 390, dan 360 px: tidak ada overflow
   halaman, tabel mobile tetap bisa digulir. Tidak ada exception JavaScript.
   Unit, produktivitas, biaya, dan durasi tabel sesuai nilai sumber; localStorage
   serta sessionStorage tidak berubah saat laporan diperbarui.
3. PDF A4 benar-benar dibuat oleh Chrome. Pratinjau tabel, grafik, dan halaman narasi
   diperiksa; fixture tiga skenario menghasilkan tiga halaman tanpa halaman kosong.
4. `node test-estimate-simulation.cjs`: regresi perhitungan yang tersedia **lulus**,
   termasuk enam alat, produktivitas, unit, jam, biaya, basis, tiga skenario,
   stale result, pembaruan bersamaan, dan proyek selesai.
5. `git -c core.whitespace=cr-at-eol diff --check`: **lulus**.

`tests/results-ui.cjs` juga dicoba, tetapi **belum dapat dijalankan sampai selesai**:
Node v18.15.0 yang tersedia tidak menyediakan global `WebSocket` yang dibutuhkan
runner tersebut. Ini tidak dihitung sebagai pengujian lulus. Runner PowerShell
laporan menggunakan koneksi CDP .NET dan sudah dijalankan terpisah.

Seluruh uji browser menggunakan profil sementara terpisah, bukan data proyek asli.
Artefak eksekusi terakhir (JSON hasil, screenshot desktop/mobile, PDF dan pratinjaunya):
`C:\Users\ASUS\AppData\Local\Temp\excabase-fleet-2371c57bad414aa5813ac530067e7d3f`.
Ketergantungan diuji melalui kehadiran penjelasan batasan durasi paralel; tidak ada
model jadwal berurutan yang dihitung atau diklaim sudah divalidasi.

## Contoh narasi fixture

> Pendekatan durasi Estimasi sebesar 4 hari menggunakan durasi alat terlama dan
> mengasumsikan pekerjaan berlangsung paralel. Angka ini bukan jadwal definitif;
> pekerjaan berurutan memerlukan analisis ketergantungan. Biaya operasional alat
> sebesar Rp2.000.000 belum mencakup seluruh biaya proyek konstruksi. Hasil Simulasi
> Armada belum tersedia; perbandingan skenario belum dapat dilakukan.

Nama proyek atau model fixture bukan hasil pemeriksaan proyek pengguna.
