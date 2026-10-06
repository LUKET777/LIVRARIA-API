const livroService = require('../services/LivroService');

class LivroController {
  index(req, res, next) {
    try {
      return res.status(200).json(livroService.listarTodos());
    } catch (error) {
      next(error);
    }
  }

  show(req, res, next) {
    try {
      return res.status(200).json(livroService.buscarPorId(req.params.id));
    } catch (error) {
      next(error);
    }
  }

  store(req, res, next) {
    try {
      const novoLivro = livroService.criar(req.body);
      return res.status(201).json(novoLivro);
    } catch (error) {
      next(error);
    }
  }

  storeComment(req, res, next) {
    try {
      const comentario = livroService.adicionarComentario(req.params.id, {
        texto: (req.body || {}).texto,
        usuario: req.usuario
      });
      return res.status(201).json(comentario);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new LivroController();