const authService = require('../services/AuthService');

class AuthController {
  async register(req, res, next) {
    try {
      const usuario = await authService.registrar(req.body);
      return res.status(201).json(usuario);
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const resposta = await authService.login(req.body);
      return res.status(200).json(resposta);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();