// Dados
let gastos = [];
let pieChart = null;
let barChart = null;

// Regras de categorização
const regrasCategorias = {
  "Alimentação": ["ifood", "restaurante", "mercado", "supermercado", "pão", "café", "almoço", "janta", "lanche"],
  "Transporte": ["uber", "99", "taxi", "ônibus", "metro", "gasolina", "estacionamento", "combustível"],
  "Moradia": ["aluguel", "condomínio", "internet", "luz", "água", "gás", "iptu"],
  "Lazer": ["netflix", "spotify", "cinema", "show", "bar", "festa", "jogo"],
  "Saúde": ["farmácia", "remédio", "médico", "dentista", "academia"],
  "Compras": ["shein", "amazon", "magazine", "roupa", "sapato", "loja"],
  "Educação": ["curso", "faculdade", "livro", "alura", "hotmart"],
  "Outros": []
};

function categorizarGasto(descricao) {
  const desc = descricao.toLowerCase();
  for (let categoria in regrasCategorias) {
    for (let palavra of regrasCategorias[categoria]) {
      if (desc.includes(palavra)) {
        return categoria;
      }
    }
  }
  return "Outros";
}

function carregarGastos() {
  const salvos = localStorage.getItem('gastos');
  if (salvos) {
    gastos = JSON.parse(salvos);
  }
  renderizarTudo();
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

function atualizarTotal() {
  const total = gastos.reduce((acc, gasto) => acc + gasto.valor, 0);
  document.getElementById('totalGasto').textContent = 
    'R$ ' + total.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

function renderizarLista() {
  const container = document.getElementById('listaGastos');
  
  if (gastos.length === 0) {
    container.innerHTML = `<div class="text-center py-12 text-zinc-500">Nenhum gasto registrado ainda.</div>`;
    return;
  }

  let html = '';
  gastos.forEach(gasto => {
    html += `
      <div class="flex items-center justify-between bg-zinc-800 rounded-2xl px-6 py-5 group">
        <div class="flex-1">
          <p class="font-medium">${gasto.descricao}</p>
          <div class="flex items-center gap-3 mt-1">
            <span class="text-xs px-3 py-1 bg-zinc-700 rounded-full text-zinc-400">${gasto.categoria}</span>
            <p class="text-zinc-400 text-sm">${new Date(gasto.data).toLocaleDateString('pt-BR')}</p>
          </div>
        </div>
        <div class="flex items-center gap-6">
          <span class="font-semibold text-lg">R$ ${gasto.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          <button onclick="removerGasto(${gasto.id})" 
            class="text-red-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
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
  Object.keys(porCategoria).sort().forEach(cat => {
    const valor = porCategoria[cat];
    html += `
      <div class="bg-zinc-800 rounded-2xl p-5">
        <p class="text-sm text-zinc-400">${cat}</p>
        <p class="text-2xl font-semibold mt-2 text-white">R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
      </div>`;
  });

  container.innerHTML = html || '<p class="text-zinc-500 col-span-4 text-center py-8">Adicione gastos para ver o resumo</p>';
}

function atualizarGraficos() {
  const porCategoria = {};
  gastos.forEach(g => {
    porCategoria[g.categoria] = (porCategoria[g.categoria] || 0) + g.valor;
  });

  const labels = Object.keys(porCategoria);
  const valores = Object.values(porCategoria);
  const cores = ['#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#eab308'];

  // Gráfico de Pizza
  const ctxPie = document.getElementById('pieChart');
  if (pieChart) pieChart.destroy();
  pieChart = new Chart(ctxPie, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{ data: valores, backgroundColor: cores }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#a1a1aa', padding: 15 } }
      }
    }
  });

  // Gráfico de Barras
  const ctxBar = document.getElementById('barChart');
  if (barChart) barChart.destroy();
  barChart = new Chart(ctxBar, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Valor gasto (R$)',
        data: valores,
        backgroundColor: '#8b5cf6',
        borderRadius: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { ticks: { color: '#71717a' } },
        x: { ticks: { color: '#71717a' } }
      }
    }
  });
}

function renderizarTudo() {
  atualizarTotal();
  renderizarLista();
  renderizarResumoCategorias();
  atualizarGraficos();
}

// Inicialização
window.onload = function() {
  const hoje = new Date().toISOString().split('T')[0];
  document.getElementById('data').value = hoje;
  carregarGastos();
};