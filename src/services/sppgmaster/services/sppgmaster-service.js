import csv from 'csv-parser';
import { Readable } from 'stream';
import InvariantError from '../../../exceptions/invariant-error.js';
import SppgMasterRepository from '../repositories/sppgmaster-repositories.js';

class SppgMasterService {
  constructor() {
    this._repository = new SppgMasterRepository();
  }

  async importMasterCsv(csvBuffer) {
    const results = [];

    return new Promise((resolve, reject) => {
      try {
        if (!csvBuffer || csvBuffer.length === 0) {
          throw new InvariantError('File CSV kosong atau tidak valid.');
        }

        const csvString = csvBuffer.toString('utf8');

        Readable.from(csvString)
          .pipe(
            csv({
              newline: '\n',
              mapHeaders: ({ header }) =>
                header
                  .trim()
                  .toLowerCase()
                  .replace(/[^a-z0-9]/g, ''),
            })
          )

          .on('data', (row) => {
            results.push(row);
          })

          .on('end', async () => {
            try {
              if (results.length === 0) {
                throw new InvariantError(
                  'File CSV tidak memiliki data.'
                );
              }

              //---------------------------------------
              // VALIDASI HEADER
              //---------------------------------------

              const headers = Object.keys(results[0]);

              const requiredHeaders = [
                'no',
                'provinsisppg',
                'kabkotasppg',
                'kecamatansppg',
                'kelurahandesasppg',
                'alamatsppg',
                'namasppg',
              ];

              const missingHeaders = requiredHeaders.filter(
                (header) => !headers.includes(header)
              );

              if (missingHeaders.length > 0) {
                throw new InvariantError(
                  `Format CSV tidak sesuai. Header berikut tidak ditemukan: ${missingHeaders.join(
                    ', '
                  )}`
                );
              }

              //---------------------------------------
              // VALIDASI ISI
              //---------------------------------------

              const cleanRows = [];

              for (let i = 0; i < results.length; i++) {
                const row = results[i];

                const mappedData = {
                  no_sppg:
                    row.no && row.no !== ''
                      ? parseInt(row.no)
                      : null,

                  provinsi:
                    row.provinsisppg?.trim() ||
                    row.provinsi?.trim() ||
                    null,

                  kab_kota:
                    row.kabkotasppg?.trim() ||
                    row.kabkota?.trim() ||
                    null,

                  kecamatan:
                    row.kecamatansppg?.trim() ||
                    row.kecamatan?.trim() ||
                    null,

                  kelurahan:
                    row.kelurahandesasppg?.trim() ||
                    row.kelurahan?.trim() ||
                    null,

                  alamat:
                    row.alamatsppg?.trim() ||
                    row.alamat?.trim() ||
                    null,

                  nama_sppg:
                    row.namasppg?.trim() || null,
                };

                //---------------------------------------
                // Validasi wajib
                //---------------------------------------

                if (!mappedData.nama_sppg) {
                  throw new InvariantError(
                    `Baris ${i + 2}: Nama SPPG wajib diisi.`
                  );
                }

                if (!mappedData.provinsi) {
                  throw new InvariantError(
                    `Baris ${i + 2}: Provinsi wajib diisi.`
                  );
                }

                if (!mappedData.kab_kota) {
                  throw new InvariantError(
                    `Baris ${i + 2}: Kabupaten/Kota wajib diisi.`
                  );
                }

                if (!mappedData.kecamatan) {
                  throw new InvariantError(
                    `Baris ${i + 2}: Kecamatan wajib diisi.`
                  );
                }

                if (!mappedData.kelurahan) {
                  throw new InvariantError(
                    `Baris ${i + 2}: Kelurahan wajib diisi.`
                  );
                }

                if (!mappedData.alamat) {
                  throw new InvariantError(
                    `Baris ${i + 2}: Alamat wajib diisi.`
                  );
                }

                cleanRows.push(mappedData);
              }

              //---------------------------------------
              // SEMUA VALID
              //---------------------------------------

              const batchSize = 1000;

              //---------------------------------------
              // Repository nanti menggunakan transaction
              //---------------------------------------

              await this._repository.replaceMasterData(cleanRows);

              resolve(cleanRows.length);
            } catch (err) {
              reject(err);
            }
          })

          .on('error', (err) => reject(err));
      } catch (err) {
        reject(err);
      }
    });
  }

  async getMasterSppg(page = 1, limit = 100) {
    return this._repository.getAllMasterData(page, limit);
  }
}

export default SppgMasterService;