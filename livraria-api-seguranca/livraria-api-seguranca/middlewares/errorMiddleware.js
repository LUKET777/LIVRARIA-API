function errorHandler(err, req, res, next) {
  const statusCode = err.status || 500;
  const mensagem = err.message || "Ocorreu um erro interno no servidor.";

  return res.status(statusCode).json({
    erro: mensagem
  });
}

module.exports = errorHandler;