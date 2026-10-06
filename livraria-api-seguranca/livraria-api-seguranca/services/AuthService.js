const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const repository = require('../repositories/LivrariaRepository');
const { JWT_SECRET, JWT_EXPIRES_IN, JWT_ALGORITHM, BCRYPT_SALT_ROUNDS } = require('../config/auth');

// Hash fictício usado quando o e-mail não existe, para que a resposta leve
// o mesmo tempo de um login real (evita enumeração de usuários por timing).
const HASH_FICTICIO = bcrypt.hashSync('senha-ficticia-para-timing', BCRYPT_SALT_ROUNDS);

class AuthService {
  async registrar({ nome, email, senha } = {}) {
    if (!nome || !email || !senha) {
      throw { status: 400, message: "Campos obrigatórios ausentes: nome, email ou senha." };
    }

    const emailNormalizado = String(email).trim().toLowerCase();

    const usuarioExistente = repository.buscarUsuarioPorEmail(emailNormalizado);
    if (usuarioExistente) {
      throw { status: 409, message: "E-mail já cadastrado no sistema." };
    }

    // BCrypt: gera salt aleatório e aplica o work factor (custo 2^rounds)
    const senha_hash = await bcrypt.hash(String(senha), BCRYPT_SALT_ROUNDS);

    // Segurança: o cadastro público SEMPRE cria perfil USER.
    // Qualquer "role" enviada no corpo é ignorada (impede escalonamento de privilégio).
    const novoUsuario = repository.salvarUsuario({
      nome: String(nome).trim(),
      email: emailNormalizado,
      senha_hash,
      role: "USER"
    });

    const { senha_hash: _, ...usuarioRetorno } = novoUsuario;
    return usuarioRetorno;
  }

  async login({ email, senha } = {}) {
    if (!email || !senha) {
      throw { status: 400, message: "E-mail e senha são obrigatórios." };
    }

    const usuario = repository.buscarUsuarioPorEmail(String(email).trim().toLowerCase());

    // Compara sempre (mesmo sem usuário) para manter tempo de resposta constante
    const senhaConfere = await bcrypt.compare(String(senha), usuario ? usuario.senha_hash : HASH_FICTICIO);

    if (!usuario || !senhaConfere) {
      // Mensagem genérica: não revela se o erro foi no e-mail ou na senha
      throw { status: 401, message: "Credenciais inválidas." };
    }

    const token = jwt.sign(
      { nome: usuario.nome, role: usuario.role },
      JWT_SECRET,
      { subject: String(usuario.id), expiresIn: JWT_EXPIRES_IN, algorithm: JWT_ALGORITHM }
    );

    return {
      usuario: { id: usuario.id, nome: usuario.nome, role: usuario.role },
      token
    };
  }
}

module.exports = new AuthService();
