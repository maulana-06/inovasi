// File: middleware/identifyTenant.js

// [PENTING] Sesuaikan path file database.js
const pool = require('../database.js'); 

async function identifyTenant(req, res, next) {
    
    // 1. Dapatkan subdomain dari request
    const hostnameParts = req.hostname.split('.');
    const subdomain = hostnameParts[0];

    // 2. Abaikan domain utama (untuk halaman landing/daftar)
    // Ganti 'aplikasipresensi' dengan domain utama ! saat deploy
    if (subdomain === 'www' || subdomain === 'aplikasipresensi' || subdomain === 'localhost') {
        req.isMainDomain = true; // Tandai ini sebagai domain utama
        return next(); // Lanjutkan tanpa mencari tenant (sekolah)
    }

    // 3. Cari sekolah (tenant) di database
    let connection;
    try {
        client = await pool.connect();
        
        const [rows] = await pool.query(
            'SELECT * FROM tabel_sekolah WHERE subdomain = $1',
            [subdomain]
        );
        
        if (rows.length > 0) {
            // 4. DITEMUKAN! Tempelkan info sekolah ke 'req'
            // Inilah "stiker" ajaib kita.
            // Semua rute API nanti bisa mengakses 'req.sekolah.id_sekolah', dll.
            req.sekolah = result.rows[0]; 
            req.isMainDomain = false;
            
            return next(); // Lanjutkan ke rute berikutnya (misal: /api/auth/login)
        } else {
            // 5. TIDAK DITEMUKAN!
            // Kirim error dalam format JSON, karena ini akan melindungi API !
            return res.status(404).json({ 
                message: `Sekolah dengan alamat "${subdomain}" tidak ditemukan.`
            });
        }
    } catch (error) {
        console.error('Error di middleware identifyTenant:', error);
        return res.status(500).json({ message: 'Terjadi kesalahan pada server' });
    } finally {
        if (client) { client.release(); }
    }
}

module.exports = identifyTenant;