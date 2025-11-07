// File: routes/pengaturan.js (VERSI BARU - Tenant-Aware)
const express = require('express');
const router = express.Router();
const pool = require('../database'); 

// API 1: Mengambil pengaturan untuk SEKOLAH INI
// (Dipanggil oleh 'auth' dari server.js)
router.get('/', async (req, res) => {
    try {
        // ATURAN 3: Ambil token idsekolah
        const idSekolah = req.user.sekolahId; 

        // ATURAN 3: Ambil data
        const [rows] = await pool.execute(
            "SELECT latitude, longitude, jam_masuk, jam_pulang, radius_meter FROM tabel_sekolah WHERE id_sekolah = ?",
            [idSekolah]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Data sekolah tidak ditemukan." });
        }
        
        res.status(200).json(rows[0]); // Kirim objek pengaturan
    } catch (error) {
        console.error("Error mengambil pengaturan:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});

// API 2: Memperbarui pengaturan untuk SEKOLAH INI
// (Dipanggil oleh 'auth' dari server)
router.put('/', async (req, res) => {
    try {
        const idSekolah = req.user.sekolahId; // ATURAN 3
        const { latitude, longitude, jam_masuk, jam_pulang, radius_meter } = req.body;

        await pool.execute(
            `UPDATE tabel_sekolah 
             SET latitude = ?, longitude = ?, jam_masuk = ?, jam_pulang = ?, radius_meter = ? 
             WHERE id_sekolah = ?`,
            // Urutan harus sesuai dengan tanda tanya (?) di atas
            [latitude, longitude, jam_masuk, jam_pulang, radius_meter, idSekolah] 
        );

        res.status(200).json({ message: "Pengaturan berhasil diperbarui." });
    } catch (error) {
        console.error("Error memperbarui pengaturan:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});

module.exports = router;