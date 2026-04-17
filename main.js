let gastos = [];
let orcamentoMensal = parseFloat(localStorage.getItem('orcamentoMensal')) || 3000;
let pieChart = null;
let barChart = null;

const regrasCategorias = {
  "Alimentação": ["ifood", "restaurante", "mercado", "supermercado", "pão", "café", "almoço", "janta"],
  "Transporte": ["uber", "99", "taxi", "ônibus", "metro", "gasolina", "estacionamento"],
  "Moradia": ["aluguel", "condomínio", "internet", "luz", "água", "gás"],
  "Lazer": ["netflix", "spotify", "cinema", "show", "bar", "festa", "jogo"],
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

function carregarDados() {
  const salvos = localStorage.getItem('gastos');
  if (salvos) gastos = JSON.parse(salvos);
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
    alert('Preencha todos os campos corretamente.');
    return;
  }

  const valor = parseFloat(valorStr);
  const categoria = categorizarGasto(descricao);

  gastos.unshift({
    id: Date.now(),
    descricao,
    valor,
    data,
    categoria
  });

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

function calcularTotal() {
  return gastos.reduce((acc, g) => acc + g.valor, 0);
}

function renderizarLista() {
  const container = document.getElementById('listaGastos');
  if (gastos.length === 0) {
    container.innerHTML = `<div class="text-center py-16 text-zinc-500">Ainda não há gastos registrados.</div>`;
    return;
  }

  let html = '';
  gastos.forEach(g => {
    html += `
      <div class="bg-zinc-800 rounded-2xl px-6 py-5 flex items-center justify-between group">
        <div>
          <p class="font-medium">${g.descricao}</p>
          <div class="flex gap-3 text-sm mt-1">
            <span class="px-3 py-1 bg-zinc-700 rounded-full text-xs">${g.categoria}</span>
            <span class="text-zinc-400">${new Date(g.data).toLocaleDateString('pt-BR')}</span>
          </div>
        </div>
        <div class="flex items-center gap-8">
          <span class="text-xl font-semibold">R$ ${g.valor.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
          <button onclick="removerGasto(${g.id})" class="text-red-400 opacity-0 group-hover:opacity-100 transition-all">
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
  gastos.forEach(g => {
    porCategoria[g.categoria] = (porCategoria[g.categoria] || 0) + g.valor;
  });

  let html = '';
  Object.keys(porCategoria).forEach(cat => {
    html += `
      <div class="bg-zinc-800 rounded-2xl p-5">
        <p class="text-zinc-400 text-sm">${cat}</p>
        <p class="text-2xl font-semibold mt-1">R$ ${porCategoria[cat].toLocaleString('pt-BR', {minimumFractionDigits: 2})}</p>
      </div>`;
  });
  container.innerHTML = html || '<p class="col-span-4 text-center py-8 text-zinc-500">Adicione gastos para ver o resumo</p>';
}

function renderizarProgressoOrcamento() {
  const total = calcularTotal();
  const percentual = orcamentoMensal > 0 ? Math.min((total / orcamentoMensal) * 100, 100) : 0;
  const container = document.getElementById('progressoOrcamento');

  let cor = percentual > 90 ? 'bg-red-500' : percentual > 70 ? 'bg-amber-500' : 'bg-emerald-500';

  container.innerHTML = `
    <div class="flex justify-between text-sm mb-2">
      <span>Gasto atual</span>
      <span class="font-medium">R$ ${total.toLocaleString('pt-BR')} / R$ ${orcamentoMensal.toLocaleString('pt-BR')}</span>
    </div>
    <div class="h-3 bg-zinc-700 rounded-full overflow-hidden">
      <div class="${cor} h-full transition-all" style="width: ${percentual}%"></div>
    </div>
    <p class="text-xs text-zinc-400 mt-2">${percentual.toFixed(0)}% do orçamento utilizado</p>
  `;
}

function gerarAnaliseInteligente() {
  const container = document.getElementById('insights');
  const total = calcularTotal();
  if (gastos.length === 0) {
    container.innerHTML = `<p class="text-zinc-500">Adicione alguns gastos para a IA analisar seu comportamento financeiro.</p>`;
    return;
  }

  const porCategoria = {};
  gastos.forEach(g => porCategoria[g.categoria] = (porCategoria[g.categoria] || 0) + g.valor);

  const maiorCategoria = Object.keys(porCategoria).reduce((a, b) => porCategoria[a] > porCategoria[b] ? a : b);
  const percentualMaior = ((porCategoria[maiorCategoria] / total) * 100).toFixed(0);

  let html = `
    <div class="bg-zinc-800/70 border border-violet-500/30 rounded-2xl p-6">
      <p class="text-violet-300 font-medium">Análise deste mês</p>
      <p class="mt-3">Você está gastando mais em <strong class="text-white">${maiorCategoria}</strong> (${percentualMaior}% do total).</p>
  `;

  if (total > orcamentoMensal * 0.85) {
    html += `<p class="mt-4 text-amber-400">⚠️ Você está próximo de ultrapassar seu orçamento mensal.</p>`;
  } else if (percentualMaior > 40) {
    html += `<p class="mt-4 text-emerald-400">Sugestão: Defina um limite específico para ${maiorCategoria.toLowerCase()} para controlar melhor.</p>`;
  } else {
    html += `<p class="mt-4 text-emerald-400">Sua distribuição de gastos está relativamente equilibrada.</p>`;
  }

  html += `</div>`;
  container.innerHTML = html;
}

function atualizarGraficos() {
  const porCategoria = {};
  gastos.forEach(g => porCategoria[g.categoria] = (porCategoria[g.categoria] || 0) + g.valor);

  const labels = Object.keys(porCategoria);
  const valores = Object.values(porCategoria);
  const cores = ['#a855f7', '#db2777', '#e11d48', '#f59e0b', '#10b981', '#3b82f6'];

  // Pie
  if (pieChart) pieChart.destroy();
  pieChart = new Chart(document.getElementById('pieChart'), {
    type: 'pie',
    data: { labels, datasets: [{ data: valores, backgroundColor: cores }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#d1d5db' } } }}
  });

  // Bar
  if (barChart) barChart.destroy();
  barChart = new Chart(document.getElementById('barChart'), {
    type: 'bar',
    data: { labels, datasets: [{ data: valores, backgroundColor: '#a855f7', borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }}
  });
}

function renderizarTudo() {
  renderizarLista();
  renderizarResumoCategorias();
  renderizarProgressoOrcamento();
  gerarAnaliseInteligente();
  atualizarGraficos();
}

// Exportar e Limpar
function exportarCSV() {
  if (gastos.length === 0) return alert('Não há dados para exportar.');
  let csv = 'Data,Descrição,Categoria,Valor\n';
  gastos.forEach(g => csv += `${g.data},"${g.descricao}",${g.categoria},${g.valor}\n`);
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gastos-ia-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}

function limparTodosDados() {
  if (confirm('Apagar todos os gastos permanentemente?')) {
    gastos = [];
    localStorage.removeItem('gastos');
    renderizarTudo();
  }
}

// Inicialização
window.onload = () => {
  document.getElementById('data').value = new Date().toISOString().split('T')[0];
  carregarDados();
};