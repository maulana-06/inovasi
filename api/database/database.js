const { Pool } = require('pg');

// Vercel akan secara otomatis mengisi process.env.DATABASE_URL
// dengan Connection String Supabase yang Anda masukkan di Dashboard Vercel.
const pool = new Pool({
  // Gunakan connectionString untuk mengambil URI lengkap dari Vercel
  connectionString: process.env.DATABASE_URL,
  
  // Opsi SSL ini PENTING karena Supabase (cloud DB) memerlukan koneksi yang aman (HTTPS/SSL)
  ssl: {
    rejectUnauthorized: false
  }
});

// Tes koneksi (Opsional, tapi bagus untuk debugging)
pool.connect((err, client, release) => {
  if (err) {
    // Jika koneksi gagal, Vercel logs akan menampilkan error ini
    return console.error('Error saat koneksi ke database', err.stack);
  }
  client.query('SELECT NOW()', (err, result) => {
    release(); // Lepaskan client
    if (err) {
      console.error('Error saat menjalankan query test', err.stack);
    } else {
      console.log('Koneksi database PostgreSQL berhasil!');
    }
  });
});

// Export pool agar bisa digunakan di route API Anda
module.exports = pool;