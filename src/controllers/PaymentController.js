import paymentService from '../services/PaymentService.js';
import statisticsService from '../services/StatisticsService.js';
import GatewayFactory from '../gateways/index.js';
import PixProprioGateway from '../gateways/PixProprioGateway.js';

class PaymentController {
  async processPayment(req, res) {
    try {
      const { amount, productTitle } = req.body;

      // Validação: só precisa do valor, NÃO precisa do gateway
      if (!amount || amount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Valor do pagamento é obrigatório e deve ser maior que zero',
          status: 'failed'
        });
      }

      // O gateway é definido pelo ADM na dashboard, não pelo frontend
      const result = await paymentService.processPayment({ amount, productTitle });

      return res.status(result.success ? 200 : 400).json(result);

    } catch (error) {
      console.error('Erro em processPayment:', error);
      return res.status(500).json({
        success: false,
        message: error.message,
        status: 'error',
        timestamp: new Date().toISOString()
      });
    }
  }

  // async processPayment(req, res) {
  //   try {
  //     const { gateway, amount } = req.body;

  //     // Validações
  //     if (!gateway) {
  //       return res.status(400).json({
  //         success: false,
  //         message: 'Gateway é obrigatório. Escolha: velana ou pix_proprio',
  //         status: 'failed'
  //       });
  //     }

  //     if (!amount || amount <= 0) {
  //       return res.status(400).json({
  //         success: false,
  //         message: 'Valor do pagamento é obrigatório e deve ser maior que zero',
  //         status: 'failed'
  //       });
  //     }

  //     const result = await paymentService.processPayment(gateway, { amount });

  //     return res.status(result.success ? 200 : 400).json(result);

  //   } catch (error) {
  //     return res.status(500).json({
  //       success: false,
  //       message: error.message,
  //       status: 'error',
  //       timestamp: new Date().toISOString()
  //     });
  //   }
  // }

  async getGateways(req, res) {
    try {
      const gateways = GatewayFactory.getAvailableGateways();
      return res.json({
        success: true,
        gateways: gateways
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async verifyPaymentStatus(req, res) {
    try {
      const { gateway, transactionId } = req.params;

      const result = await paymentService.verifyPaymentStatus(gateway, transactionId);

      return res.json({
        success: true,
        ...result
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Endpoints específicos do Pix Próprio (para compatibilidade com dashboard existente)
  async getPayments(req, res) {
    try {
      const pixGateway = new PixProprioGateway();
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const search = req.query.search || '';

      const result = await pixGateway.getAllPayments(page, limit, search);

      return res.json({
        success: true,
        data: result.payments,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          pages: result.pages
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getPaymentByTxid(req, res) {
    try {
      const { txid } = req.params;
      const pixGateway = new PixProprioGateway();
      const payment = await pixGateway.getPayment(txid);

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Pagamento não encontrado'
        });
      }

      return res.json({
        success: true,
        data: payment
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // async getStats(req, res) {
  //   try {
  //     const pixGateway = new PixProprioGateway();
  //     const stats = await pixGateway.getStats();

  //     console.log(stats)

  //     return res.json({
  //       success: true,
  //       data: stats
  //     });
  //   } catch (error) {
  //     return res.status(500).json({
  //       success: false,
  //       message: error.message
  //     });
  //   }
  // }
  async getStats(req, res) {
    try {
      const { gateway } = req.query;

      // Usa o service para buscar as estatísticas
      const stats = await statisticsService.getEstatisticasCompletas(gateway);

      return res.json({
        success: true,
        data: stats,
        gateway_filtrado: gateway || 'todos'
      });

    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

}

export default new PaymentController();