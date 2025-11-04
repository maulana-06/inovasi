// File: /ABSENSI/server.js 

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
    
    // (Tambahkan console.log untuk cek)
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
    let connection;
    try {
        console.log('Mencoba koneksi ke DB...');
        // [PERBAIKAN 1] Ganti 'dbPool' menjadi 'pool'
        connection = await pool.getConnection(); 
        console.log('Koneksi DB berhasil.');
        
        await connection.beginTransaction(); 

        // --- Validasi Keunikan (Sangat Penting!) ---
        const [npsnRows] = await connection.execute(
            'SELECT npsn FROM tabel_sekolah WHERE npsn = ?', [npsn]
        );
        if (npsnRows.length > 0) {
            throw new Error('NPSN sudah terdaftar.');
        }

        const [subdomainRows] = await connection.execute(
            'SELECT subdomain FROM tabel_sekolah WHERE subdomain = ?', [subdomain]
        );
        if (subdomainRows.length > 0) {
            throw new Error('Subdomain sudah digunakan. Pilih nama lain.');
        }
        
        const [emailRows] = await connection.execute(
            'SELECT email FROM tabel_user WHERE email = ?', [email_admin]
        );
        if (emailRows.length > 0) {
            throw new Error('Email admin sudah terdaftar.');
        }

        // Simpan ke tabel_sekolah ---
        const [sekolahResult] = await connection.execute(
            'INSERT INTO tabel_sekolah (npsn, subdomain, nama_sekolah) VALUES (?, ?, ?)',
            [npsn, subdomain, nama_sekolah]
        );
        
        const newSekolahId = sekolahResult.insertId; 

        // Simpan ke tabel_user ---
        await connection.execute(
            'INSERT INTO tabel_user (id_sekolah, email, password_hash, nama_lengkap, role) VALUES (?, ?, ?, ?, ?)',
            [newSekolahId, email_admin, password_hash, nama_admin, 'Admin']
        );

        await connection.commit(); 
        console.log('Pendaftaran BERHASIL.');
        // Arahkan pengguna ke halaman sukses !
        res.redirect(`/daftar-sukses.html?subdomain=${subdomain}`);

    } catch (error) {
        // --- TAMBAHKAN INI UNTUK MELIHAT ERROR APA YANG TERJADI ---
        console.error("ERROR REGISTRASI SEKOLAH:", error); 
        // Jika error terkait duplikasi, beri pesan 400 yang lebih jelas
        if (error.code === 'ER_DUP_ENTRY') {
             return res.status(400).send('Subdomain atau Email Admin sudah terdaftar.');
        }
        // Jika error lainnya (misal error koneksi, query, dll)
        return res.status(500).send('Terjadi error server. Cek log konsol.'); 
        if (error.message.includes('NPSN') || error.message.includes('Subdomain') || error.message.includes('Email')) {
             res.status(400).send(error.message);
        } else {
             res.status(500).send('Terjadi kesalahan pada server. Coba lagi nanti.');
        }

    } finally {
        if (connection) {
            connection.release(); 
        }
    }
});

// =============================================================
// [PERBAIKAN, "Satpam" aktif SETELAH rute publik
const identifyTenant = require('./middleware/identifyTenant'); 
app.use(identifyTenant); 
const auth = require('./middleware/auth');

app.get('/', (req, res) => {
    if (req.isMainDomain) {
        // Jika ini domain utama (localhost:8080), kirim landing page
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

const PORT = process.env.PORT || 8080; 
app.listen(PORT, '0.0.0.0', () => {
console.log(`Server berjalan di port ${PORT}`);
});

module.exports = app;