// services/PaymentService.js
import GatewayFactory from '../gateways/index.js';
import { getActiveGateway } from '../config/gatewayConfig.js';

class PaymentService {
    async processPayment(paymentData) {
        try {
            // Busca qual gateway o ADM escolheu na dashboard
            const activeGateway = await getActiveGateway();

            console.log(`Processando pagamento com gateway ativo: ${activeGateway}`);

            const gateway = GatewayFactory.getGateway(activeGateway);

            const result = await gateway.processPayment(paymentData);

            return result;

        } catch (error) {
            console.error('Erro no serviço de pagamento:', error);
            return {
                success: false,
                message: error.message,
                status: 'failed'
            };
        }
    }

    async verifyPaymentStatus(gatewayName, transactionId) {
        try {
            // console.log(`[PaymentService] Verificando status do pagamento: ${transactionId} no gateway: ${gatewayName}`);

            // Verifica se o gateway existe
            const gateway = GatewayFactory.getGateway(gatewayName);

            // Verifica se o gateway tem o método verifyStatus
            if (typeof gateway.verifyStatus !== 'function') {
                return {
                    status: 'not_supported',
                    message: `Gateway ${gatewayName} não suporta verificação de status`
                };
            }

            // Chama o método verifyStatus do gateway
            const result = await gateway.verifyStatus(transactionId);

            return result;

        } catch (error) {
            console.error('Erro ao verificar status:', error);
            return {
                status: 'error',
                message: error.message
            };
        }
    }
}


export default new PaymentService();