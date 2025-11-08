// File: database.js 
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, 
  ssl: {
    rejectUnauthorized: false   }
});

// Ekspor pool agar bisa digunakan di route API Anda
module.exports = pool;