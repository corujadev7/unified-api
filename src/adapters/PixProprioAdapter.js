import StandardResponse from '../models/StandardResponse.js';

class PixProprioAdapter {
  static normalize(response, paymentData) {
    // Resposta original do Pix próprio:
    // {
    //   "data": {
    //     "txid": "ABC123",
    //     "valor": 100.00,
    //     "pixCopiaECola": "...",
    //     "qrCodeBase64": "..."
    //   },
    //   "success": true
    // }
    
    if (response.success && response.data) {
      return StandardResponse.success('pix_proprio', {
        transactionId: response.data.txid,
        status: 'pending', // Inicialmente pending, aguardando pagamento
        amount: response.data.valor,
        paymentMethod: 'pix',
        qrCode: response.data.qrCodeBase64,
        pixCopiaECola: response.data.pixCopiaECola,
        message: 'Pix gerado com sucesso, aguardando pagamento'
      }, response);
    } else {
      return StandardResponse.error('pix_proprio', 
        response.error || 'Erro ao gerar pagamento Pix', 
        response
      );
    }
  }
  
  static normalizePaymentData(paymentData) {
    // Converte o formato unificado para o formato do Pix próprio
    return {
      valor: paymentData.amount
    };
  }
}

export default PixProprioAdapter;