PRD: Personal Productivity & Finance App
Project Overview
Saya ingin membangun sebuah aplikasi web progresif (PWA) sederhana untuk manajemen pribadi yang mencakup tiga modul: Keuangan, Catatan Kegiatan, dan To-Do List. Aplikasi ini bertujuan untuk penggunaan harian dengan antarmuka yang bersih, responsif, dan minimalis.

Tech Stack (Recommended)
Frontend: React.js atau Vue.js dengan Tailwind CSS.

Backend/Database: Supabase (untuk Auth dan Database) atau SQLite dengan Node.js.

Icons: Lucide React.

Charts: Chart.js atau Recharts.

1. Modul Keuangan (Finance)
Tujuan: Mencatat arus kas masuk dan keluar.

Fitur Utama:

Form Input: Nominal (Amount), Tipe (Income/Expense), Kategori (Food, Transport, Bill, etc), Tanggal, dan Catatan Singkat.

Dashboard: Menampilkan "Total Saldo", "Total Pemasukan Bulan Ini", dan "Total Pengeluaran Bulan Ini".

Visualisasi: Pie Chart untuk persentase pengeluaran berdasarkan kategori.

History: List transaksi terbaru dengan fitur hapus data.

2. Modul Kegiatan (Daily Log)
Tujuan: Jurnal harian untuk mencatat memori atau progres belajar.

Fitur Utama:

Text Editor: Area input teks yang mendukung format sederhana atau Markdown.

Tagging: User bisa menambahkan tag (misal: #kuliah, #kerja, #ide).

Filter & Search: Fitur pencarian kata kunci dan filter berdasarkan rentang tanggal.

Display: Tampilan kartu (Card view) urut berdasarkan waktu terbaru (Descending).

3. Modul Pekerjaan (To-Do List)
Tujuan: Manajemen tugas dengan prioritas.

Fitur Utama:

Task Input: Judul tugas, Deadline (Date picker), dan Level Prioritas (High, Medium, Low).

Progress Tracking: Checkbox untuk menandai tugas selesai.

Sorting: Secara otomatis mengurutkan tugas berdasarkan prioritas tertinggi dan deadline terdekat.

Visual: Progress bar sederhana yang menunjukkan % tugas yang selesai hari ini.

Data Schema (JSON Structure)
JSON
{
  "finances": { "id": "uuid", "type": "string", "amount": "number", "category": "string", "date": "date" },
  "activities": { "id": "uuid", "content": "text", "tags": "array", "created_at": "timestamp" },
  "tasks": { "id": "uuid", "title": "string", "priority": "string", "deadline": "date", "is_done": "boolean" }
}
User Interface (UI) Requirements
Sidebar/Navbar: Navigasi mudah antar 3 modul.

Responsive: Harus tampil sempurna di layar HP (Mobile-first).

Theme: Gunakan Clean White dengan aksen warna Indigo atau Dark Mode support.

Feedback: Tampilkan notifikasi "Success" setiap kali data berhasil disimpan.

Instructions for AI Agent
Buatlah struktur proyek menggunakan Vite dan Tailwind CSS.

Implementasikan Dashboard Utama yang merangkum data dari ketiga modul tersebut dalam satu layar (Overview).

Gunakan LocalStorage untuk penyimpanan data sementara sebelum saya menghubungkannya ke Database permanen.

Pastikan kode modular (pisahkan komponen UI seperti Button, Card, dan Modal).