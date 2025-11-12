// File: routes/superAdmin.js (VERSI KOREKSI TOTAL)

const express = require('express');
const router = express.Router();
const pool = require('../database');
const verifyToken = require('../middleware/auth');
const checkSuperAdmin = require('../middleware/checkSuperAdmin'); 

// ================================================
// ENDPOINT 1: GET /api/super-admin/schools (FIXED)
// ================================================
router.get('/schools', verifyToken, checkSuperAdmin, async (req, res) => {
    try {
        // KRITIS: Mengganti CONCAT dan GROUP BY MySQL dengan PostgreSQL
        const result = await pool.query(
            `SELECT 
                s.id_sekolah, 
                s.nama_sekolah, 
                s.subdomain, 
                s.npsn,
                -- Gunakan operator || untuk CONCAT (PostgreSQL)
                u.nama_lengkap || ' Admin ' || s.subdomain AS nama_admin_utama,
                s.is_active AS status_aktif,
                s.created_at AS tanggal_terdaftar
            FROM 
                tabel_sekolah s
            LEFT JOIN 
                tabel_user u ON s.id_sekolah = u.id_sekolah AND u.role = 'Admin' 
            -- Di PostgreSQL, jika menggunakan fungsi agregasi atau tidak mengelompokkan
            -- kolom yang tidak teragregasi, kita harus mengelompokkan semua kolom yang dipilih.
            -- Karena kita hanya mengambil 1 admin per sekolah (melalui JOIN), kita bisa
            -- menggunakan GROUP BY pada semua kolom s.* dan u.*
            GROUP BY
                s.id_sekolah, s.nama_sekolah, s.subdomain, s.npsn, s.is_active, s.created_at, u.nama_lengkap
            ORDER BY 
                s.nama_sekolah`
        );
        
        res.status(200).json(result.rows); 

    } catch (error) {
        console.error("Error mengambil daftar sekolah (Super Admin):", error);
        res.status(500).json({ message: "Gagal memuat daftar sekolah. Cek log server." });
    }
});

// ================================================
// ENDPOINT 2: PUT /api/super-admin/schools/:id_sekolah/status (FIXED)
// ================================================
router.put('/schools/:id_sekolah/status', verifyToken, checkSuperAdmin, async (req, res) => { 
    try {
        const { id_sekolah } = req.params;
        const { is_active } = req.body; 
        
        if (typeof is_active === 'undefined' || (is_active !== 0 && is_active !== 1)) {
            return res.status(400).json({ message: "Data is_active (0 atau 1) wajib disertakan." });
        }

        // PERBAIKAN 3: Hapus destructuring array []
        const result = await pool.query(
            `UPDATE tabel_sekolah SET is_active = $1 WHERE id_sekolah = $2`,
            [is_active, id_sekolah]
        );
        
        if (result.rowCount === 0) { // Gunakan rowCount untuk PostgreSQL
            return res.status(404).json({ message: "Sekolah tidak ditemukan atau status sudah sama." });
        }
        
        const aksi = is_active == 1 ? "diaktifkan" : "dinonaktifkan";
        res.status(200).json({ message: `Sekolah ID ${id_sekolah} berhasil ${aksi}.` });

    } catch (error) {
        console.error("Error mengupdate status sekolah (Super Admin):", error);
        res.status(500).json({ message: "Terjadi error pada server saat mengupdate status." });
    }
});

// ================================================
// ENDPOINT 3: DELETE /api/super-admin/schools/:id_sekolah (FIXED TRANSAKSI)
// ================================================
router.delete('/schools/:id_sekolah', verifyToken, checkSuperAdmin, async (req, res) => {
    // PERBAIKAN 4: Ambil client untuk transaksi
    const client = await pool.connect(); 
    try {
        const { id_sekolah } = req.params;

        // PERBAIKAN 5: Hapus destructuring array []
        const statusCheckResult = await pool.query(
            "SELECT is_active FROM tabel_sekolah WHERE id_sekolah = $1",
            [id_sekolah]
        );
        const statusCheck = statusCheckResult.rows; 

        if (statusCheck.length === 0) {
            return res.status(404).json({ message: "Sekolah tidak ditemukan." });
        }
        if (statusCheck[0].is_active === 1) {
             return res.status(403).json({ message: "Sekolah masih status aktif (1). Nonaktifkan sebelum menghapus!." });
        }
        
        await client.query('BEGIN');

        // PERBAIKAN 6: Ganti connection.execute() menjadi client.query()
        // dan perbaiki placeholder $1, $2, $3... menjadi semua $1
        await client.query("DELETE FROM tabel_user WHERE id_sekolah = $1", [id_sekolah]);
        await client.query("DELETE FROM tabel_guru WHERE id_sekolah = $1", [id_sekolah]);
        await client.query("DELETE FROM tabel_presensi WHERE id_sekolah = $1", [id_sekolah]);
        await client.query("DELETE FROM tabel_izin WHERE id_sekolah = $1", [id_sekolah]);
        await client.query("DELETE FROM tabel_pengumuman WHERE id_sekolah = $1", [id_sekolah]);
        
        // PERBAIKAN 7: Hapus destructuring array []
        const result = await client.query( 
            "DELETE FROM tabel_sekolah WHERE id_sekolah = $1",
            [id_sekolah]
        );

        await client.query('COMMIT'); 

        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Sekolah tidak ditemukan setelah penghapusan." });
        }
        
        res.status(200).json({ message: 'Sekolah dan semua data terkait berhasil dihapus secara permanen.' });

    } catch (error) {
        // PERBAIKAN 8: Hapus typo 'clientclient'
        await client.query('ROLLBACK'); 
        console.error("Error menghapus sekolah (Super Admin):", error);
        res.status(500).json({ message: "Terjadi error pada server saat menghapus sekolah. Transaksi dibatalkan." });
    } finally {
        if (client) {client.release();}
    }
});

// ================================================\
// ENDPOINT 4: GET /api/super-admin/schools/:id_sekolah/detail (FIXED)
// ================================================\
router.get('/schools/:id_sekolah/detail', verifyToken, checkSuperAdmin, async (req, res) => {
    try {
        const { id_sekolah } = req.params;
        
        // PERBAIKAN 9: Ganti userResult menjadi sekolahResult agar konsisten
        const sekolahResult = await pool.query(
            `SELECT 
                id_sekolah, nama_sekolah, subdomain, npsn, is_active, created_at,
                latitude, longitude, radius_meter, jam_masuk, jam_pulang 
             FROM tabel_sekolah WHERE id_sekolah = $1`,
            [id_sekolah]
        );
        const schools = sekolahResult.rows; 

        if (schools.length === 0) {
            return res.status(404).json({ message: "Sekolah tidak ditemukan." });
        }
        const sekolahDetail = schools[0];

        // PERBAIKAN 10: Hapus destructuring array []
        const usersResult = await pool.query(
            "SELECT nama_lengkap, email, role, status FROM tabel_user WHERE id_sekolah = $1 ORDER BY role DESC, nama_lengkap ASC",
            [id_sekolah]
        );
        const users = usersResult.rows;

        res.status(200).json({ 
            sekolah: sekolahDetail, 
            users: users, 
        });

    } catch (error) {
        console.error("Error mengambil detail sekolah:", error);
        res.status(500).json({ message: "Terjadi error pada server saat memuat detail sekolah." });
    }
});
module.exports = router;