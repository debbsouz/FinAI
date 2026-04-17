// Dados
let gastos = [];

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

// Carregar gastos
function carregarGastos() {
  const salvos = localStorage.getItem('gastos');
  if (salvos) {
    gastos = JSON.parse(salvos);
  }
  renderizarLista();
  atualizarTotal();
}

// Salvar gastos
function salvarGastos() {
  localStorage.setItem('gastos', JSON.stringify(gastos));
}

// Adicionar gasto
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
  renderizarLista();
  atualizarTotal();

  // Limpar formulário
  document.getElementById('descricao').value = '';
  document.getElementById('valor').value = '';
}

// Remover gasto
function removerGasto(id) {
  if (confirm('Excluir este gasto?')) {
    gastos = gastos.filter(g => g.id !== id);
    salvarGastos();
    renderizarLista();
    atualizarTotal();
  }
}

// Atualizar total
function atualizarTotal() {
  const total = gastos.reduce((acc, gasto) => acc + gasto.valor, 0);
  document.getElementById('totalGasto').textContent = 
    'R$ ' + total.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
}

// Renderizar lista
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

// Inicialização
window.onload = function() {
  const hoje = new Date().toISOString().split('T')[0];
  document.getElementById('data').value = hoje;
  carregarGastos();
};