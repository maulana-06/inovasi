// File: /auth.js 

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'kunci-rahasia-default';

module.exports = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Akses ditolak (Token tidak ditemukan).' });
    }
    const token = authHeader.split(' ')[1];
    
    try {
        const decodedToken = jwt.verify(token, JWT_SECRET);
        
        if (!decodedToken.userId) {
            throw new Error('Token tidak valid: userId tidak ditemukan.');
        }

        // ============================================
        // LOGIKA FLOW KEPUTUSAN: SUPER ADMIN vs SEKOLAH
        // ============================================
        // Hanya lolos jika role-nya 'Super Admin'
        if (decodedToken.role === 'Super Admin') { 
            
            // Logika ini HANYA boleh dipakai di rute Super Admin.
            // Jika rute ini rute Sekolah (yang butuh req.sekolah), Token Super Admin DILARANG masuk.
            if (req.originalUrl.includes('/api/superAdmin')) {
                 req.user = {
                    userId: decodedToken.userId,
                    role: decodedToken.role 
                 };
                 return next(); 
            }
            
            // Jika Super Admin mencoba mengakses rute non-Super Admin (misal: /api/sekolah/dashboard), TOLAK.
            return res.status(403).json({ message: 'Akses ditolak. Token Super Admin tidak berhak mengakses rute sekolah.' }); 
        }

        // ============================================
        // LOGIKA UNTUK ADMIN/GURU SEKOLAH (Wajib punya sekolahId & tenant match)
        // ============================================
        
        // 4. Wajib ada 'sekolahId' untuk User Sekolah (Admin/Guru)
        if (!decodedToken.sekolahId) {
            // Jika bukan Super Admin (lolos dari if di atas) dan tidak punya sekolahId, token gagal.
            return res.status(401).json({ message: 'Token tidak valid: Sekolah ID tidak ditemukan.' });
        }

        // 5. Bandingkan 'sekolahId' dari Token dengan 'sekolahId' dari Subdomain
        //    'req.sekolah' sudah dipasang oleh identifyTenant.js
        if (!req.sekolah || decodedToken.sekolahId !== req.sekolah.id_sekolah) {
             return res.status(401).json({ message: 'Token tidak sesuai untuk sekolah ini.' });
        }

        // 6. Tempelkan info lengkap ke 'req.user' untuk rute Sekolah
        req.user = {
            userId: decodedToken.userId,
            sekolahId: decodedToken.sekolahId,
            role: decodedToken.role
        };
            return next(); 

        } catch (error) {
        return res.status(401).json({ message: 'Akses ditolak (Token tidak valid atau kedaluwarsa)' });
    }
};
