import pool from '../../../config/database.js';

class SppgPredictCsvRepository {
  async insertBatchPredictions(batchData) {
    if (!batchData || batchData.length === 0) { return []; }

    const client = await pool.connect();
    const insertedRows = [];

    try {
      await client.query('BEGIN');

      // PERBAIKAN: Menambahkan kolom input_type (Total menjadi 16 kolom)
      const queryText = `
        INSERT INTO sppg_analyses 
        (
          id,
          user_id, 
          nama_wilayah, 
          total_siswa, 
          rasio_sd,
          rasio_smp,
          rasio_sma_smk,
          jumlah_sppg_prediksi, 
          kebutuhan_sppg, 
          gap_prediksi, 
          status, 
          interpretasi,
          rekomendasi_kebijakan,
          penjelasan_prediksi,
          model_llm,
          input_type -- ◄ Kolom pemisah tipe input data
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (id) DO NOTHING
        RETURNING id, nama_wilayah, status;
      `;

      for (const data of batchData) {
        const values = [
          data.id,                    // $1
          data.user_id,               // $2
          data.nama_wilayah,          // $3
          data.total_siswa,           // $4
          data.rasio_sd,              // $5
          data.rasio_smp,             // $6
          data.rasio_sma_smk,         // $7
          data.jumlah_sppg_prediksi,  // $8
          data.kebutuhan_sppg,        // $9
          data.gap_prediksi,          // $10
          data.status,                // $11
          data.interpretasi || '',    // $12
          data.rekomendasi_kebijakan, // $13
          data.penjelasan_prediksi,   // $14
          data.model_llm,             // $15
          'CSV'                       // $16 ◄ Kunci nilai bertipe 'CSV'
        ];

        const res = await client.query(queryText, values);

        if (res.rows.length > 0) {
          insertedRows.push(res.rows[0]);
        }
      }

      await client.query('COMMIT');
      return insertedRows;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findAllPredictions() {
    // PERBAIKAN: Mengunci history tabel agar hanya menarik baris ber-label 'CSV'
    const query = `
      SELECT 
        id, 
        nama_wilayah, 
        total_siswa, 
        jumlah_sppg_prediksi, 
        kebutuhan_sppg, 
        gap_prediksi, 
        status, 
        interpretasi,
        rasio_sd,
        rasio_smp,
        rasio_sma_smk,
        rekomendasi_kebijakan,
        penjelasan_prediksi,
        model_llm,
        input_type, -- ◄ Ikut sertakan agar object mapper di Controller tidak bernilai undefined
        created_at
      FROM sppg_analyses 
      WHERE input_type = 'CSV' -- ◄ Dinding penyaring
      ORDER BY created_at DESC;
    `;

    const result = await pool.query(query);
    return result.rows;
  }
}

export default SppgPredictCsvRepository;