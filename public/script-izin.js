// File: public/script-izin.js (BARU)

document.addEventListener('DOMContentLoaded', () => {
    muatDataIzin();
});

const token = localStorage.getItem('token');
const headers = {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
};

// 1. Fungsi: Memuat data izin ke tabel
async function muatDataIzin() {
    try {
        const response = await fetch('/api/admin/izin', { headers }); // -> GET ke routes/adminIzin.js
        if (!response.ok) {
            throw new Error('Gagal memuat data izin.');
        }
        const izins = await response.json();
        
        const tbody = document.getElementById('tabel-izin-body');
        tbody.innerHTML = ''; // Kosongkan tabel dulu

        if (izins.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Tidak ada data pengajuan izin.</td></tr>';
            return;
        }

        izins.forEach(izin => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${izin.nama_lengkap}</td>
                <td>${new Date(izin.tanggal_mulai).toLocaleDateString('id-ID')} s/d ${new Date(izin.tanggal_selesai).toLocaleDateString('id-ID')}</td>
                <td><span class="badge bg-secondary">${izin.jenis}</span></td>
                <td>${izin.keterangan}</td>
                <td>
                    <span class="badge ${getStatusBadge(izin.status)}">${izin.status}</span>
                </td>
                <td class="text-center" id="aksi-izin-${izin.id_izin}">
                    ${generateAksiButton(izin.status, izin.id_izin)}
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

// 2. Fungsi: Helper untuk badge status
function getStatusBadge(status) {
    if (status === 'Disetujui') return 'bg-success';
    if (status === 'Ditolak') return 'bg-danger';
    return 'bg-warning text-dark'; // Menunggu
}

// 3. Fungsi: Helper untuk tombol aksi
function generateAksiButton(status, id_izin) {
    if (status === 'Menunggu') {
        return `
            <button class="btn btn-success btn-sm" onclick="updateStatusIzin(${id_izin}, 'Disetujui')">
                <i class="bi bi-check-lg"></i> Setujui
            </button>
            <button class="btn btn-danger btn-sm" onclick="updateStatusIzin(${id_izin}, 'Ditolak')">
                <i class="bi bi-x-lg"></i> Tolak
            </button>
        `;
    }
    return 'Tindakan selesai'; // Jika sudah disetujui atau ditolak
}

// 4. Fungsi: Mengupdate status (Menyetujui / Menolak)
async function updateStatusIzin(id_izin, status) {
    if (!confirm(`Apakah Anda yakin ingin "${status}" pengajuan ini?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/izin/${id_izin}/status`, { // -> PUT ke routes/adminIzin.js
            method: 'PUT',
            headers,
            body: JSON.stringify({ status: status }) // Kirim status baru
        });
        
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || 'Gagal update status.');
        }

        alert(result.message);
        muatDataIzin(); // Muat ulang tabel

    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}