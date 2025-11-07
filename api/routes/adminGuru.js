// File: routes/adminGuru.js (VERSI BARU - Tenant-Aware & Menggunakan tabel_guru)

const express = require('express');
const router = express.Router();
const pool = require('../database');
const bcrypt = require('bcryptjs'); 

// ================================================
// ATURAN 2: 'auth' sudah dihapus dari semua rute di bawah
// ================================================
// GET Mendapatkan DAFTAR guru (nama, email, status, role) untuk SEKOLAH INI
router.get('/all-staff', async (req, res) => {
    try {
        const idSekolah = req.user.sekolahId;
        const [staffList] = await pool.query(
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
        res.status(200).json(staffList);
    } catch (error) {
        console.error("Error mengambil daftar staf:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});

router.get('/', async (req, res) => {
    try {
        const idSekolah = req.user.sekolahId; // ATURAN 3

        // Query ini sudah benar (tidak perlu JOIN untuk daftar)
        const [gurus] = await pool.query(
            `SELECT id_user, nama_lengkap, email, status, role 
             FROM tabel_user 
             WHERE (role = 'Admin' OR role = 'Guru') AND id_sekolah = $1
             ORDER BY role, nama_lengkap`, 
            [idSekolah]
        );
        res.status(200).json(gurus);

    } catch (error) {
        console.error("Error mengambil data guru:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});

// ================================================
// GET Mengambil DETAIL LENGKAP satu guru (untuk form edit)
// ================================================
router.get('/:id_user', async (req, res) => {
    try {
        const idSekolah = req.user.sekolahId;
        const { id_user } = req.params;

        // Query BARU (menggunakan LEFT JOIN)
        const [rows] = await pool.query(
            `SELECT 
                u.nama_lengkap, u.email, u.status, u.role, -- <-- Tambahkan u.role
                g.nip_nipppk, g.jabatan, g.pendidikan, g.mulai_tugas, g.alamat, g.status_keluarga, g.nomor_telepon 
            FROM 
                tabel_user u 
            LEFT JOIN 
                tabel_guru g ON u.id_user = g.id_user 
            WHERE 
                u.id_user = $1 AND u.id_sekolah = $2 AND (u.role = 'Admin' OR u.role = 'Guru')`,
            [id_user, idSekolah]
        );

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
// POST Menambahkan guru BARU (INSERT ke DUA tabel)
// ================================================
router.post('/', async (req, res) => {
    const client = await pool.connect(); // Ambil koneksi untuk transaksi
    try {
        await client.query('BEGIN'); // Mulai transaksi

        const idSekolah = req.user.sekolahId; 
        
        // Ambil data dari body (form di manajemen-guru)
        const { 
            nama_lengkap, email, password, status, // Untuk tabel_user
            nip_nipppk, jabatan, pendidikan, mulai_tugas, alamat, status_keluarga, nomor_telepon // Untuk tabel_guru
        } = req.body;

        // 1. INSERT ke tabel_user
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);
        const [resultUser] = await connection.query(
            "INSERT INTO tabel_user (id_sekolah, nama_lengkap, email, password_hash, status, role) VALUES ($1, $2, $3, $4, $5, 'guru')",
            [idSekolah, nama_lengkap, email, password_hash, status]
        );
        const newUserId = resultUser.insertId; // Dapatkan ID user yang baru dibuat

        // 2. INSERT ke tabel_guru
        await connection.query(
            `INSERT INTO tabel_guru 
             (id_user, id_sekolah, nip_nipppk, jabatan, pendidikan, mulai_tugas, alamat, status_keluarga, nomor_telepon) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [newUserId, idSekolah, nip_nipppk, jabatan, pendidikan, mulai_tugas, alamat, status_keluarga, nomor_telepon]
        );

        await client.query('COMMIT'); // Sukses! Simpan kedua INSERT
        res.status(201).json({ message: 'Guru berhasil ditambahkan', id_user_baru: newUserId });

    } catch (error) {
        await connection.rollback(); // Gagal! Batalkan semua INSERT
        if (error.code === 'ER_DUP_ENTRY') {
             res.status(400).json({ message: 'Email sudah terdaftar.' });
        } else {
            console.error("Error menambah guru:", error);
            res.status(500).json({ message: "Terjadi error pada server." });
        }
    } finally {
        connection.release(); 
    }
});

// ================================================
// PUT Mengupdate guru (UPDATE DUA tabel)
// ================================================
router.put('/:id_user', async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const idSekolah = req.user.sekolahId; 
        const { id_user } = req.params;
        
        // Ambil data dari body
        const { 
            nama_lengkap, email, status, // Untuk tabel_user
            nip_nipppk, jabatan, pendidikan, mulai_tugas, alamat, status_keluarga, nomor_telepon // Untuk tabel_guru
        } = req.body;
        
        // 1. UPDATE tabel_user
        await connection.query(
            "UPDATE tabel_user SET nama_lengkap = $1, email = $2, status = $3 WHERE id_user = $4 AND id_sekolah = $5",
            [nama_lengkap, email, status, id_user, idSekolah]
        );
        
        // 2. UPDATE tabel_guru (Gunakan INSERT ... ON DUPLICATE KEY UPDATE)
        // Ini akan mengupdate jika baris sudah ada, atau membuat baru jika belum ada
        await connection.query(
            `INSERT INTO tabel_guru 
             (id_user, id_sekolah, nip_nipppk, jabatan, pendidikan, mulai_tugas, alamat, status_keluarga, nomor_telepon) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             ON DUPLICATE KEY UPDATE 
             nip_nipppk=VALUES(nip_nipppk), jabatan=VALUES(jabatan), pendidikan=VALUES(pendidikan), 
             mulai_tugas=VALUES(mulai_tugas), alamat=VALUES(alamat), status_keluarga=VALUES(status_keluarga), 
             nomor_telepon=VALUES(nomor_telepon)`,
            [id_user, idSekolah, nip_nipppk, jabatan, pendidikan, mulai_tugas, alamat, status_keluarga, nomor_telepon]
        );
        
        await client.query('COMMIT');
        res.status(200).json({ message: 'Data guru berhasil diperbarui' });

    } catch (error) {
        await connection.rollback();
        console.error("Error update guru:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    } finally {
        connection.release();
    }
});
// ================================================
// === RUTE BARU UNTUK HAPUS GURU ===
// ================================================
router.delete('/:id_user', async (req, res) => {

    const client = await pool.connect(); 
    try {
        await client.query('BEGIN');

        const idSekolah = req.user.sekolahId;
        const idAdminYangLogin = req.user.userId; // Dapatkan ID admin yang menghapus
        const { id_user } = req.params;

        // Keamanan: Pastikan admin tidak menghapus dirinya sendiri
        if (parseInt(id_user) === idAdminYangLogin) {
            throw new Error("Anda tidak dapat menghapus akun Anda sendiri.");
        }

        // 1. Hapus dari tabel_guru (sebenarnya tidak perlu jika CASCADE aktif, tapi lebih aman)
        await pool.query(
            "DELETE FROM tabel_guru WHERE id_user = $1 AND id_sekolah = $2",
            [id_user, idSekolah]
        );

        // 2. Hapus dari tabel_user
        const [resultUser] = await pool.query(
            "DELETE FROM tabel_user WHERE id_user = $1 AND role != 'Super Admin'", // Jangan hapus super admin
            [id_user]
        );

        // Cek apakah ada baris yang terhapus
        if (resultUser.affectedRows === 0) {
             throw new Error("Guru tidak ditemukan atau Anda tidak berhak menghapusnya.");
        }

        await client.query('COMMIT'); // Sukses! Hapus permanen
        res.status(200).json({ message: 'Guru berhasil dihapus secara permanen.' });

    } catch (error) {
        await connection.rollback(); // Gagal! Batalkan penghapusan
        console.error("Error menghapus guru:", error);
        // Kirim pesan error yang spesifik jika itu error keamanan kita
        if (error.message.includes("menghapus akun Anda sendiri") || error.message.includes("Guru tidak ditemukan")) {
            res.status(400).json({ message: error.message });
        } else {
            res.status(500).json({ message: "Terjadi error pada server saat menghapus." });
        }
    } finally {
        connection.release(); // Selalu lepaskan koneksi
    }
});
// ================================================
// === RUTE BARU: RESET PASSWORD MASSAL GURU ===
// ================================================
router.post('/reset-passwords', async (req, res) => {
    // Pastikan hanya Admin yang bisa akses (Meskipun sudah dijaga di server.js, cek lagi)
    if (req.user.role !== 'Admin') {
        return res.status(403).json({ message: 'Akses ditolak.' });
    }

    const client = await pool.connect(); 
    try {
        await client.query('BEGIN'); 

        const idSekolah = req.user.sekolahId;
        
        // 1. Tentukan Password Default BARU (JANGAN GUNAKAN PASSWORD YANG MUDAH DITEBAK!)
        //    Idealnya ini dibuat random per guru, tapi untuk simpel kita buat sama dulu.
        const passwordDefault = `Pass${Math.floor(1000 + Math.random() * 9000)}`; // Contoh: Pass1234
        console.log(`[Reset Pass] Password default baru untuk sekolah ${idSekolah}: ${passwordDefault}`); // Log password (Hapus di produksi!)

        // 2. Hash Password Default
        const salt = await bcrypt.genSalt(10);
        const passwordDefaultHash = await bcrypt.hash(passwordDefault, salt);

        // 3. Ambil SEMUA GURU (role='guru') di sekolah ini
        const [gurus] = await pool.query(
            "SELECT id_user, email, nama_lengkap FROM tabel_user WHERE id_sekolah = $1 AND role = 'Guru'",
            [idSekolah]
        );

        if (gurus.length === 0) {
            throw new Error("Tidak ada akun guru yang ditemukan di sekolah ini.");
        }

        // 4. Loop dan UPDATE password setiap guru
        const updatePromises = gurus.map(guru => {
            console.log(`[Reset Pass] Mengupdate password untuk ${guru.email}`);
            return pool.query(
                "UPDATE tabel_user SET password_hash = $1 WHERE id_user = $2 AND id_sekolah = $3",
                [passwordDefaultHash, guru.id_user, idSekolah]
            );
        });
        await Promise.all(updatePromises); // Tunggu semua update selesai

        await client.query('COMMIT'); // Sukses! Simpan semua perubahan password

        // 5. Siapkan data kredensial untuk ditampilkan di frontend
        const kredensialAwal = gurus.map(guru => ({
            nama: guru.nama_lengkap,
            email: guru.email,
            passwordBaru: passwordDefault // Kirim password PLAIN TEXT!
        }));

        res.status(200).json({ 
            message: `Password untuk ${gurus.length} guru berhasil direset!`,
            kredensial: kredensialAwal 
        });

    } catch (error) {
        await connection.rollback(); // Jika gagal, batalkan semua perubahan password
        console.error("Error saat reset password massal:", error);
        res.status(500).json({ message: error.message || "Terjadi error pada server saat reset password." });
    } finally {
        connection.release(); 
    }
});
module.exports = router;