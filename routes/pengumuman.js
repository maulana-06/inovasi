// File: /routers/pengumuman.js

const express = require('express');
const router = express.Router();
const db = require('../database');
const {checkAuth, checkAdmin} = require('../middleware/auth');

// 1. ENDPOINT UNTUK GURU (GET /api/pengumuman/terbaru)
router.get('/terbaru', checkAuth, async (req, res) => {
    try {
        const [rows] = await db.query(
            'SELECT nilai_teks FROM pengaturan_global WHERE id = ?',
            ['PENGUMUMAN_AKTIF']
        );        
        // PERBAIKAN
        if (rows.length > 0) {
            // Tidak mengirim rows[0] langsung, tapi buat objek baru
            // agar namanya cocok dengan yang dicari frontend
            res.json({ isi_pengumuman: rows[0].nilai_teks }); 
        } else {
            res.json({ isi_pengumuman: "" }); 
        }
    } catch (error) {
        console.error("Error di GET /api/pengumuman/terbaru:", error);
        res.status(500).json({ message: 'Server error saat mengambil pengumuman.' });
    }
});

// 2. ENDPOINT UNTUK ADMIN (POST /api/pengumuman)
// (Menyimpan/membuat pengumuman baru)
router.post('/', [checkAuth, checkAdmin], async (req, res) => {
    const { isi_pengumuman } = req.body;

    if (!isi_pengumuman && isi_pengumuman !== "") { // Membolehkan pengumuman kosong
        return res.status(400).json({ message: 'Isi pengumuman tidak valid.' });
    }
    try {
        // tidak menimpa tapi UPDATE
        await db.query(
            'UPDATE pengaturan_global SET nilai_teks = ? WHERE id = ?', 
            [isi_pengumuman, 'PENGUMUMAN_AKTIF'] 
        );        
        res.status(201).json({ message: 'Pengumuman berhasil disimpan!' });
    } catch (error) {
        console.error("Error di POST /api/pengumuman:", error);
        res.status(500).json({ message: 'Server error saat menyimpan pengumuman.' });
    }
});
module.exports = router;