import pool from '../../../config/database.js';

class SppgMasterRepository {
  constructor() {
    this._pool = pool;
  }

  async truncateMasterTable() {
    const query = 'TRUNCATE TABLE master_sppg RESTART IDENTITY';
    await this._pool.query(query);
  }

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

  async getAllMasterData(page = 1, limit = 100) {
    const offset = (page - 1) * limit;

    const dataQuery = {
      text: `SELECT id, no_sppg, provinsi, kab_kota, kecamatan, kelurahan, alamat, nama_sppg 
           FROM master_sppg ORDER BY id ASC LIMIT $1 OFFSET $2`,
      values: [limit, offset],
    };

    const countQuery = 'SELECT COUNT(*) FROM master_sppg';

    const [dataResult, countResult] = await Promise.all([
      this._pool.query(dataQuery),
      this._pool.query(countQuery),
    ]);

    return {
      data: dataResult.rows,
      total: parseInt(countResult.rows[0].count),
    };
  }
}

export default SppgMasterRepository;