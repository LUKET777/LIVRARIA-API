const { Router } = require('express');
const controller = require('../controllers/LivroController');
const { autenticarToken, exigirRole } = require('../middlewares/authMiddleware');

const router = Router();

// Rotas Públicas
router.get('/', (req, res, next) => controller.index(req, res, next));
router.get('/:id', (req, res, next) => controller.show(req, res, next));

// Rota Restrita: ADMIN
router.post('/', autenticarToken, exigirRole('ADMIN'), (req, res, next) => controller.store(req, res, next));

// Rota Restrita: Usuário Autenticado
router.post('/:id/comentarios', autenticarToken, (req, res, next) => controller.storeComment(req, res, next));

module.exports = router;