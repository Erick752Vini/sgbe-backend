const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  db.query('SELECT * FROM livros ORDER BY titulo', (err, results) => {
    if (err) return res.status(500).json({ erro: err.message });
    res.json(results);
  });
});

router.get('/:id', (req, res) => {
  db.query('SELECT * FROM livros WHERE id = ?', [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ erro: err.message });
    if (results.length === 0) return res.status(404).json({ erro: 'Livro não encontrado' });
    res.json(results[0]);
  });
});

router.post('/', (req, res) => {
  const { titulo, autor } = req.body;
  if (!titulo || !autor) return res.status(400).json({ erro: 'Título e autor são obrigatórios' });

  db.query('INSERT INTO livros (titulo, autor, disponivel) VALUES (?, ?, TRUE)', [titulo, autor], (err, result) => {
    if (err) return res.status(500).json({ erro: err.message });
    res.status(201).json({ id: result.insertId, titulo, autor, disponivel: true });
  });
});

router.put('/:id', (req, res) => {
  const { titulo, autor } = req.body;
  if (!titulo || !autor) return res.status(400).json({ erro: 'Título e autor são obrigatórios' });

  db.query('UPDATE livros SET titulo = ?, autor = ? WHERE id = ?', [titulo, autor, req.params.id], (err, result) => {
    if (err) return res.status(500).json({ erro: err.message });
    if (result.affectedRows === 0) return res.status(404).json({ erro: 'Livro não encontrado' });
    res.json({ mensagem: 'Livro atualizado com sucesso' });
  });
});

router.delete('/:id', (req, res) => {
  db.query('SELECT id FROM emprestimos WHERE livro_id = ? AND data_devolucao IS NULL', [req.params.id], (err, ativos) => {
    if (err) return res.status(500).json({ erro: err.message });
    if (ativos.length > 0) return res.status(400).json({ erro: 'Não é possível excluir livro com empréstimo ativo' });

    db.query('DELETE FROM livros WHERE id = ?', [req.params.id], (err, result) => {
      if (err) return res.status(500).json({ erro: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ erro: 'Livro não encontrado' });
      res.json({ mensagem: 'Livro excluído com sucesso' });
    });
  });
});

module.exports = router;