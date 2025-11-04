// File: public/script-koreksi-presensi.js (BARU)

document.addEventListener('DOMContentLoaded', () => {
    // Referensi elemen
    const filterMulai = document.getElementById('filter-mulai');
    const filterSelesai = document.getElementById('filter-selesai');
    const tombolTampilkan = document.getElementById('tombol-tampilkan-koreksi');
    const tabelBody = document.getElementById('tabel-koreksi-body');
    const formEdit = document.getElementById('form-edit-koreksi');
    const editModalElement = document.getElementById('modal-edit-presensi');
    const editModal = editModalElement ? new bootstrap.Modal(editModalElement) : null;

    // Ambil token
    const token = localStorage.getItem('token');
    if (!token) {
        alert("Sesi tidak valid, silakan login ulang.");
        window.location.href = 'login.html';
        return;
    }
    const headers = { 
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
     };

    // Set tanggal default (misal: 7 hari terakhir)
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6); // 7 hari termasuk hari ini
    if (filterMulai) filterMulai.value = sevenDaysAgo.toISOString().split('T')[0];
    if (filterSelesai) filterSelesai.value = today.toISOString().split('T')[0];

    // Pasang Event Listeners
    if (tombolTampilkan) {
        tombolTampilkan.addEventListener('click', muatDataKoreksi);
    }
    if (formEdit) {
        formEdit.addEventListener('submit', simpanKoreksi);
    }
    
    // ================================================
    // FUNGSI UTAMA
    // ================================================

    // 1. Muat Data Presensi ke Tabel
    async function muatDataKoreksi() {
        if (!filterMulai || !filterSelesai) return; // Exit jika elemen filter tidak ada
        
        const tanggalMulai = filterMulai.value;
        const tanggalSelesai = filterSelesai.value;
        
        if (!tanggalMulai || !tanggalSelesai) {
            alert('Harap pilih tanggal mulai dan selesai.');
            return;
        }

        tabelBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Memuat data...</td></tr>';

        try {
            // Panggil API GET /api/koreksi-presensi?mulai=...&selesai=...
            const response = await fetch(`/api/koreksi-presensi?mulai=${tanggalMulai}&selesai=${tanggalSelesai}`, { headers });
            
            if (!response.ok) {
                 const errData = await response.json().catch(()=>({}));
                 throw new Error(errData.message || `Gagal memuat data (${response.status})`);
            }
            const dataPresensi = await response.json();
            tabelBody.innerHTML = ''; // Kosongkan

            if (dataPresensi.length === 0) {
                 tabelBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Tidak ada data presensi pada periode ini.</td></tr>';
                 return;
            }

            dataPresensi.forEach(item => {
                const tr = document.createElement('tr');
                // Simpan data asli di tombol edit untuk dioper ke modal
                const dataAsliString = JSON.stringify(item).replace(/"/g, '&quot;'); // Encode untuk atribut HTML

                tr.innerHTML = `
                    <td>${item.nama_lengkap || '-'}</td>
                    <td>${item.tanggal ? new Date(item.tanggal).toLocaleDateString('id-ID') : '-'}</td>
                    <td>${item.waktu_masuk ? item.waktu_masuk.substring(0, 5) : '-'}</td>
                    <td>${item.waktu_pulang ? item.waktu_pulang.substring(0, 5) : '-'}</td>
                    <td><span class="badge ${getStatusBadge(item.status)}">${item.status || '-'}</span></td>
                    <td>${item.keterangan || ''}</td>
                    <td class="text-center">
                        <button class="btn btn-warning btn-sm" 
                                onclick='bukaModalEdit(${item.id_presensi}, ${dataAsliString})'>
                            <i class="bi bi-pencil"></i> Edit
                        </button>
                    </td>
                `;
                tabelBody.appendChild(tr);
            });

        } catch (error) {
            console.error("Error memuat data koreksi:", error);
            tabelBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error: ${error.message}</td></tr>`;
        }
    }

    // 2. Buka Modal Edit dan Isi Form
    window.bukaModalEdit = function(id_presensi, dataAsli) { // Buat fungsi global agar bisa dipanggil dari onclick
        if (!editModal || !formEdit) return;
        
        console.log("Membuka edit untuk:", dataAsli);
        
        // Isi form
        formEdit.querySelector('#edit-id-presensi').value = id_presensi;
        formEdit.querySelector('#edit-nama-guru').textContent = dataAsli.nama_lengkap || '-';
        formEdit.querySelector('#edit-tanggal').textContent = dataAsli.tanggal ? new Date(dataAsli.tanggal).toLocaleDateString('id-ID') : '-';
        formEdit.querySelector('#edit-waktu-masuk').value = dataAsli.waktu_masuk || ''; // Kosongkan jika null
        formEdit.querySelector('#edit-waktu-pulang').value = dataAsli.waktu_pulang || ''; // Kosongkan jika null
        formEdit.querySelector('#edit-status').value = dataAsli.status || 'alpa';
        formEdit.querySelector('#edit-keterangan').value = dataAsli.keterangan || ''; // Ambil keterangan asli
        
        editModal.show();
    }

    // 3. Simpan Koreksi ke Backend
    async function simpanKoreksi(event) {
        event.preventDefault();
        if (!formEdit) return;

        const idPresensi = formEdit.querySelector('#edit-id-presensi').value;
        const tombolSimpan = formEdit.querySelector('button[type="submit"]');

        // Ambil data BARU dari form
        const dataUpdate = {
            waktu_masuk: formEdit.querySelector('#edit-waktu-masuk').value || null, // Kirim null jika kosong
            waktu_pulang: formEdit.querySelector('#edit-waktu-pulang').value || null, // Kirim null jika kosong
            status: formEdit.querySelector('#edit-status').value,
            keterangan: formEdit.querySelector('#edit-keterangan').value || null // Kirim keterangan baru
        };

        // Nonaktifkan tombol
        tombolSimpan.disabled = true;
        tombolSimpan.textContent = 'Menyimpan...';

        try {
             // Panggil API PUT /api/koreksi-presensi/:id_presensi
            const response = await fetch(`/api/koreksi-presensi/${idPresensi}`, {
                method: 'PUT',
                headers: headers, // Gunakan headers global
                body: JSON.stringify(dataUpdate)
            });

            const result = await response.json();
            if (!response.ok) {
                 throw new Error(result.message || `Gagal menyimpan koreksi (${response.status})`);
            }
            
            alert(result.message);
            editModal.hide(); // Tutup modal
            muatDataKoreksi(); // Muat ulang tabel

        } catch (error) {
            console.error("Error menyimpan koreksi:", error);
            alert(`Error: ${error.message}`);
        } finally {
            tombolSimpan.disabled = false;
            tombolSimpan.textContent = 'Simpan Perubahan Koreksi';
        }
    }

    // Helper Status Badge (bisa disamakan dengan script lain)
    function getStatusBadge(status) {
        status = status ? status.toLowerCase() : '';
        if (status === 'hadir') return 'bg-success';
        if (status === 'terlambat') return 'bg-warning text-dark';
        if (status === 'sakit') return 'bg-info text-dark';
        if (status === 'izin') return 'bg-primary';
        if (status === 'alpa') return 'bg-danger';
        return 'bg-secondary';
    }

    // Muat data awal saat halaman dibuka (opsional)
    // muatDataKoreksi(); 

}); // Akhir DOMContentLoaded