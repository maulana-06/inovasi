// File: api/database.js 
const { Pool } = require('pg');

const pool = new Pool({
  // Mengambil URI dari Environment Variable (DATABASE_URL)
  connectionString: process.env.DATABASE_URL, 
  ssl: {
    rejectUnauthorized: false // Penting untuk koneksi ke Supabase
  }
});

// Ekspor pool agar bisa digunakan di route API Anda
module.exports = pool;