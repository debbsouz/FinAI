let gastos = [];
let orcamentoMensal = parseFloat(localStorage.getItem('orcamentoMensal')) || 3000;
let pieChart = null;
let barChart = null;

const regrasCategorias = {
  "Alimentação": ["ifood", "restaurante", "mercado", "supermercado", "pão", "café", "almoço", "janta", "lanche"],
  "Transporte": ["uber", "99", "taxi", "ônibus", "metro", "gasolina", "estacionamento", "combustível"],
  "Moradia": ["aluguel", "condomínio", "internet", "luz", "água", "gás", "iptu"],
  "Lazer": ["netflix", "spotify", "cinema", "show", "bar", "festa", "jogo", "streaming"],
  "Saúde": ["farmácia", "remédio", "médico", "dentista", "academia", "consulta"],
  "Compras": ["shein", "amazon", "magazine", "roupa", "sapato", "loja"],
  "Educação": ["curso", "faculdade", "livro", "alura", "hotmart"],
  "Outros": []
};

function categorizarGasto(descricao) {
  const desc = descricao.toLowerCase();
  for (let categoria in regrasCategorias) {
    if (regrasCategorias[categoria].some(palavra => desc.includes(palavra))) {
      return categoria;
    }
  }
  return "Outros";
}

function carregarDados() {
  const salvos = localStorage.getItem('gastos');
  if (salvos) {
    gastos = JSON.parse(salvos);
  }
  document.getElementById('orcamentoMensal').value = orcamentoMensal;
  renderizarTudo();
}

function salvarGastos() {
  localStorage.setItem('gastos', JSON.stringify(gastos));
}

function salvarOrcamento() {
  const valor = parseFloat(document.getElementById('orcamentoMensal').value);
  if (valor && valor > 0) {
    orcamentoMensal = valor;
    localStorage.setItem('orcamentoMensal', valor);
    renderizarTudo();
  }
}

function adicionarGasto() {
  const descricao = document.getElementById('descricao').value.trim();
  const valorStr = document.getElementById('valor').value;
  const data = document.getElementById('data').value;

  if (!descricao || !valorStr || !data) {
    alert('Por favor, preencha todos os campos.');
    return;
  }

  const valor = parseFloat(valorStr);
  const categoria = categorizarGasto(descricao);

  gastos.unshift({
    id: Date.now(),
    descricao: descricao,
    valor: valor,
    data: data,
    categoria: categoria
  });

  salvarGastos();
  renderizarTudo();

  // Limpa os campos
  document.getElementById('descricao').value = '';
  document.getElementById('valor').value = '';
}

function removerGasto(id) {
  if (confirm('Excluir este gasto?')) {
    gastos = gastos.filter(g => g.id !== id);
    salvarGastos();
    renderizarTudo();
  }
}

function calcularTotalGasto() {
  return gastos.reduce((total, gasto) => total + gasto.valor, 0);
}

function renderizarLista() {
  const container = document.getElementById('listaGastos');
  
  if (gastos.length === 0) {
    container.innerHTML = `<div class="text-center py-16 text-zinc-500">Nenhum gasto registrado ainda.</div>`;
    return;
  }

  let html = '';
  gastos.forEach(gasto => {
    html += `
      <div class="bg-zinc-800 rounded-2xl px-6 py-5 flex justify-between items-center group">
        <div>
          <p class="font-medium">${gasto.descricao}</p>
          <div class="flex items-center gap-3 mt-1 text-sm">
            <span class="px-3 py-1 bg-zinc-700 rounded-full">${gasto.categoria}</span>
            <span class="text-zinc-400">${new Date(gasto.data).toLocaleDateString('pt-BR')}</span>
          </div>
        </div>
        <div class="flex items-center gap-8">
          <span class="text-xl font-semibold">R$ ${gasto.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          <button onclick="removerGasto(${gasto.id})" class="text-red-400 opacity-0 group-hover:opacity-100">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>`;
  });
  container.innerHTML = html;
}

function renderizarResumoCategorias() {
  const container = document.getElementById('resumoCategorias');
  const porCategoria = {};

  gastos.forEach(gasto => {
    porCategoria[gasto.categoria] = (porCategoria[gasto.categoria] || 0) + gasto.valor;
  });

  let html = '';
  Object.keys(porCategoria).forEach(categoria => {
    const valor = porCategoria[categoria];
    html += `
      <div class="bg-zinc-800 rounded-2xl p-5">
        <p class="text-zinc-400 text-sm">${categoria}</p>
        <p class="text-2xl font-semibold mt-1">R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
      </div>`;
  });

  container.innerHTML = html || `<p class="col-span-4 text-center py-8 text-zinc-500">Adicione gastos para ver o resumo</p>`;
}

function renderizarProgressoOrcamento() {
  const total = calcularTotalGasto();
  const percentual = orcamentoMensal > 0 ? Math.min((total / orcamentoMensal) * 100, 100) : 0;
  const container = document.getElementById('progressoOrcamento');

  const corBarra = percentual > 85 ? 'bg-red-500' : percentual > 65 ? 'bg-amber-500' : 'bg-emerald-500';

  container.innerHTML = `
    <div class="flex justify-between text-sm mb-2">
      <span>Gasto atual do mês</span>
      <span>R$ ${total.toLocaleString('pt-BR')} / R$ ${orcamentoMensal.toLocaleString('pt-BR')}</span>
    </div>
    <div class="h-3 bg-zinc-700 rounded-full overflow-hidden">
      <div class="${corBarra} h-full transition-all duration-300" style="width: ${percentual}%"></div>
    </div>
    <p class="text-xs text-zinc-400 mt-2">${percentual.toFixed(0)}% do orçamento utilizado</p>
  `;
}

function gerarAnaliseIA() {
  const container = document.getElementById('insights');
  const total = calcularTotalGasto();

  if (gastos.length === 0) {
    container.innerHTML = `<p class="text-zinc-500">Adicione alguns gastos para eu analisar seu padrão financeiro.</p>`;
    return;
  }

  const porCategoria = {};
  gastos.forEach(g => {
    porCategoria[g.categoria] = (porCategoria[g.categoria] || 0) + g.valor;
  });

  const categoriaMaior = Object.keys(porCategoria).reduce((a, b) => 
    porCategoria[a] > porCategoria[b] ? a : b
  );

  const percentualMaior = ((porCategoria[categoriaMaior] / total) * 100).toFixed(0);

  let textoAnalise = '';

  if (total > orcamentoMensal * 0.9) {
    textoAnalise = `Você já utilizou ${percentualMaior}% do seu orçamento e está gastando bastante em <strong>${categoriaMaior}</strong>. Recomendo atenção nos próximos dias.`;
  } else if (percentualMaior > 35) {
    textoAnalise = `Sua maior categoria é <strong>${categoriaMaior}</strong> (${percentualMaior}% do total). Vale a pena definir um limite específico para ela.`;
  } else {
    textoAnalise = `Sua distribuição está relativamente equilibrada. A categoria que mais aparece é <strong>${categoriaMaior}</strong>.`;
  }

  container.innerHTML = `
    <div class="bg-zinc-800 border border-violet-500/30 rounded-2xl p-6">
      <p class="text-violet-300">Análise deste mês</p>
      <p class="mt-4 leading-relaxed">${textoAnalise}</p>
    </div>
  `;
}

function atualizarGraficos() {
  const porCategoria = {};
  gastos.forEach(g => {
    porCategoria[g.categoria] = (porCategoria[g.categoria] || 0) + g.valor;
  });

  const labels = Object.keys(porCategoria);
  const valores = Object.values(porCategoria);
  const cores = ['#a855f7', '#db2777', '#e11d48', '#f59e0b', '#10b981', '#3b82f6'];

  // Gráfico de Pizza
  if (pieChart) pieChart.destroy();
  pieChart = new Chart(document.getElementById('pieChart'), {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{ data: valores, backgroundColor: cores }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#d1d5db', padding: 15 } }
      }
    }
  });

  // Gráfico de Barras
  if (barChart) barChart.destroy();
  barChart = new Chart(document.getElementById('barChart'), {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        data: valores,
        backgroundColor: '#a855f7',
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } }
    }
  });
}

function renderizarTudo() {
  renderizarLista();
  renderizarResumoCategorias();
  renderizarProgressoOrcamento();
  gerarAnaliseIA();
  atualizarGraficos();
}

// Funções auxiliares
function exportarCSV() {
  if (gastos.length === 0) {
    alert('Não há gastos para exportar.');
    return;
  }

  let csvContent = "Data,Descrição,Categoria,Valor\n";
  gastos.forEach(gasto => {
    csvContent += `${gasto.data},"${gasto.descricao.replace(/"/g, '""')}",${gasto.categoria},${gasto.valor}\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `meus_gastos_${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
}

function limparTodosDados() {
  if (confirm('Tem certeza que deseja apagar todos os gastos? Essa ação não pode ser desfeita.')) {
    gastos = [];
    localStorage.removeItem('gastos');
    renderizarTudo();
  }
}

// Inicialização
window.onload = function() {
  const hoje = new Date().toISOString().split('T')[0];
  document.getElementById('data').value = hoje;
  carregarDados();
};

// ==================== INTEGRAÇÃO COM GEMINI (LLM REAL) ====================

let geminiAPIKey = localStorage.getItem('geminiAPIKey') || '';

function configurarAPIKey() {
  const key = prompt('Cole sua Gemini API Key aqui (crie em aistudio.google.com):', geminiAPIKey);
  if (key !== null) {
    geminiAPIKey = key.trim();
    localStorage.setItem('geminiAPIKey', geminiAPIKey);
    alert('Chave salva! Agora a IA está usando modelo real.');
    gerarAnaliseIA(); // Atualiza análise
  }
}

// Função principal que chama o Gemini
async function chamarGemini(prompt) {
  if (!geminiAPIKey) {
    return "Configure sua Gemini API Key primeiro (clique no botão de chave).";
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiAPIKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    const data = await response.json();
    
    if (data.candidates && data.candidates[0]) {
      return data.candidates[0].content.parts[0].text.trim();
    } else {
      return "Não consegui gerar uma resposta no momento. Tente novamente.";
    }
  } catch (error) {
    console.error(error);
    return "Erro ao conectar com a IA. Verifique sua chave API ou conexão.";
  }
}

// Nova análise com LLM real
async function gerarAnaliseIA() {
  const container = document.getElementById('insights');
  const total = calcularTotalGasto();

  if (gastos.length === 0) {
    container.innerHTML = `<p class="text-zinc-500">Adicione alguns gastos para a IA analisar seu comportamento financeiro.</p>`;
    return;
  }

  // Prompt inteligente com todos os dados
  let prompt = `Você é uma analista financeira pessoal experiente e direta.

Aqui estão meus gastos deste mês:
Total gasto: R$ ${total.toLocaleString('pt-BR')}

`;

  const porCategoria = {};
  gastos.forEach(g => {
    porCategoria[g.categoria] = (porCategoria[g.categoria] || 0) + g.valor;
  });

  prompt += "Gastos por categoria:\n";
  Object.keys(porCategoria).forEach(cat => {
    prompt += `- ${cat}: R$ ${porCategoria[cat].toLocaleString('pt-BR')}\n`;
  });

  prompt += `\nOrçamento mensal definido: R$ ${orcamentoMensal.toLocaleString('pt-BR')}\n\n`;
  prompt += `Faça uma análise curta, honesta e útil (máximo 4-5 frases). Foque no que está bom, no que precisa melhorar e dê 1 sugestão prática. Use linguagem natural, como se estivesse conversando comigo.`;

  container.innerHTML = `<p class="text-violet-400">Pensando com a IA...</p>`;

  const resposta = await chamarGemini(prompt);

  container.innerHTML = `
    <div class="bg-zinc-800 border border-violet-500/30 rounded-2xl p-6">
      <p class="text-violet-300 mb-3">Análise inteligente</p>
      <p class="leading-relaxed whitespace-pre-wrap">${resposta}</p>
    </div>
  `;
}
// Função para perguntar qualquer coisa
async function enviarPerguntaIA() {
  const input = document.getElementById('perguntaIA');
  const pergunta = input.value.trim();
  
  if (!pergunta) return;

  const container = document.getElementById('insights');
  container.innerHTML = `<p class="text-violet-400">Pensando...</p>`;

  let prompt = `Você é minha analista financeira pessoal. Aqui está o resumo dos meus gastos:\n\n`;

  const total = calcularTotalGasto();
  const porCategoria = {};
  gastos.forEach(g => porCategoria[g.categoria] = (porCategoria[g.categoria] || 0) + g.valor);

  prompt += `Total gasto: R$ ${total.toLocaleString('pt-BR')}\n`;
  prompt += `Orçamento mensal: R$ ${orcamentoMensal.toLocaleString('pt-BR')}\n\n`;
  prompt += `Gastos por categoria:\n`;
  Object.keys(porCategoria).forEach(cat => {
    prompt += `- ${cat}: R$ ${porCategoria[cat].toLocaleString('pt-BR')}\n`;
  });

  prompt += `\nPergunta do usuário: ${pergunta}\n\nResponda de forma clara, útil e direta.`;

  const resposta = await chamarGemini(prompt);

  container.innerHTML = `
    <div class="bg-zinc-800 border border-violet-500/30 rounded-2xl p-6">
      <p class="text-violet-300 mb-3">Resposta da IA</p>
      <p class="leading-relaxed whitespace-pre-wrap">${resposta}</p>
    </div>
  `;

  input.value = '';
}