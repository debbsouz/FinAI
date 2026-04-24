// ==================== CONFIGURAÇÃO E DADOS ====================
const usuarioEmail = localStorage.getItem("usuario_logado") || "default";

let gastos = JSON.parse(localStorage.getItem(`gastos_${usuarioEmail}`)) || [];
let orcamentoMensal = parseFloat(localStorage.getItem(`orcamento_${usuarioEmail}`)) || 3000.00;
let saldoInicial = parseFloat(localStorage.getItem(`saldo_${usuarioEmail}`)) || 0.00;
let pieChart = null;
let barChart = null;

function salvarDados() {
  localStorage.setItem(`gastos_${usuarioEmail}`, JSON.stringify(gastos));
  localStorage.setItem(`orcamento_${usuarioEmail}`, orcamentoMensal.toString());
  localStorage.setItem(`saldo_${usuarioEmail}`, saldoInicial.toString());
  
  // Sincronizar com a chave genérica para compatibilidade se necessário
  localStorage.setItem('gastos', JSON.stringify(gastos));
}

function alterarOrcamento(valor) {
  orcamentoMensal = parseFloat(valor) || 0;
  salvarDados();
  renderizarTudo();
  if (typeof showToast === 'function') {
    const lang = localStorage.getItem('finai_language') || 'pt';
    const messages = {
      pt: 'Teto de gastos atualizado.',
      en: 'Spending limit updated.',
      es: 'Límite de gastos actualizado.'
    };
    showToast(messages[lang] || messages.pt, 'success');
  }
}

function alterarSaldoInicial(valor) {
  saldoInicial = parseFloat(valor) || 0;
  salvarDados();
  renderizarTudo();
  if (typeof showToast === 'function') {
    const lang = localStorage.getItem('finai_language') || 'pt';
    const messages = {
      pt: 'Saldo inicial atualizado.',
      en: 'Initial balance updated.',
      es: 'Saldo inicial actualizado.'
    };
    showToast(messages[lang] || messages.pt, 'success');
  }
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
  const salvos = localStorage.getItem(`gastos_${usuarioEmail}`);
  if (salvos) gastos = JSON.parse(salvos);

  const inputOrcamento = document.getElementById('orcamentoMensal');
  if (inputOrcamento) inputOrcamento.value = orcamentoMensal;

  const inputSaldo = document.getElementById('inputSaldoInicial');
  if (inputSaldo) inputSaldo.value = saldoInicial;

  if (typeof atualizarGraficos === "function") {
    atualizarGraficos();
  }

  // Atualizar Info do Usuário na Sidebar
  const session = JSON.parse(localStorage.getItem('session'));
  const nameEl = document.getElementById('userNameSidebar');
  const avatarEl = document.getElementById('userAvatar');
  const planNameEl = document.getElementById('planNameSidebar');
  const planIconEl = document.getElementById('planIcon');
  
  // Elementos do Dropdown de Plano
  const btnTrial = document.getElementById('btnTrial7Days');
  const btnAnnual = document.getElementById('btnAnnualPlan');
  const btnCancel = document.getElementById('btnCancelPlan');

  if (session) {
    if (nameEl) nameEl.innerText = session.name || 'Usuário';
    if (avatarEl && session.name) {
      avatarEl.innerText = session.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    }
    
    const isProUser = isPro();
    const isFamilyUser = isFamily();
    
    if (planNameEl) {
      if (isFamilyUser) {
        planNameEl.innerText = 'Conta Família';
      } else {
        planNameEl.innerText = isProUser ? 'Conta Premium' : 'Plano Free';
      }
    }
    
    if (planIconEl) {
      if (isFamilyUser) {
        planIconEl.innerHTML = '<i class="fas fa-users text-emerald-400"></i>';
        planIconEl.className = "w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-xs border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]";
      } else if (isProUser) {
        planIconEl.innerHTML = '<i class="fas fa-crown text-violet-400"></i>';
        planIconEl.className = "w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center text-xs border border-violet-500/20 shadow-[0_0_10px_rgba(139,92,246,0.2)]";
      } else {
        planIconEl.innerHTML = '<i class="fas fa-layer-group"></i>';
        planIconEl.className = "w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center text-xs text-zinc-400";
      }
    }

    // Badge de conta compartilhada se for família
    const sharedBadge = document.getElementById('sharedBadgeSidebar');
    if (sharedBadge) {
      if (isFamilyUser) sharedBadge.classList.remove('hidden');
      else sharedBadge.classList.add('hidden');
    }

    // Seção de Gerenciamento de Família no Dashboard
    const familySection = document.getElementById('familyManagementSection');
    if (familySection) {
      if (isFamilyUser) familySection.classList.remove('hidden');
      else familySection.classList.add('hidden');
    }

    // Ajustar opções do dropdown baseado no plano
    if (isProUser || isFamilyUser) {
      if (btnTrial) btnTrial.classList.add('hidden');
      if (btnCancel) btnCancel.classList.remove('hidden');
    } else {
      if (btnTrial) btnTrial.classList.remove('hidden');
      if (btnCancel) btnCancel.classList.add('hidden');
    }
  }
}

function salvarGastos() {
  salvarDados();
}

function adicionarGasto() {
  const descricao = document.getElementById('descricao').value.trim();
  const valorStr = document.getElementById('valor').value;
  const data = document.getElementById('data').value;

  if (!descricao || !valorStr || !data) {
    if (typeof showToast === 'function') {
      const lang = localStorage.getItem('finai_language') || 'pt';
      const messages = {
        pt: 'Preencha todos os campos.',
        en: 'Fill in all fields.',
        es: 'Complete todos los campos.'
      };
      showToast(messages[lang] || messages.pt, 'error');
    } else {
      alert('Preencha todos os campos.');
    }
    return;
  }

  const valor = parseFloat(valorStr);
  const categoria = categorizarGasto(descricao);

  gastos.unshift({ id: Date.now(), descricao, valor, data, categoria });
  salvarGastos();
  renderizarTudo();

  document.getElementById('descricao').value = '';
  document.getElementById('valor').value = '';

  if (typeof showToast === 'function') {
    const lang = localStorage.getItem('finai_language') || 'pt';
    const messages = {
      pt: 'Gasto registrado com sucesso!',
      en: 'Expense registered successfully!',
      es: '¡Gasto registrado con éxito!'
    };
    showToast(messages[lang] || messages.pt);
  }
}

function removerGasto(id) {
  if (confirm('Excluir este gasto?')) {
    gastos = gastos.filter(g => g.id !== id);
    salvarGastos();
    renderizarTudo();
    if (typeof showToast === 'function') {
      const lang = localStorage.getItem('finai_language') || 'pt';
      const messages = {
        pt: 'Gasto removido.',
        en: 'Expense removed.',
        es: 'Gasto eliminado.'
      };
      showToast(messages[lang] || messages.pt, 'success');
    }
  }
}

function calcularVolume() {
  return gastos.reduce((acc, g) => acc + g.valor, 0);
}

function calcularTotalGasto() {
  return calcularVolume();
}

// ==================== RENDERIZAÇÕES ====================
function renderizarLista() {
  const container = document.getElementById('listaGastos');
  if (!container) return;

  if (gastos.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="5" class="py-20 text-center">
          <div class="flex flex-col items-center gap-4 animate-fade-in">
            <div class="w-16 h-16 rounded-3xl bg-white/[0.02] border border-white/5 flex items-center justify-center text-zinc-700">
              <i class="fas fa-receipt text-2xl"></i>
            </div>
            <div class="space-y-1">
              <p class="text-zinc-400 font-bold text-xs uppercase tracking-widest" data-i18n="empty_list_title">Nenhuma transação encontrada</p>
              <p class="text-zinc-600 text-[10px] font-medium" data-i18n="empty_list_desc">Registre seu primeiro gasto para começar o controle.</p>
            </div>
            <button onclick="document.getElementById('descricao').focus()" class="mt-2 px-6 py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-500/20 transition-all active:scale-95" data-i18n="empty_list_btn">
              Adicionar Gasto
            </button>
          </div>
        </td>
      </tr>`;
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

let ultimaAtualizacao = new Date();

function renderizarProgressoOrcamento() {
  const container = document.getElementById('progressoOrcamento');
  
  const total = calcularTotalGasto();
  const percentualOrcamento = orcamentoMensal > 0 ? (total / orcamentoMensal) * 100 : 0;
  const percentualExibicao = Math.min(percentualOrcamento, 100);
  
  if (container) {
    const cor = percentualExibicao > 85 ? 'bg-red-500' : percentualExibicao > 65 ? 'bg-amber-500' : 'bg-emerald-500';
    container.innerHTML = `
      <div class="flex justify-between text-sm mb-2">
        <span>Gasto atual</span>
        <span>R$ ${total.toLocaleString('pt-BR')} / R$ ${orcamentoMensal.toLocaleString('pt-BR')}</span>
      </div>
      <div class="h-3 bg-zinc-700 rounded-full overflow-hidden">
        <div class="${cor} h-full transition-all" style="width: ${percentualExibicao}%"></div>
      </div>
    `;
  }

  // Atualizar Cards de Visão Geral
  const cardTotal = document.getElementById('cardTotalGasto');
  const cardSaldo = document.getElementById('cardSaldoDisponivel');
  const cardScore = document.getElementById('cardScoreLocal');
  const statusGasto = document.getElementById('statusGasto');
  const barSaldo = document.getElementById('barSaldoDisponivel');

  if (cardTotal) {
    const volume = calcularVolume();
    cardTotal.innerText = `R$ ${volume.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  }
  
  if (cardSaldo) {
    const saldoDisponivel = saldoInicial - total;
    cardSaldo.innerText = `R$ ${saldoDisponivel.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    cardSaldo.className = saldoDisponivel >= 0 ? "text-4xl font-black text-emerald-400 tracking-tighter" : "text-4xl font-black text-red-400 tracking-tighter";
    
    if (barSaldo) {
        const percSaldo = saldoInicial > 0 ? Math.max(0, Math.min((saldoDisponivel / saldoInicial) * 100, 100)) : 0;
        barSaldo.style.width = `${percSaldo}%`;
        barSaldo.className = saldoDisponivel >= 0 ? "h-full bg-emerald-500 transition-all shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "h-full bg-red-500 transition-all";
    }
  }

  if (statusGasto) {
    if (total > orcamentoMensal) {
      statusGasto.innerText = "Orçamento Estourado";
      statusGasto.className = "text-[9px] font-black uppercase px-2 py-1 rounded-md bg-red-500/20 text-red-400 tracking-tighter border border-red-500/30";
    } else {
      statusGasto.innerText = "Dentro do Limite";
      statusGasto.className = "text-[9px] font-black uppercase px-2 py-1 rounded-md bg-emerald-500/20 text-emerald-400 tracking-tighter border border-emerald-500/30";
    }
  }

  // Atualizar Mini Resumo Sidebar
  const sidebarTotalGasto = document.getElementById('sidebarTotalGasto');
  if (sidebarTotalGasto) {
    sidebarTotalGasto.innerText = `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
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
      textScore.className = "text-[10px] text-zinc-500 font-medium italic leading-tight";
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
  const plano = localStorage.getItem(`plano_${usuarioEmail}`);
  return (session && (session.plano === 'Pro' || session.plano === 'Família')) || pagamentoConfirmado || plano === 'Pro' || plano === 'Família';
}

function isFamily() {
  const session = JSON.parse(localStorage.getItem('session'));
  const plano = localStorage.getItem(`plano_${usuarioEmail}`);
  return (session && session.plano === 'Família') || plano === 'Família';
}

// ==================== WHATSAPP PRO ====================
function ativarWhatsapp() {
  if (!isPro()) return;
  
  const numero = "5551995245630";
  localStorage.setItem(`whatsapp_${usuarioEmail}`, numero);
  
  // Abrir WhatsApp com mensagem
  const texto = encodeURIComponent("Quero receber análises financeiras do FinAI");
  window.open(`https://wa.me/${numero}?text=${texto}`, '_blank');
  
  renderizarStatusWhatsapp();
}

function renderizarStatusWhatsapp() {
  const isAtivo = localStorage.getItem(`whatsapp_${usuarioEmail}`) === "5551995245630";
  const section = document.getElementById('section-whatsapp-pro');
  const btn = document.getElementById('btnAtivarWhatsapp');
  const feedback = document.getElementById('whatsappFeedback');

  if (section && isPro()) {
    section.classList.remove('hidden');
  } else if (section) {
    section.classList.add('hidden');
  }

  if (isAtivo && btn && feedback) {
    btn.innerHTML = `<i class="fas fa-check"></i><span>Ativo</span>`;
    btn.classList.remove('bg-emerald-600', 'hover:bg-emerald-500');
    btn.classList.add('bg-zinc-800', 'text-emerald-500', 'border', 'border-emerald-500/20', 'cursor-default');
    btn.onclick = null;
    feedback.classList.remove('hidden');
  }
}

function showProAlert() {
  alert('Disponível apenas no plano Pro');
  if (typeof toggleUpgradeModal === 'function') {
    toggleUpgradeModal();
  }
}

async function gerarRelatorio() {
  const container = document.getElementById('diagnostico');
  container.innerHTML = `
    <div class="flex flex-col items-center justify-center gap-4 py-12 animate-fade-in">
      <div class="relative">
        <div class="w-12 h-12 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
        <div class="absolute inset-0 flex items-center justify-center">
          <i class="fas fa-sparkles text-indigo-400 text-xs animate-pulse"></i>
        </div>
      </div>
      <p class="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">IA processando dados transacionais...</p>
    </div>
  `;

  // Simulação de processamento pesado
  await new Promise(resolve => setTimeout(resolve, 2000));

  const dados = gerarRelatorioLocal();
  renderizarConteudoRelatorio(dados.analise, container);
  
  if (typeof showToast === 'function') {
    const lang = localStorage.getItem('finai_language') || 'pt';
    const messages = {
      pt: 'Relatório gerado com sucesso!',
      en: 'Report generated successfully!',
      es: '¡Informe generado con éxito!'
    };
    showToast(messages[lang] || messages.pt);
  }
}

async function enviarConsulta() {
  const input = document.getElementById('perguntaConsulta');
  const pergunta = input.value.trim();
  if (!pergunta) return;

  const container = document.getElementById('diagnostico');
  const lang = localStorage.getItem('finai_language') || 'pt';
  
  const processingText = {
    pt: 'Analisando dados reais...',
    en: 'Analyzing real data...',
    es: 'Analizando datos reales...'
  };

  container.innerHTML = `
    <div class="flex items-center gap-2 py-3">
      <div class="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      <p class="text-zinc-500 text-[9px] font-bold uppercase tracking-widest">${processingText[lang] || processingText.pt}</p>
    </div>
  `;

  await new Promise(resolve => setTimeout(resolve, 1200));

  const keywordsFinancas = [
    'gasto', 'dinheiro', 'saldo', 'economizar', 'investir', 'finanças', 'pagar', 'comprar', 
    'preço', 'valor', 'custo', 'orcamento', 'cartão', 'banco', 'fatura', 'conta', 'receita', 
    'lucro', 'poupar', 'investimento', 'planejamento', 'estratégia', 'mercado', 'juros'
  ];
  
  const ehFinanceiro = keywordsFinancas.some(k => pergunta.toLowerCase().includes(k));

  if (!ehFinanceiro) {
    const errorMessages = {
      pt: 'Posso te ajudar com suas finanças. Tente perguntar sobre seus gastos ou planejamento.',
      en: 'I can help you with your finances. Try asking about your spending or planning.',
      es: 'Puedo ayudarte con tus finanzas. Intenta preguntar sobre tus gastos o planificación.'
    };

    container.innerHTML = `
      <div class="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 animate-fade-in">
        <div class="flex items-start gap-3">
          <div class="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 border border-white/5">
            <i class="fas fa-info-circle text-zinc-500 text-[10px]"></i>
          </div>
          <p class="text-[11px] text-zinc-400 leading-relaxed pt-0.5">${errorMessages[lang] || errorMessages.pt}</p>
        </div>
      </div>
    `;
    input.value = '';
    return;
  }

  // Lógica de resposta baseada em dados reais
  const total = calcularTotalGasto();
  const saldoDisponivel = saldoInicial - total;
  const gastosPorCategoria = gastos.reduce((acc, g) => {
    acc[g.categoria] = (acc[g.categoria] || 0) + g.valor;
    return acc;
  }, {});

  // Encontrar categoria com maior gasto
  let maiorCategoria = "Nenhuma";
  let maiorValor = 0;
  Object.entries(gastosPorCategoria).forEach(([cat, val]) => {
    if (val > maiorValor) {
      maiorValor = val;
      maiorCategoria = cat;
    }
  });

  const translationsIA = {
    pt: {
      none: "Nenhuma",
      empty: "Ainda não identifiquei gastos registrados. Assim que você adicionar suas primeiras transações, poderei fazer uma análise precisa do seu perfil.",
      overBudget: (val, cat) => `Atenção: Você ultrapassou seu orçamento mensal em R$ ${val}. Recomendo focar em reduzir gastos na categoria ${cat}, que é seu maior custo atualmente.`,
      negativeBalance: (val, cat) => `Seu saldo está negativo em R$ ${val}. Analisei seus registros e vejo que ${cat} representa a maior fatia dos seus gastos. Podemos tentar economizar aqui?`,
      highConcentration: (cat) => `Notei que ${cat} representa mais de 50% dos seus gastos totais. Uma sugestão seria diversificar ou revisar se esses custos são essenciais para manter seu equilíbrio.`,
      solid: (val) => `Seu planejamento está sólido! Com R$ ${val} de saldo, você tem uma boa margem. Que tal investir 10% desse valor?`,
      control: (cat) => `Vale observar que seu ritmo de gastos em ${cat} está sob controle. Se mantiver essa disciplina, fechará o mês com saldo positivo.`,
      reserve: "Analisei seus registros e percebi que você está com um bom score. Uma estratégia eficiente agora seria focar em criar uma reserva de emergência."
    },
    en: {
      none: "None",
      empty: "I haven't identified any recorded expenses yet. Once you add your first transactions, I'll be able to provide an accurate analysis of your profile.",
      overBudget: (val, cat) => `Attention: You have exceeded your monthly budget by R$ ${val}. I recommend focusing on reducing spending in the ${cat} category, which is currently your highest cost.`,
      negativeBalance: (val, cat) => `Your balance is negative by R$ ${val}. I've analyzed your records and see that ${cat} represents the largest share of your spending. Can we try to save here?`,
      highConcentration: (cat) => `I noticed that ${cat} represents more than 50% of your total spending. A suggestion would be to diversify or review if these costs are essential to maintain your balance.`,
      solid: (val) => `Your planning is solid! With R$ ${val} in balance, you have a good margin. How about investing 10% of this amount?`,
      control: (cat) => `It's worth noting that your spending pace in ${cat} is under control. If you maintain this discipline, you'll end the month with a positive balance.`,
      reserve: "I've analyzed your records and noticed you have a good score. An efficient strategy now would be to focus on creating an emergency fund."
    },
    es: {
      none: "Ninguna",
      empty: "Aún no he identificado gastos registrados. Una vez que añadas tus primeras transacciones, podré realizar un análisis preciso de tu perfil.",
      overBudget: (val, cat) => `Atención: Has superado tu presupuesto mensual en R$ ${val}. Recomiendo centrarse en reducir los gastos en la categoría ${cat}, que es tu mayor costo actualmente.`,
      negativeBalance: (val, cat) => `Tu saldo es negativo en R$ ${val}. He analizado tus registros y veo que ${cat} representa la mayor parte de tus gastos. ¿Podemos intentar ahorrar aquí?`,
      highConcentration: (cat) => `He notado que ${cat} representa más del 50% de tus gastos totales. Una sugerencia sería diversificar o revisar si estos costos son esenciales para mantener tu equilibrio.`,
      solid: (val) => `¡Tu planificación es sólida! Con R$ ${val} de saldo, tienes un buen margen. ¿Qué tal si inviertes el 10% de esa cantidad?`,
      control: (cat) => `Vale la pena observar que tu ritmo de gastos en ${cat} está bajo control. Si mantienes esa disciplina, terminarás el mes con un saldo positivo.`,
      reserve: "He analizado tus registros y he notado que tienes un buen puntaje. Una estrategia eficiente ahora sería centrarse en crear una reserva de emergencia."
    }
  };

  const tia = translationsIA[lang] || translationsIA.pt;
  let respostaIA = "";
  
  if (gastos.length === 0) {
    respostaIA = tia.empty;
  } else if (total > orcamentoMensal) {
    respostaIA = tia.overBudget((total - orcamentoMensal).toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US'), maiorCategoria);
  } else if (saldoDisponivel < 0) {
    respostaIA = tia.negativeBalance(Math.abs(saldoDisponivel).toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US'), maiorCategoria);
  } else if (maiorValor > (total * 0.5)) {
    respostaIA = tia.highConcentration(maiorCategoria);
  } else {
    const variacoes = [
      tia.solid(saldoDisponivel.toLocaleString(lang === 'pt' ? 'pt-BR' : 'en-US')),
      tia.control(maiorCategoria),
      tia.reserve
    ];
    respostaIA = variacoes[Math.floor(Math.random() * variacoes.length)];
  }

  container.innerHTML = `
    <div class="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-4 animate-fade-in">
      <div class="flex items-start gap-3">
        <div class="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0 border border-indigo-500/20">
          <i class="fas fa-sparkles text-indigo-400 text-[10px]"></i>
        </div>
        <p class="text-[11px] text-zinc-200 leading-relaxed pt-0.5">${respostaIA}</p>
      </div>
    </div>
  `;

  if (typeof showToast === 'function') {
    const messages = {
      pt: 'Consulta finalizada.',
      en: 'Inquiry finished.',
      es: 'Consulta finalizada.'
    };
    showToast(messages[lang] || messages.pt, 'success');
  }

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

const translations = {
  pt: {
    nav_title: 'Navegação',
    nav_dashboard: 'Dashboard',
    nav_financas: 'Finanças',
    nav_relatorios: 'Relatórios',
    nav_settings: 'Configurações',
    btn_logout: 'Sair da conta',
    empty_list_title: 'Nenhuma transação encontrada',
    empty_list_desc: 'Registre seu primeiro gasto para começar o controle.',
    empty_list_btn: 'Adicionar Gasto',
    empty_chart_desc: 'Dados insuficientes para gerar o gráfico.',
    toast_budget_upd: 'Teto de gastos atualizado.',
    toast_balance_upd: 'Saldo inicial atualizado.',
    toast_expense_add: 'Gasto registrado com sucesso!',
    toast_expense_rem: 'Gasto removido.',
    toast_report_gen: 'Relatório gerado com sucesso!',
    toast_lang_upd: 'Idioma alterado.',
    toast_error_fields: 'Preencha todos os campos.',
    plan_free_title: 'Grátis',
    plan_monthly_title: 'Mensal PRO',
    plan_annual_title: 'Anual',
    plan_family_title: 'Familiar PREMIUM',
    plan_btn_choose: 'Escolher',
    plan_btn_subscribe: 'Assinar',
    plan_btn_annual: 'Escolher Anual',
    plan_btn_family: 'Assinar Família',
    plan_modal_title: 'Planos Disponíveis',
    plan_modal_subtitle: 'Escolha seu nível',
    plan_current: 'Plano Atual',
    plan_free_sidebar: 'Plano Grátis',
    plan_pro_sidebar: 'Plano PRO',
    plan_upgrade: 'Fazer upgrade',
    plan_manage: 'Gerenciar plano',
    summary_volume: 'Volume de Despesas',
    summary_balance: 'Saldo Disponível',
    summary_score: 'Score Financeiro',
    summary_initial: 'Inicial:',
    summary_score_msg: 'Adicione dados para calcular.',
    ai_analysis_title: 'Análise Preditiva',
    ai_analysis_desc: 'Diagnóstico inteligente baseado em consumo',
    ai_analysis_btn: 'Gerar Relatório',
    ai_analysis_placeholder: 'Selecione "Gerar Relatório" para processar dados.',
    ai_query_placeholder: 'Dúvida financeira...',
    ai_query_btn: 'Consultar',
    log_title: 'Log de Transações',
    log_limit: 'Teto:',
    table_id: 'Identificação',
    table_cat: 'Classificação',
    table_date: 'Data',
    table_val: 'Valor',
    table_op: 'Operação',
    new_reg_title: 'Novo Registro',
    new_reg_desc: 'Descrição',
    new_reg_desc_placeholder: 'Ex: Assinatura Cloud',
    new_reg_val: 'Valor Nominal',
    new_reg_date: 'Data da Transação',
    new_reg_btn: 'Confirmar Registro',
    chart_title: 'Composição de Gastos',
    onboarding_title: 'Bem-vindo ao FinAI!',
    onboarding_desc: 'Para começar sua jornada de liberdade financeira, adicione seu primeiro registro de gasto no formulário ao lado.',
    onboarding_btn: 'Começar Agora',
    whatsapp_pro_title: 'Notificações inteligentes',
    whatsapp_pro_desc: 'Receba análises automáticas e alertas estratégicos diretamente no seu WhatsApp.',
    whatsapp_pro_btn: 'Ativar notificações',
    whatsapp_pro_feedback: 'Notificações ativadas com sucesso',
    whatsapp_pro_sim: 'Simulação de Mensagens',
    referral_title: 'Indique e ganhe',
    referral_desc: 'Ganhe 1 mês grátis indicando amigos para o FinAI.',
    referral_btn: 'Convidar agora',
    login_title: 'Entrar no Sistema',
    login_btn: 'Entrar no Sistema',
    config_title: 'Configurações',
    config_save: 'Salvar alterações'
  },
  en: {
    nav_title: 'Navigation',
    nav_dashboard: 'Dashboard',
    nav_financas: 'Finance',
    nav_relatorios: 'Reports',
    nav_settings: 'Settings',
    btn_logout: 'Logout',
    empty_list_title: 'No transactions found',
    empty_list_desc: 'Register your first expense to start controlling.',
    empty_list_btn: 'Add Expense',
    empty_chart_desc: 'Insufficient data to generate chart.',
    toast_budget_upd: 'Spending limit updated.',
    toast_balance_upd: 'Initial balance updated.',
    toast_expense_add: 'Expense registered successfully!',
    toast_expense_rem: 'Expense removed.',
    toast_report_gen: 'Report generated successfully!',
    toast_lang_upd: 'Language changed.',
    toast_error_fields: 'Fill in all fields.',
    plan_free_title: 'Free',
    plan_monthly_title: 'Monthly PRO',
    plan_annual_title: 'Annual',
    plan_family_title: 'Family PREMIUM',
    plan_btn_choose: 'Choose',
    plan_btn_subscribe: 'Subscribe',
    plan_btn_annual: 'Choose Annual',
    plan_btn_family: 'Subscribe Family',
    plan_modal_title: 'Available Plans',
    plan_modal_subtitle: 'Choose your level',
    plan_current: 'Current Plan',
    plan_free_sidebar: 'Free Plan',
    plan_pro_sidebar: 'PRO Plan',
    plan_upgrade: 'Upgrade now',
    plan_manage: 'Manage plan',
    summary_volume: 'Expense Volume',
    summary_balance: 'Available Balance',
    summary_score: 'Financial Score',
    summary_initial: 'Initial:',
    summary_score_msg: 'Add data to calculate.',
    ai_analysis_title: 'Predictive Analysis',
    ai_analysis_desc: 'Intelligent diagnosis based on consumption',
    ai_analysis_btn: 'Generate Report',
    ai_analysis_placeholder: 'Select "Generate Report" to process data.',
    ai_query_placeholder: 'Financial question...',
    ai_query_btn: 'Consult',
    log_title: 'Transaction Log',
    log_limit: 'Limit:',
    table_id: 'Identification',
    table_cat: 'Classification',
    table_date: 'Date',
    table_val: 'Value',
    table_op: 'Operation',
    new_reg_title: 'New Entry',
    new_reg_desc: 'Description',
    new_reg_desc_placeholder: 'Ex: Cloud Subscription',
    new_reg_val: 'Nominal Value',
    new_reg_date: 'Transaction Date',
    new_reg_btn: 'Confirm Entry',
    chart_title: 'Expense Composition',
    onboarding_title: 'Welcome to FinAI!',
    onboarding_desc: 'To start your journey of financial freedom, add your first expense entry in the form on the left.',
    onboarding_btn: 'Start Now',
    whatsapp_pro_title: 'Smart Notifications',
    whatsapp_pro_desc: 'Receive automatic analyses and strategic alerts directly on your WhatsApp.',
    whatsapp_pro_btn: 'Activate notifications',
    whatsapp_pro_feedback: 'Notifications activated successfully',
    whatsapp_pro_sim: 'Message Simulation',
    referral_title: 'Refer and earn',
    referral_desc: 'Earn 1 free month by referring friends to FinAI.',
    referral_btn: 'Invite now',
    login_title: 'Login to System',
    login_btn: 'Login to System',
    config_title: 'Settings',
    config_save: 'Save Changes'
  },
  es: {
    nav_title: 'Navegación',
    nav_dashboard: 'Panel',
    nav_financas: 'Finanzas',
    nav_relatorios: 'Informes',
    nav_settings: 'Ajustes',
    btn_logout: 'Cerrar sesión',
    empty_list_title: 'No se encontraron transacciones',
    empty_list_desc: 'Registra tu primer gasto para empezar el control.',
    empty_list_btn: 'Añadir Gasto',
    empty_chart_desc: 'Datos insuficientes para generar el gráfico.',
    toast_budget_upd: 'Límite de gastos actualizado.',
    toast_balance_upd: 'Saldo inicial actualizado.',
    toast_expense_add: '¡Gasto registrado con éxito!',
    toast_expense_rem: 'Gasto eliminado.',
    toast_report_gen: '¡Informe generado con éxito!',
    toast_lang_upd: 'Idioma cambiado.',
    toast_error_fields: 'Complete todos los campos.',
    plan_free_title: 'Gratis',
    plan_monthly_title: 'Mensual PRO',
    plan_annual_title: 'Anual',
    plan_family_title: 'Familiar PREMIUM',
    plan_btn_choose: 'Elegir',
    plan_btn_subscribe: 'Suscribir',
    plan_btn_annual: 'Elegir Anual',
    plan_btn_family: 'Suscribir Familia',
    plan_modal_title: 'Planes Disponibles',
    plan_modal_subtitle: 'Elige tu nivel',
    plan_current: 'Plan Actual',
    plan_free_sidebar: 'Plan Gratuito',
    plan_pro_sidebar: 'Plan PRO',
    plan_upgrade: 'Mejorar plan',
    plan_manage: 'Gestionar plan',
    summary_volume: 'Volumen de Gastos',
    summary_balance: 'Saldo Disponible',
    summary_score: 'Puntaje Financiero',
    summary_initial: 'Inicial:',
    summary_score_msg: 'Añade datos para calcular.',
    ai_analysis_title: 'Análisis Predictivo',
    ai_analysis_desc: 'Diagnóstico inteligente baseado en el consumo',
    ai_analysis_btn: 'Generar Informe',
    ai_analysis_placeholder: 'Selecciona "Generar Informe" para processar datos.',
    ai_query_placeholder: 'Duda financiera...',
    ai_query_btn: 'Consultar',
    log_title: 'Log de Transacciones',
    log_limit: 'Techo:',
    table_id: 'Identificación',
    table_cat: 'Clasificación',
    table_date: 'Fecha',
    table_val: 'Valor',
    table_op: 'Operação',
    new_reg_title: 'Nuevo Registro',
    new_reg_desc: 'Descrição',
    new_reg_desc_placeholder: 'Ej: Suscripción Cloud',
    new_reg_val: 'Valor Nominal',
    new_reg_date: 'Fecha de Transacción',
    new_reg_btn: 'Confirmar Registro',
    chart_title: 'Composición de Gastos',
    onboarding_title: '¡Bienvenido a FinAI!',
    onboarding_desc: 'Para comenzar tu viaje de libertad financiera, añade tu primer registro de gasto en el formulario de la izquierda.',
    onboarding_btn: 'Empezar Ahora',
    whatsapp_pro_title: 'Notificaciones Inteligentes',
    whatsapp_pro_desc: 'Recibe análisis automáticos e alertas estratégicas directamente en tu WhatsApp.',
    whatsapp_pro_btn: 'Activar notificaciones',
    whatsapp_pro_feedback: 'Notificaciones activadas con éxito',
    whatsapp_pro_sim: 'Simulación de Mensagens',
    referral_title: 'Recomienda y gana',
    referral_desc: 'Gana 1 mes gratis recomendando amigos a FinAI.',
    referral_btn: 'Invitar ahora',
    login_title: 'Entrar al Sistema',
    login_btn: 'Entrar al Sistema',
    config_title: 'Ajustes',
    config_save: 'Guardar Cambios'
  }
};

function changeLanguage(lang) {
  if (!lang) return;
  localStorage.setItem('finai_language', lang);
  document.documentElement.lang = lang;
  
  console.log('Trocando idioma para:', lang);

  // Sincronizar o select se ele existir
  const selectIdioma = document.getElementById('selectIdioma');
  if (selectIdioma) selectIdioma.value = lang;

  const t = translations[lang];
  if (t) {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (t[key]) {
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.placeholder = t[key];
        } else {
          el.textContent = t[key];
        }
      }
    });

    // Feedback visual (Toast) se a função existir
    if (typeof showToast === 'function') {
      const messages = {
        pt: 'Idioma alterado.',
        en: 'Language changed.',
        es: 'Idioma cambiado.'
      };
      showToast(messages[lang] || messages.pt, 'success');
    }
  }
}

// Inicializar idioma ao carregar qualquer página que use main.js
document.addEventListener('DOMContentLoaded', () => {
  const savedLang = localStorage.getItem('finai_language') || 'pt';
  // Pequeno delay para garantir que outros scripts carregaram
  setTimeout(() => changeLanguage(savedLang), 10);
});

function limparTodosDados() {
  if (confirm('Deseja realmente resetar seus dados? Todos os gastos e configurações deste usuário serão apagados.')) {
    localStorage.removeItem(`gastos_${usuarioEmail}`);
    localStorage.removeItem(`orcamento_${usuarioEmail}`);
    localStorage.removeItem(`pagamento_confirmado_${usuarioEmail}`);
    location.reload();
  }
}

// ==================== FINAL ====================
// ==================== ANÁLISE PREDITIVA IA ====================
function gerarAnaliseIA() {
  const total = calcularVolume();
  const percOrcamento = orcamentoMensal > 0 ? (total / orcamentoMensal) : 0;
  const gastosPorCategoria = gastos.reduce((acc, g) => {
    acc[g.categoria] = (acc[g.categoria] || 0) + g.valor;
    return acc;
  }, {});

  let insight = "Adicione gastos para uma análise personalizada.";
  let alerta = "";

  // 1. Definir Insight Principal (Baseado no Score e Volume)
  if (total === 0) {
    insight = "Adicione seus primeiros gastos para começar.";
  } else if (percOrcamento > 0.9) {
    insight = "Você atingiu quase todo seu limite de gastos mensal.";
  } else if (percOrcamento > 0.5) {
    insight = "Seu controle financeiro está equilibrado no momento.";
  } else {
    insight = "Seu padrão de gastos está saudável e sob controle.";
  }

  // 2. Definir Alerta (Se houver algo crítico)
  if (orcamentoMensal > 0 && total > orcamentoMensal) {
    alerta = "Seu teto de gastos mensal foi ultrapassado.";
  } else if (gastosPorCategoria['Alimentação'] > (total * 0.4)) {
    alerta = "Gastos com alimentação estão acima do ideal.";
  } else if (gastosPorCategoria['Lazer'] > (total * 0.25)) {
    alerta = "Atenção aos gastos com lazer este mês.";
  }

  // Atualizar UI
  const displayInsight = document.getElementById('analiseIAInsight');
  const displayAlertaContainer = document.getElementById('analiseIAAlerta');
  
  if (displayInsight) {
    displayInsight.innerText = insight;
  }

  if (displayAlertaContainer) {
    if (alerta) {
      displayAlertaContainer.classList.remove('hidden');
      displayAlertaContainer.querySelector('p').innerText = alerta;
    } else {
      displayAlertaContainer.classList.add('hidden');
    }
  }
}

function renderizarPerfilUsuario() {
  const elNome = document.getElementById('userNameHeader');
  const elAvatar = document.getElementById('userAvatarHeader');
  const elEmailDropdown = document.getElementById('userEmailDropdown');
  
  if (usuarioEmail && usuarioEmail !== "default") {
    // Atualizar email no dropdown
    if (elEmailDropdown) elEmailDropdown.innerText = usuarioEmail;

    // Pegar a parte antes do @ do email, remover pontos e capitalizar
    let nome = usuarioEmail.split('@')[0];
    
    // Formatação Premium: "Debora Souza" em vez de "deborasouza.p"
    nome = nome.split(/[._-]/).map(parte => parte.charAt(0).toUpperCase() + parte.slice(1)).join(' ');
    
    if (elNome) elNome.innerText = nome;
    
    if (elAvatar) {
      const iniciais = nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      elAvatar.innerHTML = `<span class="text-xs font-black text-white tracking-tighter">${iniciais}</span>`;
      elAvatar.classList.add('bg-gradient-to-br', 'from-indigo-500', 'to-violet-600', 'border-none');
    }
  }
}

// Controle de Dropdowns
function toggleDropdown(id) {
  const dropdowns = ['notificationsDropdown', 'settingsDropdown', 'userDropdown'];
  dropdowns.forEach(dId => {
    const el = document.getElementById(dId);
    if (dId === id) {
      el.classList.toggle('hidden');
    } else {
      el.classList.add('hidden');
    }
  });
}

// Fechar dropdowns ao clicar fora
window.addEventListener('click', (e) => {
  const dropdowns = ['notificationsDropdown', 'settingsDropdown', 'userDropdown'];
  dropdowns.forEach(id => {
    const dropdown = document.getElementById(id);
    const button = dropdown.previousElementSibling; // O botão que abre o dropdown
    
    // Se o clique não foi no dropdown nem no botão dele, fecha
    if (!dropdown.contains(e.target) && !button.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });
});

// Efeito de transparência no scroll para o Header
window.addEventListener('scroll', () => {
  const header = document.querySelector('header.sticky');
  if (header) {
    if (window.scrollY > 20) {
      header.classList.remove('bg-[#09090b]/40');
      header.classList.add('bg-[#09090b]/80', 'h-16', 'border-white/10');
      header.classList.remove('h-20');
    } else {
      header.classList.add('bg-[#09090b]/40');
      header.classList.remove('bg-[#09090b]/80', 'h-16', 'border-white/10');
      header.classList.add('h-20');
    }
  }
});

function renderizarTudo() {
  ultimaAtualizacao = new Date();
  renderizarPerfilUsuario();

  const onboardingCard = document.getElementById('onboardingCard');
  const sectionInsights = document.getElementById('section-insights');
  const sectionGastos = document.getElementById('section-gastos');

  if (gastos.length === 0) {
    if (onboardingCard) onboardingCard.classList.remove('hidden');
    if (sectionInsights) sectionInsights.classList.add('opacity-50', 'pointer-events-none');
    if (sectionGastos) sectionGastos.classList.add('opacity-50');
  } else {
    if (onboardingCard) onboardingCard.classList.add('hidden');
    if (sectionInsights) sectionInsights.classList.remove('opacity-50', 'pointer-events-none');
    if (sectionGastos) sectionGastos.classList.remove('opacity-50');
  }

  renderizarLista();
  renderizarProgressoOrcamento();
  renderizarStatusWhatsapp();
  gerarAnaliseIA();
  if (typeof atualizarGraficos === "function") {
    atualizarGraficos();
  } else {
    console.warn('Função atualizarGraficos não encontrada.');
  }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  const hoje = new Date().toISOString().split('T')[0];
  const inputData = document.getElementById('data');
  if (inputData) inputData.value = hoje;
  
  carregarDados();
  renderizarTudo();
});