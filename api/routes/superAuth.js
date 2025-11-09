// File: routes/superAuth.js (BARU)

const express = require('express');
const router = express.Router();
const pool = require('../database'); 
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken'); 
const JWT_SECRET = process.env.JWT_SECRET || 'kunci-rahasia-default'; 

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email dan password wajib diisi.' });
        }

        // Cari user berdasarkan email DAN role 'superadmin'
        const [userRows] = await pool.query(
        "SELECT * FROM tabel_user WHERE email = $1 AND role = 'Super Admin'", 
        [email]
        );
        const user = userresult.rows[0];
        console.log("Login dengan email:", email);
        if (!user) {
            return res.status(401).json({ error: "Email dan Password salah !" });
        }

        // --- BARU LAKUKAN VERIFIKASI PASSWORD DI SINI ---
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
            if (!isPasswordValid) {
                return res.status(401).json({ message: "Email atau password salah!" });
            }

        // Buat token JWT khusus Super Admin
        const tokenPayload = {
            userId: user.id_user,
            role: user.role // 'Super Admin'
        };

        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1h' }); 

        delete user.password_hash; 

        res.json({ 
            message: 'Login Super Admin berhasil!',
            token: token,
            user: user, 
        });

    } catch (error) {
        console.error("Error login Super Admin:", error);
        res.status(500).json({ message: "Terjadi error internal pada server." });
    }
});

module.exports = router;