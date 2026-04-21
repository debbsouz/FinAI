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
    container.innerHTML = `<tr><td colspan="5" class="text-center py-20 text-zinc-500 font-medium">Nenhuma transação encontrada no período.</td></tr>`;
    return;
  }

  let html = '';
  gastos.forEach(g => {
    html += `
      <tr class="group border-b border-zinc-800/50 last:border-0">
        <td class="px-8 py-5">
          <p class="font-semibold text-zinc-100">${g.descricao}</p>
        </td>
        <td class="px-8 py-5">
          <span class="px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-full text-[10px] font-bold uppercase tracking-wider">${g.categoria}</span>
        </td>
        <td class="px-8 py-5 text-zinc-500 font-medium">
          ${new Date(g.data).toLocaleDateString('pt-BR')}
        </td>
        <td class="px-8 py-5 text-right font-bold text-white">
          R$ ${g.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
        </td>
        <td class="px-8 py-5 text-center">
          <button onclick="removerGasto(${g.id})" class="w-8 h-8 rounded-lg bg-red-500/5 text-red-500/40 hover:bg-red-500/10 hover:text-red-500 transition-all">
            <i class="fas fa-trash-alt text-xs"></i>
          </button>
        </td>
      </tr>`;
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
    container.innerHTML = `<div id="insights" class="min-h-[100px] flex items-center justify-center text-zinc-500 italic">Adicione dados para análise.</div>`;
    return;
  }

  if (btnAnalise) {
    btnAnalise.disabled = true;
    btnAnalise.classList.add('opacity-50', 'cursor-not-allowed');
    btnAnalise.innerHTML = `<i class="fas fa-circle-notch animate-spin"></i><span>Processando</span>`;
  }

  container.innerHTML = `
    <div class="flex flex-col items-center justify-center py-12 space-y-4 text-center">
      <div class="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
      <p class="text-zinc-400 text-xs font-bold uppercase tracking-widest animate-pulse">Sincronizando Inteligência</p>
    </div>
  `;

  try {
    const response = await fetch("http://localhost:3000/api/analysis/analisar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dadosFinanceiros: {
          gastos,
          orcamentoMensal,
          totalGasto: calcularTotalGasto()
        }
      })
    });

    const data = await response.json();
    if (!data.success || !data.analise) throw new Error("Falha na análise");

    const { analise } = data;
    
    container.innerHTML = `
      <div class="space-y-8 animate-in fade-in duration-700">
        <div class="text-center pb-8 border-b border-zinc-800/50">
          <p class="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Financial Health Score</p>
          <div class="text-6xl font-black text-white">${analise.score_financeiro}</div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div class="space-y-4">
            <h5 class="text-[10px] font-black text-violet-500 uppercase tracking-widest">Estratégico</h5>
            <ul class="space-y-3">
              ${analise.insights.map(i => `<li class="text-xs text-zinc-400 leading-relaxed flex gap-2"><span class="text-violet-500">•</span> ${i}</li>`).join('')}
            </ul>
          </div>
          <div class="space-y-4">
            <h5 class="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Otimização</h5>
            <ul class="space-y-3">
              ${analise.sugestoes.map(s => `<li class="text-xs text-zinc-400 leading-relaxed flex gap-2"><span class="text-emerald-500">•</span> ${s}</li>`).join('')}
            </ul>
          </div>
        </div>
      </div>
    `;

  } catch (erro) {
    container.innerHTML = `
      <div class="text-center py-8">
        <p class="text-zinc-500 text-xs font-medium italic text-zinc-400 leading-relaxed">
          ${gerarRespostaLocal("fallback")}
        </p>
      </div>
    `;
  } finally {
    if (btnAnalise) {
      btnAnalise.disabled = false;
      btnAnalise.classList.remove('opacity-50', 'cursor-not-allowed');
      btnAnalise.innerHTML = `Gerar Análise`;
    }
  }
}

async function enviarPerguntaIA() {
  const input = document.getElementById('perguntaIA');
  const pergunta = input.value.trim();
  if (!pergunta) return;

  const container = document.getElementById('insights');
  container.innerHTML = `
    <div class="flex items-center gap-3 py-4">
      <div class="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
      <p class="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Processando consulta</p>
    </div>
  `;

  const resposta = await chamarGemini(pergunta);

  container.innerHTML = `
    <div class="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 animate-in slide-in-from-bottom-2 duration-500">
      <p class="text-xs text-zinc-300 leading-relaxed">${resposta}</p>
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