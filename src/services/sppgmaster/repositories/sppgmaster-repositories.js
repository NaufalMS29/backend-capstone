import pool from '../../../config/database.js';

class SppgMasterRepository {
  constructor() {
    this._pool = pool;
  }

  /**
   * Import seluruh data menggunakan Transaction
   * Jika gagal, database akan kembali seperti semula.
   */
  async replaceMasterData(dataArray) {
    const client = await this._pool.connect();

    try {
      await client.query('BEGIN');

      //---------------------------------------
      // Kosongkan tabel
      //---------------------------------------

      await client.query('TRUNCATE TABLE master_sppg RESTART IDENTITY');

      //---------------------------------------
      // Tidak ada data
      //---------------------------------------

      if (!Array.isArray(dataArray) || dataArray.length === 0) {
        throw new Error('Data CSV kosong.');
      }

      //---------------------------------------
      // Batch Insert
      //---------------------------------------

      const batchSize = 1000;

      for (let i = 0; i < dataArray.length; i += batchSize) {
        const batch = dataArray.slice(i, i + batchSize);

        const values = [];
        const placeholders = [];

        let counter = 1;

        for (const row of batch) {

          placeholders.push(
            `($${counter},
              $${counter + 1},
              $${counter + 2},
              $${counter + 3},
              $${counter + 4},
              $${counter + 5},
              $${counter + 6})`
          );

          values.push(
            row.no_sppg,
            row.provinsi,
            row.kab_kota,
            row.kecamatan,
            row.kelurahan,
            row.alamat,
            row.nama_sppg
          );

          counter += 7;
        }

        await client.query({
          text: `
            INSERT INTO master_sppg
            (
              no_sppg,
              provinsi,
              kab_kota,
              kecamatan,
              kelurahan,
              alamat,
              nama_sppg
            )

            VALUES

            ${placeholders.join(',')}
          `,
          values,
        });
      }

      //---------------------------------------
      // Semua berhasil
      //---------------------------------------

      await client.query('COMMIT');

      return dataArray.length;
    } catch (error) {

      //---------------------------------------
      // Jika ada error,
      // semua perubahan dibatalkan
      //---------------------------------------

      await client.query('ROLLBACK');

      throw error;

    } finally {

      client.release();

    }
  }

  async getAllMasterData(page = 1, limit = 100) {

    const offset = (page - 1) * limit;

    const dataQuery = {
      text: `
        SELECT
            id,
            no_sppg,
            provinsi,
            kab_kota,
            kecamatan,
            kelurahan,
            alamat,
            nama_sppg

        FROM master_sppg

        ORDER BY id ASC

        LIMIT $1 OFFSET $2
      `,
      values: [limit, offset],
    };

    const countQuery = {
      text: `
        SELECT COUNT(*) AS total
        FROM master_sppg
      `,
    };

    const [rows, count] = await Promise.all([
      this._pool.query(dataQuery),
      this._pool.query(countQuery),
    ]);

    return {
      data: rows.rows,
      total: Number(count.rows[0].total),
    };
  }
}

export default SppgMasterRepository;