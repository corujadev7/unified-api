import axios from 'axios';
import data from '../data/names.json' with { type: 'json' };
import cpfData from '../data/cpfs.json' with { type: 'json' };
import AnubisAdapter from '../adapters/AnubisAdapter.js';

class AnubisGateway {
    constructor() {
        this.baseURL = process.env.ANUBIS_URL || "https://api.anubispay.com/v1/payment-transaction/";
        this.secretKey = process.env.ANUBIS_SECRET_KEY;
        this.publicKey = process.env.ANUBIS_PUBLIC_KEY;
    }

    async processPayment(paymentData) {
        try {
            // Formata dados para API da Sharkhub

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
                payment_method: "pix",
                items: [
                    {
                        tangible: false,
                        title: paymentData.productTitle,
                        unit_price: amountInCents,
                        quantity: 1
                    }
                ],
                metadata: {provider_name: 'myself'}
            };

            const auth = 'Basic ' + Buffer.from(`${this.publicKey}:${this.secretKey}`).toString('base64');

            const response = await axios.post(`${this.baseURL}/create`, pixData, {
                headers: {
                    accept: 'application/json',
                    authorization: auth,
                    'content-type': 'application/json'
                }
            });

            // Normaliza a resposta
            return AnubisAdapter.normalize({
                success: true,
                data: response.data
            }, paymentData);

        } catch (error) {
            console.error('Erro no gateway Anubis:', error.response?.data || error.message);
            return AnubisAdapter.normalize({
                success: false,
                error: error.response?.data?.message || error.message
            }, paymentData);
        }
    }

    async verifyStatus(transactionId) {
        try {
            const auth = 'Basic ' + Buffer.from(`${this.publicKey}:${this.secretKey}`).toString('base64');

            const response = await axios.get(`${this.baseURL}/info/${transactionId}`, {
                headers: {
                    accept: 'application/json',
                    authorization: auth
                }
            });

            const data = response.data.data

            

            return AnubisAdapter.normalizeStatusCheck(data);
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

export default AnubisGateway