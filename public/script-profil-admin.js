// File: public/script-profil-admin.js (BARU)

document.addEventListener('DOMContentLoaded', () => {
    // Referensi Elemen (Sesuaikan dengan ID di profil-admin.html)
    const profilName = document.getElementById('profilName');
    // const profilRole = document.getElementById('profilRole'); // Opsional
    const gambarProfil = document.getElementById('gambarProfil');
    const emailValue = document.getElementById('emailValue'); // Elemen email baru
    const statusValue = document.getElementById('statusValue'); // Elemen status akun
    const inputFoto = document.getElementById('inputFoto');
    const ubahFotoBtn = document.getElementById('ubahFotoBtn'); // Tombol trigger upload
    const pesanStatus = document.getElementById('pesanStatus');
    const formUbahPassword = document.getElementById('formUbahPassword'); // Di dalam modal
    const pesanPasswordStatus = document.getElementById('pesanPasswordStatus'); // Di dalam modal

    const token = localStorage.getItem('token');
    if (!token) {
        alert('Anda harus login.');
        window.location.href = 'login.html';
        return;
    }
    const headers = { 'Authorization': 'Bearer ' + token };

    // --- Fungsi Utama Muat Data Profil Admin ---
    async function loadProfilDataAdmin() {
        pesanStatus.textContent = "Memuat data...";
        try {
            // Panggil API BARU untuk profil user (misal /api/profil/me)
            const response = await fetch('/api/profil/me', { headers }); 
            if (!response.ok) throw new Error('Gagal mengambil data profil');
            const data = await response.json(); // Data HANYA dari tabel_user

            if (profilName) profilName.textContent = data.nama_lengkap || '-';
            if (emailValue) emailValue.textContent = data.email || '-';
            if (statusValue) statusValue.textContent = data.status || '-';
            // Tampilkan foto (path mungkin perlu diawali / jika disimpan relatif ke public)
            if (gambarProfil) gambarProfil.src = data.foto_profil ? `/${data.foto_profil.replace('public/', '')}` : 'public/apple-touch-icon.png';

            pesanStatus.textContent = ""; 

        } catch (error) {
            console.error("Error memuat profil admin:", error);
            pesanStatus.textContent = `Error: ${error.message}`;
            pesanStatus.style.color = 'red';
            if (profilName) profilName.textContent = 'Error';
            if (emailValue) emailValue.textContent = '-';
            if (statusValue) statusValue.textContent = '-';
        }
    }

    // --- Fungsi Upload Foto (API BARU) ---
    async function uploadProfilPictureAdmin(file) {
        const formData = new FormData();
        formData.append('fotoProfil', file); // Nama field harus cocok dengan backend
        pesanStatus.textContent = 'Mengupload foto...';
        pesanStatus.style.color = 'grey';
        try {
            // Panggil API BARU untuk upload foto user
            const response = await fetch('/api/profil/foto', { 
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token }, // Content-Type diatur otomatis oleh FormData
                body: formData
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Gagal mengupload foto.');
            
            pesanStatus.textContent = result.message;
            pesanStatus.style.color = 'green';
            // Update gambar profil (tambahkan timestamp agar browser refresh)
            if (gambarProfil) gambarProfil.src = `/${result.filePath}?t=${new Date().getTime()}`; 

        } catch (error) {
            console.error("Error upload foto admin:", error);
            pesanStatus.textContent = `Error: ${error.message}`;
            pesanStatus.style.color = 'red';
        }
    }

    // --- Fungsi Ubah Password (API BARU) ---
    async function changePasswordAdmin(event) {
        event.preventDefault();
        pesanPasswordStatus.textContent = 'Memproses...'; 
        pesanPasswordStatus.style.color = 'grey';
        const dataPassword = {
            password_lama: document.getElementById('passwordLama').value,
            password_baru: document.getElementById('passwordBaru').value,
            konfirmasi_password_baru: document.getElementById('konfirmasiPasswordBaru').value
        };
        try {
            // Panggil API BARU untuk ubah password user
            const response = await fetch('/api/profil/password', { 
                method: 'PUT',
                headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
                body: JSON.stringify(dataPassword)
            });
            const hasil = await response.json();
            if (!response.ok) throw new Error(hasil.message || 'Gagal mengubah password.');
            
            pesanPasswordStatus.textContent = hasil.message;
            pesanPasswordStatus.style.color = 'green';
            if(formUbahPassword) formUbahPassword.reset(); // Reset form jika ada
            
            // Tutup modal setelah jeda
            setTimeout(() => {
                const modalElement = document.getElementById('passwordModal');
                const modalInstance = bootstrap.Modal.getInstance(modalElement);
                if (modalInstance) modalInstance.hide();
                pesanPasswordStatus.textContent = ''; // Kosongkan pesan
            }, 2000);

        } catch(error) {
            pesanPasswordStatus.textContent = `Error: ${error.message}`;
            pesanPasswordStatus.style.color = 'red';
        }
    }

    // --- Event Listeners ---
    if (ubahFotoBtn && inputFoto) {
        ubahFotoBtn.addEventListener('click', () => inputFoto.click());
        inputFoto.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) { uploadProfilPictureAdmin(file); }
        });
    } else {
        console.error("Tombol ubah foto atau input file tidak ditemukan.");
    }
    
    if (formUbahPassword) {
        formUbahPassword.addEventListener('submit', changePasswordAdmin);
    } else {
         console.error("Form ubah password tidak ditemukan.");
    }

    // Muat data awal
    loadProfilDataAdmin();
});