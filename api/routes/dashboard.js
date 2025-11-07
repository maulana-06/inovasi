// File: routes/dashboard.js (VERSI PERBAIKAN FINAL)

const express = require('express');
const router = express.Router();
const pool = require('../database'); 
const auth = require('../middleware/auth');

router.get('/summary', auth, async (req, res) => { 
    try {
        const idSekolah = req.user.sekolahId; 
        const idAdmin = req.user.userId; 

        // === AMBIL NAMA ADMIN DARI tabel_user ===
        const [adminRows] = await pool.execute(
            "SELECT nama_lengkap FROM tabel_user WHERE id_user = ?",
            [idAdmin]
        );
        const namaAdmin = adminRows.length > 0 ? adminRows[0].nama_lengkap : "Admin Error";
        const namaSekolah = req.sekolah.nama_sekolah;

        // Query 1: Presensi (Gunakan execute)
        const queryPresensi = 'SELECT COUNT(CASE WHEN status = \'hadir\' THEN 1 END) as total_hadir, COUNT(CASE WHEN status = \'terlambat\' THEN 1 END) as total_terlambat, COUNT(CASE WHEN status = \'izin\' OR status = \'sakit\' THEN 1 END) as total_izin_sakit FROM tabel_presensi WHERE tanggal = CURDATE() AND id_sekolah = ?;';
        const [presensiSummary] = await pool.execute(queryPresensi, [idSekolah]); 
        console.log("Query Presensi BERHASIL."); 

        // Query 2: Total Staf (Gunakan execute dan nama variabel yang benar)
        const queryTotalStaf = "SELECT COUNT(*) as total_aktif FROM tabel_user WHERE (role = 'Guru' OR role='Admin') AND id_sekolah = ? AND status = 'Aktif';";
        // [PERBAIKAN] Gunakan nama variabel 'totalStafRows'
        const [totalStafRows] = await pool.execute(queryTotalStaf, [idSekolah]); 
        console.log("pool.execute Total Staf BERHASIL. Hasil:", totalStafRows); 
        
        // Query 3: Aktivitas Terkini (Gunakan execute)
        const queryAktivitas = `(SELECT u.nama_lengkap, p.waktu_masuk AS waktu_aksi, 'Presensi Masuk' AS jenis_aktivitas, p.status FROM tabel_presensi p JOIN tabel_user u ON p.id_user = u.id_user WHERE p.tanggal = CURDATE() AND p.waktu_masuk IS NOT NULL AND p.id_sekolah = ?) UNION ALL (SELECT u.nama_lengkap, p.waktu_pulang AS waktu_aksi, 'Presensi Pulang' AS jenis_aktivitas, 'Pulang' AS status FROM tabel_presensi p JOIN tabel_user u ON p.id_user = u.id_user WHERE p.tanggal = CURDATE() AND p.waktu_pulang IS NOT NULL AND p.id_sekolah = ?) ORDER BY waktu_aksi DESC LIMIT 5`;
        // [PERBAIKAN] Gunakan pool.execute
        const [aktivitasTerkini] = await pool.execute(queryAktivitas, [idSekolah, idSekolah]); 

        // Query 4: Permintaan Izin (Gunakan execute)
        const queryIzin = `SELECT u.nama_lengkap, i.tanggal_mulai, i.id_izin, i.jenis FROM tabel_izin i JOIN tabel_user u ON i.id_user = u.id_user WHERE i.status = 'Menunggu' AND i.id_sekolah = ? ORDER BY i.created_at DESC LIMIT 5`;
        // [PERBAIKAN] Gunakan pool.execute
        const [permintaanIzin] = await pool.execute(queryIzin, [idSekolah]);

        // Kalkulasi (Gunakan totalStafRows)
        const hadir = (presensiSummary[0]?.total_hadir || 0) + (presensiSummary[0]?.total_terlambat || 0);
        const izin_sakit = presensiSummary[0]?.total_izin_sakit || 0;
        const total_aktif = totalStafRows[0]?.total_aktif || 0; 
        const belum_ada_kabar = total_aktif - hadir - izin_sakit;

        const responseData = {
            namaSekolah: namaSekolah,   
            namaAdmin: namaAdmin,       
            
            summary_cards: { 
                hadir: hadir,
                terlambat: presensiSummary[0]?.total_terlambat || 0,
                izin_sakit: izin_sakit,
                belum_ada_kabar: belum_ada_kabar < 0 ? 0 : belum_ada_kabar
            },
            aktivitas_terkini: aktivitasTerkini,
            permintaan_persetujuan: permintaanIzin
        };
        
        res.status(200).json(responseData);

    } catch (error) {
        console.error("Error saat mengambil data dasbor:", error); 
        res.status(500).json({ message: "Terjadi error SQL pada server." });
    }
});

module.exports = router;