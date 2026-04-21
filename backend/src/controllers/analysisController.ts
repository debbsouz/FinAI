import { Request, Response } from 'express';
import { GeminiService, FinancialAnalysis } from '../services/GeminiService';

const geminiService = new GeminiService();

export const gerarAnalise = async (req: Request, res: Response) => {
  try {
    const { dadosFinanceiros } = req.body;

    if (!dadosFinanceiros) {
      return res.status(400).json({ error: 'Dados financeiros são obrigatórios' });
    }

    const analise: FinancialAnalysis = await geminiService.analisarFinancas(dadosFinanceiros);

    res.json({
      success: true,
      analise,
      mensagem: "Análise gerada com sucesso pela IA"
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao gerar análise' 
    });
  }
};
