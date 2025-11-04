// File: public/script-admin-dashboard.js (HANYA PRESENSI ADMIN)

document.addEventListener('DOMContentLoaded', function() {
    // =================================================================
    // BAGIAN 1: DEKLARASI VARIABEL & REFERENSI ELEMEN (PRESENSI ADMIN)
    // =================================================================
    const token = localStorage.getItem('token');
    if (!token) {
        console.warn("[Presensi Admin] Token tidak ditemukan, fitur dinonaktifkan.");
        const tombolPresensi = document.getElementById('admin-tombol-presensi');
        if (tombolPresensi) tombolPresensi.disabled = true;
        return; 
    }

    const waktuSekarangElem = document.getElementById('admin-waktu-sekarang');
    const statusPresensiElem = document.getElementById('admin-status-presensi');
    const tombolPresensi = document.getElementById('admin-tombol-presensi');
    const teksTombolPresensi = document.getElementById('admin-teks-tombol-presensi');
    let statusSaatIni = null; 

//    const cameraModal = new bootstrap.Modal(document.getElementById('cameraModal'));
    const cameraModalElement = document.getElementById('adminCameraModal');
    const cameraModal = cameraModalElement ? new bootstrap.Modal(cameraModalElement) : null;
    const videoElem = document.getElementById('admin-camera-preview');
    const canvasElem = document.getElementById('admin-camera-canvas');
    const tombolAmbilFoto = document.getElementById('admin-tombol-ambil-foto');
    let stream; 

    const TARGET_WIDTH = 320; 
    const TARGET_HEIGHT = 240; 
    const JPEG_QUALITY = 0.6; 

    // =================================================================
    // BAGIAN 2: FUNGSI UTAMA & INISIALISASI (PRESENSI ADMIN)
    // =================================================================
    
    // Cek elemen penting SEBELUM lanjut
    if (!waktuSekarangElem || !statusPresensiElem || !tombolPresensi || !cameraModal || !videoElem || !canvasElem || !tombolAmbilFoto) {
        console.error("[Presensi Admin] Satu atau lebih elemen presensi admin tidak ditemukan di HTML.");
        return; 
    }

    // Jalankan jam
    setInterval(() => {
        waktuSekarangElem.textContent = new Date().toLocaleTimeString('en-GB');
    }, 1000);

    // Pasang listener
    tombolPresensi.addEventListener('click', handleTombolPresensiAdmin);
    tombolAmbilFoto.addEventListener('click', handleAmbilFotoAdmin);

    // Muat status presensi awal admin
    muatStatusPresensiAdmin();

    // =================================================================
    // BAGIAN 3: FUNGSI-FUNGSI LOGIKA (PRESENSI ADMIN)
    // =================================================================

    async function muatStatusPresensiAdmin() {
        /* ... (Kode muatStatusPresensiAdmin Anda yang sudah benar) ... */
        statusPresensiElem.textContent = "Memeriksa status...";
        tombolPresensi.disabled = true;
        try {
            const response = await fetch('/api/guru/status', { headers: { 'Authorization': 'Bearer ' + token } });
            if (!response.ok) throw new Error('Gagal memuat status presensi.');
            const data = await response.json();
            updateUIAdmin(data.status_presensi);
        } catch (error) {
            console.error("[Presensi Admin] Error muat status:", error);
            statusPresensiElem.textContent = "Gagal memuat status.";
        }
    }

    function updateUIAdmin(status) {

        statusSaatIni = status.kondisi;
        tombolPresensi.disabled = false; 
        switch (status.kondisi) {
            case 'BELUM_MASUK': 
                statusPresensiElem.textContent = "Anda belum presensi masuk hari ini."; 
                teksTombolPresensi.textContent = "Presensi Masuk"; 
                tombolPresensi.className = 'btn btn-primary btn-lg w-100'; 
                break;
            case 'SUDAH_MASUK':
                statusPresensiElem.textContent = `Masuk: ${formatWaktuLokalSimple(status.jam_masuk)}`; 
                teksTombolPresensi.textContent = "Presensi Pulang";
                tombolPresensi.className = 'btn btn-success btn-lg w-100';
                break;
            case 'SUDAH_PULANG':
                statusPresensiElem.textContent = `Masuk: ${formatWaktuLokalSimple(status.jam_masuk)} | Pulang: ${formatWaktuLokalSimple(status.jam_pulang)}`;
                teksTombolPresensi.textContent = "Selesai";
                tombolPresensi.className = 'btn btn-secondary btn-lg w-100';
                tombolPresensi.disabled = true; 
                break;        
        }
    }
    
    async function handleTombolPresensiAdmin() {
        /* ... (Kode handleTombolPresensiAdmin Anda yang sudah benar) ... */
         if (!statusSaatIni || statusSaatIni === 'SUDAH_PULANG') return;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            videoElem.srcObject = stream;
            cameraModal.show();
        } catch (error) { console.error("[Presensi Admin] Error akses kamera:", error); alert("Gagal akses kamera."); }
    }

    async function handleAmbilFotoAdmin() {

        canvasElem.width = TARGET_WIDTH; canvasElem.height = TARGET_HEIGHT;
        const ctx = canvasElem.getContext('2d');
        ctx.drawImage(videoElem, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);
        const foto_base64 = canvasElem.toDataURL('image/jpeg', JPEG_QUALITY);
        if (stream) { stream.getTracks().forEach(track => track.stop()); }
        cameraModal.hide();
        statusPresensiElem.textContent = 'Mengambil lokasi GPS...';
        tombolPresensi.disabled = true; teksTombolPresensi.textContent = 'Memproses...';
        try {
            const position = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 }));
            const dataPresensi = { latitude: position.coords.latitude, longitude: position.coords.longitude };
            let endpoint = '';
            if (statusSaatIni === 'BELUM_MASUK') { endpoint = '/api/presensi/masuk'; dataPresensi.foto_masuk = foto_base64; } 
            else if (statusSaatIni === 'SUDAH_MASUK') { endpoint = '/api/presensi/pulang'; dataPresensi.foto_pulang = foto_base64; } 
            else { throw new Error("Status presensi tidak valid."); }
            const response = await fetch(endpoint, { method: 'POST', headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(dataPresensi) });
            const hasil = await response.json();
            if (!response.ok) throw new Error(hasil.message || 'Gagal mengirim data presensi.');
            alert(hasil.message);
            await muatStatusPresensiAdmin(); 
        } catch (error) { console.error('[Presensi Admin] Error:', error); alert(`Error: ${error.message}`); await muatStatusPresensiAdmin(); } 
        finally { if (statusSaatIni !== 'SUDAH_PULANG') tombolPresensi.disabled = false; }
    }
    
    function formatWaktuLokalSimple(waktuString) {
      if (!waktuString) return '-';
      return waktuString.substring(0, 5); // Hanya HH:MM
    }

});