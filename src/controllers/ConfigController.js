// src/controllers/ConfigController.js
import { getActiveGateway, setActiveGateway } from '../config/gatewayConfig.js';
import { getConfig, setConfig, getAllConfigs } from '../database/database.js';
import GatewayFactory from '../gateways/index.js';

class ConfigController {

    // Rota existente: GET /api/config/active-gateway
    async getActiveGateway(req, res) {
        try {
            const activeGateway = await getActiveGateway();
            const gateways = GatewayFactory.getAvailableGateways();

            console.log('GET /config/active-gateway - Ativo:', activeGateway);

            return res.json({
                success: true,
                active_gateway: activeGateway,
                available_gateways: gateways
            });
        } catch (error) {
            console.error('Erro em getActiveGateway:', error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // Rota existente: POST /api/config/active-gateway
    async setActiveGateway(req, res) {
        try {
            const { gateway } = req.body;

            console.log('POST /config/active-gateway - Gateway solicitado:', gateway);

            const availableGateways = GatewayFactory.getAvailableGateways();
            const isValid = availableGateways.some(g => g.id === gateway);

            if (!isValid) {
                return res.status(400).json({
                    success: false,
                    message: `Gateway inválido. Use: ${availableGateways.map(g => g.id).join(', ')}`
                });
            }

            await setActiveGateway(gateway);

            console.log('Gateway alterado para:', gateway);

            return res.json({
                success: true,
                message: `Gateway alterado para: ${gateway}`,
                active_gateway: gateway
            });
        } catch (error) {
            console.error('Erro em setActiveGateway:', error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }

    // NOVA ROTA: GET /api/config/pix-key
    async getPixKey(req, res) {
        try {
            const chavePix = await getConfig('pix_key');

            return res.json({
                success: true,
                chave_pix: chavePix
            });
        } catch (error) {
            console.error('Erro ao buscar chave Pix:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // NOVA ROTA: POST /api/config/pix-key
    async updatePixKey(req, res) {
        try {
            const { chave_pix } = req.body;

            if (!chave_pix || chave_pix.trim() === '') {
                return res.status(400).json({
                    success: false,
                    error: "Chave Pix é obrigatória"
                });
            }

            await setConfig('pix_key', chave_pix, 'Chave Pix configurada via dashboard');

            console.log('Chave Pix atualizada:', chave_pix);

            return res.json({
                success: true,
                message: "Chave Pix atualizada com sucesso",
                chave_pix: chave_pix
            });
        } catch (error) {
            console.error('Erro ao atualizar chave Pix:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }

    // NOVA ROTA: GET /api/config/all
    async getAllConfigs(req, res) {
        try {
            const configs = await getAllConfigs();

            return res.json({
                success: true,
                configs: configs
            });
        } catch (error) {
            console.error('Erro ao listar configurações:', error);
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}

export default new ConfigController();