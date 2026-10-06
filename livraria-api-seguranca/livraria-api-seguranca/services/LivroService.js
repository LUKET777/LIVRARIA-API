const repository = require('../repositories/LivrariaRepository');

class LivroService {
  listarTodos() {
    const livros = repository.listarLivros();
    const autores = repository.listarAutores();

    return livros.map(livro => {
      const autor = autores.find(a => a.id === livro.autor_id);
      return {
        ...livro,
        autor_nome: autor ? autor.nome : "Autor Desconhecido",
        comentarios: this._formatarComentarios(livro.comentarios)
      };
    });
  }

  // Expõe também "autor_comentario", campo lido pelo front-end (index.html)
  _formatarComentarios(comentarios = []) {
    return comentarios.map(c => ({ ...c, autor_comentario: c.autor_nome }));
  }

  buscarPorId(id) {
    const livro = repository.buscarLivroPorId(id);
    if (!livro) {
      throw { status: 404, message: "Livro não localizado." };
    }

    const autor = repository.buscarAutorPorId(livro.autor_id);
    return {
      ...livro,
      autor_nome: autor ? autor.nome : "Autor Desconhecido",
      comentarios: this._formatarComentarios(livro.comentarios)
    };
  }

  criar({ titulo, ano, autor_id } = {}) {
    if (!titulo || !autor_id) {
      throw { status: 400, message: "O título e o autor_id são obrigatórios." };
    }

    const autor = repository.buscarAutorPorId(autor_id);
    if (!autor) {
      throw { status: 404, message: "O autor informado não existe." };
    }

    return repository.salvarLivro({
      titulo: String(titulo).trim(),
      ano: ano || new Date().getFullYear(),
      autor_id: Number(autor_id)
    });
  }

  adicionarComentario(livroId, { texto, usuario }) {
    if (!texto || String(texto).trim() === "") {
      throw { status: 400, message: "O texto do comentário não pode estar vazio." };
    }

    this.buscarPorId(livroId);

    // Autor do comentário vem do JWT validado, nunca do corpo da requisição
    const comentario = repository.adicionarComentario(livroId, {
      usuario_id: usuario.id,
      autor_nome: usuario.nome,
      texto: String(texto).trim()
    });
    return { ...comentario, autor_comentario: comentario.autor_nome };
  }
}

module.exports = new LivroService();