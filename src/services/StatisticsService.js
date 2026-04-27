// src/services/StatisticsService.js
import { getDb } from '../database/database.js';
import moment from 'moment-timezone';

class StatisticsService {

  async getEstatisticasCompletas(gatewayFilter = null, startDate = null, endDate = null) {
    try {
      const db = getDb();
      const TIMEZONE_BRASIL = 'America/Sao_Paulo';

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

      // Filtro de gateway (apenas para velana, pix_proprio pega tudo)
      if (gatewayFilter === 'velana') {
        filter.gateway = 'velana';
      }

      // ⭐ CORREÇÃO: Filtro de datas com horário do Brasil
      if (startDate || endDate) {
        filter.data_criacao = {};

        if (startDate) {
          // Cria a data no início do dia no horário do Brasil e converte para UTC
          const start = moment.tz(startDate, TIMEZONE_BRASIL).startOf('day').utc().toDate();
          filter.data_criacao.$gte = start;
          console.log(`[DEBUG] Start date (Brasil): ${startDate} -> UTC: ${start.toISOString()}`);
        }

        if (endDate) {
          // Cria a data no fim do dia no horário do Brasil e converte para UTC
          const end = moment.tz(endDate, TIMEZONE_BRASIL).endOf('day').utc().toDate();
          filter.data_criacao.$lte = end;
          console.log(`[DEBUG] End date (Brasil): ${endDate} -> UTC: ${end.toISOString()}`);
        }
      }

      console.log('Filtro aplicado:', JSON.stringify(filter, null, 2));

      // Buscar pagamentos
      const todosPagamentos = await db.collection('pagamentos').find(filter).toArray();

      console.log(`Encontrados ${todosPagamentos.length} pagamentos`);

      const totalGeral = todosPagamentos.length;

      // Calcular soma total
      let somaTotal = 0;
      for (const p of todosPagamentos) {
        somaTotal += converterParaNumero(p.valor || p.amount);
      }

      // ⭐ CORREÇÃO: Pagamentos de hoje no horário do Brasil
      const hojeInicio = moment.tz(TIMEZONE_BRASIL).startOf('day').toDate();
      const hojeFim = moment.tz(TIMEZONE_BRASIL).endOf('day').toDate();

      console.log(`[DEBUG] Hoje Brasil - Início: ${hojeInicio.toISOString()}`);
      console.log(`[DEBUG] Hoje Brasil - Fim: ${hojeFim.toISOString()}`);

      const pagamentosHoje = todosPagamentos.filter(p => {
        const data = new Date(p.data_criacao);
        return data >= hojeInicio && data <= hojeFim;
      });

      let somaHoje = 0;
      for (const p of pagamentosHoje) {
        somaHoje += converterParaNumero(p.valor || p.amount);
      }

      // Ticket médio
      const valorMedio = totalGeral > 0 ? somaTotal / totalGeral : 0;

      // ⭐ CORREÇÃO: Agrupar por dia no horário do Brasil
      const diasMap = new Map();
      for (const p of todosPagamentos) {
        // Converte a data UTC para o horário do Brasil para agrupar corretamente
        const dataBrasil = moment(p.data_criacao).tz(TIMEZONE_BRASIL);
        const dataStr = dataBrasil.format('YYYY-MM-DD');
        const valor = converterParaNumero(p.valor || p.amount);

        if (!diasMap.has(dataStr)) {
          diasMap.set(dataStr, { quantidade: 0, valor_total: 0 });
        }
        const dia = diasMap.get(dataStr);
        dia.quantidade++;
        dia.valor_total += valor;
      }

      const pagamentosPorDia = Array.from(diasMap.entries())
        .map(([data, values]) => ({
          data,
          quantidade: values.quantidade,
          valor_total: values.valor_total
        }))
        .sort((a, b) => a.data.localeCompare(b.data));

      // Estatísticas por status
      const statusMap = new Map();
      for (const p of todosPagamentos) {
        const status = p.status || 'gerado';
        const valor = converterParaNumero(p.valor || p.amount);

        if (!statusMap.has(status)) {
          statusMap.set(status, { status, quantidade: 0, valor_total: 0 });
        }
        const stat = statusMap.get(status);
        stat.quantidade++;
        stat.valor_total += valor;
      }

      const porStatus = Array.from(statusMap.values());

      // ⭐ CORREÇÃO: Últimos 7 dias no horário do Brasil
      const seteDiasAtrasBrasil = moment.tz(TIMEZONE_BRASIL).subtract(7, 'days').startOf('day');
      
      const ultimos7Dias = pagamentosPorDia.filter(dia => {
        const data = moment.tz(dia.data, TIMEZONE_BRASIL);
        return data.isSameOrAfter(seteDiasAtrasBrasil);
      });

      // Log para debug
      console.log('📊 Estatísticas calculadas:');
      console.log(`  - Total de pagamentos: ${totalGeral}`);
      console.log(`  - Valor total: R$ ${somaTotal.toFixed(2)}`);
      console.log(`  - Ticket médio: R$ ${valorMedio.toFixed(2)}`);
      console.log(`  - Pagamentos hoje: ${pagamentosHoje.length} (R$ ${somaHoje.toFixed(2)})`);
      console.log(`  - Dias no período: ${pagamentosPorDia.length}`);
      console.log(`  - Últimos 7 dias: ${ultimos7Dias.length} dias com dados`);

      return {
        total_gerados: totalGeral,
        valor_total: somaTotal,
        valor_medio: valorMedio,
        hoje: {
          quantidade: pagamentosHoje.length,
          valor_total: somaHoje
        },
        por_status: porStatus,
        ultimos_7_dias: ultimos7Dias,
        pagamentos_por_dia: pagamentosPorDia
      };

    } catch (error) {
      console.error('Erro em getEstatisticasCompletas:', error);
      throw error;
    }
  }

  // ⭐ MÉTODO AUXILIAR: Para incrementar estatísticas diárias
  async incrementarEstatisticasDiarias(valor, gateway = 'pix_proprio') {
    try {
      const db = getDb();
      const TIMEZONE_BRASIL = 'America/Sao_Paulo';
      
      // Pega a data de hoje no horário do Brasil
      const hoje = moment.tz(TIMEZONE_BRASIL).format('YYYY-MM-DD');

      const converterParaNumero = (val) => {
        if (typeof val === 'number' && !isNaN(val)) return val;
        if (typeof val === 'string') {
          const numero = parseFloat(val);
          return isNaN(numero) ? 0 : numero;
        }
        return 0;
      };

      const valorNumerico = converterParaNumero(valor);

      console.log(`[DEBUG] Incrementar estatísticas:`);
      console.log(`  - Data no Brasil: ${hoje}`);
      console.log(`  - Valor: ${valorNumerico}`);
      console.log(`  - Gateway: ${gateway}`);

      if (isNaN(valorNumerico) || !isFinite(valorNumerico)) {
        console.error(`Valor inválido: ${valor}`);
        return false;
      }

      await db.collection('estatisticas_diarias').updateOne(
        { data: hoje, gateway: gateway },
        {
          $inc: {
            total_pagamentos: 1,
            valor_total: valorNumerico
          },
          $set: { updated_at: new Date() }
        },
        { upsert: true }
      );

      console.log(`✅ Estatísticas atualizadas: +${valorNumerico} na data ${hoje} (Brasil)`);
      return true;

    } catch (error) {
      console.error('Erro ao incrementar estatísticas:', error);
      return false;
    }
  }

  // ⭐ MÉTODO AUXILIAR: Para buscar estatísticas de um dia específico
  async getEstatisticasDiarias(data = null, gateway = 'pix_proprio') {
    try {
      const db = getDb();
      const TIMEZONE_BRASIL = 'America/Sao_Paulo';
      
      let dataBusca = data;
      if (!dataBusca) {
        dataBusca = moment.tz(TIMEZONE_BRASIL).format('YYYY-MM-DD');
      }

      const estatistica = await db.collection('estatisticas_diarias').findOne({ 
        data: dataBusca,
        gateway: gateway 
      });

      return {
        data: dataBusca,
        total_pagamentos: estatistica?.total_pagamentos || 0,
        valor_total: estatistica?.valor_total || 0
      };

    } catch (error) {
      console.error('Erro ao buscar estatísticas diárias:', error);
      return { data, total_pagamentos: 0, valor_total: 0 };
    }
  }

  formatarDataBrasil(dataUTC) {
    const TIMEZONE_BRASIL = 'America/Sao_Paulo';
    if (!dataUTC) return '-';
    return moment(dataUTC).tz(TIMEZONE_BRASIL).format('DD/MM/YYYY HH:mm:ss');
  }
}

export default new StatisticsService();