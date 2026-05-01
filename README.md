# Alanka Daily - Personal Productivity & Finance App

Alanka Daily adalah Aplikasi Web Progresif (PWA) sederhana yang dirancang khusus untuk membantu mengelola keuangan pribadi, mencatat jurnal harian, dan melacak daftar tugas (To-Do List) dalam satu antarmuka yang bersih, responsif, dan mudah digunakan (Mobile-first).

## 🚀 Fitur Utama

Aplikasi ini dibagi menjadi tiga modul utama, yang semuanya dirangkum dalam satu **Dashboard Overview**:

1. **Manajemen Keuangan (Finance)**
   - Catat Pemasukan dan Pengeluaran dengan mudah.
   - Lacak saldo berdasarkan 4 sumber dompet: **BCA, Sea Bank, Mandiri, dan Tunai (Dompet)**.
   - Kategori pengeluaran yang sangat lengkap dan bisa disesuaikan (mulai dari Kebutuhan Sehari-hari, Tagihan, hingga Tarik Tunai).
   - Visualisasi pengeluaran bulanan menggunakan *Pie Chart*.
   - Fitur **Unduh Laporan (CSV)** untuk diekspor ke Microsoft Excel atau Google Sheets.

2. **Jurnal Harian (Daily Log)**
   - Catat memori, pembelajaran, atau ide harian.
   - Dukungan tanggal fleksibel dan *Tagging* (misal: `#kuliah`, `#kerja`).
   - Pencarian cerdas dan filter berdasarkan rentang tanggal.

3. **To-Do List (Manajemen Tugas)**
   - Tambahkan tugas beserta **Judul, Deskripsi, Deadline, dan Prioritas**.
   - Daftar tugas terpisah antara **Belum Dikerjakan** dan **Sudah Dikerjakan**.
   - Terintegrasi dengan Dashboard untuk mengingatkan tugas-tugas yang belum selesai.

## 🛠️ Teknologi yang Digunakan

Versi v1 ini dibangun sebagai *Client-side Application* tanpa memerlukan setup server lokal yang rumit:
- **HTML5 & CSS3**
- **Vanilla JavaScript (ES6)**
- **Tailwind CSS** (via CDN untuk styling cepat & responsif)
- **Chart.js** (via CDN untuk visualisasi data)
- **Lucide Icons** (via CDN untuk ikon modern)
- **LocalStorage API** (untuk penyimpanan data sementara di browser)

## 📦 Cara Menjalankan Aplikasi

Karena aplikasi ini sepenuhnya statis pada versi ini, Anda tidak perlu menginstal Node.js atau server apa pun:
1. Buka folder proyek (`v1`).
2. Klik ganda pada file `index.html`.
3. Aplikasi akan langsung terbuka di web browser default Anda (Chrome, Edge, Safari, dll).
4. (Opsional) Untuk pengalaman terbaik di HP, Anda bisa mengaksesnya via local network/server atau *hosting* statis gratis seperti Vercel / GitHub Pages.

## 🔒 Roadmap Keamanan & Autentikasi (Next Steps)
Saat ini data disimpan secara lokal di perangkat (*LocalStorage*). Untuk langkah selanjutnya, sistem autentikasi (Login User) akan diterapkan menggunakan:
- **Supabase / Firebase** untuk manajemen Pengguna, Password, dan JWT (JSON Web Token).
- Sinkronisasi *Cloud Database* agar data aman dan bisa diakses dari berbagai perangkat.
