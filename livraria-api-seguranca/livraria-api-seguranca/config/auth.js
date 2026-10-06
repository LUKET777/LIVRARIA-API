require('dotenv').config({ quiet: true });

// Configurações centrais de segurança (lidas do .env)
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  // Falha rápida: nunca subir a API com segredo ausente ou fraco
  throw new Error('JWT_SECRET ausente ou muito curto (mínimo 32 caracteres). Configure o arquivo .env.');
}

module.exports = {
  JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1h',
  JWT_ALGORITHM: 'HS256',
  BCRYPT_SALT_ROUNDS: Number(process.env.BCRYPT_SALT_ROUNDS) || 10
};
