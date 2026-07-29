import StandardResponse from '../models/StandardResponse.js';
import QRCode from "qrcode";

class AnubisAdapter {



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
        // Resposta original da Anubis:
        //     {
        //   "data": {
        //     "id": "e3899e96feb74216a96cfe2bc190c420",
        //     "amount": 120,
        //     "installments": 0,
        //     "payment_method": "pix",
        //     "status": "PENDING",
        //     "postback_url": null,
        //     "card": null,
        //     "boleto": null,
        //     "pix": {
        //       "qr_code": "00020101021126950014br.gov.bcb.pix01368a6ec374-9a5c-474f-9f90-3316279c65ec0233Pagamento via PIX - #N2RVOEO8Z7KZ52040000530398654041.205802BR5925MARKETPLACE FULL SERVICES6009SAO PAULO62290525htnprobpwuckm7bjurw2ckgek63049CA1",
        //       "url": null,
        //       "expiration_date": "2026-05-25T22:55:36.1484232+00:00",
        //       "e2_e": null
        //     }
        //   },
        //   "success": true,
        //   "return_message_type": 201,
        //   "error_messages": [],
        //   "inner_exception": null
        // }

        if (response.success && response.data) {
            const gatewayResponse = response.data.data;




            let qrCodeBase64 = null;
            if (gatewayResponse.pix?.qr_code) {
                qrCodeBase64 = await this.convertQrcodeToBase64(gatewayResponse.pix?.qr_code)
            }




            // Sharkhub retorna amount em centavos
            const amountInReais = (gatewayResponse.amount / 100);
            return StandardResponse.success('anubis', {
                transactionId: gatewayResponse.id,
                status: this.mapStatus(gatewayResponse.status),
                amount: amountInReais,
                paymentMethod: 'pix',
                qrCode: qrCodeBase64,
                pixCopiaECola: gatewayResponse.pix?.qr_code || null,
                message: 'Pix gerado com sucesso'
            }, response);
        } else {
            return StandardResponse.error('anubis',
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
            'PENDING': 'pending',
            'PAID':'paid',
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

export default AnubisAdapter;