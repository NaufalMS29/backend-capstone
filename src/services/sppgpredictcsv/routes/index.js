import express from 'express';
import multer from 'multer';
import SppgPredictCsvController from '../controller/sppgpredictcsv-controller.js';
import authMiddleware from '../../../middlewares/auth.js';

const router = express.Router();
const controller = new SppgPredictCsvController();

// Mengonfigurasi Multer untuk membaca file CSV langsung di memori RAM (buffer)
const upload = multer({ storage: multer.memoryStorage() });

// Endpoint utama untuk mengunggah CSV data siswa massal
router.post('/sppg-csv/upload', authMiddleware, upload.single('file'), controller.postBatchCsvHandler);
router.get('/sppg-csv/history', authMiddleware, controller.getBatchCsvHistoryHandler);

export default router;