import { gerarPix } from '../pix.js';
import { getConfig, incrementarEstatisticasDiarias, getDb } from '../database/database.js';
import PixProprioAdapter from '../adapters/PixProprioAdapter.js';
import crypto from 'crypto';
import moment from 'moment-timezone';

class PixProprioGateway {
    
    // ⭐ Método auxiliar para converter data para horário do Brasil
    getDataBrasil(dataUTC) {
        const TIMEZONE_BRASIL = 'America/Sao_Paulo';
        return moment(dataUTC).tz(TIMEZONE_BRASIL);
    }

    // ⭐ Método auxiliar para obter início do dia no Brasil
    getInicioDiaBrasil() {
        const TIMEZONE_BRASIL = 'America/Sao_Paulo';
        return moment.tz(TIMEZONE_BRASIL).startOf('day').toDate();
    }

    // ⭐ Método auxiliar para obter fim do dia no Brasil
    getFimDiaBrasil() {
        const TIMEZONE_BRASIL = 'America/Sao_Paulo';
        return moment.tz(TIMEZONE_BRASIL).endOf('day').toDate();
    }

    async processPayment(paymentData) {
        try {
            const chavePixAtual = await getConfig('pix_key');
            const txid = crypto.randomBytes(15).toString('hex').toUpperCase();

            const resultado = await gerarPix({
                valor: paymentData.amount,
                chavePix: chavePixAtual,
                txid: txid
            });

            // ⭐ Salvar com timestamp UTC (padrão do banco)
            const db = getDb();
            await db.collection('pagamentos').insertOne({
                txid: resultado.txid,
                valor: resultado.valor,
                chave_pix: chavePixAtual,
                nome_recebedor: paymentData.productTitle,
                cidade: "SAO PAULO",
                status: 'gerado',
                data_criacao: new Date(), // UTC
                gateway: 'pix_proprio',
            });

            // ⭐ Atualizar estatísticas (a função já deve estar corrigida para usar Brasil)
            await incrementarEstatisticasDiarias(resultado.valor, 'pix_proprio');

            // Normaliza a resposta
            return PixProprioAdapter.normalize({
                success: true,
                data: resultado
            }, paymentData);

        } catch (error) {
            console.error('Erro no gateway Pix Próprio:', error);
            return PixProprioAdapter.normalize({
                success: false,
                error: error.message
            }, paymentData);
        }
    }

    async getPayment(txid) {
        const db = getDb();
        const payment = await db.collection('pagamentos').findOne({ txid });
        
        // ⭐ Opcional: Adicionar data formatada para o Brasil
        if (payment) {
            const TIMEZONE_BRASIL = 'America/Sao_Paulo';
            payment.data_criacao_formatada = moment(payment.data_criacao)
                .tz(TIMEZONE_BRASIL)
                .format('DD/MM/YYYY HH:mm:ss');
        }
        
        return payment;
    }

    async getAllPayments(page = 1, limit = 50, search = '') {
        const db = getDb();
        const skip = (page - 1) * limit;

        let query = { gateway: 'pix_proprio' };
        if (search) {
            query.txid = { $regex: search, $options: 'i' };
        }

        const payments = await db.collection('pagamentos')
            .find(query)
            .sort({ data_criacao: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        const total = await db.collection('pagamentos').countDocuments(query);

        // ⭐ Formatar datas para o Brasil
        const TIMEZONE_BRASIL = 'America/Sao_Paulo';
        const paymentsFormatados = payments.map(p => ({
            ...p,
            data_criacao_brasil: moment(p.data_criacao).tz(TIMEZONE_BRASIL).format('DD/MM/YYYY HH:mm:ss'),
            data_brasil: moment(p.data_criacao).tz(TIMEZONE_BRASIL).format('YYYY-MM-DD')
        }));

        return { 
            payments: paymentsFormatados, 
            total, 
            page, 
            limit, 
            pages: Math.ceil(total / limit) 
        };
    }

    async getStats() {
        const db = getDb();
        const TIMEZONE_BRASIL = 'America/Sao_Paulo';

        const total = await db.collection('pagamentos').countDocuments({ gateway: 'pix_proprio' });
        
        // ⭐ CORREÇÃO: Usar horário do Brasil para "hoje"
        const hojeInicio = this.getInicioDiaBrasil();
        const hojeFim = this.getFimDiaBrasil();

        const hojeCount = await db.collection('pagamentos').countDocuments({
            gateway: 'pix_proprio',
            data_criacao: { $gte: hojeInicio, $lte: hojeFim }
        });

        console.log(`[DEBUG] Stats do Pix Próprio:`);
        console.log(`  - Total: ${total}`);
        console.log(`  - Hoje (Brasil): ${hojeCount}`);
        console.log(`  - Período: ${hojeInicio.toISOString()} até ${hojeFim.toISOString()}`);

        return { total, hoje: hojeCount };
    }

    // ⭐ CORREÇÃO COMPLETA: getEstatisticasCompletas com fuso horário do Brasil
    async getEstatisticasCompletas(startDate = null, endDate = null) {
        const db = getDb();
        const TIMEZONE_BRASIL = 'America/Sao_Paulo';

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

        // ⭐ Montar filtro com suporte a datas personalizadas
        let filter = { gateway: 'pix_proprio' };
        
        if (startDate || endDate) {
            filter.data_criacao = {};
            
            if (startDate) {
                const start = moment.tz(startDate, TIMEZONE_BRASIL).startOf('day').utc().toDate();
                filter.data_criacao.$gte = start;
                console.log(`[DEBUG] Start date (Brasil): ${startDate} -> UTC: ${start.toISOString()}`);
            }
            
            if (endDate) {
                const end = moment.tz(endDate, TIMEZONE_BRASIL).endOf('day').utc().toDate();
                filter.data_criacao.$lte = end;
                console.log(`[DEBUG] End date (Brasil): ${endDate} -> UTC: ${end.toISOString()}`);
            }
        }

        // Total geral
        const totalGeral = await db.collection('pagamentos').countDocuments(filter);

        // Buscar TODOS os pagamentos
        const todosPagamentos = await db.collection('pagamentos').find(filter).toArray();

        // Calcular soma total corretamente
        let somaTotal = 0;
        for (const p of todosPagamentos) {
            somaTotal += converterParaNumero(p.valor);
        }

        // ⭐ CORREÇÃO: Total hoje no horário do Brasil
        const hojeInicio = this.getInicioDiaBrasil();
        const hojeFim = this.getFimDiaBrasil();

        const pagamentosHoje = await db.collection('pagamentos').find({
            gateway: 'pix_proprio',
            data_criacao: { $gte: hojeInicio, $lte: hojeFim }
        }).toArray();

        let somaHoje = 0;
        for (const p of pagamentosHoje) {
            somaHoje += converterParaNumero(p.valor);
        }

        const hoje = {
            quantidade: pagamentosHoje.length,
            valor_total: somaHoje
        };

        // Estatísticas por status
        const statusMap = new Map();
        for (const p of todosPagamentos) {
            const status = p.status || 'gerado';
            const valor = converterParaNumero(p.valor);

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

        // ⭐ CORREÇÃO: Últimos 7 dias no horário do Brasil
        const seteDiasAtras = moment.tz(TIMEZONE_BRASIL).subtract(7, 'days').startOf('day').utc().toDate();

        const pagamentosUltimos7Dias = await db.collection('pagamentos').find({
            gateway: 'pix_proprio',
            data_criacao: { $gte: seteDiasAtras }
        }).toArray();

        const diasMap = new Map();
        for (const p of pagamentosUltimos7Dias) {
            // ⭐ Converter data para horário do Brasil para agrupar corretamente
            const dataBrasil = moment(p.data_criacao).tz(TIMEZONE_BRASIL);
            const dataStr = dataBrasil.format('YYYY-MM-DD');
            const valor = converterParaNumero(p.valor);

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
            const valor = converterParaNumero(p.valor);
            if (valor > 0) {
                somaValores += valor;
                quantidadeComValor++;
            }
        }
        const valorMedio = quantidadeComValor > 0 ? somaValores / quantidadeComValor : 0;

        // Logs de debug com horário do Brasil
        const agoraBrasil = moment.tz(TIMEZONE_BRASIL).format('YYYY-MM-DD HH:mm:ss');
        console.log('📊 Debug - Pix Próprio:');
        console.log(`  - Horário atual (Brasil): ${agoraBrasil}`);
        console.log(`  - Total de pagamentos: ${totalGeral}`);
        console.log(`  - Soma total: R$ ${somaTotal.toFixed(2)}`);
        console.log(`  - Ticket médio: R$ ${valorMedio.toFixed(2)}`);
        console.log(`  - Pagamentos hoje: ${hoje.quantidade} (R$ ${somaHoje.toFixed(2)})`);
        console.log(`  - Período hoje: ${hojeInicio.toISOString()} até ${hojeFim.toISOString()}`);

        return {
            total_gerados: totalGeral,
            valor_total: somaTotal,
            hoje: {
                quantidade: hoje.quantidade,
                valor_total: somaHoje
            },
            por_status: porStatus,
            ultimos_7_dias: ultimos7Dias,
            valor_medio: valorMedio
        };
    }

    // ⭐ NOVO MÉTODO: Para buscar estatísticas com filtro de datas
    async getEstatisticasPorPeriodo(startDate, endDate) {
        return this.getEstatisticasCompletas(startDate, endDate);
    }

    // ⭐ NOVO MÉTODO: Para formatar valores monetários
    formatarMoeda(valor) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(valor);
    }
}

export default PixProprioGateway;