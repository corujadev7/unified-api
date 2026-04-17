// src/services/StatisticsService.js
import { getDb } from '../database/database.js';

class StatisticsService {

  async getEstatisticasCompletas(gatewayFilter = null) {
    const db = getDb();

    // Função para converter string para número com casas decimais
    const converterParaNumero = (valor) => {
      if (valor === undefined || valor === null) return 0;
      if (typeof valor === 'number') return valor;
      if (typeof valor === 'string') {
        const numero = parseFloat(valor);
        return isNaN(numero) ? 0 : numero;
      }
      return 0;
    };

    // Montar filtro
    let filter = {};
    if (gatewayFilter === 'velana') {
      filter.gateway = 'velana';
    }
    // Para 'pix_proprio' ou null, busca todos (já que os antigos não têm o campo)

    // Total geral
    const totalGeral = await db.collection('pagamentos').countDocuments(filter);

    // Buscar TODOS os pagamentos com filtro
    const todosPagamentos = await db.collection('pagamentos').find(filter).toArray();

    // Calcular soma total corretamente
    let somaTotal = 0;
    for (const p of todosPagamentos) {
      somaTotal += converterParaNumero(p.valor || p.amount);
    }

    // Total hoje
    const hojeInicio = new Date();
    hojeInicio.setHours(0, 0, 0, 0);
    const hojeFim = new Date();
    hojeFim.setHours(23, 59, 59, 999);

    const pagamentosHoje = await db.collection('pagamentos').find({
      ...filter,
      data_criacao: { $gte: hojeInicio, $lte: hojeFim }
    }).toArray();

    let somaHoje = 0;
    for (const p of pagamentosHoje) {
      somaHoje += converterParaNumero(p.valor || p.amount);
    }

    const hoje = {
      quantidade: pagamentosHoje.length,
      valor_total: somaHoje
    };

    // Estatísticas por status
    const statusMap = new Map();
    for (const p of todosPagamentos) {
      const status = p.status || 'gerado';
      const valor = converterParaNumero(p.valor || p.amount);

      if (!statusMap.has(status)) {
        statusMap.set(status, { quantidade: 0, valor_total: 0 });
      }
      const stat = statusMap.get(status);
      stat.quantidade++;
      stat.valor_total += valor;
    }

    const porStatus = Array.from(statusMap.entries()).map(([status, data]) => ({
      status,
      quantidade: data.quantidade,
      valor_total: data.valor_total
    }));

    // Últimos 7 dias
    const seteDiasAtras = new Date();
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

    const pagamentosUltimos7Dias = await db.collection('pagamentos').find({
      ...filter,
      data_criacao: { $gte: seteDiasAtras }
    }).toArray();

    const diasMap = new Map();
    for (const p of pagamentosUltimos7Dias) {
      const dataStr = p.data_criacao.toISOString().split('T')[0];
      const valor = converterParaNumero(p.valor || p.amount);

      if (!diasMap.has(dataStr)) {
        diasMap.set(dataStr, { quantidade: 0, valor_total: 0 });
      }
      const dia = diasMap.get(dataStr);
      dia.quantidade++;
      dia.valor_total += valor;
    }

    const ultimos7Dias = Array.from(diasMap.entries())
      .map(([data, values]) => ({
        data,
        quantidade: values.quantidade,
        valor_total: values.valor_total
      }))
      .sort((a, b) => b.data.localeCompare(a.data));

    // Valor médio (ticket médio)
    let somaValores = 0;
    let quantidadeComValor = 0;
    for (const p of todosPagamentos) {
      const valor = converterParaNumero(p.valor || p.amount);
      if (valor > 0) {
        somaValores += valor;
        quantidadeComValor++;
      }
    }
    const valorMedio = quantidadeComValor > 0 ? somaValores / quantidadeComValor : 0;

    console.log('Debug - Soma total:', somaTotal);
    console.log('Debug - Quantidade:', totalGeral);
    console.log('Debug - Ticket médio:', valorMedio);
    console.log('Debug - Filtro aplicado:', gatewayFilter);

    return {
      total_gerados: totalGeral,
      valor_total: somaTotal,
      hoje: {
        quantidade: hoje.quantidade,
        valor_total: hoje.valor_total
      },
      por_status: porStatus,
      ultimos_7_dias: ultimos7Dias,
      valor_medio: valorMedio
    };
  }
}

export default new StatisticsService();