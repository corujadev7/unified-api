class StandardResponse{
    constructor(success, gateway, originalResponse){
        this.success = success
        this.gateway = gateway;
        this.timestamp = new Date().toISOString();
        

        this.transactionId = null;
        this.status = null;
        this.amount = null;
        this.currency = 'BRL';
        this.paymentMethod = null;
        this.qrCode = null;
        this.pixCopiaECola = null;
        this.message = null;
        this.rawResponse = originalResponse;
    }



    static success(gateway, data, originalResponse){
        const response = new StandardResponse(true, gateway, originalResponse);
        response.transactionId = data.transactionId;
        response.status = data.status || "Approved";
        response.amount = data.amount;
        response.paymentMethod = data.paymentMethod || 'pix';
        response.qrCode = data.qrCode || null;
        response.pixCopiaECola = data.pixCopiaECola || null;
        response.message = data.message || 'Pagamento Aprovado'

        return response;
    }

    static error(gateway, errorMessage, originalResponse){
        const response = new StandardResponse(false, gateway, originalResponse)
        response.status = 'failed';
        response.message = errorMessage;

        return response;
    }

   
}

export default StandardResponse;