function atualizarGraficos() {
  console.log('Atualizando gráficos com os dados:', gastos);
  const ctx = document.getElementById('pieChart');
  if (!ctx) {
    console.warn('Canvas "pieChart" não encontrado.');
    return;
  }

  if (gastos.length === 0) {
    console.log('Nenhum gasto registrado para exibir no gráfico.');
    if (pieChart) {
      pieChart.destroy();
      pieChart = null;
    }
    return;
  }

  const dadosPorCategoria = {};
  gastos.forEach(g => {
    const categoria = g.categoria || 'Outros';
    const valor = parseFloat(g.valor) || 0;
    dadosPorCategoria[categoria] = (dadosPorCategoria[categoria] || 0) + valor;
  });

  const labels = Object.keys(dadosPorCategoria);
  const values = Object.values(dadosPorCategoria);

  console.log('Dados formatados para o gráfico:', { labels, values });

  if (pieChart) {
    pieChart.destroy();
  }

  pieChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: [
          '#8b5cf6', // violet-500
          '#10b981', // emerald-500
          '#3b82f6', // blue-500
          '#f59e0b', // amber-500
          '#ef4444', // red-500
          '#ec4899', // pink-500
          '#a855f7', // purple-500
          '#71717a'  // zinc-500
        ],
        borderWidth: 0,
        hoverOffset: 10
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: '#18181b',
          titleFont: { size: 12, weight: 'bold' },
          bodyFont: { size: 12 },
          padding: 12,
          cornerRadius: 8,
          displayColors: false
        }
      },
      cutout: '75%'
    }
  });
}