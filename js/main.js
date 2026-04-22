// ==================== CONFIGURAÇÃO E DADOS ====================
const usuarioEmail = localStorage.getItem("usuario_logado") || "default";

let gastos = JSON.parse(localStorage.getItem(`gastos_${usuarioEmail}`)) || [];
let orcamentoMensal = parseFloat(localStorage.getItem(`orcamento_${usuarioEmail}`)) || 3000.00;
let pieChart = null;
let barChart = null;

function salvarDados() {
  localStorage.setItem(`gastos_${usuarioEmail}`, JSON.stringify(gastos));
  localStorage.setItem(`orcamento_${usuarioEmail}`, orcamentoMensal.toString());
}

function alterarOrcamento(valor) {
  orcamentoMensal = parseFloat(valor) || 0;
  salvarDados();
  renderizarTudo();
}

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

function calcularScoreLocal() {
  if (gastos.length === 0) return { score: 100, mensagem: "Adicione seus primeiros gastos para calcular seu score." };

  let score = 100;
  const total = calcularTotalGasto();
  const percentualUso = (total / orcamentoMensal) * 100;
  
  // 1. Regra: % gasto vs orçamento
  if (percentualUso > 100) score -= 40;
  else if (percentualUso > 80) score -= 20;
  else if (percentualUso < 50) score += 5;

  // 2. Regra: Categorias
  const gastosPorCategoria = {};
  gastos.forEach(g => {
    gastosPorCategoria[g.categoria] = (gastosPorCategoria[g.categoria] || 0) + g.valor;
  });

  const percAlimentacao = (gastosPorCategoria["Alimentação"] || 0) / total * 100;
  const percLazer = (gastosPorCategoria["Lazer"] || 0) / total * 100;

  if (percAlimentacao > 40) score -= 10;
  if (percLazer > 25) score -= 10;

  // 3. Regra: Equilíbrio (Diversificação)
  const categoriasUnicas = Object.keys(gastosPorCategoria).length;
  if (categoriasUnicas >= 4 && percentualUso < 80) score += 10;

  score = Math.max(0, Math.min(100, Math.round(score)));

  // Gerar Texto Dinâmico
  let mensagem = "";
  if (score >= 80) {
    mensagem = "Excelente! Seu controle financeiro está sólido. Continue assim.";
  } else if (score >= 50) {
    mensagem = "Bom trabalho, mas atenção: ";
    if (percLazer > 25) mensagem += "reduzir gastos com lazer pode ajudar.";
    else if (percAlimentacao > 40) mensagem += "gastos com alimentação estão acima da média.";
    else mensagem += "tente diversificar melhor seus gastos.";
  } else {
    mensagem = "Alerta crítico! Você está comprometendo seu orçamento. Revise seus custos fixos.";
  }

  return { score, mensagem };
}

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
    container.innerHTML = `<tr><td colspan="5" class="text-center py-24 text-zinc-600 font-medium text-xs tracking-wide">Nenhuma transação registrada no período.</td></tr>`;
    return;
  }

  let html = '';
  gastos.forEach(g => {
    html += `
      <tr class="group border-b border-zinc-800/50 last:border-0 hover:bg-zinc-800/20 transition-colors">
        <td class="px-8 py-6">
          <p class="font-bold text-zinc-200 text-xs uppercase tracking-tight">${g.descricao}</p>
        </td>
        <td class="px-8 py-6">
          <span class="px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-zinc-500 rounded-md text-[9px] font-black uppercase tracking-[0.1em]">${g.categoria}</span>
        </td>
        <td class="px-8 py-6 text-zinc-500 font-bold text-[10px] uppercase">
          ${new Date(g.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
        </td>
        <td class="px-8 py-6 text-right font-black text-white text-sm tracking-tighter">
          R$ ${g.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
        </td>
        <td class="px-8 py-6 text-center">
          <button onclick="removerGasto(${g.id})" class="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-600 hover:text-red-400 hover:border-red-400/30 hover:bg-red-400/5 transition-all active:scale-90">
            <i class="fas fa-trash-alt text-[10px]"></i>
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
    const { score, mensagem } = calcularScoreLocal();
    cardScore.innerText = score;
    
    // Cores e Barra Progressiva
    const colorClass = score > 80 ? "text-emerald-500" : score > 50 ? "text-amber-500" : "text-red-500";
    const bgClass = score > 80 ? "bg-emerald-500" : score > 50 ? "bg-amber-500" : "bg-red-500";
    
    cardScore.className = `text-5xl font-black ${colorClass} tracking-tighter transition-all duration-500`;
    
    // Atualizar barra se existir
    const barScore = document.getElementById('barScoreLocal');
    if (barScore) {
      barScore.style.width = `${score}%`;
      barScore.className = `h-full ${bgClass} transition-all duration-1000 shadow-[0_0_10px_rgba(0,0,0,0.2)]`;
    }

    // Atualizar texto dinâmico
    const textScore = document.getElementById('textScoreLocal');
    if (textScore) {
      textScore.innerText = mensagem;
      textScore.className = "text-[10px] text-zinc-500 mt-2 font-medium italic leading-tight";
    }
  }
}

function gerarRespostaLocal(pergunta = "") {
  if (gastos.length === 0) return "Ainda não tenho dados suficientes para uma análise. Adicione seus primeiros gastos para eu poder te ajudar!";

  const total = calcularTotalGasto();
  const gastosPorCategoria = {};
  gastos.forEach(g => {
    gastosPorCategoria[g.categoria] = (gastosPorCategoria[g.categoria] || 0) + g.valor;
  });

  // Encontrar categoria dominante
  let categoriaDominante = "";
  let maiorValor = 0;
  Object.entries(gastosPorCategoria).forEach(([cat, val]) => {
    if (val > maiorValor) {
      maiorValor = val;
      categoriaDominante = cat;
    }
  });

  const percDominante = (maiorValor / total) * 100;
  const percAlimentacao = (gastosPorCategoria["Alimentação"] || 0) / total * 100;
  const percLazer = (gastosPorCategoria["Lazer"] || 0) / total * 100;
  const percTransporte = (gastosPorCategoria["Transporte"] || 0) / total * 100;

  // Lógica de resposta baseada em regras
  let insights = [];

  if (percAlimentacao > 40) {
    insights.push("Você está gastando bastante com alimentação. Talvez valha revisar pedidos em apps de delivery e priorizar refeições caseiras para economizar.");
  }
  
  if (percLazer > 25) {
    insights.push("Seus gastos com lazer estão acima do recomendado (25%). Tente buscar opções de entretenimento gratuitas ou reduzir a frequência de saídas este mês.");
  }

  if (percTransporte > 20) {
    insights.push("O custo com transporte está elevado. Avalie se o uso de transporte por aplicativo está compensando ou se há alternativas mais baratas para trajetos curtos.");
  }

  if (total > orcamentoMensal) {
    insights.push(`Atenção: Você já ultrapassou seu orçamento em R$ ${(total - orcamentoMensal).toFixed(2)}. É hora de cortar gastos não essenciais imediatamente.`);
  }

  // Fallback se nenhuma regra específica for atingida
  if (insights.length === 0) {
    insights.push(`Sua maior categoria de gastos é ${categoriaDominante}, representando ${percDominante.toFixed(1)}% do seu total. No geral, sua saúde financeira parece equilibrada.`);
  }

  // Se for uma pergunta específica do chat, tentar contextualizar
  if (pergunta) {
    return `Baseado nos seus dados: ${insights[0]}`;
  }

  return insights.join(" ");
}

function gerarRelatorioLocal() {
  const total = calcularTotalGasto();
  const gastosPorCategoria = {};
  gastos.forEach(g => {
    gastosPorCategoria[g.categoria] = (gastosPorCategoria[g.categoria] || 0) + g.valor;
  });

  const insights = [];
  const sugestoes = [];
  const { score } = calcularScoreLocal();

  const percAlimentacao = (gastosPorCategoria["Alimentação"] || 0) / total * 100;
  const percLazer = (gastosPorCategoria["Lazer"] || 0) / total * 100;

  // Gerar insights baseados em dados reais
  Object.entries(gastosPorCategoria).forEach(([cat, val]) => {
    const perc = (val / total) * 100;
    if (perc > 30) insights.push(`A categoria ${cat} consome ${perc.toFixed(1)}% dos seus recursos.`);
  });

  if (percAlimentacao > 40) sugestoes.push("Reduzir delivery em 20% para equilibrar o caixa.");
  if (percLazer > 25) sugestoes.push("Limitar gastos com entretenimento até o próximo ciclo.");
  if (total > orcamentoMensal) sugestoes.push("Revisar custos fixos para evitar novos endividamentos.");
  
  if (sugestoes.length === 0) sugestoes.push("Manter o padrão de consumo atual e focar em reserva de emergência.");

  return {
    analise: {
      score_financeiro: score,
      insights: insights.length > 0 ? insights : ["Seus gastos estão bem distribuídos entre as categorias."],
      sugestoes: sugestoes
    }
  };
}

// ==================== CONSULTORIA ESTRATÉGICA ====================
function renderizarConteudoRelatorio(analise, container) {
  container.innerHTML = `
    <div class="space-y-10 animate-slide-up">
      <div class="flex flex-col items-center pb-10 border-b border-zinc-800/50">
        <p class="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] mb-3">Eficiência de Capital</p>
        <div class="relative">
          <div class="text-7xl font-black text-white tracking-tighter">${analise.score_financeiro}</div>
          <div class="absolute -top-1 -right-4 w-2 h-2 rounded-full bg-violet-500 animate-pulse"></div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div class="space-y-6">
          <div class="flex items-center gap-2">
            <div class="w-1.5 h-1.5 rounded-full bg-violet-500"></div>
            <h5 class="text-[10px] font-black text-zinc-300 uppercase tracking-[0.2em]">Diagnóstico de Performance</h5>
          </div>
          <ul class="space-y-4">
            ${analise.insights.map(i => `
              <li class="group">
                <p class="text-xs text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors">${i}</p>
              </li>
            `).join('')}
          </ul>
        </div>
        <div class="space-y-6">
          <div class="flex items-center gap-2">
            <div class="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
            <h5 class="text-[10px] font-black text-zinc-300 uppercase tracking-[0.2em]">Diretrizes de Otimização</h5>
          </div>
          <ul class="space-y-4">
            ${analise.sugestoes.map(s => `
              <li class="group">
                <p class="text-xs text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors">${s}</p>
              </li>
            `).join('')}
          </ul>
        </div>
      </div>
    </div>
  `;
}

async function chamarConsultoria(prompt) {
  try {
    const resposta = await fetch("http://localhost:3000/consultar", {
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

    throw new Error("Sem resposta do serviço");

  } catch (erro) {
    console.error("Erro Consultoria:", erro);

    // fallback inteligente (simulação)
    const total = calcularTotalGasto();

    if (total > orcamentoMensal) {
      return "O volume de despesas atual excede o teto orçamentário. Recomenda-se a revisão imediata de custos variáveis.";
    }

    return "A estrutura de gastos apresenta estabilidade. Manter a disciplina atual é fundamental para a preservação de capital.";
  }
}

function isPro() {
  const session = JSON.parse(localStorage.getItem('session'));
  const pagamentoConfirmado = localStorage.getItem(`pagamento_confirmado_${usuarioEmail}`) === "true";
  return (session && session.plano === 'Pro') || pagamentoConfirmado;
}

function showProAlert() {
  alert('Disponível apenas no plano Pro');
  if (typeof toggleUpgradeModal === 'function') {
    toggleUpgradeModal();
  }
}

async function gerarRelatorio() {
  if (!isPro()) {
    showProAlert();
    return;
  }
  const container = document.getElementById('relatorio-estrategico');
  const btnRelatorio = document.querySelector('button[onclick="gerarRelatorio()"]');
  if (!container) return;

  if (gastos.length === 0) {
    container.innerHTML = `<div id="diagnostico" class="min-h-[100px] flex items-center justify-center text-zinc-500 italic">Adicione dados para análise estratégica.</div>`;
    return;
  }

  if (btnRelatorio) {
    btnRelatorio.disabled = true;
    btnRelatorio.classList.add('opacity-50', 'cursor-not-allowed');
    btnRelatorio.innerHTML = `<i class="fas fa-circle-notch animate-spin"></i><span>Processando</span>`;
  }

  container.innerHTML = `
    <div class="flex flex-col items-center justify-center py-12 space-y-4 text-center">
      <div class="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
      <p class="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">Consolidando Diagnóstico Estratégico</p>
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
            totalGasto: total
          }
        })
      });

      const data = await response.json();
      if (!data.success || !data.analise) throw new Error("Falha na análise");

      renderizarConteudoRelatorio(data.analise, container);

    } catch (erro) {
      console.warn("IA externa falhou, usando análise local.");
      const dataLocal = gerarRelatorioLocal();
      renderizarConteudoRelatorio(dataLocal.analise, container);
    } finally {
    if (btnRelatorio) {
      btnRelatorio.disabled = false;
      btnRelatorio.classList.remove('opacity-50', 'cursor-not-allowed');
      btnRelatorio.innerHTML = `Gerar Relatório`;
    }
  }
}

async function enviarConsulta() {
  if (!isPro()) {
    showProAlert();
    return;
  }
  const input = document.getElementById('perguntaConsulta');
  const pergunta = input.value.trim();
  if (!pergunta) return;

  const container = document.getElementById('diagnostico');
  container.innerHTML = `
    <div class="flex items-center gap-3 py-4">
      <div class="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
      <p class="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Processando requisição</p>
    </div>
  `;

  const resposta = await chamarConsultoria(pergunta);

  container.innerHTML = `
    <div class="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 animate-in slide-in-from-bottom-2 duration-500">
      <p class="text-xs text-zinc-300 leading-relaxed">${resposta || gerarRespostaLocal(pergunta)}</p>
    </div>
  `;

  input.value = '';
}

function exportarCSV() {
  if (!isPro()) {
    showProAlert();
    return;
  }

  if (gastos.length === 0) {
    alert('Nenhum dado para exportar.');
    return;
  }

  const headers = ['Data', 'Descrição', 'Categoria', 'Valor'];
  const rows = gastos.map(g => [
    new Date(g.data).toLocaleDateString('pt-BR'),
    g.descricao,
    g.categoria,
    g.valor.toFixed(2)
  ]);

  let csvContent = "data:text/csv;charset=utf-8," 
    + headers.join(",") + "\n"
    + rows.map(e => e.join(",")).join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `finai_relatorio_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function logout() {
  localStorage.removeItem('usuario_logado');
  localStorage.removeItem('session');
  window.location.href = 'login.html';
}

function limparTodosDados() {
  if (confirm('Deseja realmente resetar seus dados? Todos os gastos e configurações deste usuário serão apagados.')) {
    localStorage.removeItem(`gastos_${usuarioEmail}`);
    localStorage.removeItem(`orcamento_${usuarioEmail}`);
    localStorage.removeItem(`pagamento_confirmado_${usuarioEmail}`);
    location.reload();
  }
}

// ==================== FINAL ====================
function renderizarTudo() {
  renderizarLista();
  renderizarResumoCategorias();
  renderizarProgressoOrcamento();
  if (typeof atualizarGraficos === "function") {
    atualizarGraficos();
  } else {
    console.warn('Função atualizarGraficos não encontrada.');
  }
}

window.onload = function() {
  const hoje = new Date().toISOString().split('T')[0];
  document.getElementById('data').value = hoje;
  carregarDados();
};