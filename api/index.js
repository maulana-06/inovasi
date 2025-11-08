// File: index.js 

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
// [PERBAIKAN 3] Pindahkan blok ini ke ATAS "Satpam"
// =============================================================

app.get('/daftar', (req, res) => {
    res.sendFile(path.join(__dirname, 'daftar.html')); 
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
    let client; // Ganti 'connection' menjadi 'client'
    try {
        console.log('Mencoba koneksi ke DB...');
        // 1. Ambil client dari pool (pg syntax)
        client = await pool.connect(); 
        console.log('Koneksi DB berhasil.');
        
        // 2. Mulai Transaksi PostgreSQL
        await client.query('BEGIN'); 

        // --- Validasi Keunikan (Gunakan client.query() dan cek result.rows.length) ---
        const npsnResult = await client.query(
            'SELECT npsn FROM tabel_sekolah WHERE npsn = $1', [npsn]
        );
        if (npsnResult.rows.length > 0) { // Cek result.rows.length
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

        // Simpan ke tabel_sekolah (Gunakan client.query() dengan RETURNING)
        const sekolahResult = await client.query(
            'INSERT INTO tabel_sekolah (npsn, subdomain, nama_sekolah) VALUES ($1, $2, $3) RETURNING id_sekolah', // RETURNING ID
            [npsn, subdomain, nama_sekolah]
        );
        
        // 3. Ambil ID yang di-generate dari PostgreSQL
        const newSekolahId = sekolahResult.rows[0].id_sekolah; // Ambil ID dari result.rows

        // Simpan ke tabel_user (Gunakan client.query())
        await client.query(
            'INSERT INTO tabel_user (id_sekolah, email, password_hash, nama_lengkap, role) VALUES ($1, $2, $3, $4, $5)',
            [newSekolahId, email_admin, password_hash, nama_admin, 'Admin']
        );

        // 4. Commit Transaksi
        await client.query('COMMIT'); 
        console.log('Pendaftaran BERHASIL.');
        res.redirect(`/daftar-sukses.html$1subdomain=${subdomain}`);

    } catch (error) {
        // 5. Rollback jika ada error
        if (client) {
            await client.query('ROLLBACK');
        }
        console.error("ERROR REGISTRASI SEKOLAH:", error.message);
        // ... (sisanya logic error Anda) ...
        return res.status(500).send('Terjadi kesalahan pada server. Coba lagi nanti.');

    } finally {
        // 6. Release client
        if (client) {
            client.release(); 
        }
    }
});

// =============================================================
// [PERBAIKAN, "Satpam" aktif SETELAH rute publik
const identifyTenant = require('./middleware/identifyTenant'); 
app.use(identifyTenant); 
const auth = require('./middleware/auth'); 

app.get('/api', (req, res) => {
  res.status(200).send('API is running successfully on Vercel!');
    if (req.isMainDomain) {

        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
        res.redirect('login.html');
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
// Rute-rute PRIVAT di bawah ini dijaga oleh "Auth-Guard" ('auth')
// 'auth' berjalan SETELAH 'identifyTenant'
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
const PORT = process.env.PORT || 8080; 

const testDbConnection = async () => {
    try {
        const client = await pool.connect();
        console.log("✅ Koneksi Host ke Supabase SUKSES!");
        client.release();
    } catch (error) {
        console.error("❌ GAGAL KONEKSI HOST/DNS:", error.message);
    }
};
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, async () => { // Tambahkan async test
        console.log(`Aplikasi berjalan pada port ${PORT}.`);
        await testDbConnection(); // Panggil test
    });
}
module.exports = app;
