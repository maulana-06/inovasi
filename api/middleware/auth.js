// File: middleware/auth.js (FINAL TERKOREKSI)

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET; 

module.exports = (req, res, next) => {
    // KRITIS: Handle header Authorization yang mungkin sensitif huruf besar/kecil
    const authHeader = req.headers.authorization || req.headers.Authorization; 
    
    // 1. Cek keberadaan token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Akses ditolak. Token tidak ditemukan atau format tidak valid.' });
    }
    
    // Ambil token dari 'Bearer [token]'
    const token = authHeader.split(' ')[1];
    
    try {
        // 2. Verifikasi Token
        const decodedToken = jwt.verify(token, JWT_SECRET);
        
        if (!decodedToken.userId) {
            throw new Error('Token tidak valid: userId tidak ditemukan.');
        }

        // ===========================================
        // LOGIKA FLOW 1: SUPER ADMIN
        // ===========================================
        if (decodedToken.role === 'Super Admin') { 
            
            // HANYA izinkan Super Admin mengakses rute Super Admin
            if (req.originalUrl.includes('/api/superAdmin') || req.originalUrl.includes('/api/superAuth')) {
                 // Tempelkan info user untuk rute Super Admin
                 req.user = {
                    userId: decodedToken.userId,
                    role: decodedToken.role 
                 };
                 return next(); // Lolos untuk rute Super Admin
            }
            
            // Jika Super Admin mencoba mengakses rute Sekolah (misal: /api/presensi), TOLAK.
            return res.status(403).json({ message: 'Akses ditolak. Token Super Admin tidak berhak mengakses rute sekolah.' }); 
        }

        // ===========================================
        // LOGIKA FLOW 2: ADMIN/GURU SEKOLAH
        // ===========================================
        
        // 3. Wajib ada 'sekolahId' untuk User Sekolah
        if (!decodedToken.sekolahId) {
            return res.status(401).json({ message: 'Token tidak valid: ID Sekolah tidak ditemukan.' });
        }

        // 4. Bandingkan 'sekolahId' dari Token dengan 'id_sekolah' dari Subdomain
        //    (req.sekolah ditempel oleh identifyTenant.js)
        if (!req.sekolah || decodedToken.sekolahId !== req.sekolah.id_sekolah) {
             return res.status(401).json({ message: 'Token tidak sesuai untuk sekolah ini. Silakan login kembali.' });
        }

        // 5. Tempelkan info lengkap ke 'req.user'
        req.user = {
            userId: decodedToken.userId,
            sekolahId: decodedToken.sekolahId,
            role: decodedToken.role
        };
        
        return next(); // Lolos untuk rute Sekolah

    } catch (error) {
        // Jika verifikasi JWT gagal (expired, signature invalid, dll.)
        console.error('Error otentikasi (auth middleware):', error.message);
        return res.status(401).json({ message: 'Token tidak valid atau kedaluwarsa.' });
    } 
};