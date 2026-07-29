import SppgPredictCsvRepository from '../repositories/sppgpredictcsv-repositories.js';

class SppgPredictCsvService {
  constructor() {
    this._repository = new SppgPredictCsvRepository();
  }

  async processAndCombineBatch(
    userId,
    newRows,
    aiPredictions,
    cachedRows
  ) {

    if (!Array.isArray(newRows)) {
      throw new Error("Data CSV tidak valid.");
    }

    if (!Array.isArray(aiPredictions)) {
      throw new Error("Hasil prediksi AI tidak valid.");
    }

    if (!Array.isArray(cachedRows)) {
      cachedRows = [];
    }

    if (
      newRows.length > 0 &&
      aiPredictions.length !== newRows.length
    ) {
      throw new Error(
        "Jumlah hasil prediksi FastAPI tidak sesuai dengan jumlah data CSV."
      );
    }

    const finalBatchData = [...cachedRows];

    for (let i = 0; i < newRows.length; i++) {

      const row = newRows[i];
      const prediction = aiPredictions[i];

      if (!prediction) {
        throw new Error(
          `Prediksi AI untuk wilayah "${row.nama_wilayah}" tidak ditemukan.`
        );
      }

      const prediksi =
        Number(prediction.jumlah_sppg_prediksi);

      const kebutuhan =
        Number(prediction.kebutuhan_sppg);

      const gap =
        Number(prediction.gap_prediksi);

      if (
        isNaN(prediksi) ||
        isNaN(kebutuhan) ||
        isNaN(gap)
      ) {
        throw new Error(
          `Nilai prediksi AI wilayah "${row.nama_wilayah}" tidak valid.`
        );
      }

      const statusWilayah =
        prediction.status || "UNKNOWN";

      const interpretasi =
        prediction.interpretasi ||
        `Status wilayah ${statusWilayah}.`;

      const totalSiswa =
        Number(row.total_siswa) || 1;

      const rasioSd =
        (
          (Number(row.sd_sederajat) || 0) /
          totalSiswa
        ) * 100;

      const rasioSmp =
        (
          (Number(row.smp_sederajat) || 0) /
          totalSiswa
        ) * 100;

      const rasioSmaSmk =
        (
          (
            (Number(row.sma_sederajat) || 0) +
            (Number(row.smk_sederajat) || 0)
          ) /
          totalSiswa
        ) * 100;

      let rekomendasi = "";

      switch (statusWilayah.toUpperCase()) {

        case "KURANG":

          rekomendasi =
            `1. Prioritaskan pembangunan unit baru.
2. Tambahkan anggaran.
3. Redistribusi layanan.`;

          break;

        case "SURPLUS":

          rekomendasi =
            `1. Optimalkan pemanfaatan unit.
2. Evaluasi distribusi.
3. Alihkan anggaran ke wilayah lain.`;

          break;

        default:

          rekomendasi =
            `1. Pertahankan kondisi saat ini.
2. Monitoring berkala.`;

      }

      const penjelasan =
        `Analisis batch mendeteksi wilayah ${row.nama_wilayah}
memiliki total ${totalSiswa} siswa.
Model memprediksi kebutuhan ideal sebesar
${kebutuhan} unit SPPG.`;

      const generatedId =
        `csv-${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 8)}`;

      finalBatchData.push({

        id: generatedId,

        user_id: userId,

        nama_wilayah: row.nama_wilayah,

        total_siswa: totalSiswa,

        jumlah_sppg_prediksi: Math.round(prediksi),

        kebutuhan_sppg: kebutuhan,

        gap_prediksi: gap,

        status: statusWilayah,

        rasio_sd: Number(rasioSd.toFixed(2)),

        rasio_smp: Number(rasioSmp.toFixed(2)),

        rasio_sma_smk: Number(rasioSmaSmk.toFixed(2)),

        interpretasi: interpretasi,

        rekomendasi_kebijakan: rekomendasi,

        penjelasan_prediksi: penjelasan,

        model_llm: "FastAPI-Batch/Ridge-Reg",

        input_type: "CSV"

      });

    }

    // Simpan ke database setelah seluruh data selesai diproses
    await this._repository.insertBatchPredictions(finalBatchData);

    return finalBatchData;
  }

  async getPredictionHistory() {
    return await this._repository.findAllPredictions();
  }
}

export default SppgPredictCsvService;