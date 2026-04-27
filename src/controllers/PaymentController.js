import paymentService from '../services/PaymentService.js';
import StatisticsService from '../services/StatisticsService.js';
import GatewayFactory from '../gateways/index.js';
import PixProprioGateway from '../gateways/PixProprioGateway.js';
import { getDb } from '../database/database.js';

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
      const { gateway, startDate, endDate } = req.query;

      console.log('Filtros:', { gateway, startDate, endDate });

      const stats = await StatisticsService.getEstatisticasCompletas(gateway, startDate, endDate);

      return res.json({
        success: true,
        data: stats,
        filtros: {
          gateway: gateway || 'todos',
          startDate: startDate || null,
          endDate: endDate || null
        }
      });

    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // Listagem de pagamentos com filtro de datas
  async getPayments(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;
      const search = req.query.search || '';
      const gateway = req.query.gateway;
      const startDate = req.query.startDate;
      const endDate = req.query.endDate;
      const skip = (page - 1) * limit;

      const db = getDb();

      let filter = {};

      // Filtro de gateway
      if (gateway === 'velana') {
        filter.gateway = 'velana';
      }

      // Filtro de datas
      if (startDate || endDate) {
        filter.data_criacao = {};
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0, 0, 0, 0);
          filter.data_criacao.$gte = start;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          filter.data_criacao.$lte = end;
        }
      }

      // Busca por TXID
      if (search) {
        filter.txid = { $regex: search, $options: 'i' };
      }

      const payments = await db.collection('pagamentos')
        .find(filter)
        .sort({ data_criacao: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      const total = await db.collection('pagamentos').countDocuments(filter);

      return res.json({
        success: true,
        data: payments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        filtros: {
          gateway: gateway || 'todos',
          startDate: startDate || null,
          endDate: endDate || null
        }
      });

    } catch (error) {
      console.error('Erro ao listar pagamentos:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

}

export default new PaymentController();