// ==================== VARIÁVEIS GLOBAIS ====================
let gastos = [];
let orcamentoMensal = parseFloat(localStorage.getItem('orcamentoMensal')) || 3000;
let pieChart = null;
let barChart = null;

// ==================== CATEGORIZAÇÃO ====================
const regrasCategorias = {
  "Alimentação": ["ifood", "restaurante", "mercado", "supermercado", "pão", "café", "almoço", "janta", "lanche"],
  "Transporte": ["uber", "99", "taxi", "ônibus", "metro", "gasolina", "estacionamento"],
  "Moradia": ["aluguel", "condomínio", "internet", "luz", "água", "gás"],
  "Lazer": ["netflix", "spotify", "cinema", "show", "bar", "festa"],
  "Saúde": ["farmácia", "remédio", "médico", "dentista", "academia"],
  "Compras": ["shein", "amazon", "magazine", "roupa", "sapato"],
  "Educação": ["curso", "faculdade", "livro"],
  "Outros": []
};

function categorizarGasto(descricao) {
  const desc = descricao.toLowerCase();
  for (let cat in regrasCategorias) {
    if (regrasCategorias[cat].some(p => desc.includes(p))) return cat;
  }
  return "Outros";
}

// ==================== SCORE LOCAL ====================
function calcularScoreLocal() {
  if (gastos.length === 0) return 0;

  const total = calcularTotalGasto();
  let score = 100;

  // 1. Penalidade por estourar orçamento (até -50 pontos)
  if (total > orcamentoMensal) {
    const estouro = ((total - orcamentoMensal) / orcamentoMensal) * 100;
    score -= Math.min(estouro, 50);
  } else if (total > orcamentoMensal * 0.8) {
    score -= 10; // Alerta: acima de 80%
  }

  // 2. Bônus por diversificação (até +20 pontos)
  const categoriasUnicas = new Set(gastos.map(g => g.categoria)).size;
  if (categoriasUnicas >= 5) score += 10;
  else if (categoriasUnicas >= 3) score += 5;

  // 3. Consistência (quantidade de gastos)
  if (gastos.length > 10) score += 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}

// ==================== FUNÇÕES BÁSICAS ====================
function carregarDados() {
  const salvos = localStorage.getItem('gastos');
  if (salvos) gastos = JSON.parse(salvos);

  const inputOrcamento = document.getElementById('orcamentoMensal');
  if (inputOrcamento) inputOrcamento.value = orcamentoMensal;

if (typeof atualizarGraficos === "function") {
  atualizarGraficos();
}
}

function salvarGastos() {
  localStorage.setItem('gastos', JSON.stringify(gastos));
}

function adicionarGasto() {
  const descricao = document.getElementById('descricao').value.trim();
  const valorStr = document.getElementById('valor').value;
  const data = document.getElementById('data').value;

  if (!descricao || !valorStr || !data) {
    alert('Preencha todos os campos.');
    return;
  }

  const valor = parseFloat(valorStr);
  const categoria = categorizarGasto(descricao);

  gastos.unshift({ id: Date.now(), descricao, valor, data, categoria });
  salvarGastos();
  renderizarTudo();

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
  return gastos.reduce((acc, g) => acc + g.valor, 0);
}

// ==================== RENDERIZAÇÕES ====================
function renderizarLista() {
  const container = document.getElementById('listaGastos');
  if (!container) return;

  if (gastos.length === 0) {
    container.innerHTML = `<div class="text-center py-16 text-zinc-500">Nenhum gasto registrado ainda.</div>`;
    return;
  }

  let html = '';
  gastos.forEach(g => {
    html += `
      <div class="bg-zinc-800 rounded-2xl px-6 py-5 flex justify-between items-center group">
        <div>
          <p class="font-medium">${g.descricao}</p>
          <div class="flex gap-3 mt-1 text-sm">
            <span class="px-3 py-1 bg-zinc-700 rounded-full">${g.categoria}</span>
            <span class="text-zinc-400">${new Date(g.data).toLocaleDateString('pt-BR')}</span>
          </div>
        </div>
        <div class="flex items-center gap-8">
          <span class="text-xl font-semibold">R$ ${g.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
          <button onclick="removerGasto(${g.id})" class="text-red-400 opacity-0 group-hover:opacity-100">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>`;
  });

  container.innerHTML = html;
}

function renderizarResumoCategorias() {
  const container = document.getElementById('resumoCategorias');
  if (!container) return;

  const porCategoria = {};
  gastos.forEach(g => porCategoria[g.categoria] = (porCategoria[g.categoria] || 0) + g.valor);

  let html = '';
  Object.keys(porCategoria).forEach(cat => {
    html += `
      <div class="bg-zinc-800 rounded-2xl p-5">
        <p class="text-zinc-400 text-sm">${cat}</p>
        <p class="text-2xl font-semibold mt-1">R$ ${porCategoria[cat].toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
      </div>`;
  });

  container.innerHTML = html || `<p class="col-span-4 text-center py-8 text-zinc-500">Adicione gastos para ver o resumo</p>`;
}

function renderizarProgressoOrcamento() {
  const container = document.getElementById('progressoOrcamento');
  if (!container) return;

  const total = calcularTotalGasto();
  const percentual = orcamentoMensal > 0 ? Math.min((total / orcamentoMensal) * 100, 100) : 0;
  const cor = percentual > 85 ? 'bg-red-500' : percentual > 65 ? 'bg-amber-500' : 'bg-emerald-500';

  container.innerHTML = `
    <div class="flex justify-between text-sm mb-2">
      <span>Gasto atual</span>
      <span>R$ ${total.toLocaleString('pt-BR')} / R$ ${orcamentoMensal.toLocaleString('pt-BR')}</span>
    </div>
    <div class="h-3 bg-zinc-700 rounded-full overflow-hidden">
      <div class="${cor} h-full transition-all" style="width: ${percentual}%"></div>
    </div>
  `;

  // Atualizar Cards de Visão Geral
  const cardTotal = document.getElementById('cardTotalGasto');
  const cardRestante = document.getElementById('cardOrcamentoRestante');
  const cardScore = document.getElementById('cardScoreLocal');
  const statusGasto = document.getElementById('statusGasto');
  const barRestante = document.getElementById('barOrcamentoRestante');

  if (cardTotal) cardTotal.innerText = `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  
  if (cardRestante) {
    const restante = Math.max(0, orcamentoMensal - total);
    cardRestante.innerText = `R$ ${restante.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    cardRestante.className = restante > 0 ? "text-3xl font-bold text-emerald-400" : "text-3xl font-bold text-red-400";
  }

  if (barRestante) {
    const percRestante = orcamentoMensal > 0 ? Math.max(0, ((orcamentoMensal - total) / orcamentoMensal) * 100) : 0;
    barRestante.style.width = `${percRestante}%`;
    barRestante.className = percRestante > 20 ? "h-full bg-emerald-500 transition-all" : "h-full bg-red-500 transition-all";
  }

  if (statusGasto) {
    if (total > orcamentoMensal) {
      statusGasto.innerText = "Orçamento Estourado";
      statusGasto.className = "mt-2 text-[10px] font-bold px-2 py-1 rounded-lg inline-block bg-red-500/20 text-red-400 uppercase";
    } else {
      statusGasto.innerText = "Dentro do Limite";
      statusGasto.className = "mt-2 text-[10px] font-bold px-2 py-1 rounded-lg inline-block bg-emerald-500/20 text-emerald-400 uppercase";
    }
  }

  if (cardScore) {
    const score = calcularScoreLocal();
    cardScore.innerText = score;
    cardScore.className = score > 80 ? "text-3xl font-bold text-emerald-400" : score > 60 ? "text-3xl font-bold text-amber-400" : "text-3xl font-bold text-red-400";
  }
}

// ==================== IA ====================
async function chamarGemini(prompt) {
  try {
    const resposta = await fetch("http://localhost:3000/ia", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt })
    });

    const data = await resposta.json();

    if (data?.resposta) {
      return data.resposta;
    }

    throw new Error("Sem resposta da API");

  } catch (erro) {
    console.error("Erro IA:", erro);

    // fallback inteligente (simulação)
    const total = calcularTotalGasto();

    if (total > orcamentoMensal) {
      return "Você está gastando acima do seu orçamento. Tente reduzir despesas variáveis como alimentação e lazer.";
    }

    return "Seus gastos estão sob controle, mas você pode economizar reduzindo pequenos gastos do dia a dia.";
  }
}

async function gerarAnaliseIA() {
  const container = document.getElementById('analise-ia');
  const btnAnalise = document.querySelector('button[onclick="gerarAnaliseIA()"]');
  if (!container) return;

  if (gastos.length === 0) {
    container.innerHTML = `<div id="insights" class="min-h-[100px] flex items-center justify-center text-zinc-500 italic">Adicione gastos para a IA analisar.</div>`;
    return;
  }

  // Desabilitar botão e mostrar loading
  if (btnAnalise) {
    btnAnalise.disabled = true;
    btnAnalise.classList.add('opacity-50', 'cursor-not-allowed');
    btnAnalise.innerHTML = `<i class="fas fa-spinner animate-spin"></i><span>Analisando...</span>`;
  }

  container.innerHTML = `
    <div class="flex flex-col items-center justify-center py-12 space-y-4">
      <div class="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
      <p class="text-violet-400 font-medium animate-pulse">FinAI está analisando suas finanças...</p>
    </div>
  `;

  try {
    const response = await fetch("http://localhost:3000/api/analysis/analisar", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        dadosFinanceiros: {
          gastos,
          orcamentoMensal,
          totalGasto: calcularTotalGasto()
        }
      })
    });

    const data = await response.json();

    if (!data.success || !data.analise) {
      throw new Error(data.error || "Falha na análise");
    }

    const { analise } = data;
    
    // Cor do Score
    const corScore = analise.score_financeiro > 80 ? 'text-emerald-400' : analise.score_financeiro > 60 ? 'text-amber-400' : 'text-red-400';
    const bgScore = analise.score_financeiro > 80 ? 'bg-emerald-500/10 border-emerald-500/20' : analise.score_financeiro > 60 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20';

    container.innerHTML = `
      <!-- Score Card -->
      <div class="${bgScore} border rounded-3xl p-8 text-center">
        <p class="text-zinc-400 text-sm uppercase tracking-wider font-bold mb-2">Score da IA</p>
        <div class="text-6xl font-black ${corScore}">${analise.score_financeiro}</div>
        <p class="text-zinc-300 mt-4 text-sm">${analise.previsao_proximo_mes}</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Insights -->
        <div class="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700">
          <h3 class="text-violet-400 font-bold flex items-center gap-2 mb-4">
            <i class="fas fa-lightbulb"></i> Insights
          </h3>
          <ul class="space-y-3 text-sm text-zinc-300">
            ${analise.insights.map(i => `<li class="flex gap-2"><span class="text-violet-500">•</span> ${i}</li>`).join('')}
          </ul>
        </div>

        <!-- Alertas -->
        <div class="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700">
          <h3 class="text-red-400 font-bold flex items-center gap-2 mb-4">
            <i class="fas fa-exclamation-triangle"></i> Alertas
          </h3>
          <ul class="space-y-3 text-sm text-zinc-300">
            ${analise.alertas.map(a => `<li class="flex gap-2"><span class="text-red-500">•</span> ${a}</li>`).join('')}
          </ul>
        </div>

        <!-- Sugestões -->
        <div class="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700">
          <h3 class="text-emerald-400 font-bold flex items-center gap-2 mb-4">
            <i class="fas fa-check-circle"></i> Sugestões
          </h3>
          <ul class="space-y-3 text-sm text-zinc-300">
            ${analise.sugestoes.map(s => `<li class="flex gap-2"><span class="text-emerald-500">•</span> ${s}</li>`).join('')}
          </ul>
        </div>

        <!-- Padrões -->
        <div class="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700">
          <h3 class="text-blue-400 font-bold flex items-center gap-2 mb-4">
            <i class="fas fa-search"></i> Padrões
          </h3>
          <ul class="space-y-3 text-sm text-zinc-300">
            ${analise.padroes_identificados.map(p => `<li class="flex gap-2"><span class="text-blue-500">•</span> ${p}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;

  } catch (erro) {
    console.error("Erro IA:", erro);
    container.innerHTML = `
      <div class="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
        <i class="fas fa-exclamation-circle text-red-500 text-3xl mb-3"></i>
        <p class="text-red-400 font-medium">Ops! Não conseguimos gerar a análise.</p>
        <p class="text-zinc-500 text-sm mt-1">Verifique se o servidor backend está rodando e tente novamente.</p>
        <button onclick="gerarAnaliseIA()" class="mt-4 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded-lg transition-all">
          Tentar novamente
        </button>
      </div>
    `;
  } finally {
    if (btnAnalise) {
      btnAnalise.disabled = false;
      btnAnalise.classList.remove('opacity-50', 'cursor-not-allowed');
      btnAnalise.innerHTML = `<i class="fas fa-magic"></i><span>Gerar Análise com IA</span>`;
    }
  }
}

async function enviarPerguntaIA() {
  const input = document.getElementById('perguntaIA');
  const pergunta = input.value.trim();
  if (!pergunta) return;

  const container = document.getElementById('insights');
  container.innerHTML = `<p class="text-violet-400">Pensando...</p>`;

  const resposta = await chamarGemini(pergunta);

  container.innerHTML = `
    <div class="bg-zinc-800 border border-violet-500/30 rounded-2xl p-6">
      <p class="text-violet-300 mb-3">Resposta da IA</p>
      <p>${resposta}</p>
    </div>
  `;

  input.value = '';
}

// ==================== FINAL ====================
function renderizarTudo() {
  renderizarLista();
  renderizarResumoCategorias();
  renderizarProgressoOrcamento();
  atualizarGraficos();
}

window.onload = function() {
  const hoje = new Date().toISOString().split('T')[0];
  document.getElementById('data').value = hoje;
  carregarDados();
};