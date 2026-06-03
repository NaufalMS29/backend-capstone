// sppgmaster-repositories.js
import pool from '../../../config/database.js';

class SppgMasterRepository {
  constructor() {
    this._pool = pool;
  }

  // Mengosongkan tabel sebelum data baru masuk agar tidak duplikat
  async truncateMasterTable() {
    const query = 'TRUNCATE TABLE master_sppg RESTART IDENTITY';
    await this._pool.query(query);
  }

  // Memasukkan data baris CSV secara sekuensial/bulk
  async insertMasterRow(rowData) {
    const query = {
      text: `
      INSERT INTO master_sppg (no_sppg, provinsi, kab_kota, kecamatan, kelurahan, alamat, nama_sppg)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
      values: [
        rowData.no_sppg,
        rowData.provinsi,
        rowData.kab_kota,
        rowData.kecamatan,
        rowData.kelurahan,
        rowData.alamat,
        rowData.nama_sppg
      ],
    };
    await this._pool.query(query);
  }

  // ─── FUNGSI BARU: MENGAMBIL SEMUA DATA MASTER SPPG ───────────────────
  async getAllMasterData() {
    const query = 'SELECT id, no_sppg, provinsi, kab_kota, kecamatan, kelurahan, alamat, nama_sppg FROM master_sppg ORDER BY id ASC';
    const result = await this._pool.query(query);
    return result.rows;
  }
}

export default SppgMasterRepository;