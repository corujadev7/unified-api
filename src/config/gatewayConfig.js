// config/gatewayConfig.js
import { getDb } from '../database/database.js';

export async function getActiveGateway() {
    const db = getDb();
    const config = await db.collection('configuracoes').findOne({ chave: 'active_gateway' });
    return config?.valor || 'pix_proprio'; // padrão
}

export async function setActiveGateway(gateway) {
    const db = getDb();
    await db.collection('configuracoes').updateOne(
        { chave: 'active_gateway' },
        { 
            $set: { 
                valor: gateway,
                updated_at: new Date(),
                updated_by: 'admin'
            }
        },
        { upsert: true }
    );
}