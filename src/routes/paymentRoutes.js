import express from 'express';
import paymentController from '../controllers/PaymentController.js';

const router = express.Router();

// Rotas principais
router.post('/payment/process', paymentController.processPayment);
router.get('/gateways', paymentController.getGateways);
router.get('/payment/status/:gateway/:transactionId', paymentController.verifyPaymentStatus);

// Rotas específicas do Pix Próprio (para manter compatibilidade com dashboard existente)
router.get('/payments', paymentController.getPayments);
router.get('/payment/:txid', paymentController.getPaymentByTxid);
router.get('/payment-stats', paymentController.getStats);

// Health check
router.get('/healthy', (req, res) => {
    res.json({
        success: true,
        message: "API Unificada de Pagamentos - Online",
        version: "1.0.0",
        gateways: ['velana', 'pix_proprio']
    });
});

export default router;