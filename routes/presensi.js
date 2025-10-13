// =================================================================
// routes/presensi.js (VERSI PERBAIKAN)
// =================================================================

const express = require('express');
const router = express.Router();
const db = require('../database');
const { checkAuth } = require('../middleware/auth');

// 1. Membuat Middleware untuk pengaturan
// Middleware ini akan berjalan setiap kali ada request ke endpoint presensi.
const loadPengaturanMiddleware = async (req, res, next) => {
    try {
        const [rows] = await db.query("SELECT * FROM pengaturan;");
        // Konversi hasil query array menjadi objek, sekaligus mengubah tipe data
        const settings = rows.reduce((obj, item) => {
            let value = item.setting_value;
            // Konversi nilai yang seharusnya angka menjadi tipe data number
            if (item.setting_key === 'school_lat' || item.setting_key === 'school_lon') {
                value = parseFloat(value);
            } else if (item.setting_key === 'radius_meter') {
                value = parseInt(value, 10);
            }
            obj[item.setting_key] = value;
            return obj;
        }, {});
        
        // Simpan pengaturan ke dalam objek request agar bisa diakses di endpoint
        req.pengaturan = settings; 
        next(); // Lanjutkan ke proses selanjutnya (endpoint)
    } catch (error) {
        console.error("Gagal memuat pengaturan:", error);
        // Jika gagal, kirim response error dan jangan lanjutkan
        res.status(500).json({ message: "Server tidak dapat memuat konfigurasi pengaturan." });
    }
};

// router.use() akan menerapkan middleware ini ke semua rute di file ini.
router.use(loadPengaturanMiddleware);

const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Radius bumi dalam meter
    const φ1 = lat1 * Math.PI/180, φ2 = lat2 * Math.PI/180, Δφ = (lat2-lat1) * Math.PI/180, Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

// --- ENDPOINT PRESENSI MASUK ---
// --- ENDPOINT PRESENSI MASUK (VERSI BARU) ---
router.post('/masuk', checkAuth, async (req, res) => {
    // Bagian ini tidak berubah, masih mengambil pengaturan yang sudah ada
    const { school_lat, school_lon, radius_meter, batas_jam_masuk } = req.pengaturan;
    const id_guru = req.user.id_guru;
    // --- [DIUBAH] --- Ambil latitude & longitude dari body untuk disimpan
    const { latitude, longitude, foto_masuk } = req.body; 
    
    try {
        const tanggal_hari_ini = new Date().toISOString().slice(0, 10);

        // Pengecekan presensi yang sudah ada (tidak berubah)
        const [existing] = await db.query("SELECT * FROM presensi WHERE id_guru = ? AND tanggal = ?;", [id_guru, tanggal_hari_ini]);
        if (existing.length > 0) return res.status(409).json({ message: "Anda sudah melakukan presensi masuk hari ini." });
        
        // Pengecekan data lokasi (tidak berubah)
        if (typeof latitude === 'undefined' || typeof longitude === 'undefined' || typeof school_lat === 'undefined' || typeof school_lon === 'undefined') {
            return res.status(400).json({ message: "Data lokasi tidak lengkap untuk perhitungan jarak." });
        }

        // Perhitungan jarak (tidak berubah)
        const jarak = calculateDistance(latitude, longitude, school_lat, school_lon);
        if (jarak > radius_meter) {
            return res.status(403).json({ message: `Lokasi Anda terlalu jauh dari sekolah (${Math.round(jarak)} meter). Radius yang diizinkan: ${radius_meter} meter.` });
        }

        // ===================================================================
        // ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ [BAGIAN INI DIPERBARUI] ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
        // ===================================================================
        const waktuSekarang = new Date();
        const jam_sekarang_string = waktuSekarang.toLocaleTimeString('en-GB');

        // 1. Tentukan nilai untuk `is_telat` (true/false)
        const hariIni = waktuSekarang.toISOString().slice(0, 10);
        const waktuBatasMasuk = new Date(`${hariIni}T${formatWaktuLokal(batas_jam_masuk)}`);
        const is_telat = waktuSekarang > waktuBatasMasuk; // --- [BARU] --- Hasilnya akan true atau false

        // 2. Tentukan nilai untuk `status_kehadiran`
        const status_kehadiran = 'Hadir'; // --- [BARU] --- Untuk presensi masuk, statusnya selalu 'Hadir'

        // 3. Query INSERT yang baru sesuai struktur tabel
        const query_insert = `
            INSERT INTO presensi 
            (id_guru, tanggal, jam_masuk, foto_masuk, status_kehadiran, is_telat, latitude_masuk, longitude_masuk) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        `;
        
        // --- [DIUBAH] --- Eksekusi query dengan data yang sudah disiapkan
        await db.query(query_insert, [
            id_guru, 
            tanggal_hari_ini, 
            jam_sekarang_string, 
            foto_masuk, 
            status_kehadiran, // Kolom baru
            is_telat,         // Kolom baru
            latitude,         // Kolom baru (menyimpan bukti lokasi)
            longitude         // Kolom baru (menyimpan bukti lokasi)
        ]);
        
        // --- [DIUBAH] --- Kirim response sukses yang baru
        const status_pesan = is_telat ? 'Terlambat' : 'Tepat Waktu';
        res.status(201).json({ message: `Presensi masuk berhasil pada jam ${formatWaktuLokal(jam_sekarang_string)}. Status: ${status_pesan}.` });
        // ===================================================================
        // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ [AKHIR BAGIAN DIPERBARUI] ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
        // ===================================================================

    } catch (error) {
        console.error("Error saat presensi masuk:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});

// --- ENDPOINT PRESENSI PULANG (DENGAN VALIDASI RADIUS) ---
router.post('/pulang', checkAuth, async (req, res) => {
    // --- [BARU] --- Ambil pengaturan dan data lokasi dari request
    const { school_lat, school_lon, radius_meter } = req.pengaturan;
    const id_guru = req.user.id_guru;
    const { foto_pulang, latitude, longitude } = req.body; 
    
    const tanggal_hari_ini = new Date().toISOString().slice(0, 10);
    const jam_sekarang = new Date().toLocaleTimeString('en-GB');

    try {
        // Pengecekan presensi masuk (tidak berubah)
        const [presensiMasuk] = await db.query("SELECT * FROM presensi WHERE id_guru = ? AND tanggal = ?;", [id_guru, tanggal_hari_ini]);
        if (presensiMasuk.length === 0) return res.status(404).json({ message: "Anda belum melakukan presensi masuk hari ini." });
        if (presensiMasuk[0].jam_pulang) return res.status(409).json({ message: "Anda sudah melakukan presensi pulang hari ini." });

        // ===================================================================
        // ▼▼▼▼▼▼▼▼▼▼▼▼▼ [LOGIKA VALIDASI LOKASI DITAMBAHKAN] ▼▼▼▼▼▼▼▼▼▼▼▼▼
        // ===================================================================
        if (typeof latitude === 'undefined' || typeof longitude === 'undefined') {
            return res.status(400).json({ message: "Data lokasi (GPS) tidak terkirim." });
        }

        const jarak = calculateDistance(latitude, longitude, school_lat, school_lon);
        
        if (jarak > radius_meter) {
            return res.status(403).json({ message: `Lokasi Anda terlalu jauh dari sekolah (${Math.round(jarak)} meter) untuk melakukan presensi pulang.` });
        }
        // ===================================================================
        // ▲▲▲▲▲▲▲▲▲▲▲▲▲ [AKHIR LOGIKA VALIDASI LOKASI] ▲▲▲▲▲▲▲▲▲▲▲▲▲
        // ===================================================================

        // Query UPDATE (tidak berubah, tetap aman)
        await db.query("UPDATE presensi SET jam_pulang = ?, foto_pulang = ? WHERE id_presensi = ?;", [jam_sekarang, foto_pulang, presensiMasuk[0].id_presensi]);
        
        res.status(200).json({ message: `Presensi pulang berhasil pada jam ${formatWaktuLokal(jam_sekarang)}.` });

    } catch (error) {
        console.error("Error saat presensi pulang:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});

// --- ENDPOINT RIWAYAT PRESENSI (VERSI BARU) ---
router.get('/riwayat', checkAuth, async (req, res) => {
    const id_guru = req.user.id_guru;
    const { bulan, tahun } = req.query;
    if (!bulan || !tahun) return res.status(400).json({ message: "Parameter bulan dan tahun wajib diisi." });

    try {
        // --- [DIUBAH] --- Query SELECT mengambil kolom baru
        const query = `
            SELECT tanggal, jam_masuk, jam_pulang, status_kehadiran, is_telat 
            FROM presensi 
            WHERE id_guru = ? AND MONTH(tanggal) = ? AND YEAR(tanggal) = ?
            ORDER BY tanggal ASC;
        `;
        const [rows] = await db.query(query, [id_guru, bulan, tahun]);
        res.status(200).json(rows);
    } catch (error) {
        console.error("Error saat mengambil riwayat presensi:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});

function formatWaktuLokal(waktuUTC) {
    if (!waktuUTC) return '-';
    const tanggal = new Date(`1970-01-01T${waktuUTC}Z`);
    // Waktu zona waktu Asia/Jakarta (GMT+7) format 24 jam
    return tanggal.toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false 
    });
    };

module.exports = router;