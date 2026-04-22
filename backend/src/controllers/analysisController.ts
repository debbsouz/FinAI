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
      mensagem: "Análise estratégica consolidada com sucesso"
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao gerar análise' 
    });
  }
};
