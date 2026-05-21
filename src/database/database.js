// database.js
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import moment from 'moment-timezone';
dotenv.config()

let client;
let db;

export async function initializeDatabase() {
    if (db) return db;

    const uri = process.env.MONGODB_URI;
    if (!uri) {
        throw new Error('Defina a variável MONGODB_URI no ambiente');
    }

    client = new MongoClient(uri);
    await client.connect();
    db = client.db('pix_pagamentos');

    // Criar índices para performance
    await db.collection('pagamentos').createIndex({ txid: 1 }, { unique: true });
    await db.collection('pagamentos').createIndex({ data_criacao: -1 });
    await db.collection('pagamentos').createIndex({ status: 1 });
    await db.collection('configuracoes').createIndex({ chave: 1 }, { unique: true });

    // Configuração padrão da chave Pix
    const configCollection = db.collection('configuracoes');
    const pixConfig = await configCollection.findOne({ chave: 'pix_key' });
    if (!pixConfig) {
        await configCollection.insertOne({
            chave: 'pix_key',
            valor: process.env.PIX_KEY || 'b555fbe5-6b87-418b-a134-ee99157865c8',
            descricao: 'Chave Pix padrão',
            updated_at: new Date()
        });
    }

    console.log('✅ MongoDB Atlas conectado com sucesso');
    return db;
}

export function getDb() {
    if (!db) {
        throw new Error('Database não inicializado. Chame initializeDatabase() primeiro');
    }
    return db;
}

// Funções de configuração
export async function getConfig(chave) {
    const db = getDb();
    const config = await db.collection('configuracoes').findOne({ chave });
    return config?.valor || null;
}

export async function setConfig(chave, valor, descricao = null) {
    const db = getDb();
    await db.collection('configuracoes').updateOne(
        { chave },
        {
            $set: {
                valor,
                descricao: descricao || '',
                updated_at: new Date()
            },
            $setOnInsert: { chave }
        },
        { upsert: true }
    );
}

export async function getAllConfigs() {
    const db = getDb();
    return await db.collection('configuracoes').find({}).toArray();
}

// Função para estatísticas diárias
// Função para estatísticas diárias - CORRIGIDA para valores mal formatados
// export async function incrementarEstatisticasDiarias(valor) {
//     try {
//         const db = getDb();
//         const hoje = new Date().toISOString().split('T')[0];

//         // Função robusta para converter qualquer formato
//         const converterParaNumero = (val) => {
//             if (typeof val === 'number' && !isNaN(val)) return val;

//             let str = String(val);

//             // Remove todos os pontos (separadores de milhar)
//             str = str.replace(/\./g, '');

//             // Substitui vírgula por ponto
//             str = str.replace(/,/g, '.');

//             // Extrai o número
//             const match = str.match(/-?\d+(?:\.\d+)?/);
//             if (!match) return 0;

//             const numero = parseFloat(match[0]);
//             return isNaN(numero) ? 0 : numero;
//         };

//         const valorNumerico = converterParaNumero(valor);

//         console.log(`[Debug] Valor original: ${valor}`);
//         console.log(`[Debug] Valor convertido: ${valorNumerico}`);

//         // Verificar se é um número válido e razoável
//         if (isNaN(valorNumerico) || !isFinite(valorNumerico)) {
//             console.error(`Valor inválido: ${valor}`);
//             return;
//         }

//         await db.collection('estatisticas_diarias').updateOne(
//             { data: hoje },
//             {
//                 $inc: {
//                     total_pagamentos: 1,
//                     valor_total: valorNumerico
//                 },
//                 $set: { updated_at: new Date() }
//             },
//             { upsert: true }
//         );

//         console.log(`✅ Estatísticas atualizadas: +${valorNumerico} na data ${hoje}`);

//     } catch (error) {
//         console.error('Erro ao incrementar estatísticas:', error);
//     }
// }




export async function incrementarEstatisticasDiarias(valor, gateway = 'pix_proprio') {
    try {
        const db = getDb();
        const TIMEZONE_BRASIL = 'America/Sao_Paulo';
        
        //  CORREÇÃO: Usar data do Brasil
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