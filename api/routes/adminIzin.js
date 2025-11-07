const express = require('express');
const router = express.Router();
const pool = require('../database.js'); // ATURAN 1

// GET: Mendapatkan SEMUA izin untuk SEKOLAH INI
router.get('/', async (req, res) => {
    try {
        const idSekolah = req.user.sekolahId; // ATURAN 3

        const [izins] = await pool.query(
            // ATURAN 3: Query ke 'tabel_izin' BARU dan filter 'id_sekolah'
            `SELECT i.*, u.nama_lengkap 
             FROM tabel_izin i 
             JOIN tabel_user u ON i.id_user = u.id_user 
             WHERE i.id_sekolah = $1 
             ORDER BY i.created_at DESC`,
            [idSekolah]
        );
        res.status(200).json(izins);

    } catch (error) {
        console.error("Error mengambil data izin:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});

// PUT: Menyetujui atau Menolak Izin
router.put('/:id_izin/status', async (req, res) => {
    try {
        const idSekolah = req.user.sekolahId; // ATURAN 3
        const { id_izin } = req.params;
        const { status } = req.body;

        // (Kita tambahkan 'AND id_sekolah = $' untuk keamanan)
        await pool.query(
            "UPDATE tabel_izin SET status = $1 WHERE id_izin = $2 AND id_sekolah = $3",
            [status, id_izin, idSekolah]
        );
        
        // (Di sini Anda nanti bisa menambahkan logika untuk OTOMATIS
        //  membuat data di 'tabel_presensi' jika izin 'Disetujui')

        res.status(200).json({ message: `Izin berhasil ${status}` });

    } catch (error) {
        console.error("Error update status izin:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});

module.exports = router;