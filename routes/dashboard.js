// File: /routes/dashboard.js (VERSI BARU)

const express = require('express');
const router = express.Router();
const db = require('../database');
const { checkAuth, checkAdmin } = require('../middleware/auth');

router.get('/summary', [checkAuth, checkAdmin], async (req, res) => { 
    try {
        const tanggal_hari_ini = new Date().toISOString().slice(0, 10);

        // --- [DIUBAH] --- 1. Menghitung ringkasan presensi (hadir, terlambat)
        const [presensiSummary] = await db.query(
            `SELECT
                COUNT(*) as total_hadir,
                SUM(is_telat) as total_terlambat
             FROM presensi WHERE tanggal = ? AND status_kehadiran = 'Hadir';`,
            [tanggal_hari_ini]
        );

        // Query ini tidak berubah, sudah benar
        const [izinSummary] = await db.query(
            `SELECT COUNT(*) as total_izin_sakit FROM izin_sakit_tugas
            WHERE status = 'Disetujui' AND tanggal_mulai <= ? AND tanggal_selesai >= ?;`,
            [tanggal_hari_ini, tanggal_hari_ini]
        );

        // Query ini tidak berubah, sudah benar
        const [totalGuru] = await db.query("SELECT COUNT(*) as total_aktif FROM guru WHERE status = 'Aktif';");

        // --- [DIUBAH] --- 4. Mengambil 5 aktivitas presensi terkini
        const [aktivitasTerkini] = await db.query(
            `(SELECT g.nama_lengkap, p.jam_masuk AS waktu_aksi, 'Presensi Masuk' AS jenis_aktivitas, 
                CASE WHEN p.is_telat = TRUE THEN 'Terlambat' ELSE 'Tepat Waktu' END AS status
                FROM presensi p JOIN guru g ON p.id_guru = g.id_guru
                WHERE p.tanggal = ? AND p.jam_masuk IS NOT NULL AND p.status_kehadiran = 'Hadir')
            UNION ALL
            (SELECT g.nama_lengkap, p.jam_pulang AS waktu_aksi, 'Presensi Pulang' AS jenis_aktivitas, 'Tepat Waktu' AS status
                FROM presensi p JOIN guru g ON p.id_guru = g.id_guru
                WHERE p.tanggal = ? AND p.jam_pulang IS NOT NULL AND p.status_kehadiran = 'Hadir')
            ORDER BY waktu_aksi DESC LIMIT 5;`,
            [tanggal_hari_ini, tanggal_hari_ini]
        );

        // Query ini tidak berubah, sudah benar
        const [permintaanIzin] = await db.query(
            `SELECT g.nama_lengkap, i.tanggal_mulai, i.id_izin FROM izin_sakit_tugas i
             JOIN guru g ON i.id_guru = g.id_guru
             WHERE i.status = 'Menunggu Persetujuan' ORDER BY i.created_at DESC LIMIT 5;`
        );

        // Logika kalkulasi di bawah ini akan otomatis menjadi benar karena sumber datanya sudah diperbaiki.
        const hadir = presensiSummary[0].total_hadir || 0;
        const izin_sakit = izinSummary[0].total_izin_sakit || 0;
        const total_aktif = totalGuru[0].total_aktif || 0;
        const belum_ada_kabar = total_aktif - hadir - izin_sakit;

        const responseData = {
            summary_cards: {
                hadir: hadir,
                terlambat: presensiSummary[0].total_terlambat || 0,
                izin_sakit: izin_sakit,
                belum_ada_kabar: belum_ada_kabar < 0 ? 0 : belum_ada_kabar
            },
            aktivitas_terkini: aktivitasTerkini,
            permintaan_persetujuan: permintaanIzin
        };

        res.status(200).json(responseData);

    } catch (error) {
        console.error("Error saat mengambil data dasbor:", error);
        res.status(500).json({ message: "Terjadi error pada server." });
    }
});

module.exports = router;