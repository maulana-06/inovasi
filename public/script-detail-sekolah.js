// File: public/script-detail-sekolah.js

document.addEventListener('DOMContentLoaded', () => {
    const errorAlert = document.getElementById('error-alert');
    const judulDetail = document.getElementById('judul-detail');
    const token = localStorage.getItem('superAdminToken');
    let idSekolah = null;

    // Fungsi untuk mendapatkan ID dari URL
    function getSekolahIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }
    
    // Fungsi format tanggal
    function formatTanggal(isoString) {
        if (!isoString) return '-';
        const datePart = isoString.split(' ')[0] || isoString.split('T')[0];
        const date = new Date(datePart);
        const options = { day: 'numeric', month: 'short', year: 'numeric' };
        return date.toLocaleDateString('id-ID', options);
    }

    // Fungsi utama: Memuat data detail sekolah
    async function muatDetailSekolah() {
        idSekolah = getSekolahIdFromUrl();

        if (!token) {
            alert("Sesi Super Admin berakhir. Silakan login ulang.");
            window.location.href = 'super-login.html';
            return;
        }

        if (!idSekolah) {
            errorAlert.textContent = "ID Sekolah tidak ditemukan di URL.";
            errorAlert.classList.remove('d-none');
            judulDetail.textContent = 'Error Detail Sekolah';
            return;
        }

try {
        // Panggil API untuk mendapatkan detail
        const response = await fetch(`/api/superAdmin/schools/${idSekolah}/detail`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        // ==========================================================
        // KRITIS: Periksa status OK terlebih dahulu
        // ==========================================================
        if (!response.ok) {
            // Coba ambil pesan error dari JSON response jika ada
            const errorData = await response.json();
            throw new Error(errorData.message || `Gagal memuat detail sekolah (Status: ${response.status}).`);
        }
        
        const data = await response.json(); // Ambil data JSON setelah dipastikan response OK

        // ==========================================================
        // KRITIS: Tambahkan Cek null/undefined pada data
        // ==========================================================
        if (!data || !data.sekolah) {
             throw new Error("Struktur data tidak valid atau data sekolah kosong dari server.");
        }
        
        const sekolah = data.sekolah;
            
            judulDetail.innerHTML = `<i class="bi bi-building-fill me-2"></i>Detail Sekolah: ${sekolah.nama_sekolah}`;

            document.getElementById('detail-id').textContent = sekolah.id_sekolah;
            document.getElementById('detail-nama').textContent = sekolah.nama_sekolah;
            document.getElementById('detail-subdomain').textContent = sekolah.subdomain;
            document.getElementById('detail-npsn').textContent = sekolah.npsn;
            document.getElementById('detail-status').innerHTML = sekolah.is_active == 1 
                ? '<span class="badge bg-success">Aktif</span>' 
                : '<span class="badge bg-danger">Nonaktif</span>';
            document.getElementById('detail-tanggal').textContent = formatTanggal(sekolah.created_at);
            
            document.getElementById('detail-lat').textContent = sekolah.latitude;
            document.getElementById('detail-lon').textContent = sekolah.longitude;
            document.getElementById('detail-radius').textContent = `${sekolah.radius_meter} meter`;

            // Panggil fungsi untuk memuat data lain (Admin/Guru)
            tampilkanDataAdminGuru(data.users); 

        } catch (error) {
            console.error("Error memuat detail sekolah:", error);
            errorAlert.textContent = `Error: ${error.message}`;
            errorAlert.classList.remove('d-none');
            judulDetail.textContent = 'Error Jaringan';
        }
    }

    // Fungsi placeholder untuk Tab Admin & Guru
    function tampilkanDataAdminGuru(users) {
        const container = document.getElementById('data-admin-guru');
        let html = '<h5>Daftar User (Admin & Guru)</h5><table class="table table-bordered table-sm"><thead><tr><th>Nama</th><th>Email</th><th>Role</th><th>Status</th></tr></thead><tbody>';

        users.forEach(user => {
            const statusBadge = user.status == 'Aktif' 
                ? '<span class="badge bg-success">Aktif</span>' 
                : '<span class="badge bg-danger">Nonaktif</span>';
            html += `<tr><td>${user.nama_lengkap}</td><td>${user.email}</td><td>${user.role}</td><td>${statusBadge}</td></tr>`;
        });

        html += '</tbody></table>';
        container.innerHTML = html;
    }
    muatDetailSekolah();
});