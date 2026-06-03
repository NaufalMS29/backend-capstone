import express from 'express';
import { getDashboardSummaryHandler } from '../controller/dashboard-controller.js';
import authMiddleware from '../../../middlewares/auth.js';

const router = express.Router();

// Definisikan rute get summary dashboard utama
router.get('/api/dashboard/summary', authMiddleware, getDashboardSummaryHandler);

export default router;