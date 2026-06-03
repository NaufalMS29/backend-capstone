import pg from 'pg';

const { Pool } = pg;

// Konfigurasi otomatis: 
// Jika di Vercel/Production, ia akan membaca POSTGRES_URL.
// Jika di lokal, library 'pg' otomatis mencari variabel PGUSER, PGHOST, PGPASSWORD, PGDATABASE, PGPORT di .env Anda.
const poolConfig = process.env.POSTGRES_URL
  ? {
    connectionString: process.env.POSTGRES_URL,
    ssl: {
      rejectUnauthorized: false, // Wajib diaktifkan untuk koneksi cloud aman seperti Supabase
    },
  }
  : {
    // Menggunakan variabel lokal yang sudah Anda set di .env
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: process.env.PGPORT,
  };

const pool = new Pool(poolConfig);

// Lakukan tes koneksi awal saat server menyala
pool.connect((err, client, release) => {
  if (err) {
    return console.error('❌ Gagal mengoneksikan ke database PostgreSQL:', err.stack);
  }
  console.log('⚡ Sukses terkoneksi ke database PostgreSQL lokal!');
  release();
});

export default pool;