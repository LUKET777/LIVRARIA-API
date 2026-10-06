const fs = require('fs');
const path = require('path');

class LivrariaRepository {
  constructor() {
    // Garante que o arquivo fique na raiz do projeto (onde o server.js roda)
    // DB_PATH permite isolar o banco nos testes automatizados
    this.dbPath = path.resolve(process.cwd(), process.env.DB_PATH || 'database.txt');
    this._garantirArquivoInicial();
    this._migrarHashesLegados();
  }

  _obterDadosPadrao() {
    return {
      usuarios: [
        { id: 1, nome: "Admin", email: "admin@livraria.com", senha_hash: "$2b$10$OL.zNXsZTmibKyPNUXIVB.lgooq77WIm8nK6Jrtr8GxJIJFwYAVwm", role: "ADMIN" },
        { id: 2, nome: "Leitor", email: "leitor@gmail.com", senha_hash: "$2b$10$4TNGR/FKcBl4aZXPkP1KPekHw6vyLgS7Rpm/fQ5M40ukDHNsirkjG", role: "USER" }
      ],
      autores: [
        { id: 1, nome: "Machado de Assis", nacionalidade: "Brasileiro" }
      ],
      livros: [
        {
          id: 1,
          titulo: "Dom Casmurro",
          ano: 1899,
          autor_id: 1,
          comentarios: [
            { id: 1, autor_nome: "Leitor", texto: "Clássico indispensável." }
          ]
        }
      ]
    };
  }

  _garantirArquivoInicial() {
    try {
      if (!fs.existsSync(this.dbPath)) {
        this.salvar(this._obterDadosPadrao());
      } else {
        const conteudo = fs.readFileSync(this.dbPath, 'utf-8').trim();
        if (!conteudo) {
          this.salvar(this._obterDadosPadrao());
        }
      }
    } catch (err) {
      console.error("Erro ao inicializar database.txt:", err);
    }
  }

  // Bancos criados pela versão antiga guardavam um hash BCrypt fictício para os
  // usuários-semente. Aqui ele é trocado pelo hash real (admin123 / leitor123).
  _migrarHashesLegados() {
    try {
      const HASH_LEGADO = "$2b$10$9v3m0C1O6mK9BqV3j0Xg9.1fG/3zR1i5e.7F6o4D1u1G2H3J4K5L6";
      const db = JSON.parse(fs.readFileSync(this.dbPath, 'utf-8'));
      const padrao = this._obterDadosPadrao().usuarios;
      let alterou = false;
      (db.usuarios || []).forEach(u => {
        if (u.senha_hash === HASH_LEGADO) {
          const semente = padrao.find(p => p.email === u.email);
          if (semente) { u.senha_hash = semente.senha_hash; alterou = true; }
        }
      });
      if (alterou) this.salvar(db);
    } catch (err) {
      console.error("Erro ao migrar hashes legados:", err);
    }
  }

  carregar() {
    try {
      this._garantirArquivoInicial();
      const rawData = fs.readFileSync(this.dbPath, 'utf-8');
      return JSON.parse(rawData);
    } catch (e) {
      return this._obterDadosPadrao();
    }
  }

  salvar(dados) {
    fs.writeFileSync(this.dbPath, JSON.stringify(dados, null, 2), 'utf-8');
  }

  // Métodos de Usuários
  buscarUsuarioPorEmail(email) {
    const db = this.carregar();
    const alvo = String(email).trim().toLowerCase();
    return db.usuarios.find(u => String(u.email).toLowerCase() === alvo) || null;
  }

  salvarUsuario(usuario) {
    const db = this.carregar();
    const novoUsuario = { id: Date.now(), ...usuario };
    db.usuarios.push(novoUsuario);
    this.salvar(db);
    return novoUsuario;
  }

  // Métodos de Autores
  listarAutores() {
    return this.carregar().autores || [];
  }

  buscarAutorPorId(id) {
    return (this.carregar().autores || []).find(a => a.id === Number(id)) || null;
  }

  salvarAutor(autor) {
    const db = this.carregar();
    const novoAutor = { id: Date.now(), ...autor };
    db.autores.push(novoAutor);
    this.salvar(db);
    return novoAutor;
  }

  // Métodos de Livros
  listarLivros() {
    return this.carregar().livros || [];
  }

  buscarLivroPorId(id) {
    return (this.carregar().livros || []).find(l => l.id === Number(id)) || null;
  }

  salvarLivro(livro) {
    const db = this.carregar();
    const novoLivro = { id: Date.now(), ...livro, comentarios: [] };
    db.livros.push(novoLivro);
    this.salvar(db);
    return novoLivro;
  }

  adicionarComentario(livroId, comentario) {
    const db = this.carregar();
    const livro = db.livros.find(l => l.id === Number(livroId));
    if (!livro) return null;

    if (!livro.comentarios) livro.comentarios = [];

    const novoComentario = { id: Date.now(), ...comentario };
    livro.comentarios.push(novoComentario);
    this.salvar(db);
    return novoComentario;
  }
}

module.exports = new LivrariaRepository();