// File: middleware/identifyTenant.js (VERSI FINAL POSTGRESQL + FIX RELEASE)

const pool = require('../database.js'); 

async function identifyTenant(req, res, next) {
    
    const hostnameParts = req.hostname.split('.');
    const subdomain = hostnameParts[0];

    // 1. Abaikan domain utama (www, localhost, atau domain utama Anda)
    if (subdomain === 'www' || subdomain === 'aplikasipresensi' || subdomain === 'localhost') {
        req.isMainDomain = true; 
        return next(); 
    }

    // 2. Cari sekolah (tenant) di database
    let client; // Deklarasi variabel koneksi di luar try
    try {
        // Ambil koneksi dari pool
        client = await pool.connect();
        
        const result = await client.query( 
            'SELECT id_sekolah, subdomain, is_active, nama_sekolah FROM tabel_sekolah WHERE subdomain = $1',
            [subdomain]
        );
        
        const rows = result.rows; 
        
        if (rows.length > 0) {
            req.sekolah = rows[0]; 
            req.isMainDomain = false;
            
            // Cek status aktif sekolah
            if (req.sekolah.is_active === 0) {
                 return res.status(403).json({ 
                    message: `Akses ditolak. Sekolah ${subdomain} berstatus Nonaktif.`
                });
            }
            next();
            return;

        } else {
            return res.status(404).json({ 
                message: `Sekolah dengan alamat "${subdomain}" tidak ditemukan.`
            });
        }
    } catch (error) {
        // Ini yang menangkap Error: read ECONNRESET
        console.error('Error di middleware identifyTenant:', error);
        return res.status(500).json({ message: 'Terjadi kesalahan internal pada server saat mencari sekolah. Cek koneksi DB.' });
    } finally {
        // KRITIS: Melepaskan koneksi SELALU di 'finally'
        if (client) { 
            client.release(); 
        }
    }
}

module.exports = identifyTenant;