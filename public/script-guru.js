// File: public/script-guru.js (BARU)

const currentUser = JSON.parse(localStorage.getItem('user'));
const currentUserId = currentUser ? currentUser.userId : null;

document.addEventListener('DOMContentLoaded', () => {
    muatDataGuru();

    // Listener untuk form tambah guru
    document.getElementById('form-tambah-guru').addEventListener('submit', tambahGuru);
    // Listener untuk form edit guru
    document.getElementById('form-edit-guru').addEventListener('submit', simpanEditGuru);
});

    const token = localStorage.getItem('token');
    const headers = {
    'Authorization': 'Bearer ' + token,
    'Content-Type': 'application/json'
    };

// 1. Fungsi: Memuat data guru ke tabel
async function muatDataGuru() {
    try {
        const response = await fetch('/api/admin/guru', { headers });
        if (!response.ok) {
            throw new Error('Gagal memuat data guru.');
        }
        const gurus = await response.json();

        const tbody = document.getElementById('tabel-guru-body');
        tbody.innerHTML = ''; 

        gurus.forEach(guru => {
                    const tr = document.createElement('tr');
                    
                    let roleBadge = (guru.role === 'Admin') ? '<span class="badge bg-primary">Admin</span>' : '<span class="badge bg-secondary">Guru</span>';

                    // ================================================
                    // === PERBARUI TOMBOL AKSI (TAMBAHKAN DETAIL) ===
                    // ================================================
                    let aksiButtons = '';
                    // Tombol Detail (Selalu ada)
                    aksiButtons += `
                        <button class="btn btn-info btn-sm me-1" title="Lihat Detail" onclick="tampilkanDetailModal('${guru.id_user}')">
                            <i class="bi bi-eye-fill"></i> Detail
                        </button>`;

                    if (guru.id_user === currentUserId) {
                        // Jika ini akun admin yang sedang login
                        aksiButtons += `
                            <button class="btn btn-warning btn-sm me-1" title="Edit Detail Anda" onclick="bukaEditModal('${guru.id_user}')">
                                <i class="bi bi-pencil-fill"></i> Edit
                            </button>
                            <button class="btn btn-danger btn-sm" title="Tidak dapat menghapus akun sendiri" disabled>
                                <i class="bi bi-trash-fill"></i> Hapus
                            </button>`;
                    } else {
                        // Untuk akun guru lain
                        aksiButtons += `
                            <button class="btn btn-warning btn-sm me-1" title="Edit Detail Guru" onclick="bukaEditModal('${guru.id_user}')">
                                <i class="bi bi-pencil-fill"></i> Edit
                            </button>
                            <button class="btn btn-danger btn-sm" title="Hapus Guru" onclick="hapusGuru('${guru.id_user}', '${guru.nama_lengkap}')">
                                <i class="bi bi-trash-fill"></i> Hapus
                            </button>`;
                    }
                    tr.innerHTML = `
                        <td>${guru.nama_lengkap}</td>
                        <td>${guru.email}</td>
                        <td>${roleBadge}</td> 
                        <td>
                            <span class="badge ${guru.status === 'Aktif' ? 'bg-success' : 'bg-danger'}">
                                ${guru.status}
                            </span>
                        </td>
                        <td class="text-center">
                            ${aksiButtons} </td>
                    `;
                    tbody.appendChild(tr);
                });
            } catch (error) {
                console.error(error);
                alert(error.message);
            }
        }
// 2. Fungsi: Menambah guru baru
async function tambahGuru(event) {
    event.preventDefault();
    // Ambil SEMUA data dari form
    const data = {
        // Data tabel_user
        nama_lengkap: document.getElementById('tambah-nama').value,
        email: document.getElementById('tambah-email').value,
        password: document.getElementById('tambah-password').value,
        status: document.getElementById('tambah-status').value,
        // Data tabel_guru
        nip_nipppk: document.getElementById('tambah-nip').value || null, // Kirim null jika kosong
        jabatan: document.getElementById('tambah-jabatan').value || null,
        pendidikan: document.getElementById('tambah-pendidikan').value || null,
        mulai_tugas: document.getElementById('tambah-mulai-tugas').value || null,
        alamat: document.getElementById('tambah-alamat').value || null,
        status_keluarga: document.getElementById('tambah-status-keluarga').value || null,
        nomor_telepon: document.getElementById('tambah-telepon').value || null
    };

    try {
        const response = await fetch('/api/admin/guru', { 
            method: 'POST',
            headers,
            body: JSON.stringify(data) // Kirim semua data
        });
        
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || 'Gagal menambah guru.');
        }

        alert('Guru baru berhasil ditambahkan!');
        muatDataGuru(); 
        bootstrap.Modal.getInstance(document.getElementById('tambahGuruModal')).hide();
        document.getElementById('form-tambah-guru').reset();

    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

// ================================================
// === FUNGSI BARU UNTUK MENAMPILKAN MODAL DETAIL ===
// ================================================
async function tampilkanDetailModal(id_user) {
    try {
        // Tampilkan loading di modal (opsional)
        document.getElementById('detail-nama').textContent = "Memuat...";
        // Kosongkan field lain
        ['email', 'role', 'status', 'telepon', 'alamat', 'nip/nipppk', 'jabatan', 'pendidikan', 'mulai-tugas', 'status_keluarga'].forEach(id => {
            const elem = document.getElementById(`detail-${id}`);
            if(elem) elem.textContent = '-';
        });

        // Tampilkan modalnya dulu sebelum fetch
        const detailModal = new bootstrap.Modal(document.getElementById('detailGuruModal'));
        detailModal.show();

        // 1. Ambil data detail guru dari backend (ENDPOINT YANG SAMA DENGAN EDIT)
        const response = await fetch(`/api/admin/guru/${id_user}`, { headers }); // -> GET /:id_user
        if (!response.ok) {
            throw new Error('Gagal mengambil detail guru.');
        }
        const guru = await response.json(); // Data lengkap dari JOIN

        // 2. Isi semua elemen dd di modal detail dengan data yang didapat
        document.getElementById('detail-nama').textContent = guru.nama_lengkap || '-';
        document.getElementById('detail-email').textContent = guru.email || '-';
        document.getElementById('detail-role').textContent = guru.role || '-'; // Backend GET /:id_user perlu kirim role
        document.getElementById('detail-status').textContent = guru.status || '-';
        document.getElementById('detail-telepon').textContent = guru.nomor_telepon || '-';
        document.getElementById('detail-alamat').textContent = guru.alamat || '-';
        document.getElementById('detail-nip').textContent = guru.nip_nipppk || '-';
        document.getElementById('detail-jabatan').textContent = guru.jabatan || '-';
        document.getElementById('detail-pendidikan').textContent = guru.pendidikan || '-';
        document.getElementById('detail-mulai-tugas').textContent = guru.mulai_tugas ? new Date(guru.mulai_tugas).toLocaleDateString('id-ID') : '-';
        document.getElementById('detail-status-keluarga').textContent = guru.status_keluarga || '-';

    } catch (error) {
        console.error("Error menampilkan detail guru:", error);
        // Tampilkan pesan error di modal jika gagal
        document.getElementById('detail-nama').textContent = "Error memuat data.";
        alert(error.message); 
    }
}
// ================================================
// == FUNGSI Simpan Edit Guru (Diperbarui) ==
// ================================================
async function simpanEditGuru(event) {
    event.preventDefault();
    const id_user = document.getElementById('edit-id-user').value;
    // Ambil SEMUA data dari form
    const data = {
        // Data tabel_user
        nama_lengkap: document.getElementById('edit-nama').value,
        email: document.getElementById('edit-email').value,
        status: document.getElementById('edit-status').value,
        // Data tabel_guru
        nip_nipppk: document.getElementById('edit-nip').value || null,
        jabatan: document.getElementById('edit-jabatan').value || null,
        pendidikan: document.getElementById('edit-pendidikan').value || null,
        mulai_tugas: document.getElementById('edit-mulai-tugas').value || null,
        alamat: document.getElementById('edit-alamat').value || null,
        status_keluarga: document.getElementById('edit-status-keluarga').value || null,
        nomor_telepon: document.getElementById('edit-telepon').value || null
    };

    try {
        const response = await fetch(`/api/admin/guru/${id_user}`, { 
            method: 'PUT',
            headers,
            body: JSON.stringify(data) // Kirim semua data
        });
        
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || 'Gagal mengupdate guru.');
        }

        alert(result.message);
        muatDataGuru(); // Muat ulang tabel
        bootstrap.Modal.getInstance(document.getElementById('editGuruModal')).hide();

    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}
async function bukaEditModal(id_user) { 
    console.log(`[bukaEditModal] Dipanggil untuk id_user: ${id_user}`); 
    try {
        const modalElement = document.getElementById('editGuruModal');
        if (!modalElement) throw new Error("Modal 'editGuruModal' tidak ditemukan!");
        // Tampilkan loading di form (opsional)
        document.getElementById('edit-nama').value = "Memuat..."; 
        // 1. Ambil data detail guru dari backend
        console.log(`[bukaEditModal] Fetching data for user ${id_user}...`); 
        const response = await fetch(`/api/admin/guru/${id_user}`, { headers }); 
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({})); // Tangkap jika JSON parse gagal
            throw new Error(errorData.message || `Gagal mengambil detail guru (${response.status}).`);
        }
        const guru = await response.json(); 
        console.log("[bukaEditModal] Data diterima:", guru); 

        // 2. Isi form modal edit 
        console.log("[bukaEditModal] Mengisi form..."); 
        document.getElementById('edit-id-user').value = id_user;
        document.getElementById('edit-nama').value = guru.nama_lengkap || '';
        document.getElementById('edit-email').value = guru.email || '';
        document.getElementById('edit-status').value = guru.status || 'Aktif';
        document.getElementById('edit-nip').value = guru.nip_nipppk || '';
        document.getElementById('edit-jabatan').value = guru.jabatan || '';
        document.getElementById('edit-pendidikan').value = guru.pendidikan || '';
        // Format tanggal YYYY-MM-DD untuk input type="date"
        document.getElementById('edit-mulai-tugas').value = guru.mulai_tugas ? guru.mulai_tugas.split('T')[0] : ''; 
        document.getElementById('edit-alamat').value = guru.alamat || '';
        document.getElementById('edit-status-keluarga').value = guru.status_keluarga || '';
        document.getElementById('edit-telepon').value = guru.nomor_telepon || '';
        console.log("[bukaEditModal] Form terisi."); 

        // 3. Tampilkan modal
        console.log("[bukaEditModal] Menampilkan modal..."); 
        if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
            // Dapatkan instance modal yang sudah ada ATAU buat baru
            let editModal = bootstrap.Modal.getInstance(modalElement);
            if (!editModal) {
                editModal = new bootstrap.Modal(modalElement);
            }
            editModal.show();
            console.log("[bukaEditModal] Modal seharusnya tampil."); 
        } else {
             console.error("[bukaEditModal] bootstrap.Modal tidak ditemukan!");
             alert("Error: Komponen modal tidak dapat dimuat.");
        }

    } catch (error) {
        console.error("Error membuka modal edit:", error);
        alert(`Error: ${error.message}`);
    }
}
// ================================================
// === FUNGSI BARU UNTUK HAPUS GURU ===
// ================================================
async function hapusGuru(id_user, nama_lengkap) {
    // Tampilkan konfirmasi
    if (!confirm(`Apakah Anda yakin ingin menghapus guru "${nama_lengkap}" secara permanen? Tindakan ini tidak dapat dibatalkan.`)) {
        return; // Batalkan jika pengguna menekan Cancel
    }

    try {
        const response = await fetch(`/api/admin/guru/${id_user}`, { 
            method: 'DELETE',
            headers: headers // Gunakan headers global yang sudah ada token
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.message || 'Gagal menghapus guru.');
        }

        alert(result.message); // Tampilkan pesan sukses dari backend
        muatDataGuru(); // Muat ulang tabel untuk menghapus baris guru

    } catch (error) {
        console.error("Error menghapus guru:", error);
        alert(`Error: ${error.message}`);
    }
}
