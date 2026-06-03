import express from 'express';
import multer from 'multer';
import path from 'path';
import { uploadMasterCsvHandler, getMasterCsvHandler } from '../controller/sppgmaster-controller.js';
import authMiddleware from '../../../middlewares/auth.js';

const router = express.Router();
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    if (ext !== '.csv') {
      return cb(new Error('Hanya diperbolehkan mengunggah berkas dengan format .csv'), false);
    }
    cb(null, true);
  }
});

router.post('/sppg/master/csv', authMiddleware, upload.single('file'), uploadMasterCsvHandler);
router.get('/sppg/master/csv', authMiddleware, getMasterCsvHandler);

export default router;