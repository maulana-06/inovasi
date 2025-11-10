// File: database.js 

const { Pool } = require('pg');
const pool = new Pool({
  user: process.env.DB_USER, 
  password: process.env.DB_PASSWORD, 
  host: process.env.DB_HOST, 
  database: process.env.DB_DATABASE, 
  port: 5432,
    ssl: {
    rejectUnauthorized: false,
    // Baris ini terkadang membantu memaksa koneksi
    requestCert: true 
  },
  
  // Aturan Pool Connection
  max: 20, // Batasi jumlah koneksi di Vercel
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

module.exports = pool;