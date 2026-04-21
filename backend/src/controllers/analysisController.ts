import { Request, Response } from 'express';
import { OpenAIService, FinancialAnalysis } from '../services/OpenAIService';

const openAIService = new OpenAIService();

export const gerarAnalise = async (req: Request, res: Response) => {
  try {
    const { dadosFinanceiros } = req.body;

    if (!dadosFinanceiros) {
      return res.status(400).json({ error: 'Dados financeiros são obrigatórios' });
    }

    const analise: FinancialAnalysis = await openAIService.analisarFinancas(dadosFinanceiros);

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