// File: routes/profil.js (BARU)

const express = require('express');
const router = express.Router();
const pool = require('../database.js'); 
const bcrypt = require('bcryptjs'); 
const multer = require('multer'); 
const fs = require('fs'); 
const path = require('path'); 

// --- Konfigurasi Multer (Sama seperti di guru.js) ---
const UPLOAD_DIR = 'public/uploads/profil';
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
        const idSekolah = req.user.sekolahId; // Ambil dari req.user (middleware auth)
        const idUser = req.user.userId;
        const ext = path.extname(file.originalname);
        cb(null, `${idSekolah}-${idUser}-${Date.now()}${ext}`);
    }
});
const upload = multer({ storage: storage });
const auth = require('../middleware/auth'); 
router.use(auth); 

// GET /api/profil/me - Mendapatkan profil user yang login
router.get('/me', async (req, res) => {
    try {
        const idUser = req.user.userId;
        const idSekolah = req.user.sekolahId;
        
        // Query HANYA ke tabel_user
        const [rows] = await pool.query(
            "SELECT id_user, nama_lengkap, email, role, status, foto_profil FROM tabel_user WHERE id_user = $1 AND id_sekolah = $2",
            [idUser, idSekolah]
        );
        
        if (rows.length === 0) return res.status(404).json({ message: 'Profil tidak ditemukan.' });
        
        res.json(rows[0]); // Kirim data user

    } catch (error) {
        console.error("Error di GET /api/profil/me:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// POST /api/profil/foto - Upload foto profil user yang login
router.post('/foto', upload.single('fotoProfil'), async (req, res) => {
    try {
        const idUser = req.user.userId;
        const idSekolah = req.user.sekolahId;

        if (!req.file) return res.status(400).json({ message: 'Tidak ada file di-upload.' });
        
        // Path relatif ke folder 'public'
        const filePath = req.file.path.replace('public', '').replace(/\\/g, '/'); // Ganti backslash

        await pool.query( // Gunakan execute
            "UPDATE tabel_user SET foto_profil = $1 WHERE id_user = $2 AND id_sekolah = $3",
            [filePath, idUser, idSekolah]
        );

        res.json({ message: 'Foto profil berhasil diperbarui.', filePath: filePath });

    } catch (error) {
        console.error("Error di POST /api/profil/foto:", error);
        res.status(500).json({ message: "Server error" });
    }
});

// PUT /api/profil/password - Ubah password user yang login
router.put('/password', async (req, res) => {
    try {
        const idUser = req.user.userId;
        const { password_lama, password_baru, konfirmasi_password_baru } = req.body;

        if (!password_lama || !password_baru || !konfirmasi_password_baru) {
             return res.status(400).json({ message: 'Semua field password wajib diisi.' });
        }
        if (password_baru !== konfirmasi_password_baru) {
            return res.status(400).json({ message: 'Konfirmasi password baru tidak cocok.' });
        }

        const [userRows] = await pool.query( // Gunakan execute
            "SELECT password_hash FROM tabel_user WHERE id_user = $1",
            [idUser]
        );
        if (userRows.length === 0) return res.status(404).json({ message: 'User tidak ditemukan.' });
        const user = userRows[0];

        const isMatch = await bcrypt.compare(password_lama, user.password_hash);
        if (!isMatch) return res.status(400).json({ message: 'Password lama salah.' });

        const salt = await bcrypt.genSalt(10);
        const password_hash_baru = await bcrypt.hash(password_baru, salt);

        await pool.query( // Gunakan execute
            "UPDATE tabel_user SET password_hash = $1 WHERE id_user = $2",
            [password_hash_baru, idUser]
        );

        res.json({ message: 'Password berhasil diubah.' });

    } catch (error) {
        console.error("Error di PUT /api/profil/password:", error);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;