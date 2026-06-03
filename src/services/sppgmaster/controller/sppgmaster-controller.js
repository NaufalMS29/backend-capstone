import SppgMasterService from '../services/sppgmaster-service.js';
import response from '../../../utils/response.js';
import InvariantError from '../../../exceptions/invariant-error.js';

const sppgMasterService = new SppgMasterService();

export const uploadMasterCsvHandler = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new InvariantError('Gagal mengunggah berkas. Mohon lampirkan file CSV yang valid.');
    }

    const fileBuffer = req.file.buffer;

    const totalInserted = await sppgMasterService.importMasterCsv(fileBuffer);

    return response(res, 201, `Berhasil mengimpor ${totalInserted} baris data master fisik SPPG ke database.`);
  } catch (error) {
    next(error);
  }
};

export const getMasterCsvHandler = async (req, res, next) => {
  try {
    const data = await sppgMasterService.getMasterSppg();
    return response(res, 200, 'Berhasil mengambil data master fisik SPPG.', data);
  } catch (error) {
    next(error);
  }
};

export default {
  uploadMasterCsvHandler,
  getMasterCsvHandler,
};