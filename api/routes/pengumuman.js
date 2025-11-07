// File: /routers/pengumuman.js

const express = require('express');
const router = express.Router();
const pool = require('../database');

// ================================================
// ATURAN 2: 'auth' sudah dihapus dari rute
// (Sudah dijaga oleh server.js)
// ================================================

// 1. ENDPOINT UNTUK GURU (GET /api/pengumuman/terbaru)
router.get('/terbaru', async (req, res) => {
    try {
        // ATURAN 3: Ambil idSekolah dari token
        const idSekolah = req.user.sekolahId;

        // ATURAN 3: Query ke 'tabel_pengumuman' dan filter id_sekolah
        const [rows] = await pool.query(
            'SELECT isi_pengumuman FROM tabel_pengumuman WHERE id_sekolah = $1 ORDER BY created_at DESC LIMIT 1',
            [idSekolah]
        );
        
        if (rows.length > 0) {
            res.json(rows[0]); // Kirim { isi_pengumuman: "..." }
        } else {
            res.json({ isi_pengumuman: "" }); // Kirim kosong jika tidak ada
        }
    } catch (error) {
        console.error("Error di GET /api/pengumuman/terbaru:", error);
        res.status(500).json({ message: 'Server error saat mengambil pengumuman.' });
    }
});

// 2. ENDPOINT UNTUK ADMIN (POST /api/pengumuman)
// (Membuat pengumuman baru untuk SEKOLAH INI)
router.post('/', async (req, res) => {
    try {
        const { isi_pengumuman } = req.body;
        const idSekolah = req.user.sekolahId; // ATURAN 3

        if (!isi_pengumuman && isi_pengumuman !== "") {
            return res.status(400).json({ message: 'Isi pengumuman tidak valid.' });
        }

        // ATURAN 3: INSERT ke 'tabel_pengumuman' dengan id_sekolah
        // (Kita buat baru saja, tidak perlu UPDATE)
        await pool.query(
            'INSERT INTO tabel_pengumuman (id_sekolah, isi_pengumuman) VALUES ($1, $2)',
            [idSekolah, isi_pengumuman] 
        );        
        res.status(201).json({ message: 'Pengumuman berhasil disimpan!' });

    } catch (error) {
        console.error("Error di POST /api/pengumuman:", error);
        res.status(500).json({ message: 'Server error saat menyimpan pengumuman.' });
    }
});

module.exports = router;