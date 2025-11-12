// File: public/script-super-admin.js 

async function muatDaftarSekolah () {
    const token = localStorage.getItem('superAdminToken');
    const tabelBody = document.getElementById('tabel-daftar-sekolah');

    if (!token) {
        window.location.href = 'super-login.html';
        return;
    }

    tabelBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Memuat daftar sekolah...</td></tr>';
    
    try {
        const response = await fetch('/api/superAdmin/schools', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        if (response.status === 401) { 
            localStorage.removeItem('superAdminToken');
            window.location.href = 'super-login.html';
            return; 
        }
        if (!response.ok) {
            throw new Error(`Gagal memuat data sekolah. Status: ${response.status}`);
        }

        const schools = await response.json(); 
        tabelBody.innerHTML = ''; // Bersihkan tabel sebelum mengisi
        
        if (schools.length === 0) {
            tabelBody.innerHTML = '<tr><td colspan="7" class="text-center">Tidak ada data sekolah.</td></tr>';
            return;
        }

        schools.forEach(sekolah => { 
            const is_active = sekolah.status_aktif == 1; // 1 = Aktif, 0 = Nonaktif
            const statusBadge = is_active 
                ? '<span class="badge bg-success">Aktif</span>' 
                : '<span class="badge bg-danger">Nonaktif</span>';

            const aksiText = is_active ? 'Nonaktifkan' : 'Aktifkan'; // Teks tombol
            const tombolAksi = `
                <button class="btn btn-sm ${is_active ? 'btn-danger' : 'btn-success'}" 
                    onclick="handleAksi('${sekolah.id_sekolah}', ${sekolah.status_aktif})"> 
                    ${aksiText}
                </button>`; 
            
            // Tombol Hapus: Panggil fungsi hapus
            const tombolHapus = `
                <button class="btn btn-sm btn-outline-secondary ms-1" 
                    onclick="hapusSekolahSuperAdmin('${sekolah.id_sekolah}', '${sekolah.nama_sekolah}')">
                    Hapus
                </button>`;
            const tanggal_terdaftar_formatted = formatTanggal(sekolah.tanggal_terdaftar);
            const subdomainLink = `<a href="detail-sekolah.html?id=${sekolah.id_sekolah}" class="text-primary fw-bold">${sekolah.subdomain}</a>`;
                const row = `<tr id="row-sekolah-${sekolah.id_sekolah}">
                <td>${sekolah.id_sekolah}</td>
                <td>${sekolah.nama_sekolah}</td>
                <td>${subdomainLink}</td> <td>${sekolah.npsn}</td>
                <td>${tanggal_terdaftar_formatted}</td> <td>${sekolah.nama_admin_utama}</td>
                <td>${statusBadge}</td>
                <td class="text-center">
                    ${tombolAksi}
                    ${tombolHapus}
                </td>
            </tr>`;
            tabelBody.innerHTML += row;
        });

    } catch (error) {
        console.error("Error saat memuat daftar sekolah:", error);
        tabelBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Gagal memuat data: ${error.message}</td></tr>`;
    }
};

async function handleAksi(id_sekolah, status_sekarang) {
    const status_sekarang_int = parseInt(status_sekarang); 
    const status_baru = status_sekarang_int === 1 ? 0 : 1; 
    const aksiText = status_sekarang_int === 1 ? "nonaktifkan" : "aktifkan"; 
    if (!confirm(`Apakah Anda yakin ingin ${aksiText} sekolah ID ${id_sekolah}?`)) {
        return; // Batalkan
    }
    
    const token = localStorage.getItem('superAdminToken');
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
    };

    try {
        const response = await fetch(`/api/superAdmin/schools/${id_sekolah}/status`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify({ is_active: status_baru })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[FE] API Error Response Status ${response.status}:`, errorText);
            
            let errorMessage = errorText;
            try {
                // Coba parse ke JSON. Jika sukses, ambil pesan.
                const errorJson = JSON.parse(errorText);
                errorMessage = errorJson.message || errorText;
            } catch (e) {
            }
            throw new Error(errorMessage || `Gagal melakukan aksi. Status: ${response.status}`);
        }
        const result = await response.json(); 
        alert(result.message);
        muatDaftarSekolah(); 

    } catch (error) {
        console.error(`Error saat toggle status:`, error);
        alert(`Error: ${error.message}`); 
    }
};

window.hapusSekolahSuperAdmin = async function(id_sekolah, nama_sekolah) {
    if (!confirm(`PERINGATAN BERBAHAYA! Anda akan menghapus \"${nama_sekolah}\" ( ID: ${id_sekolah} ) beserta SEMUA datanya secara permanen. Tindakan ini TIDAK DAPAT DIBATALKAN. Lanjutkan penghapusan?`)) {
        return; 
    }
    
    console.log(`Menghapus sekolah ID: ${id_sekolah}`);
    
    try {

        const token = localStorage.getItem('superAdminToken');
        
        if (!token) {
            throw new Error("Token Super Admin tidak ditemukan. Silakan login ulang.");
        }

        const response = await fetch(`/api/superAdmin/schools/${id_sekolah}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'Gagal menghapus sekolah. Cek log server.');
        }
        
        alert(result.message);
        muatDaftarSekolah(); 
        
    } catch (error) {
        console.error("Error menghapus sekolah:", error);
        alert(`Error: ${error.message}`);
    }
}

function logoutSuperAdmin() {
        if (confirm('Logout dari sesi Super Admin?')) {
            localStorage.removeItem('superAdminToken'); 
            localStorage.removeItem('user'); 
            window.location.href = 'index.html'; 
    }};
    const logoutBtn = document.getElementById('super-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logoutSuperAdmin);
}

function formatTanggal(isoString) {
    if (!isoString) return '-';
    const datePart = isoString.split(' ')[0] || isoString.split('T')[0];

    const date = new Date(datePart);
    const options = { day: 'numeric', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('id-ID', options); // Contoh: 02 Nov 2025
}

document.addEventListener('DOMContentLoaded', () => {
    const tabelBody = document.getElementById('tabel-daftar-sekolah');
    const token = localStorage.getItem('superAdminToken');
    if (!token) {
        window.location.href = 'super-login.html';
        return;
    }
    muatDaftarSekolah(); 
});