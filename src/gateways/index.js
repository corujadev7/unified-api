import VelanaGateway from './VelanaGateway.js';
import PixProprioGateway from './PixProprioGateway.js';
import SharkhubGateway from './SharkhubGateway.js';
class GatewayFactory {
    static getGateway(gatewayName) {
        switch (gatewayName) {
            case 'sharkhub':
                return new SharkhubGateway();
            case 'velana':
                return new VelanaGateway();
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
            { id: 'pix_proprio', name: 'Pix Próprio (Dashboard)', type: 'pix' }
        ];
    }
}

export default GatewayFactory;