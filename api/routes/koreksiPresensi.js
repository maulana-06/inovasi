// File: routes/koreksiPresensi.js (BARU)

const express = require('express');
const router = express.Router();
// Pastikan impor pool sudah benar
const pool = require('../database.js'); 

// ================================================
// Middleware Khusus Rute Ini: Cek Admin
// ================================================
// Kita letakkan cek admin di sini agar semua endpoint di file ini terlindungi
router.use((req, res, next) => {
    // req.user sudah ada berkat middleware 'auth' di server.js
    if (req.user && req.user.role === 'admin') {
        next(); // Lanjutkan jika admin
    } else {
        res.status(403).json({ message: 'Akses ditolak. Hanya untuk Admin.' }); // Tolak jika bukan admin
    }
});

// ================================================
// ENDPOINT 1: GET /api/koreksi-presensi
// Mengambil daftar presensi untuk dikoreksi
// ================================================
router.get('/', async (req, res) => {
    try {
        const idSekolah = req.user.sekolahId; 
        const { mulai, selesai } = req.query; // Ambil tanggal dari query string

        // Validasi input tanggal
        if (!mulai || !selesai) {
            return res.status(400).json({ message: "Harap tentukan tanggal mulai dan selesai." });
        }
        // (Tambahkan validasi format tanggal jika perlu)

        // Query untuk mengambil data presensi + nama guru
        const [dataPresensi] = await pool.query(
            `SELECT 
                p.id_presensi, p.id_user, p.tanggal, p.waktu_masuk, p.waktu_pulang, p.status, p.keterangan, 
                u.nama_lengkap 
             FROM tabel_presensi p 
             JOIN tabel_user u ON p.id_user = u.id_user 
             WHERE p.id_sekolah = ? AND p.tanggal BETWEEN ? AND ?
             ORDER BY p.tanggal DESC, u.nama_lengkap`, // Urutkan tanggal terbaru dulu
            [idSekolah, mulai, selesai]
        );
        
        res.status(200).json(dataPresensi);

    } catch (error) {
        console.error("Error mengambil data presensi untuk koreksi:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});

// ================================================
// ENDPOINT 2: PUT /api/koreksi-presensi/:id_presensi
// Menyimpan perubahan koreksi
// ================================================
router.put('/:id_presensi', async (req, res) => {
    try {
        const idSekolah = req.user.sekolahId; 
        const { id_presensi } = req.params; 
        const { waktu_masuk, waktu_pulang, status, keterangan } = req.body;

        console.log(`[Koreksi PUT] Menerima update untuk id_presensi: ${id_presensi}, id_sekolah: ${idSekolah}`); // Debug
        console.log("[Koreksi PUT] Data baru:", { waktu_masuk, waktu_pulang, status, keterangan }); // Debug

        // === PERBAIKAN: Gunakan pool.execute ===
        const [result] = await pool.execute( 
            `UPDATE tabel_presensi 
             SET 
                waktu_masuk = ?, 
                waktu_pulang = ?, 
                status = ?, 
                keterangan = ? 
             WHERE 
                id_presensi = ? AND id_sekolah = ?`, 
            [
                waktu_masuk, 
                waktu_pulang, 
                status, 
                keterangan, 
                id_presensi, // Pastikan urutan parameter benar
                idSekolah
            ]
        );

        // Cek apakah ada baris yang terpengaruh (updated)
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Data presensi tidak ditemukan atau Anda tidak berhak mengubahnya." });
        }
        
        res.status(200).json({ message: "Data presensi berhasil dikoreksi." });

    } catch (error) {
        console.error("Error menyimpan koreksi presensi:", error);
        res.status(500).json({ message: "Terjadi error pada server saat menyimpan." });
    }
});

module.exports = router;