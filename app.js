const SUPABASE_URL = 'https://vokltxbtrastwtttlcpj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZva2x0eGJ0cmFzdHd0dHRsY3BqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2NDM4NTAsImV4cCI6MjA5MzIxOTg1MH0.hy37GgFjcWNIsyipdhNgxvu3PcbqFAzihaafzBJOazA';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        storage: window.sessionStorage
    }
});
let currentUser = null;

// FIX 1: Flag untuk mencegah onAuthStateChange bereaksi saat logout manual sedang berjalan
let isLoggingOut = false;

// FIX 2: Flag untuk mencegah loadData dipanggil berkali-kali (race condition)
let isLoadingData = false;

// Utilities
function showToast(msg = "Berhasil disimpan!") {
    const toast = document.getElementById('toast');
    document.getElementById('toast-message').innerText = msg;
    toast.classList.remove('opacity-0', 'translate-y-[-150%]');
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-[-150%]');
    }, 3000);
}

function setBtnLoading(btnId, isLoading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    if (isLoading) {
        btn.dataset.originalText = btn.innerText;
        btn.innerText = 'Memproses...';
        btn.disabled = true;
        btn.classList.add('opacity-70');
    } else {
        btn.innerText = btn.dataset.originalText || 'Simpan';
        btn.disabled = false;
        btn.classList.remove('opacity-70');
    }
}

// Data Store
let data = {
    finances: [],
    activities: [],
    tasks: []
};

// Auth Logic
async function handleAuth(action) {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const errorEl = document.getElementById('auth-error');
    errorEl.classList.add('hidden');
    errorEl.classList.remove('text-green-600');
    errorEl.classList.add('text-red-500');

    if (!email || !password) {
        errorEl.innerText = "Email dan password harus diisi!";
        errorEl.classList.remove('hidden');
        return;
    }

    const btnId = action === 'login' ? 'btn-login' : 'btn-register';
    setBtnLoading(btnId, true);

    try {
        let result;
        if (action === 'login') {
            result = await sb.auth.signInWithPassword({ email, password });
        } else {
            result = await sb.auth.signUp({ email, password });
        }

        if (result.error) {
            errorEl.innerText = result.error.message;
            errorEl.classList.remove('hidden');
        } else if (action === 'register') {
            errorEl.innerText = "Registrasi berhasil! Silakan cek email Anda untuk konfirmasi (jika diperlukan) atau langsung Login.";
            errorEl.classList.remove('hidden', 'text-red-500');
            errorEl.classList.add('text-green-600');
        }
    } catch (err) {
        console.error('Auth error:', err);
        errorEl.innerText = "Terjadi kesalahan jaringan. Periksa koneksi internet Anda.";
        errorEl.classList.remove('hidden');
    } finally {
        setBtnLoading(btnId, false);
    }
}

document.getElementById('auth-form').addEventListener('submit', (e) => {
    e.preventDefault();
    handleAuth('login');
});

document.getElementById('btn-register').addEventListener('click', () => {
    handleAuth('register');
});

// FIX 3: Fungsi logout yang benar
async function logout() {
    if (isLoggingOut) return; // Cegah double-click
    isLoggingOut = true;

    try {
        await sb.auth.signOut();
    } catch (err) {
        console.error('Logout exception:', err);
    } finally {
        // Selalu paksa reset UI untuk memastikan logout berhasil di sisi klien
        forceResetToAuthScreen();
    }
}

// FIX 4: Pisahkan logika reset UI ke fungsi tersendiri agar konsisten
function forceResetToAuthScreen() {
    currentUser = null;
    isLoadingData = false;
    isLoggingOut = false;
    data = { finances: [], activities: [], tasks: [] };
    
    // Hapus cache dari session dan local (untuk membersihkan sisa lama)
    sessionStorage.removeItem('alanka_cache');
    localStorage.removeItem('alanka_cache');

    // Bersihkan semua token auth yang mungkin nyangkut di storage
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-')) localStorage.removeItem(key);
    });
    Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('sb-')) sessionStorage.removeItem(key);
    });

    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('app-container').classList.add('hidden');
}

sb.auth.onAuthStateChange(async (event, session) => {
    console.log('Auth event:', event, 'Session:', !!session);

    // FIX 5: Abaikan event INITIAL_SESSION saat sedang logout untuk cegah race condition
    if (isLoggingOut && event !== 'SIGNED_OUT') {
        console.log('Ignoring auth event during logout:', event);
        return;
    }

    const authScreen = document.getElementById('auth-screen');
    const appContainer = document.getElementById('app-container');
    const loading = document.getElementById('data-loading');
    const appContent = document.getElementById('app-content');

    if (event === 'SIGNED_OUT' || !session || !session.user) {
        forceResetToAuthScreen();
        return;
    }

    // FIX 6: Cegah loadData dipanggil berulang kali jika event terpicu dua kali
    // (Supabase v2 kadang emit TOKEN_REFRESHED + SIGNED_IN secara bersamaan)
    if (event === 'TOKEN_REFRESHED' && currentUser) {
        console.log('Token refreshed, skip reload data');
        return;
    }

    // SIGNED IN
    currentUser = session.user;
    authScreen.classList.add('hidden');
    appContainer.classList.remove('hidden');

    // Tampilkan dari cache agar instan
    const cachedData = sessionStorage.getItem('alanka_cache');
    if (cachedData) {
        try {
            data = JSON.parse(cachedData);
            render();
            loading.classList.add('hidden');
            appContent.classList.remove('hidden');
        } catch (e) {
            console.warn('Cache parse error:', e);
        }
    } else {
        loading.classList.remove('hidden');
        appContent.classList.add('hidden');
    }

    // FIX 7: Guard agar loadData tidak jalan paralel
    if (isLoadingData) {
        console.log('loadData already in progress, skip');
        return;
    }

    try {
        await loadData();
    } catch (e) {
        console.error("Error saat memuat:", e);
    } finally {
        loading.classList.add('hidden');
        appContent.classList.remove('hidden');
    }
});

// Database Fetch
async function loadData() {
    if (!currentUser) return;
    if (isLoadingData) return; // FIX: cegah concurrent load

    isLoadingData = true;

    try {
        const [finRes, actRes, tskRes] = await Promise.all([
            sb.from('finances').select('*').order('date', { ascending: false }),
            sb.from('activities').select('*').order('created_at', { ascending: false }),
            sb.from('tasks').select('*').order('deadline', { ascending: true })
        ]);

        // FIX: Cegah overwrite cache jika user logout selagi menunggu response server
        if (!currentUser) return;

        if (!finRes.error) data.finances = finRes.data || [];
        if (!actRes.error) data.activities = actRes.data || [];
        if (!tskRes.error) data.tasks = tskRes.data || [];

        localStorage.setItem('alanka_cache', JSON.stringify(data));

    } catch (e) {
        console.error("Terjadi kesalahan saat memuat data:", e);
    } finally {
        isLoadingData = false; // FIX: selalu reset flag setelah selesai
    }

    render();
}

// Navigation
function nav(section) {
    document.querySelectorAll('.page-section').forEach(el => el.classList.add('hidden'));
    document.getElementById('sec-' + section).classList.remove('hidden');

    // Desktop Nav
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('bg-indigo-50', 'text-indigo-700', 'font-medium');
        btn.classList.add('text-gray-600');
    });
    const activeBtn = document.getElementById('nav-' + section);
    if (activeBtn) {
        activeBtn.classList.remove('text-gray-600');
        activeBtn.classList.add('bg-indigo-50', 'text-indigo-700', 'font-medium');
    }

    // Mobile Nav
    document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
        btn.classList.remove('text-indigo-600');
        btn.classList.add('text-gray-400');
    });
    const mobileActive = document.getElementById('mobile-nav-' + section);
    if (mobileActive) {
        mobileActive.classList.remove('text-gray-400');
        mobileActive.classList.add('text-indigo-600');
    }

    if (currentUser) {
        render(); // Render cache dulu agar UI cepat
        loadData(); // Ambil data terbaru dari server (sync antar device)
    }
}

// Finance Logic
const categories = {
    income: [
        'Gaji', 'Pasang Wifi', 'Pasang CCTV', 'Desain',
        'Penjualan Babi', 'Komisi Penjualan Bali', 'Tabungan', 'Tarik Tunai', 'Lainnya'
    ],
    expense: [
        'Sayur', 'Canang', 'Galon', 'Gas', 'Pulsa Listrik', 'Paket Data', 'MCK',
        'Bensin', 'Jajan', 'Keluar Pacar', 'Keluar Temen', 'Belanja Online',
        'Tiket Seminar', 'Bayar Sertifikasi', 'Iuran HIMA', 'Futsal Rutin',
        'Baju Panitia', 'Nugas', 'Kasi Ortu', 'Ternak Babi', 'Sea Bank',
        'Pegadaian', 'BPR', 'Crypto', 'Sakit', 'Melayat', 'Di Jalan', 'Kundangan',
        'Bayar Kos', 'Laundry', 'Service Motor', 'Tarik Tunai', 'Lainnya'
    ]
};

function updateCategoryOptions() {
    const type = document.querySelector('input[name="fin_type"]:checked').value;
    const select = document.getElementById('fin_category');
    select.innerHTML = '';
    categories[type].forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.innerText = cat;
        select.appendChild(opt);
    });
}

document.querySelectorAll('input[name="fin_type"]').forEach(r => {
    r.addEventListener('change', updateCategoryOptions);
});

// CSV Export
function exportToCSV() {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const monthData = data.finances.filter(f => {
        const d = new Date(f.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    if (monthData.length === 0) {
        alert("Tidak ada data bulan ini untuk diunduh.");
        return;
    }

    let csvContent = "data:text/csv;charset=utf-8,Tanggal,Rekening/Dompet,Tipe,Kategori,Nominal,Catatan\n";
    monthData.forEach(f => {
        const typeStr = f.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
        const note = f.note ? `"${f.note.replace(/"/g, '""')}"` : "";
        csvContent += `${f.date},${f.bank},${typeStr},${f.category},${f.amount},${note}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Laporan_Keuangan_${currentYear}_${currentMonth + 1}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

let financeChartInstance = null;

document.getElementById('finance-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    setBtnLoading('btn-submit-fin', true);

    try {
        const type = document.querySelector('input[name="fin_type"]:checked').value;
        const bank = document.getElementById('fin_bank').value;
        const amount = Number(document.getElementById('fin_amount').value);
        const category = document.getElementById('fin_category').value;
        const date = document.getElementById('fin_date').value;
        const note = document.getElementById('fin_note').value;

        const payload = { user_id: currentUser.id, type, bank, amount, category, date, note };

        const { data: inserted, error } = await sb.from('finances').insert([payload]).select();

        if (error) {
            alert("Gagal menyimpan: " + error.message + "\n\nPastikan tabel 'finances' sudah dibuat di Supabase dan RLS policy sudah diatur.");
        } else {
            if (inserted && inserted.length > 0) {
                data.finances.unshift(inserted[0]);
            } else {
                loadData(); // Fallback fetch
            }
            sessionStorage.setItem('alanka_cache', JSON.stringify(data));
            showToast("Transaksi disimpan!");
            document.getElementById('fin_amount').value = '';
            document.getElementById('fin_note').value = '';
            renderFinance();
        }
    } catch (err) {
        console.error('Finance save error:', err);
        alert("Terjadi kesalahan jaringan saat menyimpan transaksi. Periksa koneksi internet Anda.");
    } finally {
        setBtnLoading('btn-submit-fin', false);
    }
});

async function deleteFinance(id) {
    if (confirm("Hapus transaksi ini?")) {
        const { error } = await sb.from('finances').delete().eq('id', id);
        if (!error) {
            data.finances = data.finances.filter(f => f.id !== id);
            renderFinance();
        } else {
            alert("Error deleting: " + error.message);
        }
    }
}

function renderFinance() {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    let totalIncome = 0;
    let totalExpense = 0;

    let balances = {
        'Tunai': 0,
        'BCA': 0,
        'Sea Bank': 0,
        'Mandiri': 0
    };

    const categoryData = {};

    data.finances.forEach(f => {
        const fDate = new Date(f.date);

        if (balances[f.bank] === undefined) balances[f.bank] = 0;
        if (f.type === 'income') balances[f.bank] += f.amount;
        else balances[f.bank] -= f.amount;

        if (fDate.getMonth() === currentMonth && fDate.getFullYear() === currentYear) {
            if (f.type === 'income') totalIncome += f.amount;
            if (f.type === 'expense') {
                totalExpense += f.amount;
                categoryData[f.category] = (categoryData[f.category] || 0) + f.amount;
            }
        }
    });

    document.getElementById('dash-tunai').innerText = 'Rp ' + balances['Tunai'].toLocaleString('id-ID');
    document.getElementById('dash-bca').innerText = 'Rp ' + balances['BCA'].toLocaleString('id-ID');
    document.getElementById('dash-sea').innerText = 'Rp ' + balances['Sea Bank'].toLocaleString('id-ID');
    document.getElementById('dash-mandiri').innerText = 'Rp ' + balances['Mandiri'].toLocaleString('id-ID');

    document.getElementById('dash-income').innerText = 'Rp ' + totalIncome.toLocaleString('id-ID');
    document.getElementById('dash-expense').innerText = 'Rp ' + totalExpense.toLocaleString('id-ID');

    const ctx = document.getElementById('financeChart');
    if (financeChartInstance) {
        financeChartInstance.destroy();
    }
    const catKeys = Object.keys(categoryData);
    if (catKeys.length > 0) {
        financeChartInstance = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: catKeys,
                datasets: [{
                    data: Object.values(categoryData),
                    backgroundColor: catKeys.map((_, i) => `hsl(${(i * 360 / catKeys.length) % 360}, 70%, 60%)`)
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right', labels: { boxWidth: 12 } } }
            }
        });
    }

    const tbody = document.getElementById('finance-history');
    tbody.innerHTML = '';
    const sorted = [...data.finances].sort((a, b) => new Date(b.date) - new Date(a.date));
    sorted.forEach(f => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="px-2 md:px-4 py-3">
                <p class="text-sm font-medium text-gray-800">${f.category} <span class="text-xs font-normal text-gray-500">(${f.bank})</span></p>
                <p class="text-xs text-gray-400">${f.date} ${f.note ? '- ' + f.note : ''}</p>
            </td>
            <td class="px-2 md:px-4 py-3 text-right text-sm font-bold ${f.type === 'income' ? 'text-green-600' : 'text-red-600'}">
                ${f.type === 'income' ? '+' : '-'}Rp ${f.amount.toLocaleString('id-ID')}
            </td>
            <td class="px-2 md:px-4 py-3 text-center">
                <button onclick="deleteFinance('${f.id}')" class="text-red-400 hover:text-red-600 p-2"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

// Activity Logic
document.getElementById('activity-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    setBtnLoading('btn-submit-act', true);

    try {
        const content = document.getElementById('act_content').value;
        const tagsStr = document.getElementById('act_tags').value;
        const dateStr = document.getElementById('act_date').value;
        const tags = tagsStr.split(',').map(t => t.trim()).filter(t => t);

        const now = new Date();
        const actDate = new Date(dateStr);
        actDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

        const payload = { user_id: currentUser.id, content, tags, created_at: actDate.toISOString() };

        const { data: inserted, error } = await sb.from('activities').insert([payload]).select();

        if (error) {
            alert("Gagal menyimpan: " + error.message + "\n\nPastikan tabel 'activities' sudah dibuat di Supabase dan RLS policy sudah diatur.");
        } else {
            if (inserted && inserted.length > 0) {
                data.activities.unshift(inserted[0]);
            } else {
                loadData(); // Fallback fetch
            }
            sessionStorage.setItem('alanka_cache', JSON.stringify(data));
            showToast("Catatan disimpan!");
            document.getElementById('act_content').value = '';
            document.getElementById('act_tags').value = '';
            renderActivities();
        }
    } catch (err) {
        console.error('Activity save error:', err);
        alert("Terjadi kesalahan jaringan saat menyimpan catatan. Periksa koneksi internet Anda.");
    } finally {
        setBtnLoading('btn-submit-act', false);
    }
});

async function deleteActivity(id) {
    if (confirm("Hapus catatan ini?")) {
        const { error } = await sb.from('activities').delete().eq('id', id);
        if (!error) {
            data.activities = data.activities.filter(a => a.id !== id);
            renderActivities();
        } else {
            alert("Error deleting: " + error.message);
        }
    }
}

function renderActivities() {
    const list = document.getElementById('activity-list');
    const dashList = document.getElementById('dash-activity-list');
    const search = document.getElementById('act_search')?.value.toLowerCase() || "";
    const filterDate = document.getElementById('act_filter_date')?.value || "";

    list.innerHTML = '';
    dashList.innerHTML = '';

    let sorted = [...data.activities].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    sorted.slice(0, 3).forEach(a => {
        const dateStr = new Date(a.created_at).toLocaleDateString('id-ID');
        dashList.innerHTML += `
            <div class="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                <p class="text-xs text-gray-400 mb-1">${dateStr}</p>
                <p class="text-sm text-gray-700 line-clamp-2">${a.content}</p>
            </div>
        `;
    });
    if (sorted.length === 0) dashList.innerHTML = '<p class="text-gray-500 text-sm">Belum ada aktivitas tercatat.</p>';

    if (search) {
        sorted = sorted.filter(a => a.content.toLowerCase().includes(search) || (a.tags && a.tags.some(t => t.toLowerCase().includes(search))));
    }
    if (filterDate) {
        sorted = sorted.filter(a => a.created_at.startsWith(filterDate));
    }

    sorted.forEach(a => {
        const div = document.createElement('div');
        div.className = 'bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start gap-4';
        const dateStr = new Date(a.created_at).toLocaleString('id-ID');

        let safeTags = [];
        if (Array.isArray(a.tags)) safeTags = a.tags;
        else if (typeof a.tags === 'string') {
            try { safeTags = JSON.parse(a.tags); }
            catch (e) { safeTags = a.tags.split(',').map(s => s.trim()); }
        }

        const tagsHtml = safeTags.map(t => `<span class="bg-indigo-50 text-indigo-600 border border-indigo-100 text-xs px-2 py-1 rounded-md">#${t}</span>`).join(' ');

        div.innerHTML = `
            <div class="flex-1 w-full">
                <p class="text-gray-800 whitespace-pre-wrap">${a.content}</p>
                <div class="mt-4 flex flex-wrap gap-2 items-center justify-between md:justify-start">
                    <div class="flex gap-2">${tagsHtml}</div>
                    <span class="text-xs text-gray-400 md:ml-4">${dateStr}</span>
                </div>
            </div>
            <button onclick="deleteActivity('${a.id}')" class="text-red-400 hover:text-red-600 p-2 md:p-0 self-end md:self-start"><i data-lucide="trash-2" class="w-5 h-5"></i></button>
        `;
        list.appendChild(div);
    });

    if (sorted.length === 0) list.innerHTML = '<div class="text-center p-8 bg-white rounded-2xl border border-gray-100"><p class="text-gray-500">Tidak ada catatan ditemukan.</p></div>';
    lucide.createIcons();
}

// Tasks Logic
const priorityWeight = { 'High': 3, 'Medium': 2, 'Low': 1 };

document.getElementById('task-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    setBtnLoading('btn-submit-tsk', true);

    try {
        const title = document.getElementById('tsk_title').value;
        const desc = document.getElementById('tsk_desc').value;
        const deadline = document.getElementById('tsk_deadline').value;
        const priority = document.getElementById('tsk_priority').value;

        const payload = { user_id: currentUser.id, title, desc, deadline, priority, is_done: false };

        const { data: inserted, error } = await sb.from('tasks').insert([payload]).select();

        if (error) {
            alert("Gagal menyimpan: " + error.message + "\n\nPastikan tabel 'tasks' sudah dibuat di Supabase dan RLS policy sudah diatur.");
        } else {
            if (inserted && inserted.length > 0) {
                data.tasks.push(inserted[0]);
            } else {
                loadData(); // Fallback fetch
            }
            sessionStorage.setItem('alanka_cache', JSON.stringify(data));
            showToast("Tugas ditambahkan!");
            document.getElementById('tsk_title').value = '';
            document.getElementById('tsk_desc').value = '';
            renderTasks();
        }
    } catch (err) {
        console.error('Task save error:', err);
        alert("Terjadi kesalahan jaringan saat menyimpan tugas. Periksa koneksi internet Anda.");
    } finally {
        setBtnLoading('btn-submit-tsk', false);
    }
});

async function toggleTask(id) {
    const task = data.tasks.find(t => t.id === id);
    if (task) {
        const newVal = !task.is_done;
        const { error } = await sb.from('tasks').update({ is_done: newVal }).eq('id', id);
        if (!error) {
            task.is_done = newVal;
            renderTasks();
        } else {
            alert("Error updating: " + error.message);
        }
    }
}

async function deleteTask(id) {
    if (confirm("Hapus tugas ini?")) {
        const { error } = await sb.from('tasks').delete().eq('id', id);
        if (!error) {
            data.tasks = data.tasks.filter(t => t.id !== id);
            renderTasks();
        } else {
            alert("Error deleting: " + error.message);
        }
    }
}

function renderTasks() {
    const listPending = document.getElementById('task-list-pending');
    const listCompleted = document.getElementById('task-list-completed');
    const dashList = document.getElementById('dash-task-list');

    listPending.innerHTML = '';
    listCompleted.innerHTML = '';
    dashList.innerHTML = '';

    let sorted = [...data.tasks].sort((a, b) => {
        if (priorityWeight[b.priority] !== priorityWeight[a.priority]) {
            return priorityWeight[b.priority] - priorityWeight[a.priority];
        }
        return new Date(a.deadline) - new Date(b.deadline);
    });

    let pendingCount = 0;

    sorted.forEach(t => {
        const priorityColors = {
            'High': 'text-red-600 bg-red-50',
            'Medium': 'text-yellow-600 bg-yellow-50',
            'Low': 'text-indigo-600 bg-indigo-50'
        };
        const pClass = priorityColors[t.priority];

        let descHtml = t.desc ? `<p class="text-sm text-gray-500 mt-1 whitespace-pre-wrap">${t.desc}</p>` : '';

        const html = `
            <div class="flex items-start gap-3 bg-white p-3 md:p-4 rounded-xl border border-gray-100 ${t.is_done ? 'opacity-70 bg-gray-50' : 'shadow-sm'} transition hover:border-indigo-100">
                <input type="checkbox" ${t.is_done ? 'checked' : ''} onchange="toggleTask('${t.id}')" class="mt-1 w-5 h-5 text-indigo-600 rounded-md focus:ring-indigo-500 cursor-pointer">
                <div class="flex-1 min-w-0">
                    <p class="font-medium truncate ${t.is_done ? 'line-through text-gray-500' : 'text-gray-800'}">${t.title}</p>
                    ${descHtml}
                    <div class="flex gap-2 text-xs mt-2">
                        <span class="text-gray-500 flex items-center gap-1"><i data-lucide="calendar" class="w-3 h-3"></i> ${t.deadline}</span>
                        <span class="px-2 py-0.5 rounded-md font-medium ${pClass}">${t.priority}</span>
                    </div>
                </div>
                <button onclick="deleteTask('${t.id}')" class="text-red-400 hover:text-red-600 p-2 mt-[-4px]"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </div>
        `;

        if (t.is_done) {
            listCompleted.innerHTML += html;
        } else {
            listPending.innerHTML += html;
            pendingCount++;

            if (pendingCount <= 4) {
                dashList.innerHTML += html;
            }
        }
    });

    if (listPending.children.length === 0) listPending.innerHTML = '<p class="text-gray-500 text-sm p-2">Yeay! Semua tugas sudah selesai.</p>';
    if (listCompleted.children.length === 0) listCompleted.innerHTML = '<p class="text-gray-500 text-sm p-2">Belum ada tugas yang selesai.</p>';
    if (dashList.children.length === 0) dashList.innerHTML = '<li class="text-gray-500 text-sm p-2 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">Tidak ada tugas tertunda.</li>';

    lucide.createIcons();
}

// Initialization
function render() {
    renderFinance();
    renderActivities();
    renderTasks();
}

document.addEventListener('DOMContentLoaded', () => {
    updateCategoryOptions();
    nav('dashboard');
    lucide.createIcons();

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('fin_date').value = today;
    document.getElementById('tsk_deadline').value = today;
    document.getElementById('act_date').value = today;
    document.getElementById('act_filter_date').value = today;
});

document.getElementById('act_search').addEventListener('input', renderActivities);
document.getElementById('act_filter_date').addEventListener('change', renderActivities);
