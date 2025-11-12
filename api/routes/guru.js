// File: routes/guru.js (VERSI FINAL TERKOREKSI UNTUK POSTGRESQL)

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

// ================================================
// RUTE 1: GET /status (KRITIS: PRESENSI HARIAN)
// ================================================
router.get('/status', async (req, res) => {
    try {
        // Data otentikasi dari middleware auth
        const idUser = req.user.userId;
        const idSekolah = req.user.sekolahId;

        // KRITIS: Hapus destructuring array. Gunakan result.rows.
        const result = await pool.query( 
            // Query untuk mendapatkan profil dan status presensi hari ini
            `SELECT 
                u.nama_lengkap, g.foto_profil_url, u.role, 
                p.status, p.waktu_masuk, p.waktu_pulang 
             FROM 
                tabel_user u
             LEFT JOIN 
                tabel_guru g ON u.id_user = g.id_user
             LEFT JOIN 
                tabel_presensi p ON u.id_user = p.id_user AND p.tanggal = CURRENT_DATE -- KRITIS: Gunakan CURRENT_DATE (PostgreSQL)
             WHERE 
                u.id_user = $1 AND u.id_sekolah = $2`,
            [idUser, idSekolah]
        );

        const profil = result.rows[0]; // Ambil baris pertama dari hasil query
        
        if (!profil) {
            // Seharusnya tidak terjadi jika token valid, tapi ini untuk jaga-jaga
            return res.status(404).json({ message: 'Data profil user tidak ditemukan.' });
        }
        
        // Tentukan status presensi
        let statusSaatIni = 'BELUM_MASUK';
        if (profil.waktu_masuk && !profil.waktu_pulang) {
            statusSaatIni = 'SUDAH_MASUK';
        } else if (profil.waktu_masuk && profil.waktu_pulang) {
            statusSaatIni = 'SUDAH_PULANG';
        }

        // Kirim respons sukses
        res.status(200).json({
            nama_lengkap: profil.nama_lengkap,
            role: profil.role,
            foto_profil_url: profil.foto_profil_url,
            status: statusSaatIni,
            waktu_masuk: profil.waktu_masuk,
            waktu_pulang: profil.waktu_pulang
        });

    } catch (error) {
        console.error("Error di rute /api/guru/status:", error);
        res.status(500).json({ message: "Terjadi error internal saat memuat status presensi." });
    }
});

// ================================================
// RUTE 2: GET /profil (Mengambil Detail Profil)
// ================================================

router.get('/profil', async (req, res) => {
    try {
        const idUser = req.user.userId;
        const idSekolah = req.user.sekolahId;
        
        // KRITIS: Hapus destructuring array []
        const profilResult = await pool.query( 
            `SELECT 
                u.nama_lengkap, u.email, u.role, u.status, u.foto_profil, -- Data dari tabel_user (u)
                g.nip_nipppk, g.jabatan -- Data dari tabel_guru (g)
            FROM 
                tabel_user u 
            LEFT JOIN 
                tabel_guru g ON u.id_user = g.id_user 
            WHERE 
                u.id_user = $1 AND u.id_sekolah = $2`,
            [idUser, idSekolah]
        );
        if (profilResult.rows.length === 0) return res.status(404).json({ message: 'Profil tidak ditemukan.' });
        
        // KRITIS: Perbaiki penamaan variabel: profilresult -> profilResult
        res.json({
            profil: {
                nama_lengkap: profilResult.rows[0].nama_lengkap,
                foto_profil: profilResult.rows[0].foto_profil
            },
            jabatan: profilResult.rows[0].jabatan, 
            nip_nipppk: profilResult.rows[0].nip_nipppk, 
            status: profilResult.rows[0].status
        });

    } catch (error) {
        console.error("Error di /api/guru/profil:", error);
        if (error.code === 'ER_BAD_FIELD_ERROR') {
            return res.status(500).json({ message: "Database belum di-update. Jalankan ALTER TABLE." });
        }
        res.status(500).json({ message: "Server error di /profil" });
    }
});

// ================================================
// RUTE 3: POST /profil/foto (Update Foto Profil)
// ================================================

router.post('/profil/foto', upload.single('fotoProfil'), async (req, res) => {
    try {
        const idUser = req.user.userId;
        const idSekolah = req.user.sekolahId;

        if (!req.file) {
            return res.status(400).json({ message: 'Tidak ada file di-upload.' });
        }
        
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

// ================================================
// RUTE 4: PUT /profil/password (Ubah Password)
// ================================================

router.put('/profil/password', async (req, res) => {
    try {
        const idUser = req.user.userId;
        const { password_lama, password_baru, konfirmasi_password_baru } = req.body;

        if (password_baru !== konfirmasi_password_baru) {
            return res.status(400).json({ message: 'Konfirmasi password baru tidak cocok.' });
        }

        // KRITIS: Hapus destructuring array []
        const userResult = await pool.query(
            "SELECT password_hash FROM tabel_user WHERE id_user = $1",
            [idUser]
        );
        if (userResult.rows.length === 0) return res.status(404).json({ message: 'User tidak ditemukan.' });

        // KRITIS: Ganti userresult -> userResult
        const user = userResult.rows[0];

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