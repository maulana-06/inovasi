// File: routes/presensi.js (VERSI FINAL POSTGRESQL)

const express = require('express');
const router = express.Router();
const pool = require('../database');

// Fungsi Jarak
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; 
    const φ1 = lat1 * Math.PI/180, φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2); 
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

// ================================================
// ENDPOINT 1: POST /masuk (KRITIS)
// ================================================
router.post('/masuk', async (req, res) => {
    try {
        const idUser = req.user.userId;
        const idSekolah = req.user.sekolahId;
        const { latitude, longitude, foto_masuk } = req.body;
        
        // 1. Cek apakah user sudah presensi hari ini
        // KRITIS: Ganti CURDATE() -> CURRENT_DATE
        const existingResult = await pool.query(
            "SELECT id_presensi, status FROM tabel_presensi WHERE id_user = $1 AND id_sekolah = $2 AND tanggal = CURRENT_DATE", 
            [idUser, idSekolah]
        );
        const existing = existingResult.rows;

        if (existing.length > 0) {
            // Cek jika status sudah Izin/Sakit/Alpa, atau sudah presensi masuk
            if (existing[0].status !== 'alpa' && existing[0].status !== 'belum presensi') {
                 return res.status(400).json({ message: `Anda sudah tercatat presensi dengan status: ${existing[0].status}.` });
            }
        }
        
        // 2. Validasi Jarak
        const { latitude: latSekolah, longitude: lonSekolah, radius_meter } = req.sekolah;

        if (!latSekolah || !lonSekolah || !radius_meter) {
             return res.status(500).json({ message: 'Pengaturan lokasi sekolah belum lengkap.' });
        }

        const distance = calculateDistance(latitude, longitude, latSekolah, lonSekolah);
        if (distance > radius_meter) {
             return res.status(403).json({ message: 'Anda berada di luar radius presensi yang ditentukan.' });
        }
        
        // 3. Tentukan status (hadir atau terlambat)
        const { jam_masuk: jamMasukSekolah } = req.sekolah; // Ambil jam_masuk dari tabel_sekolah
        const waktuSekarang = new Date();
        const waktuMasukTarget = new Date();
        
        if (jamMasukSekolah) {
            // Set jam masuk target hari ini
            const [h, m, s] = jamMasukSekolah.split(':').map(Number);
            waktuMasukTarget.setHours(h, m, s, 0);
        } else {
             // Jika jam masuk tidak diset, default 07:00:00
             waktuMasukTarget.setHours(7, 0, 0, 0);
        }
        
        const status = (waktuSekarang > waktuMasukTarget) ? 'terlambat' : 'hadir';
        
        // 4. Catat Presensi
        await pool.query(
            // KRITIS: Ganti CURDATE() -> CURRENT_DATE. Ganti CURTIME() -> LOCALTIME.
            // KRITIS: Ganti waktu_masuk -> jam_masuk, foto_masuk -> foto_masuk
            `INSERT INTO tabel_presensi (id_sekolah, id_user, tanggal, jam_masuk, status, foto_masuk) 
             VALUES ($1, $2, CURRENT_DATE, LOCALTIME, $3, $4) 
             ON CONFLICT (id_presensi) DO UPDATE 
             SET jam_masuk = LOCALTIME, status = $3, foto_masuk = $4`,
            [idSekolah, idUser, status, foto_masuk]
        );
        
        res.status(200).json({ 
            message: `Presensi masuk berhasil dicatat! Status: ${status.toUpperCase()}`,
            status: status.toUpperCase()
        });

    } catch (error) {
        console.error("Error presensi masuk:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});


// ================================================
// ENDPOINT 2: POST /pulang (KRITIS)
// ================================================
router.post('/pulang', async (req, res) => {
    try {
        const idUser = req.user.userId;
        const idSekolah = req.user.sekolahId;
        const { latitude, longitude, foto_pulang } = req.body;
        
        // 1. Cek apakah user sudah presensi masuk
        // KRITIS: Ganti CURDATE() -> CURRENT_DATE
        const existingResult = await pool.query(
            "SELECT jam_pulang, status FROM tabel_presensi WHERE id_user = $1 AND id_sekolah = $2 AND tanggal = CURRENT_DATE", 
            [idUser, idSekolah]
        );
        const existing = existingResult.rows;

        if (existing.length === 0) return res.status(400).json({ message: 'Anda belum presensi masuk hari ini.' });
        if (existing[0].jam_pulang) return res.status(400).json({ message: 'Anda sudah presensi pulang.' });
        
        // 2. Validasi Jarak (Sama seperti masuk)
        const { latitude: latSekolah, longitude: lonSekolah, radius_meter } = req.sekolah;

        if (!latSekolah || !lonSekolah || !radius_meter) {
             return res.status(500).json({ message: 'Pengaturan lokasi sekolah belum lengkap.' });
        }

        const distance = calculateDistance(latitude, longitude, latSekolah, lonSekolah);
        if (distance > radius_meter) {
             return res.status(403).json({ message: 'Anda berada di luar radius presensi yang ditentukan.' });
        }

        // 3. Catat Presensi Pulang
        await pool.query(
            // KRITIS: Ganti CURTIME() -> LOCALTIME. Ganti CURDATE() -> CURRENT_DATE.
            // KRITIS: Ganti waktu_pulang -> jam_pulang, foto_pulang -> foto_pulang
            "UPDATE tabel_presensi SET jam_pulang = LOCALTIME, foto_pulang = $1 WHERE id_user = $2 AND id_sekolah = $3 AND tanggal = CURRENT_DATE",
            [foto_pulang, idUser, idSekolah]
        );
        
        res.status(200).json({ 
            message: 'Presensi pulang berhasil dicatat!',
            status: 'SUDAH_PULANG'
        });
        
    } catch (error) {
        console.error("Error presensi pulang:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});

// ================================================
// ENDPOINT 3: GET /riwayat (KRITIS)
// ================================================
router.get('/riwayat', async (req, res) => {
    try {
        const idUser = req.user.userId;
        const idSekolah = req.user.sekolahId;
        const { bulan, tahun } = req.query; // Bulan 1-12

        // KRITIS: Ganti MONTH(tanggal) dan YEAR(tanggal)
        // KRITIS: Ganti waktu_masuk/pulang -> jam_masuk/pulang
        const riwayatResult = await pool.query(
            `SELECT 
                tanggal, jam_masuk, jam_pulang, status AS status_kehadiran 
            FROM 
                tabel_presensi 
            WHERE 
                id_user = $1 AND id_sekolah = $2 
                AND EXTRACT(MONTH FROM tanggal) = $3 
                AND EXTRACT(YEAR FROM tanggal) = $4
            ORDER BY tanggal DESC`,
            [idUser, idSekolah, bulan, tahun]
        );
        
        res.status(200).json(riwayatResult.rows);

    } catch (error) {
        console.error("Error mengambil riwayat presensi:", error);
        res.status(500).json({ message: "Terjadi error pada server saat memuat riwayat." });
    }
});


module.exports = router;