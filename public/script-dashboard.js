// File: public/script-dashboard.js (BARU)

let attendanceChart; 

// ================================================
// === UTAMA: Tunggu HTML Siap, Lalu Jalankan ===
// ================================================
document.addEventListener('DOMContentLoaded', () => {

    const dateElement = document.getElementById('current-date');
    const tombolExit = document.getElementById('tombol-exit');
    const namaSekolahElem = document.getElementById('nama-sekolah-display');
    const namaAdminElem = document.getElementById('nama-admin-display');

    // Cek token SEBELUM melakukan apapun
    const token = localStorage.getItem('token');
    if (!token) {
        alert('Anda harus login terlebih dahulu.');

        window.location.href = 'login.html'; 
        return; // Hentikan eksekusi
    }

    // Pasang listener HANYA jika tombolnya ada
    if (tombolExit) {
        tombolExit.addEventListener('click', logout);
    } else {
        console.error("[script-dashboard] Tombol 'tombol-exit' tidak ditemukan!");
    }

    // Panggil fungsi inisialisasi HANYA SEKALI
    if (dateElement) {
         tampilkanTanggal();
    } else {
         console.error("[script-dashboard] Elemen 'current-date' tidak ditemukan!");
    }
    
    // Panggil fungsi utama untuk memuat data
    muatDataDasbor(); 
    window.addEventListener('focus', function() {
        console.log("[script-dashboard] Tab aktif, memuat ulang data...");
        if (localStorage.getItem('token')) { 
            muatDataDasbor(); 
        } else {
             console.warn("[script-dashboard] Token hilang, tidak memuat ulang.");

          window.location.href = 'index.html';
        }
    });
});

    function logout() {
    if (confirm('Anda yakin ingin keluar dari sesi sekolah Anda dan kembali ke halaman utama?')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user'); 

        const protocol = window.location.protocol;
        const currentHost = window.location.host; 
        const hostParts = currentHost.split('.');
        let baseHost = currentHost; 
        if (hostParts.length > 2) {
            baseHost = hostParts.slice(1).join('.'); 
        }
        const targetUrl = `${protocol}//${baseHost}/index.html`;
        window.location.href = targetUrl;
    }
    }
    // --- Fungsi Menampilkan Tanggal ---
    function tampilkanTanggal() {
        const dateElement = document.getElementById('current-date');
        if (!dateElement) return; 
        const today = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateElement.textContent = today.toLocaleDateString('id-ID', options);
    }
    async function muatDataDasbor() {
        const token = localStorage.getItem('token');
        try {
        const response = await fetch('/api/dashboard/summary', { 
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        if (response.status === 401) { 
            // 1. Hapus token kedaluwarsa
//            localStorage.removeItem('token'); 
//            localStorage.removeItem('user');
            // 2. Paksa pindah ke halaman login
            alert('Sesi Anda telah berakhir. Silakan login kembali.');
            window.location.href = 'login.html'; 
            return; // Hentikan eksekusi
        }
        if (!response.ok) throw new Error('Gagal mengambil data dasbor.');
            const data = await response.json();

            // 1. Update Kartu Ringkasan
            document.querySelector('.card.border-success .h3').textContent = data.summary_cards.hadir;
            document.querySelector('.card.border-warning .h3').textContent = data.summary_cards.terlambat;
            document.querySelector('.card.border-info .h3').textContent = data.summary_cards.izin_sakit;
            document.querySelector('.card.border-danger .h3').textContent = data.summary_cards.belum_ada_kabar;

            // 2. Update Grafik Kehadiran
            const chartData = [
                data.summary_cards.hadir,
                data.summary_cards.terlambat,
                data.summary_cards.izin_sakit,
                data.summary_cards.belum_ada_kabar
            ];
            const namaSekolahElem = document.getElementById('nama-sekolah-display');
            const namaAdminElem = document.getElementById('nama-admin-display');
            if (namaSekolahElem) namaSekolahElem.textContent = data.namaSekolah || 'Nama Sekolah Error';
            if (namaAdminElem) namaAdminElem.textContent = data.namaAdmin || 'Admin Error';            

            updateGrafik(chartData);
            // 3. Update Aktivitas Terkini
            const aktivitasList = document.getElementById('aktivitas-list');
            aktivitasList.innerHTML = '';
            if (data.aktivitas_terkini.length > 0) {
                data.aktivitas_terkini.forEach(aktivitas => {
                    const jamTampil = aktivitas.waktu_aksi;
                    let badge;
                    if (aktivitas.jenis_aktivitas === 'Presensi Masuk') {
                        const badgeClass = aktivitas.status === 'Terlambat' ? 'bg-warning text-dark' : 'bg-success';
                        badge = `<span class="badge ${badgeClass}">${aktivitas.status}</span>`;
                    } else {
                        badge = `<span class="badge bg-primary">Pulang</span>`;
                    }
                    aktivitasList.innerHTML += `
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            <div>
                                <strong class="d-block">${aktivitas.nama_lengkap}</strong>
                                <small class="text-muted">${jamTampil} - ${aktivitas.jenis_aktivitas}</small>
                            </div>
                            ${badge}
                        </li>`;
                });
            } else {
                aktivitasList.innerHTML = '<li class="list-group-item text-muted">Belum ada aktivitas presensi hari ini.</li>';
            }

            // 4. Update Permintaan Persetujuan
            const permintaanList = document.getElementById('permintaan-list');
            permintaanList.innerHTML = '';
            if (data.permintaan_persetujuan.length > 0) {
                data.permintaan_persetujuan.forEach(req => {
                    permintaanList.innerHTML += `
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                           <div>
                                <strong class="d-block">${req.nama_lengkap}</strong>
                                <small class="text-muted">Mengajukan Izin (mulai ${new Date(req.tanggal_mulai).toLocaleDateString('id-ID')})</small>
                           </div>
                           <a href="manajemen-izin.html" class="btn btn-info btn-sm">Proses</a>
                        </li>`;
                });
            } else {
                permintaanList.innerHTML = '<li class="list-group-item text-muted">Tidak ada permintaan persetujuan baru.</li>';
            }
        } catch (error) {
            console.error("Error:", error);
            document.querySelector('.container-fluid').innerHTML = `<div class="alert alert-danger"><strong>Error:</strong> Gagal memuat data dasbor. Pastikan Anda sudah login dan server berjalan.</div>`;

        }
    }

    function updateGrafik(data) {
        const ctx = document.getElementById('attendanceChart').getContext('2d');
        if (attendanceChart) {
            attendanceChart.data.datasets[0].data = data;
            attendanceChart.update();
        } else {
            attendanceChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Hadir Tepat Waktu', 'Terlambat', 'Izin/Sakit', 'Belum Ada Kabar'],
                    datasets: [{
                        label: 'Jumlah Guru',
                        data: data,
                        backgroundColor: ['#198754', '#ffc107', '#0dcaf0', '#dc3545'],
                        borderColor: '#fff',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } }
                }
            });
        }
    }

    const token = localStorage.getItem('token');
    if (!token) {
        // Jika tidak ada token, paksa kembali ke halaman login
        alert('Anda harus login terlebih dahulu.');
        window.location.href = 'login.html';
    } else {
        // 2. Jika token ada, baru jalankan semua fungsi dasbor
        document.getElementById('tombol-exit').addEventListener('click', logout);
        tampilkanTanggal();
        muatDataDasbor(); // Panggil fungsi utama untuk memuat data
    }

    // Muat ulang data setiap kali pengguna kembali ke tab/jendela ini
    window.addEventListener('focus', function() {
        console.log("Tab dasbor kembali aktif, memuat ulang data...");
        if (localStorage.getItem('token')) {
            muatDataDasbor(); // Panggil fungsi muat data lagi
        }
    });

  function formatWaktuLokal(waktuString) {
  if (!waktuString) return '-';
  // Ambil HH:MM saja
  return waktuString.substring(0, 5); 
}