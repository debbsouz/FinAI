import fetch from "node-fetch";
import dotenv from 'dotenv'; 
import path from "path";

// Garante o carregamento das variáveis de ambiente
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

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
  private modelos = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro"]; 

  async analisarFinancas(dadosFinanceiros: any): Promise<FinancialAnalysis> { 
    const prompt = ` 
Você é um consultor financeiro sênior especializado em eficiência de capital e análise de dados.

Analise os seguintes dados financeiros do usuário e responda **estritamente** no formato JSON abaixo. 

Dados financeiros: 
${JSON.stringify(dadosFinanceiros, null, 2)} 

Responda apenas com um objeto JSON válido com exatamente estas chaves: 
{ 
  "score_financeiro": number (0-100), 
  "insights": array de strings (análise técnica de tendências, máximo 3 itens), 
  "alertas": array de strings (análise de risco imediato, máximo 2 itens), 
  "sugestoes": array de strings (otimização estratégica, máximo 2 itens), 
  "previsao_proximo_mes": string (projeção baseada em dados), 
  "padroes_identificados": array de strings (padrões de consumo detectados) 
} 

Sua linguagem deve ser profissional, técnica e objetiva. Não utilize linguagem informal ou emojis. Não inclua nenhuma explicação fora do JSON.
`; 

    for (const modelo of this.modelos) {
      try { 
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${GEMINI_API_KEY}`;

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

        if (response.status === 503 || response.status === 429) {
          console.warn(`Modelo ${modelo} indisponível (${response.status}). Tentando próximo...`);
          continue;
        }

        const data: any = await response.json();

        if (!response.ok) {
          console.error(`Erro no modelo ${modelo}:`, data.error?.message);
          continue;
        }

        let textoGerado = "";
        if (data.candidates && Array.isArray(data.candidates)) {
          data.candidates.forEach((candidate: any) => {
            if (candidate.content && Array.isArray(candidate.content.parts)) {
              candidate.content.parts.forEach((part: any) => {
                if (part.text) {
                  textoGerado += part.text;
                }
              });
            }
          });
        }

        textoGerado = textoGerado.trim();

        if (textoGerado) {
          return JSON.parse(textoGerado) as FinancialAnalysis;
        }

      } catch (error) { 
        console.error(`Falha ao analisar com ${modelo}:`, error); 
        continue;
      }
    }

    // Fallback se todos os modelos falharem
    return { 
      score_financeiro: 50, 
      insights: ["Não foi possível gerar análise no momento."], 
      alertas: [], 
      sugestoes: ["O serviço de consultoria está com alta demanda. Tente novamente em instantes."], 
      previsao_proximo_mes: "Análise indisponível.", 
      padroes_identificados: [] 
    }; 
  } 
}
