import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";
import analysisRoutes from './routes/analysisRoutes.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/analysis', analysisRoutes);

const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

app.post("/ia", async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt não enviado" });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "Você é uma especialista financeira moderna. Fale de forma clara, inteligente e levemente motivadora. Seja direta e útil." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7
      })
    });

    const data: any = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    const texto = data.choices?.[0]?.message?.content || "Sem resposta";

    return res.json({ resposta: texto });

  } catch (error) {
    console.error("Erro no servidor:", error);
    return res.status(500).json({ error: "Erro no servidor" });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
