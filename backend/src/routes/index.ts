import { Router } from 'express';
import analysisRoutes from './analysisRoutes';

const router = Router();

router.use('/analysis', analysisRoutes);

export default router;
