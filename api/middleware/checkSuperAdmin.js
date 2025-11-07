// File: /checkSuperAdmin.js (BARU)
 
// Middleware ini dijalankan SETELAH middleware 'auth'
module.exports = (req, res, next) => {
    // req.user sudah ada dari middleware 'auth'
    // Pastikan req.user ada dan memiliki role 'superadmin'
    if (req.user && req.user.role === 'Super Admin') {
        next(); // Lanjutkan jika Super Admin
    } else {
        // Tolak akses jika bukan Super Admin
        res.status(403).json({ message: 'Akses ditolak. Hanya untuk Super Admin.' }); 
    }
};