// File: database.js 

const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST, 
  user: process.env.DB_USER, 
  password: process.env.DB_PASSWORD, 
  database: process.env.DB_DATABASE, 
  port: process.env.DB_PORT,
    ssl: {
    rejectUnauthorized: false,
    requestCert: true 
  },
    connectionTimeoutMillis: 10000, // Naikkan menjadi 10 detik
    idleTimeoutMillis: 30000, // koneksi idle selama 30 detik
    max: 20, // Jumlah koneksi maksimum
});
module.exports = pool;