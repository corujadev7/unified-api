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
}

export default PixProprioGateway;