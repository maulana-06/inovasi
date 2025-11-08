// File: routes/superAdmin.js 

const express = require('express');
const router = express.Router();
const pool = require('../database');
const verifyToken = require('../middleware/auth');
const checkSuperAdmin = require('../middleware/checkSuperAdmin'); 

// ================================================
// ENDPOINT 1: GET /api/super-admin/schools
// Mengambil daftar semua sekolah
// ================================================
router.get('/schools', verifyToken, checkSuperAdmin, async (req, res) => {
    try {
        const [schools] = await pool.query(
            `SELECT 
                s.id_sekolah, s.nama_sekolah, s.subdomain, s.npsn,
                CONCAT(u.nama_lengkap, ' Admin ', s.subdomain) AS nama_admin_utama,
                s.is_active AS status_aktif,
                s.created_at AS tanggal_terdaftar
            FROM 
                tabel_sekolah s
            JOIN 
                tabel_user u ON s.id_sekolah = u.id_sekolah AND u.role = 'Admin' 
            GROUP BY
                s.id_sekolah
            ORDER BY 
                s.nama_sekolah`
        );        
        res.status(200).json(schools);

    } catch (error) {
        console.error("Error mengambil daftar sekolah (Super Admin):", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});

// ================================================
// ENDPOINT 2: PUT /api/super-admin/schools/:id_sekolah/status
// Mengubah status aktif/nonaktif sekolah
// ================================================
router.put('/schools/:id_sekolah/status', verifyToken, checkSuperAdmin, async (req, res) => { 
    try {
        const { id_sekolah } = req.params;
        // Menerima nilai is_active (0 atau 1) dari body
        const { is_active } = req.body; 
        
        // Pastikan is_active adalah 0 atau 1
        if (typeof is_active === 'undefined' || (is_active !== 0 && is_active !== 1)) {
            return res.status(400).json({ message: "Data is_active (0 atau 1) wajib disertakan." });
        }

        // Jalankan Query UPDATE
        const [result] = await pool.query(
            `UPDATE tabel_sekolah SET is_active = $1 WHERE id_sekolah = $2`,
            [is_active, id_sekolah]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Sekolah tidak ditemukan atau status sudah sama." });
        }
        
        const aksi = is_active == 1 ? "diaktifkan" : "dinonaktifkan";
        // Kirim response JSON yang sukses
        res.status(200).json({ message: `Sekolah ID ${id_sekolah} berhasil ${aksi}.` });

    } catch (error) {
        console.error("Error mengupdate status sekolah (Super Admin):", error);
        res.status(500).json({ message: "Terjadi error pada server saat mengupdate status." });
    }
});

// ================================================
// ENDPOINT 3: DELETE /api/super-admin/schools/:id_sekolah
// Menghapus sekolah secara permanen
// ================================================
router.delete('/schools/:id_sekolah', verifyToken, checkSuperAdmin, async (req, res) => {
    const client = await pool.connect(); 
    try {
        const { id_sekolah } = req.params;

        const [statusCheck] = await pool.query(
            "SELECT is_active FROM tabel_sekolah WHERE id_sekolah = $1",
            [id_sekolah]
        );

        if (statusCheck.length === 0) {
            return res.status(404).json({ message: "Sekolah tidak ditemukan." });
        }
        if (statusCheck[0].is_active === 1) {
             return res.status(403).json({ message: "Sekolah masih status aktif (1). Nonaktifkan sebelum menghapus!." });
        }
        
        // ==========================================================
        // 2. KRITIS: HAPUS BERANTAI (CASCADING DELETE) DENGAN TRANSACTION
        // ==========================================================
        await client.query('BEGIN');

        // Urutan: Hapus data Anak (Child) terlebih dahulu
        await connection.execute("DELETE FROM tabel_user WHERE id_sekolah = $1", [id_sekolah]);
        await connection.execute("DELETE FROM tabel_guru WHERE id_sekolah = $2", [id_sekolah]);
        await connection.execute("DELETE FROM tabel_presensi WHERE id_sekolah = $3", [id_sekolah]);
        await connection.execute("DELETE FROM tabel_izin WHERE id_sekolah = $4", [id_sekolah]);
        await connection.execute("DELETE FROM tabel_pengumuman WHERE id_sekolah = $5", [id_sekolah]);
        
        const [result] = await pool.query( 
            "DELETE FROM tabel_sekolah WHERE id_sekolah = $1",
            [id_sekolah]
        );

        await client.query('COMMIT'); // Jika semua sukses, commit perubahan
        // ==========================================================

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Sekolah tidak ditemukan setelah penghapusan." });
        }
        
        res.status(200).json({ message: 'Sekolah dan semua data terkait berhasil dihapus secara permanen.' });

    } catch (error) {
        await connection.rollback(); // Jika ada yang gagal, batalkan semua
        console.error("Error menghapus sekolah (Super Admin):", error);
        res.status(500).json({ message: "Terjadi error pada server saat menghapus sekolah. Transaksi dibatalkan." });
    } finally {
        if (client) {client.release();}
    }
});
// ================================================\
// ENDPOINT 4: GET /api/super-admin/schools/:id_sekolah/detail
// Mengambil data detail sekolah, user, dan pengaturan
// ================================================\
router.get('/schools/:id_sekolah/detail', verifyToken, checkSuperAdmin, async (req, res) => {
    try {
        const { id_sekolah } = req.params;

        // Query 1: Ambil data dasar sekolah dan pengaturan
        const [schools] = await pool.query(
            `SELECT 
                id_sekolah, nama_sekolah, subdomain, npsn, is_active, created_at,
                latitude, longitude, radius_meter, jam_masuk, jam_pulang 
             FROM tabel_sekolah WHERE id_sekolah = $1`,
            [id_sekolah]
        );

        if (schools.length === 0) {
            return res.status(404).json({ message: "Sekolah tidak ditemukan." });
        }
        const sekolahDetail = schools[0];

        // Query 2: Ambil semua user (Admin dan Guru) di sekolah ini
        const [users] = await pool.query(
            "SELECT nama_lengkap, email, role, status FROM tabel_user WHERE id_sekolah = $1 ORDER BY role DESC, nama_lengkap ASC",
            [id_sekolah]
        );

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