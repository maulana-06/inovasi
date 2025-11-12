// File: routes/adminGuru.js (SUDAH DIKOREKSI TOTAL KE POSTGRESQL)

const express = require('express');
const router = express.Router();
const pool = require('../database');
const bcrypt = require('bcryptjs'); 

// ================================================
// GET Mendapatkan DAFTAR guru (Diperbaiki: Menghilangkan Destructuring Array)
// ================================================
router.get('/all-staff', async (req, res) => {
    try {
        const idSekolah = req.user.sekolahId;
        
        // Ganti destructuring array ([staffList]) menjadi object result
        const result = await pool.query(
            `SELECT 
                u.id_user, u.nama_lengkap, g.nip_nipppk 
            FROM 
                tabel_user u 
            LEFT JOIN 
                tabel_guru g ON u.id_user = g.id_user 
            WHERE 
                u.id_sekolah = $1 AND (u.role = 'Admin' OR u.role = 'Guru')
            ORDER BY u.role, u.nama_lengkap`,
            [idSekolah]
        );
        res.status(200).json(result.rows); // Mengambil rows dari object result

    } catch (error) {
        console.error("Error mengambil daftar staf:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});

router.get('/', async (req, res) => {
    try {
        const idSekolah = req.user.sekolahId; 
        
        // Ganti destructuring array ([gurus]) menjadi object result
        const result = await pool.query(
            `SELECT id_user, nama_lengkap, email, status, role 
             FROM tabel_user 
             WHERE (role = 'Admin' OR role = 'Guru') AND id_sekolah = $1
             ORDER BY role, nama_lengkap`, 
            [idSekolah]
        );
        res.status(200).json(result.rows); // Mengambil rows dari object result

    } catch (error) {
        console.error("Error mengambil data guru:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});
// ================================================
// 1. TAMBAHKAN RUTE SPESIFIK INI (HARUS DI ATAS ID_USER)
// ================================================
router.get('/datatable', async (req, res) => {
    try {
        const idSekolah = req.user.sekolahId;
        
        // Query untuk Datatable
        const result = await pool.query(
            `SELECT 
                u.id_user, u.nama_lengkap, u.email, u.status, u.role, u.foto_profil,
                g.nip_nipppk,
                COALESCE(g.jabatan, 'Belum Diisi') AS jabatan
            FROM 
                tabel_user u 
            LEFT JOIN 
                tabel_guru g ON u.id_user = g.id_user 
            WHERE 
                u.id_sekolah = $1 
                AND u.role IN ('Admin', 'Guru')
            ORDER BY u.role DESC, u.nama_lengkap ASC`,
            [idSekolah]
        );
        
        res.status(200).json({ data: result.rows });

    } catch (error) {
        console.error("Error memuat datatable Admin/Guru:", error);
        res.status(500).json({ message: "Gagal memuat data datatable staff. Cek log server." });
    }
});

// ================================================
// GET Mengambil DETAIL LENGKAP satu guru (Diperbaiki: Referensi 'result')
// ================================================
router.get('/:id_user', async (req, res) => {
    try {
        const idSekolah = req.user.sekolahId;
        const { id_user } = req.params;

        // Ganti destructuring array ([rows]) menjadi object result
        const result = await pool.query(
            `SELECT 
                u.nama_lengkap, u.email, u.status, u.role, 
                g.nip_nipppk, g.jabatan, g.pendidikan, g.mulai_tugas, g.alamat, g.status_keluarga, g.nomor_telepon 
            FROM 
                tabel_user u 
            LEFT JOIN 
                tabel_guru g ON u.id_user = g.id_user 
            WHERE 
                u.id_user = $1 AND u.id_sekolah = $2 AND (u.role = 'Admin' OR u.role = 'Guru')`,
            [id_user, idSekolah]
        );
        const rows = result.rows; 
    
        if (rows.length === 0) {
            return res.status(404).json({ message: "Data guru tidak ditemukan." });
        }
        res.status(200).json(rows[0]);

    } catch (error) {
        console.error("Error mengambil detail guru:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});

// ================================================
// POST Menambahkan guru BARU (Diperbaiki: 'connection' ganti 'client', 'insertId' ganti 'RETURNING')
// ================================================
router.post('/', async (req, res) => {
    const client = await pool.connect(); 
    try {
        await client.query('BEGIN'); 

        const idSekolah = req.user.sekolahId; 
        
        const { 
            nama_lengkap, email, password, status, 
            nip_nipppk, jabatan, pendidikan, mulai_tugas, alamat, status_keluarga, nomor_telepon 
        } = req.body;

        // 1. INSERT ke tabel_user (Menggunakan client.query dan RETURNING)
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);
        // Ganti connection.query() -> client.query() dan tambahkan RETURNING id_user
        const resultUser = await client.query(
            "INSERT INTO tabel_user (id_sekolah, nama_lengkap, email, password_hash, status, role) VALUES ($1, $2, $3, $4, $5, 'Guru') RETURNING id_user",
            [idSekolah, nama_lengkap, email, password_hash, status]
        );
        // Ganti .insertId -> .rows[0].id_user
        const newUserId = resultUser.rows[0].id_user; 

        // 2. INSERT ke tabel_guru (Menggunakan client.query)
        await client.query(
            `INSERT INTO tabel_guru 
             (id_user, id_sekolah, nip_nipppk, jabatan, pendidikan, mulai_tugas, alamat, status_keluarga, nomor_telepon) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [newUserId, idSekolah, nip_nipppk, jabatan, pendidikan, mulai_tugas, alamat, status_keluarga, nomor_telepon]
        );

        await client.query('COMMIT'); 
        res.status(201).json({ message: 'Guru berhasil ditambahkan', id_user_baru: newUserId });

    } catch (error) {
        await client.query('ROLLBACK'); // Ganti connection.rollback() -> client.query('ROLLBACK')
        // Ganti ER_DUP_ENTRY -> 23505 (PostgreSQL unique violation code)
        if (error.code === '23505') { 
             res.status(400).json({ message: 'Email atau NIP/NIPPPK sudah terdaftar.' });
        } else {
            console.error("Error menambah guru:", error);
            res.status(500).json({ message: "Terjadi error pada server." });
        }
    } finally {
        client.release(); 
    }
});

// ================================================
// PUT Mengupdate guru (Diperbaiki: 'connection' ganti 'client', 'ON DUPLICATE KEY UPDATE' ganti 'ON CONFLICT')
// ================================================
router.put('/:id_user', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const idSekolah = req.user.sekolahId; 
        const { id_user } = req.params;
        
        const { 
            nama_lengkap, email, status, 
            nip_nipppk, jabatan, pendidikan, mulai_tugas, alamat, status_keluarga, nomor_telepon 
        } = req.body;
        
        // 1. UPDATE tabel_user (Menggunakan client.query)
        // Ganti connection.query() -> client.query()
        await client.query(
            "UPDATE tabel_user SET nama_lengkap = $1, email = $2, status = $3 WHERE id_user = $4 AND id_sekolah = $5",
            [nama_lengkap, email, status, id_user, idSekolah]
        );
        
        // 2. UPDATE tabel_guru (Gunakan INSERT ... ON CONFLICT DO UPDATE SET)
        // Ganti ON DUPLICATE KEY UPDATE (MySQL) -> ON CONFLICT (id_user) DO UPDATE (PostgreSQL)
        await client.query(
            `INSERT INTO tabel_guru 
             (id_user, id_sekolah, nip_nipppk, jabatan, pendidikan, mulai_tugas, alamat, status_keluarga, nomor_telepon) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (id_user) DO UPDATE SET 
             nip_nipppk=EXCLUDED.nip_nipppk, jabatan=EXCLUDED.jabatan, pendidikan=EXCLUDED.pendidikan, 
             mulai_tugas=EXCLUDED.mulai_tugas, alamat=EXCLUDED.alamat, status_keluarga=EXCLUDED.status_keluarga, 
             nomor_telepon=EXCLUDED.nomor_telepon`,
            [id_user, idSekolah, nip_nipppk, jabatan, pendidikan, mulai_tugas, alamat, status_keluarga, nomor_telepon]
        );
        
        await client.query('COMMIT');
        res.status(200).json({ message: 'Data guru berhasil diperbarui' });

    } catch (error) {
        await client.query('ROLLBACK'); // Ganti connection.rollback() -> client.query('ROLLBACK')
        console.error("Error update guru:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    } finally {
        client.release();
    }
});

// ================================================
// === RUTE BARU UNTUK HAPUS GURU === (Diperbaiki: .affectedRows ganti .rowCount)
// ================================================
router.delete('/:id_user', async (req, res) => {

    const client = await pool.connect(); 
    try {
        await client.query('BEGIN');

        const idSekolah = req.user.sekolahId;
        const idAdminYangLogin = req.user.userId; 
        const { id_user } = req.params;

        if (parseInt(id_user) === idAdminYangLogin) {
            throw new Error("Anda tidak dapat menghapus akun Anda sendiri.");
        }

        // 1. Hapus dari tabel_guru 
        // Menggunakan client.query
        await client.query(
            "DELETE FROM tabel_guru WHERE id_user = $1 AND id_sekolah = $2",
            [id_user, idSekolah]
        );

        // 2. Hapus dari tabel_user 
        // Menggunakan client.query
        const resultUser = await client.query(
            "DELETE FROM tabel_user WHERE id_user = $1 AND id_sekolah = $2 AND role != 'Super Admin'", // Tambah id_sekolah
            [id_user, idSekolah]
        );

        // Cek apakah ada baris yang terhapus (Ganti .affectedRows -> .rowCount)
        if (resultUser.rowCount === 0) { 
             throw new Error("Guru tidak ditemukan atau Anda tidak berhak menghapusnya.");
        }

        await client.query('COMMIT'); 
        res.status(200).json({ message: 'Guru berhasil dihapus secara permanen.' });

    } catch (error) {
        await client.query('ROLLBACK'); // Ganti connection.rollback() -> client.query('ROLLBACK')
        console.error("Error menghapus guru:", error);
        if (error.message.includes("menghapus akun Anda sendiri") || error.message.includes("Guru tidak ditemukan")) {
            res.status(400).json({ message: error.message });
        } else {
            res.status(500).json({ message: "Terjadi error pada server saat menghapus." });
        }
    } finally {
        client.release();
    }
});
// ================================================
// === RUTE BARU: RESET PASSWORD MASSAL GURU === (Diperbaiki: Menghilangkan Destructuring Array)
// ================================================
router.post('/reset-passwords', async (req, res) => {
    if (req.user.role !== 'Admin') {
        return res.status(403).json({ message: 'Akses ditolak.' });
    }

    const client = await pool.connect(); 
    try {
        await client.query('BEGIN'); 

        const idSekolah = req.user.sekolahId;
        
        const passwordDefault = `Pass${Math.floor(1000 + Math.random() * 9000)}`; 
        console.log(`[Reset Pass] Password default baru untuk sekolah ${idSekolah}: ${passwordDefault}`); 

        const salt = await bcrypt.genSalt(10);
        const passwordDefaultHash = await bcrypt.hash(passwordDefault, salt);

        // Ganti destructuring array ([gurus]) menjadi object result
        const result = await client.query(
            "SELECT id_user, email, nama_lengkap FROM tabel_user WHERE id_sekolah = $1 AND role = 'Guru'",
            [idSekolah]
        );
        const gurus = result.rows; // Ambil rows

        if (gurus.length === 0) {
            throw new Error("Tidak ada akun guru yang ditemukan di sekolah ini.");
        }

        // Loop dan UPDATE password setiap guru
        const updatePromises = gurus.map(guru => {
            console.log(`[Reset Pass] Mengupdate password untuk ${guru.email}`);
            return client.query( // Menggunakan client.query() untuk konsistensi dalam transaksi
                "UPDATE tabel_user SET password_hash = $1 WHERE id_user = $2 AND id_sekolah = $3",
                [passwordDefaultHash, guru.id_user, idSekolah]
            );
        });
        await Promise.all(updatePromises); 

        await client.query('COMMIT'); 

        const kredensialAwal = gurus.map(guru => ({
            nama: guru.nama_lengkap,
            email: guru.email,
            passwordBaru: passwordDefault 
        }));

        res.status(200).json({ 
            message: `Password untuk ${gurus.length} guru berhasil direset!`,
            kredensial: kredensialAwal 
        });

    } catch (error) {
        await client.query('ROLLBACK'); // Ganti connection.rollback() -> client.query('ROLLBACK')
        console.error("Error saat reset password massal:", error);
        res.status(500).json({ message: error.message || "Terjadi error pada server saat reset password." });
    } finally {
        client.release();
    }
});
module.exports = router;