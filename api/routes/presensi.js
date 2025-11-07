// File: routes/presensi.js (VERSI BARU - Full Tenant-Aware)

const express = require('express');
const router = express.Router();
const pool = require('../database');

// =================================================================
// Middleware 'loadPengaturanMiddleware' LAMA sudah DIHAPUS.
// 'identifyTenant' di server.js sudah memberi kita 'req.sekolah'
// 'auth' di server.js sudah memberi kita 'req.user'
// =================================================================

const calculateDistance = (lat1, lon1, lat2, lon2) => {

    const R = 6371e3; const φ1 = lat1 * Math.PI/180, φ2 = lat2 * Math.PI/180, Δφ = (lat2-lat1) * Math.PI/180, Δλ = (lon2-lon1) * Math.PI/180; const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2); return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

router.post('/masuk', async (req, res) => {
    try {
        const idUser = req.user.userId;
        const idSekolah = req.user.sekolahId;
        const [rows] = await pool.query(
            `SELECT 
                latitude,             
                longitude,            
                radius_meter, 
                jam_masuk 
            FROM tabel_sekolah WHERE id_sekolah = $1`,
            [idSekolah]
        );

        const pengaturanSekolah = rows[0];        
        const latSekolah = Number(pengaturanSekolah.latitude);
        const lonSekolah = Number(pengaturanSekolah.longitude);
        const radiusMeter = Number(pengaturanSekolah.radius_meter);
        const latGuru = Number(req.body.latitude);
        const lonGuru = Number(req.body.longitude);
        
        const jarak = calculateDistance(latGuru, lonGuru, latSekolah, lonSekolah);
        
        if (jarak > radiusMeter) {
            return res.status(400).json({ message: `Anda berada ${jarak.toFixed(0)} meter di luar radius sekolah.` });
        }

        // 2. Cek apakah sudah presensi
        const [existing] = await pool.query(
            "SELECT * FROM tabel_presensi WHERE id_user = $1 AND tanggal = CURDATE()", [idUser]
        );
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Anda sudah presensi masuk hari ini.' });
        }

        // 3. Tentukan status (Terlambat atau Hadir)
        const jamMasukSekolah = pengaturanSekolah.jam_masuk; 
        const waktuSekarang = new Date().toLocaleTimeString('en-GB'); 
        
        const status = (waktuSekarang > jamMasukSekolah) ? 'terlambat' : 'hadir';

        // 4. Simpan ke Database
        await pool.query(
            "INSERT INTO tabel_presensi (id_user, id_sekolah, tanggal, waktu_masuk, status) VALUES ($1, $2, CURDATE(), CURTIME(), $3)",
            [idUser, idSekolah, status]
        );
        
        res.status(201).json({ message: 'Presensi masuk berhasil dicatat!' });

    } catch (error) {
        console.error("Error presensi masuk:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});

// --- ENDPOINT PRESENSI PULANG ---
router.post('/pulang', async (req, res) => {
    // (Logika serupa untuk /pulang, validasi GPS, dll)
    // ... (disederhanakan dulu)
    try {
        const idUser = req.user.userId;
        const idSekolah = req.user.sekolahId;

        const [existing] = await pool.query(
            "SELECT * FROM tabel_presensi WHERE id_user = $1 AND tanggal = CURDATE()", [idUser]
        );
        if (existing.length === 0) return res.status(400).json({ message: 'Anda belum presensi masuk.' });
        if (existing[0].waktu_pulang) return res.status(400).json({ message: 'Anda sudah presensi pulang.' });

        await pool.query(
            "UPDATE tabel_presensi SET waktu_pulang = CURTIME() WHERE id_user = $1 AND tanggal = CURDATE()",
            [idUser]
        );
        
        res.status(200).json({ message: 'Presensi pulang berhasil dicatat!' });
    } catch (error) {
        console.error("Error presensi pulang:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});

// --- ENDPOINT RIWAYAT
router.get('/riwayat', async (req, res) => {
    try {
        const idUser = req.user.userId;
        const idSekolah = req.user.sekolahId;
        const { bulan, tahun } = req.query;

        const [riwayat] = await pool.query(
            "SELECT tanggal, waktu_masuk, waktu_pulang, status AS status_kehadiran FROM tabel_presensi WHERE id_user = $1 AND id_sekolah = $2 AND MONTH(tanggal) = $3 AND YEAR(tanggal) = $4 ORDER BY tanggal DESC",
            [idUser, idSekolah, bulan, tahun]
        );
        res.json(riwayat);
    } catch (error) {
        console.error("Error ambil riwayat:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});

module.exports = router;