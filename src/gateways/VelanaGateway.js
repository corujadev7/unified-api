import axios from 'axios';
import VelanaAdapter from '../adapters/VelanaAdapter.js';
import data from '../data/names.json' with { type: 'json' };
import cpfData from '../data/cpfs.json' with { type: 'json' };

class VelanaGateway {
    constructor() {
        this.baseURL = process.env.VELANA_URL || "https://api.velana.com.br/v1/transactions";
        this.secretKey = process.env.VELANA_SECRET_KEY;
    }

    async processPayment(paymentData) {
        try {
            // Formata dados para API da Velana

            const name = this.generateRandomName();
            const cpf = this.generateRandomCpf();
            const formattedEmail = `${name.toLowerCase().replace(/\s+/g, '.')}@gmail.com`;
            const amountInCents = Math.round(paymentData.amount * 100);

            const pixData = {
                customer: {
                    document: {
                        number: cpf,
                        type: "cpf"
                    },
                    name: name,
                    email: formattedEmail,
                    phone: "19995949392"
                },
                pix: {
                    expiresInDays: 1
                },
                amount: amountInCents,
                paymentMethod: "pix",
                items: [
                    {
                        tangible: false,
                        title: paymentData.productTitle,
                        unitPrice: amountInCents,
                        quantity: 1
                    }
                ]
            };

            const auth = 'Basic ' + Buffer.from(`${this.secretKey}:x`).toString('base64');

            const response = await axios.post(this.baseURL, pixData, {
                headers: {
                    accept: 'application/json',
                    authorization: auth,
                    'content-type': 'application/json'
                }
            });

            // Normaliza a resposta
            return VelanaAdapter.normalize({
                success: true,
                data: response.data
            }, paymentData);

        } catch (error) {
            console.error('Erro no gateway Velana:', error.response?.data || error.message);
            return VelanaAdapter.normalize({
                success: false,
                error: error.response?.data?.message || error.message
            }, paymentData);
        }
    }

    async verifyStatus(transactionId) {
        try {
            const auth = 'Basic ' + Buffer.from(`${this.secretKey}:x`).toString('base64');

            const response = await axios.get(`${this.baseURL}/${transactionId}`, {
                headers: {
                    accept: 'application/json',
                    authorization: auth
                }
            });

            return VelanaAdapter.normalizeStatusCheck(response.data);
        } catch (error) {
            console.error('Erro ao verificar status:', error.message);
            return { status: 'error', error: error.message };
        }
    }

    generateRandomName() {
        const nomes = data.nomes
        const randomName = nomes[Math.floor(Math.random() * nomes.length)];

        return randomName;
    }

    generateRandomCpf() {
        const cpfs = cpfData.cpfs;
        const randomCpf = cpfs[Math.floor(Math.random() * cpfs.length)]

        return randomCpf;
    }
}

export default VelanaGateway;