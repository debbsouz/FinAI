import fetch from "node-fetch";
import dotenv from 'dotenv'; 

dotenv.config(); 

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export interface FinancialAnalysis { 
  score_financeiro: number;        // 0 a 100 
  insights: string[]; 
  alertas: string[]; 
  sugestoes: string[]; 
  previsao_proximo_mes: string; 
  padroes_identificados: string[]; 
} 

export class GeminiService { 
  private model = 'gemini-2.5-flash'; 

  async analisarFinancas(dadosFinanceiros: any): Promise<FinancialAnalysis> { 
    const prompt = ` 
Você é um consultor financeiro pessoal experiente, direto e acionável. 

Analise os seguintes dados financeiros do usuário e responda **estritamente** no formato JSON abaixo. 

Dados financeiros: 
${JSON.stringify(dadosFinanceiros, null, 2)} 

Responda apenas com um objeto JSON válido com exatamente estas chaves: 
{ 
  "score_financeiro": number (0-100), 
  "insights": array de strings (máximo 5 insights importantes), 
  "alertas": array de strings (gastos excessivos, riscos, etc.), 
  "sugestoes": array de strings (ações concretas e realistas para melhorar), 
  "previsao_proximo_mes": string (previsão breve do próximo mês), 
  "padroes_identificados": array de strings (padrões de consumo detectados) 
} 

Pense passo a passo antes de responder: 
1. Identifique padrões de gastos por categoria e período. 
2. Calcule o score financeiro considerando orçamento, diversificação de gastos e tendências. 
3. Liste alertas reais e urgentes. 
4. Crie sugestões práticas e mensuráveis. 
5. Faça uma previsão realista. 

Não inclua nenhuma explicação fora do JSON. Certifique-se de que a resposta seja um JSON válido.
`; 

    try { 
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${GEMINI_API_KEY}`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            response_mime_type: "application/json"
          }
        })
      });

      const data: any = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Erro na API do Gemini");
      }

      const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!content) throw new Error("Resposta vazia do Gemini"); 

      return JSON.parse(content) as FinancialAnalysis; 
    } catch (error) { 
      console.error("Erro ao analisar finanças com Gemini:", error); 
      return { 
        score_financeiro: 50, 
        insights: ["Não foi possível gerar análise no momento."], 
        alertas: [], 
        sugestoes: ["Verifique sua chave do Gemini e tente novamente."], 
        previsao_proximo_mes: "Análise indisponível.", 
        padroes_identificados: [] 
      }; 
    } 
  } 
}
