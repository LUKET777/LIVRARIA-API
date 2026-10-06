const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_ALGORITHM } = require('../config/auth');

/**
 * Autenticação stateless: exige o header "Authorization: Bearer <token>",
 * valida assinatura + expiração do JWT e injeta o usuário em req.usuario.
 */
function autenticarToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({ erro: "Token de autenticação não fornecido." });
  }

  const [esquema, token] = authHeader.split(' ');
  if (esquema !== 'Bearer' || !token) {
    return res.status(401).json({ erro: "Formato inválido. Use: Authorization: Bearer <token>." });
  }

  try {
    // algorithms fixado evita ataques de troca de algoritmo (ex.: "alg": "none")
    const payload = jwt.verify(token, JWT_SECRET, { algorithms: [JWT_ALGORITHM] });
    req.usuario = { id: payload.sub, nome: payload.nome, role: payload.role };
    return next();
  } catch (err) {
    const mensagem = err.name === 'TokenExpiredError'
      ? "Token expirado. Faça login novamente."
      : "Token inválido.";
    return res.status(401).json({ erro: mensagem });
  }
}

/**
 * RBAC: libera a rota apenas para os perfis informados.
 * Sem usuário autenticado -> 401; perfil sem permissão -> 403.
 */
function exigirRole(...rolesPermitidas) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ erro: "Usuário não autenticado." });
    }
    if (!rolesPermitidas.includes(req.usuario.role)) {
      return res.status(403).json({ erro: `Acesso proibido: privilégio de ${rolesPermitidas.join(' ou ')} exigido.` });
    }
    next();
  };
}

module.exports = { autenticarToken, exigirRole };
