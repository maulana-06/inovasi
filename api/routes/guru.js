// File: routes/guru.js (VERSI Baru)

const express = require('express');
const router = express.Router();
const pool = require('../database.js'); // Impor pool
const bcrypt = require('bcryptjs'); // Untuk ubah password
const multer = require('multer'); // Untuk upload foto
const fs = require('fs'); // Untuk mengelola file
const path = require('path'); // Untuk mengelola path

// --- Konfigurasi Multer untuk Upload Foto Profil ---
const UPLOAD_DIR = 'public/uploads/profil';
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        // Buat nama file unik: idSekolah-idUser-timestamp.ext
        const idSekolah = req.user.sekolahId;
        const idUser = req.user.userId;
        const ext = path.extname(file.originalname);
        cb(null, `${idSekolah}-${idUser}-${Date.now()}${ext}`);
    }
});
const upload = multer({ storage: storage });
router.get('/status', async (req, res) => {
    try {
        const idUser = req.user.userId;
        const idSekolah = req.user.sekolahId;

        const [profilRows] = await pool.query(
            "SELECT nama_lengkap, email FROM tabel_user WHERE id_user = $1 AND id_sekolah = $2",
            [idUser, idSekolah]
        );
        if (profilRows.length === 0) return res.status(404).json({ message: 'Profil tidak ditemukan.' });

        const [presensiRows] = await pool.query(
            "SELECT waktu_masuk, waktu_pulang FROM tabel_presensi WHERE id_user = $1 AND id_sekolah = $2 AND tanggal = CURDATE()",
            [idUser, idSekolah]
        );

        let status_presensi = {};
        if (presensiRows.length === 0) status_presensi.kondisi = 'BELUM_MASUK';
        else if (presensiRows[0].waktu_masuk && !presensiRows[0].waktu_pulang) {
            status_presensi.kondisi = 'SUDAH_MASUK';
            status_presensi.jam_masuk = presensiRows[0].waktu_masuk;
        } else {
            status_presensi.kondisi = 'SUDAH_PULANG';
            status_presensi.jam_masuk = presensiRows[0].waktu_masuk;
            status_presensi.jam_pulang = presensiRows[0].waktu_pulang;
        }

        res.json({
            profil: profilRows[0],
            status_presensi: status_presensi
        });
    } catch (error) { res.status(500).json({ message: "Server error di /status" }); }
});

// ================================================
// RUTE BARU UNTUK PROFIL-GURU.HTML
// ================================================

router.get('/profil', async (req, res) => {
    try {
        const idUser = req.user.userId;
        const idSekolah = req.user.sekolahId;
        
const [profilRows] = await pool.query(
            `SELECT 
                u.nama_lengkap, u.email, u.role, u.status, u.foto_profil, -- Data dari tabel_user (u)
                g.nip_nipppk, g.jabatan -- Data dari tabel_guru (g)
            FROM 
                tabel_user u 
            LEFT JOIN -- Pakai LEFT JOIN agar profil tetap tampil meskipun data di tabel_guru belum ada
                tabel_guru g ON u.id_user = g.id_user 
            WHERE 
                u.id_user = $1 AND u.id_sekolah = $2`,
            [idUser, idSekolah]
        );
        if (profilRows.length === 0) return res.status(404).json({ message: 'Profil tidak ditemukan.' });
        
        // Kirim data BARU (semua ada di profilRows[0])
        res.json({
            profil: {
                nama_lengkap: profilRows[0].nama_lengkap,
                foto_profil: profilRows[0].foto_profil
            },
            jabatan: profilRows[0].jabatan, 
            nip_nipppk: profilRows[0].nip_nipppk, 
            status: profilRows[0].status
        });

    } catch (error) {
        console.error("Error di /api/guru/profil:", error);
        // Jika error karena kolom belum ada, kirim pesan spesifik
        if (error.code === 'ER_BAD_FIELD_ERROR') {
            return res.status(500).json({ message: "Database belum di-update. Jalankan ALTER TABLE." });
        }
        res.status(500).json({ message: "Server error di /profil" });
    }
});

router.post('/profil/foto', upload.single('fotoProfil'), async (req, res) => {
    try {
        const idUser = req.user.userId;
        const idSekolah = req.user.sekolahId;

        if (!req.file) {
            return res.status(400).json({ message: 'Tidak ada file di-upload.' });
        }
        
        // Simpan path file (relatif ke folder 'public')
        const filePath = req.file.path.replace('public', ''); 

        await pool.query(
            "UPDATE tabel_user SET foto_profil = $1 WHERE id_user = $2 AND id_sekolah = $3",
            [filePath, idUser, idSekolah]
        );

        res.json({ message: 'Foto profil berhasil diperbarui.', filePath: filePath });

    } catch (error) {
        console.error("Error di /profil/foto:", error);
        res.status(500).json({ message: "Server error di /profil/foto" });
    }
});

router.put('/profil/password', async (req, res) => {
    try {
        const idUser = req.user.userId;
        const { password_lama, password_baru, konfirmasi_password_baru } = req.body;

        if (password_baru !== konfirmasi_password_baru) {
            return res.status(400).json({ message: 'Konfirmasi password baru tidak cocok.' });
        }

        const [userRows] = await pool.query(
            "SELECT password_hash FROM tabel_user WHERE id_user = $1",
            [idUser]
        );
        if (userRows.length === 0) return res.status(404).json({ message: 'User tidak ditemukan.' });

        const user = userRows[0];

        // Cek password lama
        const isMatch = await bcrypt.compare(password_lama, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Password lama salah.' });
        }

        // Hash password baru
        const salt = await bcrypt.genSalt(10);
        const password_hash_baru = await bcrypt.hash(password_baru, salt);

        await pool.query(
            "UPDATE tabel_user SET password_hash = $1 WHERE id_user = $2",
            [password_hash_baru, idUser]
        );

        res.json({ message: 'Password berhasil diubah.' });

    } catch (error) {
        console.error("Error di /profil/password:", error);
        res.status(500).json({ message: "Server error di /profil/password" });
    }
});

module.exports = router;