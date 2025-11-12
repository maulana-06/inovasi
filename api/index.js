// File: index.js (VERSI TERKOREKSI)

require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const app = express();
const pool = require('./database');
const path = require('path'); 

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));

// =============================================================
// RUTE PENDAFTARAN
// =============================================================

app.get('/daftar', (req, res) => {

    res.sendFile(path.join(__dirname, 'public', 'daftar.html')); 
});

app.post('/daftar', async (req, res) => {    

    console.log('Menerima data pendaftaran:', req.body.nama_sekolah);

    const { 
        nama_sekolah, npsn, subdomain, 
        nama_admin, email_admin, password_admin 
    } = req.body;

    // 2. Validasi Sederhana
    if (!nama_sekolah || !npsn || !subdomain || !nama_admin || !email_admin || !password_admin) {
        return res.status(400).send('Semua field wajib diisi.');
    }

    // 3. Hash Password Admin
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password_admin, salt);

    // 4. Mulai Transaksi Database
    let client;
    try {
        console.log('Mencoba koneksi ke DB...');
        client = await pool.connect(); 
        console.log('Koneksi DB berhasil.');
        
        await client.query('BEGIN'); 

        // --- Validasi Keunikan ---
        const npsnResult = await client.query(
            'SELECT npsn FROM tabel_sekolah WHERE npsn = $1', [npsn]
        );
        if (npsnResult.rows.length > 0) {
            throw new Error('NPSN sudah terdaftar.');
        }

        const subdomainResult = await client.query(
            'SELECT subdomain FROM tabel_sekolah WHERE subdomain = $1', [subdomain]
        );
        if (subdomainResult.rows.length > 0) {
            throw new Error('Subdomain sudah digunakan. Pilih nama lain.');
        }
        
        const emailResult = await client.query(
            'SELECT email FROM tabel_user WHERE email = $1', [email_admin]
        );
        if (emailResult.rows.length > 0) {
            throw new Error('Email admin sudah terdaftar.');
        }

        // Simpan ke tabel_sekolah (dengan RETURNING)
        const sekolahResult = await client.query(
            'INSERT INTO tabel_sekolah (npsn, subdomain, nama_sekolah) VALUES ($1, $2, $3) RETURNING id_sekolah',
            [npsn, subdomain, nama_sekolah]
        );
        
        const newSekolahId = sekolahResult.rows[0].id_sekolah;

        // Simpan ke tabel_user
        await client.query(
            'INSERT INTO tabel_user (id_sekolah, email, password_hash, nama_lengkap, role) VALUES ($1, $2, $3, $4, $5)',
            [newSekolahId, email_admin, password_hash, nama_admin, 'Admin']
        );

        // 4. Commit Transaksi
        await client.query('COMMIT'); 
        console.log('Pendaftaran BERHASIL.');
        
        // KRITIS: PERBAIKAN REDIRECT DARI $1 MENJADI ?
        res.redirect(`/daftar-sukses.html?subdomain=${subdomain}`);

    } catch (error) {
        // 5. Rollback jika ada error
        if (client) {
            await client.query('ROLLBACK');
        }
        console.error("ERROR REGISTRASI SEKOLAH:", error.message);
        return res.status(500).send('Terjadi kesalahan pada server. Coba lagi nanti.');

    } finally {
        // 6. Release client
        if (client) {
            client.release(); 
        }
    }
});

// =============================================================
// MIDDLEWARE IDENTIFY TENANT DAN AUTH (Satpam)
// =============================================================
const identifyTenant = require('./middleware/identifyTenant'); 
const auth = require('./middleware/auth'); 
app.use(identifyTenant);

app.get('/', (req, res) => {
    if (req.isMainDomain) {

        res.sendFile(path.join(__dirname, 'public', 'index.html')); 
    } else {
        res.redirect('/login.html'); 
    }
});
// =============================================================
// RUTE API YANG DILINDUNGI (Butuh tahu sekolahnya)
// =============================================================
const authRoutes = require('./routes/auth');
const guruRoutes = require('./routes/guru');
const presensiRoutes = require('./routes/presensi');
const izinRoutes = require('./routes/izin');
const adminGuruRoutes = require('./routes/adminGuru');
const dashboardRoutes = require('./routes/dashboard');
const adminIzinRoutes = require('./routes/adminIzin');
const laporanRoutes = require('./routes/laporan');
const pengaturanRoutes = require('./routes/pengaturan');
const pengumumanRoutes = require('./routes/pengumuman');
const koreksiPresensiRoutes = require('./routes/koreksiPresensi');
const profilRoutes = require('./routes/profil');
const checkSuperAdmin = require('./middleware/checkSuperAdmin'); 
const superAdminRoutes = require('./routes/superAdmin');
const superAuthRoutes = require('./routes/superAuth');

// -------------------------------------------------------------
// Rute-rute PRIVAT
// -------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/guru', auth, guruRoutes);
app.use('/api/presensi', auth, presensiRoutes);
app.use('/api/izin', auth, izinRoutes);
app.use('/api/admin/guru', auth, adminGuruRoutes);
app.use('/api/dashboard', auth, dashboardRoutes); 
app.use('/api/admin/izin', auth, adminIzinRoutes);
app.use('/api/laporan', auth, laporanRoutes);
app.use('/api/pengaturan', auth, pengaturanRoutes);
app.use('/api/pengumuman', auth, pengumumanRoutes);
app.use('/api/koreksi-presensi', auth, koreksiPresensiRoutes);
app.use('/api/profil', auth, profilRoutes);
app.use('/api/superadmin', auth, checkSuperAdmin, superAdminRoutes);
app.use('/api/superAuth', superAuthRoutes);

app.get('/api', (req, res) => {
  res.status(200).send('API is running successfully on Vercel!');
});

const PORT = process.env.PORT || 5000; 

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => { 
        console.log(`🚀 Aplikasi berjalan pada port http://localhost:${PORT}.`);
        console.log("✅ Koneksi DB (Railway) akan diuji saat ada request.");
    });
}

module.exports = app;