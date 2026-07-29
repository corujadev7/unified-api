import VelanaGateway from './VelanaGateway.js';
import PixProprioGateway from './PixProprioGateway.js';
import SharkhubGateway from './SharkhubGateway.js';
import AproveiPayGateway from './AproveiPayGateway.js';
import AnubisGateway from './AnubisGateway.js';
class GatewayFactory {
    static getGateway(gatewayName) {
        switch (gatewayName) {
            case 'sharkhub':
                return new SharkhubGateway();
            case 'velana':
                return new VelanaGateway();
            case 'aprovei_pay':
                return new AproveiPayGateway();
            case 'anubis':
                return new AnubisGateway();
            case 'pix_proprio':
                return new PixProprioGateway();
            default:
                throw new Error(`Gateway ${gatewayName} não suportado. Use: velana ou pix_proprio`);
        }
    }

    static getAvailableGateways() {
        return [
            { id: 'velana', name: 'Velana (API Externa)', type: 'pix' },
            { id: 'sharkhub', name: 'Sharkhub (API Externa)', type: 'pix' },
            { id: 'aprovei_pay', name: 'Aprovei Pay (API Externa)', type: 'pix' },
            { id: 'anubis', name: 'Anubis (API Externa)', type: 'pix' },
            { id: 'pix_proprio', name: 'Pix Próprio (Dashboard)', type: 'pix' }
        ];
    }
}

export default GatewayFactory;