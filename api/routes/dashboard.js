// File: routes/dashboard.js (VERSI FINAL TERKOREKSI)

const express = require('express');
const router = express.Router();
const pool = require('../database'); 
const auth = require('../middleware/auth'); 

router.get('/summary', auth, async (req, res) => {
    try {
        // Pastikan req.user dan req.sekolah ada (ditempel oleh middleware)
        if (!req.user || !req.sekolah) {
            return res.status(401).json({ message: "Otentikasi atau identifikasi sekolah gagal." });
        }
       
        const idSekolah = req.user.sekolahId; 
        const idAdmin = req.user.userId; 
        const namaSekolah = req.sekolah.nama_sekolah;

        // === 1. Query Nama Admin (FIXED) ===
        const adminResult = await pool.query(
            "SELECT nama_lengkap FROM tabel_user WHERE id_user = $1",
            [idAdmin]
        );
        // KRITIS: Menggunakan adminResult.rows
        const namaAdmin = adminResult.rows.length > 0 ? adminResult.rows[0].nama_lengkap : "Admin Error";

        // === 2. Query Presensi Hari Ini (FIXED PG SYNTAX) ===
        // Menggunakan CURRENT_DATE untuk PostgreSQL
        const queryPresensi = `
            SELECT 
                COUNT(CASE WHEN status = 'hadir' THEN 1 END) as total_hadir, 
                COUNT(CASE WHEN status = 'terlambat' THEN 1 END) as total_terlambat, 
                COUNT(CASE WHEN status = 'izin' OR status = 'sakit' THEN 1 END) as total_izin_sakit 
            FROM 
                tabel_presensi 
            WHERE 
                tanggal = CURRENT_DATE 
                AND id_sekolah = $1;
        `;
        const presensiResult = await pool.query(queryPresensi, [idSekolah]); 
        // KRITIS: Ambil data presensi dari .rows
        const presensiSummary = presensiResult.rows; 

        // === 3. Query Total Staf Aktif (FIXED PG SYNTAX) ===
        const queryTotalStaf = `
            SELECT 
                COUNT(CASE WHEN status = 'Aktif' THEN 1 END) as total_aktif 
            FROM 
                tabel_user 
            WHERE 
                id_sekolah = $1 
                AND role IN ('Admin', 'Guru')
        `;
        const totalStafResult = await pool.query(queryTotalStaf, [idSekolah]);
        // KRITIS: Ambil data staf dari .rows
        const totalStafRows = totalStafResult.rows;

        // === 4. Query Permintaan Izin Terbaru (FIXED PG SYNTAX) ===
        const queryIzin = `
            SELECT 
                u.nama_lengkap, i.tanggal_mulai, i.id_izin, i.jenis 
            FROM 
                tabel_izin i 
            JOIN 
                tabel_user u ON i.id_user = u.id_user 
            WHERE 
                i.status = 'Menunggu' 
                AND i.id_sekolah = $1 
            ORDER BY 
                i.created_at DESC 
            LIMIT 5
        `;
        const izinResult = await pool.query(queryIzin, [idSekolah]);
        // KRITIS: Ambil data izin dari .rows
        const permintaanIzin = izinResult.rows;

        // === 5. Kalkulasi Ringkasan Dashboard ===
        // Pastikan variabel ada sebelum diakses
        const total_aktif = parseInt(totalStafRows[0]?.total_aktif || 0);
        const hadir = parseInt(presensiSummary[0]?.total_hadir || 0);
        const terlambat = parseInt(presensiSummary[0]?.total_terlambat || 0);
        const izin_sakit = parseInt(presensiSummary[0]?.total_izin_sakit || 0);
        
        let belum_ada_kabar = total_aktif - hadir - terlambat - izin_sakit;
        if (belum_ada_kabar < 0) belum_ada_kabar = 0; 

        const responseData = {
            namaSekolah: namaSekolah,   
            namaAdmin: namaAdmin,       
            
            summary_cards: { 
                hadir: hadir,
                terlambat: terlambat,
                izin_sakit: izin_sakit,
                belum_ada_kabar: belum_ada_kabar
            },
            aktivitas_terkini: permintaanIzin, 
            total_staf: total_aktif,
        };

        res.status(200).json(responseData);

    } catch (error) {
        // Tampilkan error ke terminal untuk debugging
        console.error("Error mengambil ringkasan Dashboard:", error);
        res.status(500).json({ message: "Gagal memuat data dashboard. Cek log server." });
    } 
});

module.exports = router;