import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';

import paymentRoutes from './src/routes/paymentRoutes.js';
import configRoutes from './src/routes/configRoutes.js';

import { initializeDatabase } from './src/database/database.js';

dotenv.config();

const app = express();

/*
|--------------------------------------------------------------------------
| Segurança básica
|--------------------------------------------------------------------------
*/

app.use(helmet());

app.set('trust proxy', 1);

/*
|--------------------------------------------------------------------------
| Logs
|--------------------------------------------------------------------------
*/

app.use(morgan('combined'));

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
*/

const allowedOrigins = [
   'https://viaexpressamg.top',
   'https://loboautomoveis.top'
];

const corsOptions = {
   origin: function(origin, callback){

      // Permite requests sem origin (Postman/backend)
      if(!origin) return callback(null, true);

      if(allowedOrigins.includes(origin)){
         callback(null, true);
      } else {
         callback(new Error('Origem não permitida'));
      }
   },

   methods: ['GET', 'POST', 'OPTIONS'],
   allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

/*
|--------------------------------------------------------------------------
| Limite JSON
|--------------------------------------------------------------------------
*/

app.use(express.json({
   limit:'100kb'
}));

/*
|--------------------------------------------------------------------------
| Rate Limit Global
|--------------------------------------------------------------------------
*/

const globalLimiter = rateLimit({
   windowMs: 1 * 60 * 1000,
   max: 100,
   standardHeaders: true,
   legacyHeaders: false,

   message:{
      error:'Muitas requisições'
   }
});

app.use(globalLimiter);

/*
|--------------------------------------------------------------------------
| Rate Limit pagamento
|--------------------------------------------------------------------------
*/

const paymentLimiter = rateLimit({
   windowMs: 1 * 60 * 1000,
   max: 5,

   message:{
      error:'Limite de pagamentos excedido'
   }
});

app.use('/api/pix', paymentLimiter);

/*
|--------------------------------------------------------------------------
| Middleware Auth
|--------------------------------------------------------------------------
*/

function authMiddleware(req,res,next){

   const token = req.headers.authorization;

   if(!token){
      return res.status(401).json({
         error:'Token ausente'
      });
   }

   if(token !== `Bearer ${process.env.API_TOKEN}`){
      return res.status(401).json({
         error:'Token inválido'
      });
   }

   next();
}

/*
|--------------------------------------------------------------------------
| Banco
|--------------------------------------------------------------------------
*/

await initializeDatabase();

/*
|--------------------------------------------------------------------------
| Rotas protegidas
|--------------------------------------------------------------------------
*/

app.use('/api', authMiddleware, paymentRoutes);
app.use('/api', authMiddleware, configRoutes);

/*
|--------------------------------------------------------------------------
| Health Check
|--------------------------------------------------------------------------
*/

app.get('/', (req,res)=>{
   res.json({
      status:'online'
   });
});

/*
|--------------------------------------------------------------------------
| Start
|--------------------------------------------------------------------------
*/

const PORT = process.env.PORT || 5004;

app.listen(PORT, () => {

   console.log(`🚀 API Unificada rodando na porta ${PORT}`);

});