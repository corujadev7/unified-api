// src/routes/configRoutes.js
import express from 'express';
import configController from '../controllers/ConfigController.js';

const router = express.Router();

// Rotas de gateway ativo
router.get('/config/active-gateway', configController.getActiveGateway);
router.post('/config/active-gateway', configController.setActiveGateway);

// Rotas de chave Pix
router.get('/config/pix-key', configController.getPixKey);
router.post('/config/pix-key', configController.updatePixKey);

// Rota para listar todas configurações
router.get('/config/all', configController.getAllConfigs);

export default router;