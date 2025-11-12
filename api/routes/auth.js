// File: routes/auth.js (FINAL TERKOREKSI)

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const pool = require('../database');
const JWT_SECRET = process.env.JWT_SECRET;

router.post('/login', async (req, res) => {

    if (!req.sekolah || !req.sekolah.id_sekolah) {
        return res.status(500).json({ message: 'Server error: ID Sekolah tidak teridentifikasi.' });
    }

    const idSekolah = req.sekolah.id_sekolah;
    const { email, password } = req.body;
    
    try {
        // 1. Cari User di tabel_user
        const userResult = await pool.query( 
            'SELECT * FROM tabel_user WHERE email = $1 AND id_sekolah = $2', 
            [email, idSekolah] 
        );
        
        // KRITIS: Ambil data dari .rows[0]
        const user = userResult.rows[0]; 
        
        if (!user) { 
            return res.status(401).json({ message: 'Email atau Password salah.' });
        }

        // 2. Cek Status Sekolah (tambahan validasi)
        // Sebenarnya identifyTenant sudah cek, tapi ini sebagai fail-safe dan untuk ambil nama sekolah.
        const schoolsResult = await pool.query(
            "SELECT is_active, nama_sekolah FROM tabel_sekolah WHERE id_sekolah = $1",
            [user.id_sekolah] // Gunakan id_sekolah dari data user
        );
        
        // KRITIS: Ambil data dari .rows[0]
        const school = schoolsResult.rows[0];
        
        if (!school) {
            return res.status(500).json({ message: 'Data sekolah tidak valid (Inkonsistensi data).' });
        }
        
        if (school.is_active === 0) { 
            return res.status(403).json({ 
                message: `Akses ditolak. Sekolah ${school.nama_sekolah} telah dinonaktifkan.`
            });
        }
    
        // 3. Verifikasi Password
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Email atau Password salah.' });
        }
        
        // 4. Buat Token
        const tokenPayload = {
            userId: user.id_user,
            sekolahId: user.id_sekolah,
            role: user.role
        };

        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '12h' });

        // 5. Kirim Respons Sukses
        res.status(200).json({ 
            message: 'Login berhasil.',
            token, 
            user: {
                userId: user.id_user,
                sekolahId: user.id_sekolah,
                role: user.role,
                nama_lengkap: user.nama_lengkap,
                email: user.email
            }
        });

    } catch (error) {
        console.error("Error login:", error);
        res.status(500).json({ message: 'Terjadi kesalahan pada server saat proses login.' });
    }
});

module.exports = router;