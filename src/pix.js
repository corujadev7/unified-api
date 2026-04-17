import { payload } from "pix-payload";
import QRCode from "qrcode";

export async function gerarPix({
    valor,
    chavePix,
    txid = "PEDIDO123"
}) {

    const newValue = parseFloat(valor)
    const data = {
        key: `${chavePix}`,
        name: "Free Flow",
        city: "Sao Paulo",
        amount: newValue,
        transactionId: "PAY123",
    }

    const pixCopiaECola = payload(data)


    const qrCodeBase64 = await QRCode.toDataURL(pixCopiaECola);

    return {
        txid,
        valor: valor || null,
        pixCopiaECola,
        qrCodeBase64,
    };
}