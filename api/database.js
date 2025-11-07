const { Pool } = require('pg');
const pool = new Pool({

    connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

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

module.exports = pool;