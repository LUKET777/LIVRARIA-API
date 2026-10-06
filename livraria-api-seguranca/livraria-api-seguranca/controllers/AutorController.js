const autorService = require('../services/AutorService');

class AutorController {
  index(req, res, next) {
    try {
      return res.status(200).json(autorService.listarTodos());
    } catch (error) {
      next(error);
    }
  }

  store(req, res, next) {
    try {
      const novoAutor = autorService.criar(req.body);
      return res.status(201).json(novoAutor);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AutorController();