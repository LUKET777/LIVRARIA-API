// Testes de integração da camada de segurança (node:test, sem dependências extras)
const path = require('path');
const fs = require('fs');
const os = require('os');

const dbTemp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'livraria-')), 'database.test.txt');
process.env.DB_PATH = dbTemp;
process.env.JWT_SECRET = process.env.JWT_SECRET || 'segredo-de-teste-com-mais-de-trinta-e-dois-caracteres';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const app = require('../server');

let server, base;
const api = async (metodo, rota, { corpo, token } = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(base + rota, { method: metodo, headers, body: corpo ? JSON.stringify(corpo) : undefined });
  return { status: res.status, dados: await res.json() };
};
const login = async (email, senha) => (await api('POST', '/auth/login', { corpo: { email, senha } })).dados.token;

before(async () => {
  server = app.listen(0);
  await new Promise(r => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api/v1`;
});
after(() => { server.close(); fs.rmSync(path.dirname(dbTemp), { recursive: true, force: true }); });

test('GET /livros e /livros/:id são públicos (200)', async () => {
  assert.equal((await api('GET', '/livros')).status, 200);
  assert.equal((await api('GET', '/livros/1')).status, 200);
});

test('Login do admin e do leitor retorna 200 + JWT com role correta', async () => {
  const a = await api('POST', '/auth/login', { corpo: { email: 'admin@livraria.com', senha: 'admin123' } });
  assert.equal(a.status, 200);
  assert.equal(jwt.decode(a.dados.token).role, 'ADMIN');
  const l = await api('POST', '/auth/login', { corpo: { email: 'leitor@gmail.com', senha: 'leitor123' } });
  assert.equal(l.status, 200);
  assert.equal(jwt.decode(l.dados.token).role, 'USER');
});

test('Login com senha errada ou e-mail inexistente retorna 401', async () => {
  assert.equal((await api('POST', '/auth/login', { corpo: { email: 'admin@livraria.com', senha: 'errada' } })).status, 401);
  assert.equal((await api('POST', '/auth/login', { corpo: { email: 'naoexiste@x.com', senha: 'x' } })).status, 401);
});

test('Register retorna 201, grava hash BCrypt e ignora role enviada', async () => {
  const r = await api('POST', '/auth/register', { corpo: { nome: 'Novo', email: 'novo@x.com', senha: 'segredo1', role: 'ADMIN' } });
  assert.equal(r.status, 201);
  assert.equal(r.dados.role, 'USER');
  assert.equal(r.dados.senha_hash, undefined);
  const db = JSON.parse(fs.readFileSync(dbTemp, 'utf-8'));
  const salvo = db.usuarios.find(u => u.email === 'novo@x.com');
  assert.match(salvo.senha_hash, /^\$2[aby]\$10\$/);
  assert.notEqual(salvo.senha_hash, 'segredo1');
  assert.equal((await api('POST', '/auth/register', { corpo: { nome: 'Novo', email: 'novo@x.com', senha: 'x' } })).status, 409);
});

test('POST /livros/:id/comentarios: 401 anônimo, 201 para USER e ADMIN', async () => {
  assert.equal((await api('POST', '/livros/1/comentarios', { corpo: { texto: 'oi' } })).status, 401);
  const leitor = await login('leitor@gmail.com', 'leitor123');
  const r = await api('POST', '/livros/1/comentarios', { corpo: { texto: 'Ótimo!' }, token: leitor });
  assert.equal(r.status, 201);
  assert.equal(r.dados.autor_comentario, 'Leitor');
  const admin = await login('admin@livraria.com', 'admin123');
  assert.equal((await api('POST', '/livros/1/comentarios', { corpo: { texto: 'Concordo' }, token: admin })).status, 201);
});

test('POST /autores e POST /livros: 401 anônimo, 403 USER, 201 ADMIN', async () => {
  const leitor = await login('leitor@gmail.com', 'leitor123');
  const admin = await login('admin@livraria.com', 'admin123');

  assert.equal((await api('POST', '/autores', { corpo: { nome: 'X' } })).status, 401);
  assert.equal((await api('POST', '/autores', { corpo: { nome: 'X' }, token: leitor })).status, 403);
  const autor = await api('POST', '/autores', { corpo: { nome: 'Clarice Lispector' }, token: admin });
  assert.equal(autor.status, 201);

  const livro = { titulo: 'A Hora da Estrela', ano: 1977, autor_id: autor.dados.id };
  assert.equal((await api('POST', '/livros', { corpo: livro })).status, 401);
  assert.equal((await api('POST', '/livros', { corpo: livro, token: leitor })).status, 403);
  assert.equal((await api('POST', '/livros', { corpo: livro, token: admin })).status, 201);
});

test('Tokens inválidos, adulterados, expirados ou sem "Bearer" retornam 401', async () => {
  const corpo = { nome: 'X' };
  const forjado = jwt.sign({ role: 'ADMIN', nome: 'Hacker' }, 'outro-segredo', { subject: '99' });
  const expirado = jwt.sign({ role: 'ADMIN', nome: 'A' }, process.env.JWT_SECRET, { subject: '1', expiresIn: -10 });
  const semAssinatura = jwt.sign({ role: 'ADMIN' }, null, { algorithm: 'none' });
  for (const token of ['null', 'abc.def.ghi', forjado, expirado, semAssinatura]) {
    assert.equal((await api('POST', '/autores', { corpo, token })).status, 401, `token: ${token}`);
  }
  const admin = await login('admin@livraria.com', 'admin123');
  const r = await fetch(base + '/autores', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: admin }, body: JSON.stringify(corpo) });
  assert.equal(r.status, 401);
});
