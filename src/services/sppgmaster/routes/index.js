// index.js (Router - SPPG Master)
import express from 'express';
import multer from 'multer';
import path from 'path';
import { uploadMasterCsvHandler, getMasterCsvHandler } from '../controller/sppgmaster-controller.js';
import authMiddleware from '../../../middlewares/auth.js';

const router = express.Router();

const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    if (ext !== '.csv') {
      return cb(new Error('Hanya diperbolehkan mengunggah berkas dengan format .csv'), false);
    }
    cb(null, true);
  }
});

// ─── PERBAIKAN: Hilangkan kata '/api' agar tidak dobel/bentrok ───────────
// Jika server utama menggunakan app.use('/api', ...), rute ini otomatis menjadi /api/sppg/master/csv
router.post('/api/sppg/master/csv', authMiddleware, upload.single('file'), uploadMasterCsvHandler);
router.get('/api/sppg/master/csv', authMiddleware, getMasterCsvHandler);

export default router;