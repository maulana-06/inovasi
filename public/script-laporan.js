// File: public/script-laporan.js (VERSI BERSIH TANPA DUPLIKASI)

let dataLaporanTerakhir = []; 
let namaSekolahTerakhir = "NAMA SEKOLAH"; 
let daftarStaf = []; 

document.addEventListener('DOMContentLoaded', () => {
    // Panggil setup HANYA SATU KALI
    setupFilterTanggal(); 
    document.getElementById('tombol-tampilkan').addEventListener('click', muatLaporan);
    document.getElementById('tombol-cetak').addEventListener('click', () => window.print());
    
    document.getElementById('exportExcelBtn').addEventListener('click', exportKeExcel);

    // Pasang listener HANYA SATU KALI
    const tombolTampilkan = document.getElementById('tombol-tampilkan');
    if (tombolTampilkan) {
        tombolTampilkan.addEventListener('click', muatLaporan);
        console.log("Event listener untuk 'tombol-tampilkan' berhasil dipasang."); 
    } else {
        console.error("Tombol 'tombol-tampilkan' TIDAK DITEMUKAN!"); 
    }
    const tombolReset = document.getElementById('getGuruDataBtn');
    if (tombolReset) {
        tombolReset.addEventListener('click', buatAkunAwal);
    } else {
        console.error("Tombol 'getGuruDataBtn' tidak ditemukan!");
    }
});

// Definisikan variabel HANYA SATU KALI
const token = localStorage.getItem('token');
const headers = { 'Authorization': 'Bearer ' + token };

// ================================================
// === HANYA SATU FUNGSI setupFilterTanggal ===
// ================================================
function setupFilterTanggal() {
    const filterBulan = document.getElementById('filter-bulan');
    const filterTahun = document.getElementById('filter-tahun');
    // ... (Sisa kode setupFilterTanggal Anda yang sudah benar) ...
    const today = new Date();
    const currentMonth = today.getMonth() + 1; 
    const currentYear = today.getFullYear();
    if (!filterBulan || !filterTahun) { console.error("Dropdown filter tidak ditemukan!"); return; }
    filterBulan.innerHTML = ''; filterTahun.innerHTML = '';
    const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    namaBulan.forEach((bulan, index) => filterBulan.add(new Option(bulan, index + 1)));
    filterBulan.value = currentMonth; 
    for (let i = 0; i < 5; i++) { const tahun = currentYear - i; filterTahun.add(new Option(tahun, tahun)); }
    filterTahun.value = currentYear; 
    console.log("Dropdown bulan dan tahun berhasil diisi."); 
}

// ================================================
// === HANYA SATU FUNGSI muatLaporan ===
// ================================================
async function muatLaporan() {
    console.log("Fungsi muatLaporan() dipanggil!"); 
    const exportBtn = document.getElementById('exportExcelBtn');
    const cetakBtn = document.getElementById('tombol-cetak');
    const tbody = document.getElementById('tabel-laporan-body');
    const filterBulanElement = document.getElementById('filter-bulan');
    const filterTahunElement = document.getElementById('filter-tahun');
    const judulLaporanElement = document.getElementById('judul-laporan');

    if (!filterBulanElement || !filterTahunElement || !judulLaporanElement) { /* ... (error handling elemen) ... */ return; }
    
    // Nonaktifkan tombol & reset
    exportBtn.disabled = true; cetakBtn.disabled = true;
    dataLaporanTerakhir = []; namaSekolahTerakhir = "NAMA SEKOLAH"; daftarStaf = []; 
    if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="text-muted">Memuat data...</td></tr>';

    const bulan = filterBulanElement.value; 
    const tahun = filterTahunElement.value; 
    
    // Ambil Nama Bulan (Sudah benar)
    let namaBulanTerpilih = "(Bulan Error)"; 
    try {
        const selectedOption = filterBulanElement.options[filterBulanElement.selectedIndex]; 
        if (selectedOption) namaBulanTerpilih = selectedOption.text; 
        else console.warn("Tidak dapat menemukan option bulan terpilih");
    } catch (e) { console.error("Error ambil teks bulan:", e); }
    judulLaporanElement.textContent = `Laporan Bulan ${namaBulanTerpilih} Tahun ${tahun}`;

    try {
        // 1. Ambil Daftar Staf
        console.log("Fetching staff list...");
        const staffResponse = await fetch('/api/admin/guru/all-staff', { headers });
        if (!staffResponse.ok) throw new Error(`Gagal mengambil daftar staf (${staffResponse.status})`);
        daftarStaf = await staffResponse.json();
        console.log("Staff list fetched:", daftarStaf);

        // 2. Inisialisasi Rekap
        const rekap = {};
        if (daftarStaf.length > 0) {
            daftarStaf.forEach(staf => {
                rekap[staf.nama_lengkap] = { Hadir: 0, Sakit: 0, Izin: 0, Alpa: 0, Terlambat: 0 };
            });
            cetakBtn.disabled = false; // Aktifkan cetak jika ada staf
        } else { console.warn("Daftar staf kosong."); }
        console.log("Rekap initialized:", rekap);

        // 3. Ambil Data Laporan Presensi (jika ada staf)
        if (daftarStaf.length > 0) {
            const tanggalMulai = `${tahun}-${String(bulan).padStart(2, '0')}-01`;
            const tanggalAkhir = `${tahun}-${String(bulan).padStart(2, '0')}-${new Date(tahun, bulan, 0).getDate()}`;
            console.log("Fetching attendance data..."); 
            const laporanResponse = await fetch(`/api/laporan?mulai=${tanggalMulai}&selesai=${tanggalAkhir}`, { headers });
            
            if (laporanResponse.ok) { 
                const responseData = await laporanResponse.json(); 
                dataLaporanTerakhir = responseData.laporan || []; 
                namaSekolahTerakhir = responseData.namaSekolah; 
                console.log("Attendance data fetched:", dataLaporanTerakhir); 

                // 4. Isi Objek Rekap 
                if (Array.isArray(dataLaporanTerakhir) && dataLaporanTerakhir.length > 0) { 
                    dataLaporanTerakhir.forEach(item => { 
                         if (rekap[item.nama_lengkap] && item.status !== null && item.status !== undefined) {
                            let statusLower = String(item.status).toLowerCase(); 
                            if (statusLower === 'hadir') rekap[item.nama_lengkap].Hadir++;
                            else if (statusLower === 'terlambat') { rekap[item.nama_lengkap].Terlambat++; rekap[item.nama_lengkap].Hadir++; } 
                            else if (statusLower === 'sakit') rekap[item.nama_lengkap].Sakit++;
                            else if (statusLower === 'izin') rekap[item.nama_lengkap].Izin++;
                        }
                    });
                    exportBtn.disabled = false; // Aktifkan export jika ada data presensi
                }
            } else { console.warn("Gagal mengambil data laporan presensi."); }
        }
        
        // 5. Tampilkan Tabel Rekap
        console.log("Objek Rekap Final:", rekap); 
        tampilkanTabelRekap(rekap); 
        
    } catch (error) {
        console.error("Error di muatLaporan:", error);
        alert(error.message);
        if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="text-danger">Error: ${error.message}</td></tr>`;
        exportBtn.disabled = true; cetakBtn.disabled = true;
    }
}
// ================================================
// === FUNGSI tampilkanTabelRekap ===
// ================================================
function tampilkanTabelRekap(rekap) {
    const tbody = document.getElementById('tabel-laporan-body');
    if (!tbody) { 
        console.error("Elemen tbody '#tabel-laporan-body' tidak ditemukan!");
        return; 
    }
    
    tbody.innerHTML = ''; // Kosongkan
    let no = 1;
    let rowCount = 0; 
    for (const nama in rekap) {
        rowCount++;
        const data = rekap[nama];
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${no++}</td>
            <td class="text-start">${nama}</td>
            <td>-</td> 
            <td>${data.Hadir !== undefined ? data.Hadir : 0}</td>
            <td>${data.Sakit !== undefined ? data.Sakit : 0}</td>
            <td>${data.Izin !== undefined ? data.Izin : 0}</td>
            <td>${data.Alpa !== undefined ? data.Alpa : 0}</td>
            <td>${data.Terlambat !== undefined ? data.Terlambat : 0}</td>
        `;
        tbody.appendChild(tr);
    }
    
    if (rowCount === 0) { 
        tbody.innerHTML = '<tr><td colspan="8" class="text-muted">Tidak ada data rekapitulasi untuk periode ini.</td></tr>';
    }
}
// ================================================
// === FUNGSI EXPORT EXCEL BARU (FORMAT GRID FINAL SESUAI GAMBAR) ===
// ================================================
function exportKeExcel() {
    if (dataLaporanTerakhir.length === 0) {
        alert("Tidak ada data untuk diekspor.");
        return;
    }

    // 1. Info Bulan & Tahun (Tetap Sama)
    const filterBulan = document.getElementById('filter-bulan');
    const filterTahun = document.getElementById('filter-tahun');
    const bulan = parseInt(filterBulan.value);
    const tahun = parseInt(filterTahun.value);
    const namaBulan = filterBulan.options[filterBulan.selectedIndex].text.toUpperCase();
    const jumlahHari = new Date(tahun, bulan, 0).getDate(); 

    // 2. Siapkan Header Excel (Struktur Final)
    const headerRows = [
        [namaSekolahTerakhir], // Baris 0: Nama Sekolah
        ["Laporan Kehadiran Guru dan Staff"], // Baris 1: Judul
        [`Tahun Pelajaran ${tahun}-${tahun + 1}`], // Baris 2: Tahun Ajaran
        [], // Baris 3: Kosong
        // Baris 4 (Indeks 4) - Judul Utama Kolom
        ["No", "Nama Guru/Staff", "Absensi"], 
        // Baris 5 (Indeks 5) - Subjudul Kolom (Jam / ✓)
        ["", "", ""] 
    ];
    const merges = []; 

    // Tambahkan judul BULAN di atas tanggal (di baris ke-4, indeks 3)
    headerRows[3][3] = namaBulan; // Mulai dari kolom ke-4 (indeks 3)
    merges.push({ s: { r: 3, c: 3 }, e: { r: 3, c: 3 + (jumlahHari * 2) - 1 } }); 
    
    // Tambahkan kolom tanggal
    for (let i = 1; i <= jumlahHari; i++) {
        headerRows[4].push(i);      
        headerRows[4].push("");     
        headerRows[5].push("");  
        headerRows[5].push("");    
        merges.push({ s: { r: 4, c: 3 + ((i - 1) * 2) }, e: { r: 4, c: 3 + ((i - 1) * 2) + 1 } }); 
    }

    // Tambahkan kolom rekapitulasi
    const kolomMulaiRekap = 3 + (jumlahHari * 2);
    headerRows[4].push("Jumlah Kehadiran"); 
    headerRows[5].push("Hadir"); headerRows[5].push("Sakit"); headerRows[5].push("Izin");
    headerRows[5].push("Alpa"); headerRows[5].push("Jumlah");   
    merges.push({ s: { r: 4, c: kolomMulaiRekap }, e: { r: 4, c: kolomMulaiRekap + 4 } }); 

    // 3. Kelompokkan Data per Guru (Sambil simpan NIP)
    const dataPerGuru = {};
    dataLaporanTerakhir.forEach(item => {
        if (!dataPerGuru[item.nama_lengkap]) {
             dataPerGuru[item.nama_lengkap] = { data: [], nip: item.nip_nipppk || '-' };
        }
        dataPerGuru[item.nama_lengkap].data.push(item); 
    });

    // 4. Proses Data per Guru (Struktur Final)
    const dataRows = [];
    let noUrut = 1;
    let barisSaatIni = headerRows.length; 

    for (const nama in dataPerGuru) {
        const presensiGuru = dataPerGuru[nama].data;
        const nipGuru = dataPerGuru[nama].nip; 

        // Buat DUA baris data untuk setiap guru
        const barisNamaDanMasuk = [noUrut, nama, "Masuk"]; // Baris Atas
        const barisNipDanPulang = ["", `${nipGuru}`, "Pulang"]; // Baris Bawah

        let countHadir = 0, countSakit = 0, countIzin = 0, countAlpa = 0;

        for (let hari = 1; hari <= jumlahHari; hari++) {
            const tanggalCari = `${tahun}-${String(bulan).padStart(2, '0')}-${String(hari).padStart(2, '0')}`;
            const dataHariIni = presensiGuru.find(p => p.tanggal.startsWith(tanggalCari)); 
            
            let jamMasuk = "", cekMasuk = "", jamPulang = "", cekPulang = "";
            
            if (dataHariIni) {
                if (dataHariIni.waktu_masuk) jamMasuk = dataHariIni.waktu_masuk.substring(0, 5).replace(':', '.');
                if (dataHariIni.waktu_pulang) jamPulang = dataHariIni.waktu_pulang.substring(0, 5).replace(':', '.');
                
                if (dataHariIni.status === 'hadir' || dataHariIni.status === 'terlambat') {
                    if (jamMasuk) cekMasuk = "✓"; 
                    if (jamPulang) cekPulang = "✓"; 
                    countHadir++;
                } else if (dataHariIni.status === 'sakit') {
                    cekMasuk = "S"; cekPulang = "S"; countSakit++;
                } else if (dataHariIni.status === 'izin') {
                    cekMasuk = "I"; cekPulang = "I"; countIzin++;
                }
            } 
            // Isi baris atas (Masuk)
            barisNamaDanMasuk.push(jamMasuk); 
            barisNamaDanMasuk.push(cekMasuk);
            // Isi baris bawah (Pulang)
            barisNipDanPulang.push(jamPulang);
            barisNipDanPulang.push(cekPulang);
        }
        
        countAlpa = 0; 
        const jumlahTotal = countHadir + countSakit + countIzin + countAlpa;

        // Tambahkan rekap HANYA ke baris atas
        barisNamaDanMasuk.push(countHadir); barisNamaDanMasuk.push(countSakit);
        barisNamaDanMasuk.push(countIzin); barisNamaDanMasuk.push(countAlpa);
        barisNamaDanMasuk.push(jumlahTotal);
        
        // Tambahkan sel kosong ke baris bawah untuk menyamakan panjang
        for (let i = 0; i < 5; i++) barisNipDanPulang.push("");

        dataRows.push(barisNamaDanMasuk);
        dataRows.push(barisNipDanPulang);

        // Tambahkan merge untuk No dan Nama
        merges.push({ s: { r: barisSaatIni, c: 0 }, e: { r: barisSaatIni + 1, c: 0 } }); // Merge No
        // Nama dan NIP TIDAK di-merge lagi
        // merges.push({ s: { r: barisSaatIni, c: 1 }, e: { r: barisSaatIni + 1, c: 1 } }); 

        noUrut++;
        barisSaatIni += 2; 
    }

    // 5. Gabungkan Header dan Data
    const finalData = [...headerRows, ...dataRows];

    // 6. Buat Worksheet
    const ws = XLSX.utils.aoa_to_sheet(finalData);

    // 7. Terapkan Merge Cells
    ws['!merges'] = merges;

    // 8. Atur Lebar Kolom
    const cols = [{ wch: 4 }, { wch: 25 }, { wch: 8 }]; // No, Nama, Absensi
    for (let i = 0; i < jumlahHari; i++) { 
        cols.push({ wch: 6 }); // Kolom Jam 
        cols.push({ wch: 3 }); // Kolom Centang
    } 
    for (let i = 0; i < 5; i++) { cols.push({ wch: 6 }); } // Kolom Rekap
    ws['!cols'] = cols;

    // 9. Buat Workbook dan Unduh
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Rekap ${namaBulan}`); 
    const namaFile = `Rekap_Presensi_${namaBulan}_${tahun}.xlsx`;
    XLSX.writeFile(wb, namaFile);
}
// ================================================
// === FUNGSI BARU UNTUK RESET PASSWORD ===
// ================================================
async function buatAkunAwal() {
    // Konfirmasi Super Penting!
    if (!confirm("PERINGATAN!\n\nAnda akan me-reset password SEMUA akun GURU di sekolah ini ke password default baru.\n\nApakah Anda yakin ingin melanjutkan?")) {
        return; // Batalkan jika tidak yakin
    }

    const tombolReset = document.getElementById('getGuruDataBtn');
    const hasilDiv = document.getElementById('hasilDataGuru');
    const dataOutputElem = document.getElementById('dataOutput');
    const errorMsgElem = document.getElementById('errorMessage');

    // Tampilkan loading & sembunyikan hasil/error lama
    tombolReset.disabled = true;
    tombolReset.innerHTML = '<i class="spinner-border spinner-border-sm me-2"></i>Memproses...';
    hasilDiv.classList.add('d-none');
    errorMsgElem.classList.add('d-none');
    dataOutputElem.textContent = '';

    try {
        // Panggil API Backend BARU
        const response = await fetch('/api/admin/guru/reset-passwords', {
            method: 'POST',
            headers: headers // Gunakan headers global (sudah ada token)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || `Gagal melakukan reset (Status: ${response.status})`);
        }

        // Tampilkan hasil kredensial
        let outputText = `Password Default Baru: ${result.kredensial[0]?.passwordBaru || '(Tidak ada guru)'}\n\n`; // Ambil password dari data pertama
        outputText += "Daftar Akun Guru:\n";
        outputText += "===================\n";
        result.kredensial.forEach(akun => {
            outputText += `Nama  : ${akun.nama}\n`;
            outputText += `Email : ${akun.email}\n`;
            outputText += `Pass  : ${akun.passwordBaru}\n`; // Tampilkan password baru
            outputText += "-------------------\n";
        });

        dataOutputElem.textContent = outputText;
        hasilDiv.classList.remove('d-none'); // Tampilkan div hasil
        alert(result.message); // Tampilkan pesan sukses

    } catch (error) {
        console.error("Error saat reset password:", error);
        errorMsgElem.textContent = `Error: ${error.message}`;
        errorMsgElem.classList.remove('d-none'); // Tampilkan pesan error
    } finally {
        // Kembalikan tombol ke normal
        tombolReset.disabled = false;
        tombolReset.innerHTML = '<i class="bi bi-shield-lock-fill me-2"></i>Buat & Tampilkan Kredensial Awal';
    }
}