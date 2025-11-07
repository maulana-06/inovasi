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
        const [rows] = await pool.query(
            "SELECT latitude, longitude, jam_masuk, jam_pulang, radius_meter FROM tabel_sekolah WHERE id_sekolah = $1",
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

        await pool.query(
            `UPDATE tabel_sekolah 
             SET latitude = $1, longitude = $2, jam_masuk = $3, jam_pulang = $4, radius_meter = $5 
             WHERE id_sekolah = $6`,
            // Urutan harus sesuai dengan tanda tanya ($) di atas
            [latitude, longitude, jam_masuk, jam_pulang, radius_meter, idSekolah] 
        );

        res.status(200).json({ message: "Pengaturan berhasil diperbarui." });
    } catch (error) {
        console.error("Error memperbarui pengaturan:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});

module.exports = router;