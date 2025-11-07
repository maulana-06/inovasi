// File: /routes/izin.js

const express = require('express');
const router = express.Router();
const pool = require('../database');
const multer = require('multer');
const path = require('path');

// =================================================================
// BARU: Konfigurasi Multer (Penyimpanan File)
// =================================================================
/*
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Tentukan folder penyimpanan file
        // Pastikan folder './public/uploads/bukti_sakit/' sudah Anda buat
        cb(null, './public/uploads/bukti_sakit/'); 
    },
    filename: function (req, file, cb) {
        // Buat nama file yang unik agar tidak tumpang tindih
        // Contoh: 1678886400-surat_dokter.pdf
        const namaUnik = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, namaUnik + path.extname(file.originalname));
    }
}); */

const upload = multer({ storage: multer.memoryStorage() });
    router.post('/', upload.single('file_pendukung'), async (req, res) => {
    try {
        const idUser = req.user.userId;
        const idSekolah = req.user.sekolahId;

        // Ambil data teks dari FormData
        const { jenis_izin, tanggal_mulai, tanggal_selesai, keterangan } = req.body;

        // Ambil info file (jika ada)
        let pathFileBukti = null;
        if (req.file) {
            // (LOGIKA SIMPAN FILE KE DISK/CLOUD & DAPATKAN URL HARUSNYA DI SINI)
            // Untuk sekarang, kita simpan nama filenya saja
            pathFileBukti = req.file.originalname;
        }

        await pool.query(
            `INSERT INTO tabel_izin 
             (id_sekolah, id_user, jenis, tanggal_mulai, tanggal_selesai, keterangan, file_bukti, status) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'Menunggu')`,
            [idSekolah, idUser, jenis_izin, tanggal_mulai, tanggal_selesai, keterangan, pathFileBukti]
        );

        res.status(201).json({ message: 'Pengajuan izin berhasil terkirim.' });

    } catch (error) {
        console.error("Error saat guru mengajukan izin (POST /api/izin):", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});

module.exports = router;