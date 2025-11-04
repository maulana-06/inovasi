// File: /public/script-pengaturan.js (VERSI PERBAIKAN FINAL)

document.addEventListener('DOMContentLoaded', function() {
    // Referensi ke elemen form (Gunakan ID yang konsisten)
    const form = document.getElementById('form-pengaturan');
    const inputLatitude = document.getElementById('latitude');
    const inputLongitude = document.getElementById('longitude');    
    const inputJamMasuk = document.getElementById('jam_masuk');
    const inputJamPulang = document.getElementById('jam_pulang');
    const inputRadius = document.getElementById('radius_meter');
    const tombolSimpan = form.querySelector('button[type="submit"]'); // Dapatkan tombol submit
    const token = localStorage.getItem('token');

    // =================================================================
    // BAGIAN A: Mengambil dan Menampilkan Pengaturan Saat Ini
    // =================================================================
    async function muatPengaturan() {
        console.log("Mencoba memuat pengaturan..."); 
        if (!token) {
            alert("Token tidak ditemukan, silakan login ulang.");
            return;
        }
        try {
            const response = await fetch('/api/pengaturan', { 
                headers: { 'Authorization': 'Bearer ' + token }
            });
            if (!response.ok) {
                 const errorData = await response.json(); 
                throw new Error(errorData.message || 'Gagal memuat data pengaturan.');
            }
            
            const settings = await response.json();
            console.log("Pengaturan diterima:", settings); 
            
            if (inputLatitude) inputLatitude.value = settings.latitude || ''; 
            if (inputLongitude) inputLongitude.value = settings.longitude || ''; 

            if (inputJamMasuk) inputJamMasuk.value = settings.jam_masuk || '';
            if (inputJamPulang) inputJamPulang.value = settings.jam_pulang || '';
            if (inputRadius) inputRadius.value = settings.radius_meter || '';

        } catch (error) {
            console.error("Error memuat pengaturan:", error); // Tampilkan error di konsol
            alert(`Error: ${error.message}`);
        }
    }

    // =================================================================
    // BAGIAN B: Mengirim Perubahan Saat Form Disubmit
    // =================================================================
    async function simpanPengaturan(event) {
        event.preventDefault(); // Mencegah form refresh halaman
        
        if (tombolSimpan) {
            tombolSimpan.disabled = true;
            tombolSimpan.textContent = 'Menyimpan...';
        }

        const dataPengaturan = {
            latitude: inputLatitude.value.trim(), 
            longitude: inputLongitude.value.trim(), 
            radius_meter: inputRadius ? inputRadius.value : null,
            
            jam_masuk: inputJamMasuk ? inputJamMasuk.value : null,
            jam_pulang: inputJamPulang ? inputJamPulang.value : null
        };
        console.log("Mengirim pengaturan:", dataPengaturan); // Debug

        try {
            if (!token) throw new Error("Token tidak ditemukan.");

            const response = await fetch('/api/pengaturan', { // PUT /api/pengaturan
                method: 'PUT',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dataPengaturan)
            });

            const result = await response.json(); 

            if (response.ok) {
                alert('Pengaturan berhasil disimpan!');

            } else {
                throw new Error(result.message || `Gagal menyimpan pengaturan (Status: ${response.status})`);
            }
        } catch (error) {
            console.error("Error menyimpan pengaturan:", error); // Tampilkan error di konsol
            alert(`Error: ${error.message}`);
        } finally {

            if (tombolSimpan) {
                tombolSimpan.disabled = false;
                tombolSimpan.textContent = 'Simpan Pengaturan';
            }
        }
    }

    // =================================================================
    // INISIALISASI: Panggil muatPengaturan & pasang listener
    // =================================================================
    if (form) {
        form.addEventListener('submit', simpanPengaturan); 
        muatPengaturan();
    } else {
        console.error("Form pengaturan '#form-pengaturan' tidak ditemukan!");
    }
});