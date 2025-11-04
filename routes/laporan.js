const express = require('express');
const router = express.Router();
const pool = require('../database');

// GET: Mendapatkan Laporan (Harian, Bulanan, dll)
// Kita gunakan query parameter: /api/laporan?mulai=2025-10-01&selesai=2025-10-31
router.get('/', async (req, res) => {
    try {
        const idSekolah = req.user.sekolahId; 
        const { mulai, selesai } = req.query; 

        if (!mulai || !selesai) {
            return res.status(400).json({ message: "Harap tentukan tanggal mulai dan selesai." });
        }

        // [PERBAIKAN] JOIN ke tabel_user dan ambil nip_nipppk
        const [laporanData] = await pool.query(
            `SELECT 
                u.nama_lengkap, 
                g.nip_nipppk,   -- << BENAR! Ambil dari tabel_guru (g)
                p.tanggal, 
                p.waktu_masuk, 
                p.waktu_pulang, 
                p.status 
             FROM tabel_presensi p 
             JOIN tabel_user u ON p.id_user = u.id_user 
             LEFT JOIN tabel_guru g ON u.id_user = g.id_user -- << TAMBAHKAN JOIN ke tabel_guru
             WHERE p.id_sekolah = ? AND p.tanggal BETWEEN ? AND ?
             ORDER BY u.nama_lengkap, p.tanggal`, 
            [idSekolah, mulai, selesai]
        );
        
        // [PERBAIKAN] Ambil Nama Sekolah dari req.sekolah
        const namaSekolah = req.sekolah.nama_sekolah;

        // [PERBAIKAN] Kirim data dalam format objek
        res.status(200).json({ 
            laporan: laporanData, 
            namaSekolah: namaSekolah 
        });

    } catch (error) {
        console.error("Error mengambil data laporan:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});

module.exports = router;