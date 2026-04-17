import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import paymentRoutes from './src/routes/paymentRoutes.js';
import configRoutes from './src/routes/configRoutes.js';  
import { initializeDatabase } from './src/database/database.js';

dotenv.config();

const app = express();

const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
};

app.use(cors(corsOptions));
app.use(express.json());

// Inicializar banco de dados (para Pix Próprio)
await initializeDatabase();

// Rotas
app.use('/api', paymentRoutes);
app.use('/api', configRoutes); 

const PORT = process.env.PORT || 5004;

app.listen(PORT, () => {
    console.log(`🚀 API Unificada de Pagamentos rodando na porta ${PORT}`);
    console.log(`📋 Gateways disponíveis: velana, pix_proprio`);
});