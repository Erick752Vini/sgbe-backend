const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  db.query('SELECT id, nome, email, matricula, turma FROM alunos ORDER BY nome', (err, results) => {
    if (err) return res.status(500).json({ erro: err.message });
    res.json(results);
  });
});

router.get('/:id', (req, res) => {
  db.query('SELECT id, nome, email, matricula, turma FROM alunos WHERE id = ?', [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ erro: err.message });
    if (results.length === 0) return res.status(404).json({ erro: 'Aluno não encontrado' });
    res.json(results[0]);
  });
});

router.post('/', (req, res) => {
  const { nome, email, senha, matricula, turma } = req.body;
  if (!nome || !email || !senha || !matricula) {
    return res.status(400).json({ erro: 'Nome, email, senha e matrícula são obrigatórios' });
  }

  db.query(
    'INSERT INTO alunos (nome, email, senha, matricula, turma) VALUES (?, ?, ?, ?, ?)',
    [nome, email, senha, matricula, turma || null],
    (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ erro: 'Email ou matrícula já cadastrado' });
        return res.status(500).json({ erro: err.message });
      }
      res.status(201).json({ id: result.insertId, nome, email, matricula, turma });
    }
  );
});

router.put('/:id', (req, res) => {
  const { nome, email, matricula, turma } = req.body;
  if (!nome || !email || !matricula) {
    return res.status(400).json({ erro: 'Nome, email e matrícula são obrigatórios' });
  }

  db.query(
    'UPDATE alunos SET nome = ?, email = ?, matricula = ?, turma = ? WHERE id = ?',
    [nome, email, matricula, turma || null, req.params.id],
    (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ erro: 'Email ou matrícula já cadastrado' });
        return res.status(500).json({ erro: err.message });
      }
      if (result.affectedRows === 0) return res.status(404).json({ erro: 'Aluno não encontrado' });
      res.json({ mensagem: 'Aluno atualizado com sucesso' });
    }
  );
});

router.delete('/:id', (req, res) => {
  db.query('SELECT id FROM emprestimos WHERE aluno_id = ? AND data_devolucao IS NULL', [req.params.id], (err, ativos) => {
    if (err) return res.status(500).json({ erro: err.message });
    if (ativos.length > 0) return res.status(400).json({ erro: 'Não é possível excluir aluno com empréstimo ativo' });

    db.query('DELETE FROM alunos WHERE id = ?', [req.params.id], (err, result) => {
      if (err) return res.status(500).json({ erro: err.message });
      if (result.affectedRows === 0) return res.status(404).json({ erro: 'Aluno não encontrado' });
      res.json({ mensagem: 'Aluno excluído com sucesso' });
    });
  });
});

module.exports = router;