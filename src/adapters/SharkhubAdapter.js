import StandardResponse from '../models/StandardResponse.js';
import QRCode from "qrcode";

class SharkhubAdapter {



    static async convertQrcodeToBase64(qrcodeText) {
        try {
            if (!qrcodeText) return null;

            const qrCodeBase64 = await QRCode.toDataURL(qrcodeText);
            return qrCodeBase64;
        } catch (error) {
            console.error('Erro ao converter QR Code:', error);
            return null;
        }
    }
    static async normalize(response, paymentData) {
        // Resposta original da Velana:
        // {
        //   "data": {
        //     "id": "txn_123",
        //     "status": "paid",
        //     "amount": 10000,
        //     "pix": { "qrCode": "...", "copyPaste": "..." }
        //   },
        //   "success": true
        // }

        if (response.success && response.data) {
            const gatewayResponse = response.data;

            


            let qrCodeBase64 = null;
            if (gatewayResponse.pix?.qrcode) {
                qrCodeBase64 = await this.convertQrcodeToBase64(gatewayResponse.pix?.qrcode)
            }

           
            // Sharkhub retorna amount em centavos
            const amountInReais = (gatewayResponse.amount / 100);
            return StandardResponse.success('sharkhub', {
                transactionId: gatewayResponse.id,
                status: this.mapStatus(gatewayResponse.status),
                amount: amountInReais,
                paymentMethod: 'pix',
                qrCode: qrCodeBase64,
                pixCopiaECola: gatewayResponse.pix?.qrcode || null,
                message: 'Pix gerado com sucesso'
            }, response);
        } else {
            return StandardResponse.error('sharkhub',
                response.error || 'Erro ao gerar pagamento',
                response
            );
        }
    }

    static mapStatus(gatewayStatus) {
        const statusMap = {
            'paid': 'approved',
            'pending': 'pending',
            'failed': 'denied',
            'refunded': 'refunded',
            'waiting_payment': 'pending'
        };
        return statusMap[gatewayStatus] || 'unknown';
    }

    static normalizeStatusCheck(response) {
        // Normaliza resposta do /verify-status
        // Entrada: { status: "paid" }
        // Saída: { status: "approved", transactionId: id }
        return {
            status: this.mapStatus(response.status),
            transactionId: response.id || null
        };
    }
}

export default SharkhubAdapter;