import { gerarPix } from '../pix.js';
import { getConfig, incrementarEstatisticasDiarias, getDb } from '../database/database.js';
import PixProprioAdapter from '../adapters/PixProprioAdapter.js';
import crypto from 'crypto';

class PixProprioGateway {
    async processPayment(paymentData) {
        try {
            const chavePixAtual = await getConfig('pix_key');
            const txid = crypto.randomBytes(15).toString('hex').toUpperCase();

            const resultado = await gerarPix({
                valor: paymentData.amount,
                chavePix: chavePixAtual,
                txid: txid
            });

            // Salvar no MongoDB
            const db = getDb();
            await db.collection('pagamentos').insertOne({
                txid: resultado.txid,
                valor: resultado.valor,
                chave_pix: chavePixAtual,
                nome_recebedor: "FREE FLOW",
                cidade: "SAO PAULO",
                status: 'gerado',
                data_criacao: new Date(),
                gateway: 'pix_proprio',
                // metadata: JSON.stringify({ user_agent: req.headers['user-agent']})
            });

            // Atualizar estatísticas
            await incrementarEstatisticasDiarias(resultado.valor);

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
        return payment;
    }

    async getAllPayments(page = 1, limit = 50, search = '') {
        const db = getDb();
        const skip = (page - 1) * limit;

        let query = {};
        if (search) {
            query = { txid: { $regex: search, $options: 'i' } };
        }

        const payments = await db.collection('pagamentos')
            .find(query)
            .sort({ data_criacao: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        const total = await db.collection('pagamentos').countDocuments(query);

        return { payments, total, page, limit, pages: Math.ceil(total / limit) };
    }

    async getStats() {
        const db = getDb();

        const total = await db.collection('pagamentos').countDocuments();
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const hojeCount = await db.collection('pagamentos').countDocuments({
            data_criacao: { $gte: hoje }
        });

        return { total, hoje: hojeCount };
    }

    async getEstatisticasCompletas() {
        const db = getDb();

        // Função para converter string para número com casas decimais
        const converterParaNumero = (valor) => {
            if (valor === undefined || valor === null) return 0;
            if (typeof valor === 'number') return valor;
            if (typeof valor === 'string') {
                // Converte "68.5" para 68.5
                const numero = parseFloat(valor);
                return isNaN(numero) ? 0 : numero;
            }
            return 0;
        };

        // Total geral
        const totalGeral = await db.collection('pagamentos').countDocuments();

        // Buscar TODOS os pagamentos
        const todosPagamentos = await db.collection('pagamentos').find({}).toArray();

        // Calcular soma total corretamente
        let somaTotal = 0;
        for (const p of todosPagamentos) {
            somaTotal += converterParaNumero(p.valor);
        }

        // Total hoje
        const hojeInicio = new Date();
        hojeInicio.setHours(0, 0, 0, 0);
        const hojeFim = new Date();
        hojeFim.setHours(23, 59, 59, 999);

        const pagamentosHoje = await db.collection('pagamentos').find({
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

        // Últimos 7 dias
        const seteDiasAtras = new Date();
        seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

        const pagamentosUltimos7Dias = await db.collection('pagamentos').find({
            data_criacao: { $gte: seteDiasAtras }
        }).toArray();

        const diasMap = new Map();
        for (const p of pagamentosUltimos7Dias) {
            const dataStr = p.data_criacao.toISOString().split('T')[0];
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

        console.log('Debug - Soma total:', somaTotal);
        console.log('Debug - Quantidade:', totalGeral);
        console.log('Debug - Ticket médio:', valorMedio);

        return {
            total_gerados: totalGeral,
            valor_total: somaTotal,  // Adicionar campo valor_total
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

export default PixProprioGateway;