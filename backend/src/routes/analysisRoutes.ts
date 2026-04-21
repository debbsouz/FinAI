import { Router } from 'express';
import { gerarAnalise } from '../controllers/analysisController.js';

const router = Router();

router.post('/analisar', gerarAnalise);

export default router;