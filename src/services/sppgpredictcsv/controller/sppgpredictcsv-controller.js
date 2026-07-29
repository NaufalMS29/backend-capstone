import { Readable } from 'stream';
import csvParser from 'csv-parser';
import axios from 'axios';
import responseHelper from '../../../utils/response.js';
import SppgPredictCsvService from '../services/sppgpredictcsv-service.js';

class SppgPredictCsvController {
  constructor() {
    this._service = new SppgPredictCsvService();

    this.postBatchCsvHandler = this.postBatchCsvHandler.bind(this);
    this.getBatchCsvHistoryHandler =
      this.getBatchCsvHistoryHandler.bind(this);
  }

  async postBatchCsvHandler(req, res, next) {
    try {
      if (!req.file) {
        return responseHelper(
          res,
          400,
          'Mohon unggah file CSV terlebih dahulu.',
          null
        );
      }

      const allowedMimeTypes = [
        'text/csv',
        'application/csv',
        'text/plain',
        'application/vnd.ms-excel',
      ];

      const originalName = req.file.originalname.toLowerCase();

      if (
        !originalName.endsWith('.csv') ||
        !allowedMimeTypes.includes(req.file.mimetype)
      ) {
        return responseHelper(
          res,
          400,
          'File harus berformat CSV (.csv).',
          null
        );
      }

      const REQUIRED_HEADERS = [
        'nama_wilayah',
        'kode_wilayah',
        'kb_sederajat',
        'sd_sederajat',
        'smp_sederajat',
        'sma_sederajat',
        'smk_sederajat',
        'slb',
        'sps',
        'tk_sederajat',
        'tpa',
        'total'
      ];

      const rows = [];

      const stream = Readable.from(
        req.file.buffer.toString('utf-8')
      );

      let headerValidated = false;
      await new Promise((resolve, reject) => {

        stream
          .pipe(csvParser())
          .on('headers', (headers) => {
            const normalizedHeaders = headers.map((h) =>
              h.trim().toLowerCase()
            );
            const missingHeaders =
              REQUIRED_HEADERS.filter(
                (header) =>
                  !normalizedHeaders.includes(header)
              );
            if (missingHeaders.length > 0) {
              return reject(
                new Error(
                  `Format CSV tidak sesuai.\nKolom berikut belum tersedia:\n${missingHeaders.join(', ')}`
                )
              );
            }

            headerValidated = true;
          })
          .on('data', (data) => {
            if (!headerValidated) {
              return;
            }

            if (
              !data.nama_wilayah ||
              !data.kode_wilayah
            ) {
              return reject(
                new Error(
                  'CSV memiliki baris kosong atau nama_wilayah tidak tersedia.'
                )
              );
            }

            const numberFields = [
              'kb_sederajat',
              'sd_sederajat',
              'smp_sederajat',
              'sma_sederajat',
              'smk_sederajat',
              'slb',
              'sps',
              'tk_sederajat',
              'tpa',
              'total'
            ];

            for (const field of numberFields) {
              if (isNaN(Number(data[field]))) {
                return reject(
                  new Error(
                    `Kolom "${field}" harus berupa angka.`
                  )
                );
              }
            }

            const kodeWilayah =
              String(data.kode_wilayah);
            const kodeProvinsi =
              kodeWilayah.substring(0, 2);
            rows.push({
              kb_sederajat:
                Number(data.kb_sederajat),

              kode_provinsi:
                kodeProvinsi || '32',

              sd_sederajat:
                Number(data.sd_sederajat),

              slb:
                Number(data.slb),

              sma_sederajat:
                Number(data.sma_sederajat),

              smk_sederajat:
                Number(data.smk_sederajat),

              smp_sederajat:
                Number(data.smp_sederajat),

              sps:
                Number(data.sps),

              tk_sederajat:
                Number(data.tk_sederajat),

              total_siswa:
                Number(data.total) ||
                Number(data.total_siswa),

              tpa:
                Number(data.tpa),

              nama_wilayah:
                data.nama_wilayah.trim()
            });
          })
          .on('end', () => {
            if (rows.length === 0) {
              return reject(
                new Error(
                  'CSV tidak memiliki data.'
                )
              );
            }
            resolve();
          })
          .on('error', reject);
      });

      const userId = req.user
        ? req.user.id
        : 'system-batch';

      const existingAnalyses = await this._service.getPredictionHistory();
      const dataToProcessToAi = [];
      const cachedDataResults = [];

      for (const row of rows) {
        const matchCache =
          existingAnalyses.find(
            (exist) =>
              exist.nama_wilayah
                .trim()
                .toLowerCase() ===
              row.nama_wilayah
                .trim()
                .toLowerCase()
              &&
              exist.input_type === 'CSV'
          );

        if (matchCache) {
          cachedDataResults.push({
            id: matchCache.id,
            user_id: userId,
            nama_wilayah:
              matchCache.nama_wilayah,
            total_siswa:
              Number(matchCache.total_siswa),
            jumlah_sppg_prediksi:
              Number(matchCache.jumlah_sppg_prediksi),
            kebutuhan_sppg:
              parseFloat(matchCache.kebutuhan_sppg),
            gap_prediksi:
              parseFloat(matchCache.gap_prediksi),
            status:
              matchCache.status,
            rasio_sd:
              parseFloat(matchCache.rasio_sd),
            rasio_smp:
              parseFloat(matchCache.rasio_smp),
            rasio_sma_smk:
              parseFloat(matchCache.rasio_sma_smk),
            interpretasi:
              matchCache.interpretasi,
            rekomendasi_kebijakan:
              matchCache.rekomendasi_kebijakan,
            penjelasan_prediksi:
              matchCache.penjelasan_prediksi,
            model_llm:
              matchCache.model_llm.includes('(Cached)')
                ? matchCache.model_llm
                : `${matchCache.model_llm} (Cached)`,
            input_type: 'CSV'
          });
        } else {
          dataToProcessToAi.push(row);
        }
      }
      let aiPredictionsResult = [];
      if (dataToProcessToAi.length > 0) {
        const CHUNK_SIZE = 100;
        const fastapiBaseUrl =
          process.env.FASTAPI_URL ||
          "https://fkaslana-capstone-projek.hf.space";
        const fastapiUrl = `${fastapiBaseUrl}/predict/batch`;
        const promises = [];

        for (
          let i = 0;
          i < dataToProcessToAi.length;
          i += CHUNK_SIZE
        ) {
          const chunkRows = dataToProcessToAi.slice(i, i + CHUNK_SIZE);
          const payload = chunkRows.map(
            ({ nama_wilayah, ...rest }) => rest
          );

          promises.push(
            axios.post(
              fastapiUrl,
              payload,
              {
                headers: {
                  accept: "application/json",
                  "Content-Type": "application/json",
                },
                timeout: 120000,
              }
            )
          );
        }

        const responses = await Promise.all(promises);
        for (const resFastApi of responses) {
          if (!Array.isArray(resFastApi.data)) {
            throw new Error(
              "Format response FastAPI tidak sesuai."
            );
          }

          aiPredictionsResult =
            aiPredictionsResult.concat(
              resFastApi.data
            );
        }
      }

      if (
        aiPredictionsResult.length !==
        dataToProcessToAi.length
      ) {
        throw new Error(
          "Jumlah hasil prediksi FastAPI tidak sesuai dengan jumlah data yang dikirim."
        );
      }

      const finalInserted =
        await this._service.processAndCombineBatch(
          userId,
          dataToProcessToAi,
          aiPredictionsResult,
          cachedDataResults
        );
      return responseHelper(res, 201, `Berhasil memproses ${rows.length} data CSV.
          ${dataToProcessToAi.length} diproses melalui FastAPI.
          ${cachedDataResults.length} menggunakan cache PostgreSQL.`,
        {
          filename: req.file.originalname,
          total_records: rows.length,
          new_processed: dataToProcessToAi.length,
          cached_applied: cachedDataResults.length,
          result: finalInserted
        }
      );
    } catch (error) {
      console.error(error);

      if (error.response) {
        return responseHelper(
          res, error.response.status || 500,
          `FastAPI Error : ${error.response.data?.detail ||
          error.response.data?.message ||
          JSON.stringify(error.response.data)
          }`,
          null
        );
      }

      if (
        error.message.includes("Format CSV") ||
        error.message.includes("Kolom") ||
        error.message.includes("CSV") ||
        error.message.includes("angka")
      ) {
        return responseHelper(
          res,
          400,
          error.message,
          null
        );
      }
      return next(error);
    }
  }

  async getBatchCsvHistoryHandler(req, res, next) {
    try {
      const historyData =
        await this._service.getPredictionHistory();
      return responseHelper(
        res,
        200,
        "Berhasil memuat riwayat analisis CSV.",
        historyData
      );
    } catch (error) {
      return next(error);
    }
  }
}

export default SppgPredictCsvController;