// File: /ABSENSI/routes/auth.js

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;
const pool = require('../database');

router.post('/login', async (req, res) => {
    const idSekolah = req.sekolah.id_sekolah;
    const { email, password } = req.body;
    
    try {
        // 1. Cari User di tabel_user berdasarkan email dan id_sekolah
        const [rows] = await pool.query( 
            'SELECT * FROM tabel_user WHERE email = $1 AND id_sekolah = $2', 
            [email, idSekolah] 
        );
        
        const user = rows[0]; 
        
        if (!user) { 
            return res.status(401).json({ message: 'Email atau Password salah.' });
        }

        const [schools] = await pool.query(
            "SELECT is_active, nama_sekolah FROM tabel_sekolah WHERE id_sekolah = $1",
            [user.id_sekolah] 
        );

        const school = schools[0];
        
        if (!school) {
            return res.status(500).json({ message: 'Data sekolah tidak valid.' });
        }
        
        if (school.is_active === 0) { 
            return res.status(403).json({ 
                message: `Akses ditolak. Sekolah ${school.nama_sekolah} telah dinonaktifkan oleh Super Admin.`
            });
        }
    
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Email atau Password salah.' });
        }
        
        const tokenPayload = {
            userId: user.id_user,
            sekolahId: user.id_sekolah,
            role: user.role
        };

        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '12h' });

        res.status(200).json({ 
            message: 'Login berhasil.',
            token, 
            user: {
                userId: user.id_user,
                sekolahId: user.id_sekolah,
                role: user.role,
                nama_lengkap: user.nama_lengkap
                // Tambahkan data user lain yang relevan
            }
        });

    } catch (error) {
        console.error("Error pada proses Login:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});

module.exports = router;