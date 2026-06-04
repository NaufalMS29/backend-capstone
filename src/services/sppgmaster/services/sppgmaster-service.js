import fs from 'fs';
import csv from 'csv-parser';
import { Readable } from 'stream';
import SppgMasterRepository from '../repositories/sppgmaster-repositories.js';

class SppgMasterService {
  constructor() {
    this._repository = new SppgMasterRepository();
  }

  async importMasterCsv(csvContent) {
    const results = [];

    return new Promise((resolve, reject) => {
      Readable.from(csvContent)
        .pipe(csv({
          mapHeaders: ({ header }) => header.trim().toLowerCase().replace(/[^a-z0-9]/g, '')
        }))
        .on('data', (data) => {
          results.push(data);
        })
        .on('end', async () => {
          try {
            await this._repository.truncateMasterTable();

            for (const row of results) {
              const mappedData = {
                no_sppg: parseInt(row['no']) || null,
                provinsi: row['provinsisppg'] || row['provinsi'] || null,
                kab_kota: row['kabkotasppg'] || row['kabkota'] || null,
                kecamatan: row['kecamatansppg'] || row['kecamatan'] || null,
                kelurahan: row['kelurahandesasppg'] || row['kelurahan'] || null,
                alamat: row['alamatsppg'] || row['alamat'] || null,
                nama_sppg: row['namasppg'] || row['namasppg'] || null
              };

              if (!mappedData.nama_sppg && !mappedData.provinsi) {
                continue;
              }

              await this._repository.insertMasterRow(mappedData);
            }

            resolve(results.length);
          } catch (error) {
            reject(error);
          }
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  async getMasterSppg(page = 1, limit = 100) {
    return await this._repository.getAllMasterData(page, limit);
  }
}

export default SppgMasterService;