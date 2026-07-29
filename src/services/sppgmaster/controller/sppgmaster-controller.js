import SppgMasterService from '../services/sppgmaster-service.js';
import response from '../../../utils/response.js';
import InvariantError from '../../../exceptions/invariant-error.js';
import fetch from 'node-fetch';

const sppgMasterService = new SppgMasterService();

export const uploadMasterCsvHandler = async (req, res, next) => {
  try {
    const { fileUrl } = req.body;

    //---------------------------------------------------
    // Validasi URL
    //---------------------------------------------------

    if (!fileUrl) {
      throw new InvariantError(
        'Mohon lampirkan file CSV terlebih dahulu.'
      );
    }

    //---------------------------------------------------
    // Download file dari Supabase
    //---------------------------------------------------

    const fileRes = await fetch(fileUrl);

    if (!fileRes.ok) {
      throw new InvariantError(
        'File tidak dapat diakses.'
      );
    }

    //---------------------------------------------------
    // Validasi Content-Type
    //---------------------------------------------------

    const contentType =
      fileRes.headers.get('content-type') || '';

    const allowedTypes = [
      'text/csv',
      'application/csv',
      'text/plain',
      'application/vnd.ms-excel'
    ];

    const validContentType = allowedTypes.some(type =>
      contentType.includes(type)
    );

    //---------------------------------------------------
    // Validasi ekstensi URL
    //---------------------------------------------------

    const lowerUrl = fileUrl.toLowerCase();

    const validExtension =
      lowerUrl.endsWith('.csv') ||
      lowerUrl.includes('.csv?');

    if (!validContentType && !validExtension) {
      throw new InvariantError(
        'File harus berformat CSV.'
      );
    }

    //---------------------------------------------------
    // Buffer
    //---------------------------------------------------

    const fileBuffer = Buffer.from(
      await fileRes.arrayBuffer()
    );

    if (!fileBuffer.length) {
      throw new InvariantError(
        'File CSV kosong.'
      );
    }

    //---------------------------------------------------
    // Import
    //---------------------------------------------------

    const totalInserted =
      await sppgMasterService.importMasterCsv(
        fileBuffer
      );

    return response(
      res,
      201,
      `Berhasil mengimpor ${totalInserted.toLocaleString(
        'id-ID'
      )} data Master SPPG.`,
      {
        inserted: totalInserted,
      }
    );
  } catch (error) {
    next(error);
  }
};

export const getMasterCsvHandler = async (
  req,
  res,
  next
) => {
  try {
    const page =
      Number(req.query.page) || 1;

    const limit =
      Number(req.query.limit) || 100;

    const result =
      await sppgMasterService.getMasterSppg(
        page,
        limit
      );

    return response(
      res,
      200,
      'Berhasil mengambil data Master SPPG.',
      {
        data: result.data,
        total: result.total,
        page,
        totalPages: Math.ceil(
          result.total / limit
        ),
      }
    );
  } catch (error) {
    next(error);
  }
};

export default {
  uploadMasterCsvHandler,
  getMasterCsvHandler,
};