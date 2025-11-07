// File: database.js 

const mysql = require('mysql2/promise');
// const databaseUrl = process.env.DATABASE_URL;
// const pool = mysql.createPool(databaseUrl);

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD, 
    database: process.env.DB_NAME || 'sekolah_db',
    port: process.env.DB_PORT || 3306,
    dateStrings: true, 
    
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;