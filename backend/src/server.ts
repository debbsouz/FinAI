import dotenv from "dotenv";
import path from "path";

// Carrega as variáveis de ambiente antes de qualquer outro import
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express, { Request, Response } from "express";
import cors from "cors";
import fetch from "node-fetch";
import routes from './routes';

const app = express();

app.use(cors());
app.use(express.json());

// Rotas da API
app.use('/api', routes);

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.get("/", (req: Request, res: Response) => {
  res.send("FinAI API - Status: Operational");
});

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

function gerarRespostaLocal(prompt: string): string {
  const p = prompt.toLowerCase();

  if (p.includes("gasto") || p.includes("valor") || p.includes("dinheiro")) {
    return "A redução de despesas operacionais variáveis pode impactar positivamente seu balanço mensal.";
  }
  
  if (p.includes("economizar") || p.includes("poupar") || p.includes("investir")) {
    return "Manter um aporte constante em ativos de alta liquidez é recomendável para estabilidade financeira.";
  }

  if (p.includes("comida") || p.includes("alimentação") || p.includes("restaurante")) {
    return "Otimizar gastos com alimentação através de planejamento prévio permite maior previsibilidade orçamentária.";
  }

  if (p.includes("lazer") || p.includes("diversão") || p.includes("viagem")) {
    return "O planejamento antecipado de custos com entretenimento evita o comprometimento de recursos essenciais.";
  }

  return "O monitoramento contínuo de transações é fundamental para a governança das finanças pessoais.";
}

app.post("/consultar", async (req: Request, res: Response) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "O campo 'prompt' é obrigatório." });
  }

  try {
    if (!GEMINI_API_KEY) throw new Error("API Key ausente");

    const modelos = ["gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
    
    for (const modelo of modelos) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${GEMINI_API_KEY}`;
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        });

        if (!response.ok) continue;

        const data: any = await response.json();
        let textoGerado = "";

        if (data.candidates?.[0]?.content?.parts) {
          textoGerado = data.candidates[0].content.parts.map((p: any) => p.text).join("").trim();
        }

        if (textoGerado) return res.json({ resposta: textoGerado });

      } catch (err) {
        continue; // Tenta o próximo modelo
      }
    }

    // Se todos os modelos falharem, usa a resposta local
    return res.json({ resposta: gerarRespostaLocal(prompt) });

  } catch (error) {
    // Fallback final em caso de erro crítico no processo
    return res.json({ resposta: gerarRespostaLocal(prompt) });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
