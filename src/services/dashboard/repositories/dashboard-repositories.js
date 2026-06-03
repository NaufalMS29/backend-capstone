import pool from '../../../config/database.js';

class DashboardRepository {
  constructor() {
    this._pool = pool;
  }

  // 1. Hitung total baris di tabel master_sppg (Total SPPG Terdaftar)
  async getTotalSppgMaster() {
    const query = 'SELECT COUNT(*) AS total FROM master_sppg';
    const result = await this._pool.query(query);
    return parseInt(result.rows[0].total) || 0;
  }

  // 2. Hitung total siswa (SUM total_siswa) dari tabel sppg_analyses
  async getTotalSiswaAnalyses() {
    const query = 'SELECT SUM(total_siswa) AS total FROM sppg_analyses';
    const result = await this._pool.query(query);
    return parseInt(result.rows[0].total) || 0;
  }

  // 3. Menghitung wilayah prioritas yang berstatus SANGAT_KURANG atau KURANG
  async getTotalWilayahPrioritas() {
    const query = `
      SELECT COUNT(*) AS total 
      FROM sppg_analyses 
      WHERE UPPER(status) IN ('SANGAT_KURANG', 'KURANG')
    `;
    const result = await this._pool.query(query);
    return parseInt(result.rows[0].total) || 0;
  }

  // 4. 💡 PERBAIKAN UTAMA (Mencegah Duplikasi Wilayah di Top 5):
  // Menggunakan Common Table Expression (CTE) dan DISTINCT ON untuk menyaring wilayah duplikat,
  // mengambil gap paling minus (paling kritis) dari wilayah tersebut,
  // serta otomatis menarik wilayah unik di bawahnya untuk mengisi slot Top 5.
  async getTopKerawanan() {
    const query = `
      WITH unique_kerawanan AS (
        SELECT DISTINCT ON (LOWER(TRIM(nama_wilayah))) 
          nama_wilayah, 
          kebutuhan_sppg, 
          gap_prediksi, 
          status
        FROM sppg_analyses
        WHERE UPPER(status) = 'SANGAT_KURANG'
        ORDER BY LOWER(TRIM(nama_wilayah)), gap_prediksi ASC
      )
      SELECT nama_wilayah, kebutuhan_sppg, gap_prediksi, status
      FROM unique_kerawanan
      ORDER BY gap_prediksi ASC
      LIMIT 5
    `;
    const result = await this._pool.query(query);
    return result.rows;
  }
}

export default DashboardRepository;