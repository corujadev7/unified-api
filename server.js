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

app.use(helmet());

app.use(morgan('combined'));

app.set('trust proxy', 1);

app.use(express.json({
   limit:'100kb'
}));

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
*/

app.use(cors({
   origin:false
}));

/*
|--------------------------------------------------------------------------
| RATE LIMIT
|--------------------------------------------------------------------------
*/

const limiter = rateLimit({
   windowMs: 1 * 60 * 1000,
   max: 10,

   message:{
      error:'Muitas requisições'
   }
});

app.use(limiter);

/*
|--------------------------------------------------------------------------
| AUTH MIDDLEWARE
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
| DATABASE
|--------------------------------------------------------------------------
*/

await initializeDatabase();

/*
|--------------------------------------------------------------------------
| ROTAS
|--------------------------------------------------------------------------
*/

app.use('/api', authMiddleware, paymentRoutes);
app.use('/api', authMiddleware, configRoutes);

/*
|--------------------------------------------------------------------------
| HEALTH CHECK
|--------------------------------------------------------------------------
*/

app.get('/', (req,res)=>{
   res.json({
      status:'online'
   });
});

const PORT = process.env.PORT || 5004;

app.listen(PORT, () => {
   console.log(`🚀 API PIX rodando na porta ${PORT}`);
});