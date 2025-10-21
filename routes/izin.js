// File: /routes/izin.js

const express = require('express');
const router = express.Router();
const db = require('../database');
const { checkAuth } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// =================================================================
// BARU: Konfigurasi Multer (Penyimpanan File)
// =================================================================
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
});

// BARU: Inisialisasi multer dengan konfigurasi storage
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 } // Batas ukuran file 2MB
}).single('file_pendukung'); // Nama 'file_pendukung' harus sama dengan di FormData frontend

// =================================================================
// API 1: Guru membuat pengajuan izin baru
// METHOD: POST, URL: /api/izin
// =================================================================
router.post('/', checkAuth, (req, res) => {
    // BARU: Gunakan middleware 'upload' dari multer
    upload(req, res, async function (err) {
        if (err instanceof multer.MulterError) {
            // Error dari multer (misal: file terlalu besar)
            return res.status(400).json({ message: "Error upload file: " + err.message });
        } else if (err) {
            // Error lain
            return res.status(500).json({ message: "Terjadi error tidak dikenal saat upload." });
        }

        // --- Mulai logika setelah file (jika ada) di-upload ---
        const id_guru = req.user.id_guru;
        // DIUBAH: Ambil data dari req.body (karena sekarang multipart)
        const { tanggal_mulai, tanggal_selesai, jenis_izin, keterangan } = req.body;

        if (!tanggal_mulai || !tanggal_selesai || !jenis_izin || !keterangan) {
            return res.status(400).json({ message: "Semua kolom wajib diisi." });
        }

        let file_pendukung_db = null; // Nama file untuk disimpan ke DB

        // BARU: Logika validasi untuk 'Sakit'
        if (jenis_izin === 'Sakit') {
            if (!req.file) {
                // Jika jenisnya 'Sakit' tapi tidak ada file di-upload
                return res.status(400).json({ message: "Bukti pendukung (file) wajib di-upload untuk pengajuan Sakit." });
            }
            // Jika ada file, simpan nama filenya
            file_pendukung_db = req.file.filename;
        }

        try {
            // DIUBAH: Query INSERT kini menyertakan 'file_pendukung'
            const query = `
                INSERT INTO izin_sakit_tugas 
                (id_guru, tanggal_mulai, tanggal_selesai, jenis_izin, keterangan, status, file_pendukung) 
                VALUES (?, ?, ?, ?, ?, ?, ?);
            `;
            await db.query(query, [
                id_guru, 
                tanggal_mulai, 
                tanggal_selesai, 
                jenis_izin, 
                keterangan, 
                'Menunggu Persetujuan',
                file_pendukung_db // Ini bisa null (jika 'Izin') atau nama file (jika 'Sakit')
            ]);

            res.status(201).json({ message: "Pengajuan izin berhasil dikirim." });
        } catch (error) {
            console.error("Error saat membuat pengajuan izin:", error);
            res.status(500).json({ message: "Terjadi error pada server." });
        }
    });
});

// =================================================================
// API 2: Guru melihat riwayat pengajuannya sendiri
// METHOD: GET, URL: /api/izin/riwayat
// =================================================================
router.get('/riwayat', checkAuth, async (req, res) => {
    const id_guru = req.user.id_guru;
    try {
        const query = "SELECT * FROM izin_sakit_tugas WHERE id_guru = ? ORDER BY tanggal_mulai DESC;";
        const [rows] = await db.query(query, [id_guru]);
        res.status(200).json(rows);
    } catch (error) {
        console.error("Error saat mengambil riwayat izin:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});

module.exports = router;