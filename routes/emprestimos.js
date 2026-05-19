const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const query = `
    SELECT 
      e.id,
      e.data_emprestimo,
      e.data_devolucao,
      DATE_ADD(e.data_emprestimo, INTERVAL 7 DAY) AS data_prevista_devolucao,
      a.id AS aluno_id,
      a.nome AS aluno_nome,
      a.matricula AS aluno_matricula,
      a.turma AS aluno_turma,
      l.id AS livro_id,
      l.titulo AS livro_titulo,
      l.autor AS livro_autor,
      CASE 
        WHEN e.data_devolucao IS NULL AND CURDATE() > DATE_ADD(e.data_emprestimo, INTERVAL 7 DAY) 
        THEN TRUE 
        ELSE FALSE 
      END AS em_atraso
    FROM emprestimos e
    JOIN alunos a ON e.aluno_id = a.id
    JOIN livros l ON e.livro_id = l.id
    ORDER BY em_atraso DESC, e.data_emprestimo DESC
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ erro: err.message });
    res.json(results);
  });
});

router.get('/atraso', (req, res) => {
  const query = `
    SELECT 
      e.id,
      e.data_emprestimo,
      DATE_ADD(e.data_emprestimo, INTERVAL 7 DAY) AS data_prevista_devolucao,
      DATEDIFF(CURDATE(), DATE_ADD(e.data_emprestimo, INTERVAL 7 DAY)) AS dias_atraso,
      a.nome AS aluno_nome,
      a.matricula AS aluno_matricula,
      a.turma AS aluno_turma,
      l.titulo AS livro_titulo,
      l.autor AS livro_autor
    FROM emprestimos e
    JOIN alunos a ON e.aluno_id = a.id
    JOIN livros l ON e.livro_id = l.id
    WHERE e.data_devolucao IS NULL
      AND CURDATE() > DATE_ADD(e.data_emprestimo, INTERVAL 7 DAY)
    ORDER BY dias_atraso DESC
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ erro: err.message });
    res.json(results);
  });
});

router.get('/:id', (req, res) => {
  const query = `
    SELECT 
      e.id,
      e.data_emprestimo,
      e.data_devolucao,
      DATE_ADD(e.data_emprestimo, INTERVAL 7 DAY) AS data_prevista_devolucao,
      a.id AS aluno_id,
      a.nome AS aluno_nome,
      a.matricula AS aluno_matricula,
      l.id AS livro_id,
      l.titulo AS livro_titulo,
      l.autor AS livro_autor,
      CASE 
        WHEN e.data_devolucao IS NULL AND CURDATE() > DATE_ADD(e.data_emprestimo, INTERVAL 7 DAY) 
        THEN TRUE ELSE FALSE 
      END AS em_atraso
    FROM emprestimos e
    JOIN alunos a ON e.aluno_id = a.id
    JOIN livros l ON e.livro_id = l.id
    WHERE e.id = ?
  `;
  db.query(query, [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ erro: err.message });
    if (results.length === 0) return res.status(404).json({ erro: 'Empréstimo não encontrado' });
    res.json(results[0]);
  });
});

router.post('/', (req, res) => {
  const { aluno_id, livro_id } = req.body;

  if (!aluno_id || !livro_id) {
    return res.status(400).json({ erro: 'aluno_id e livro_id são obrigatórios' });
  }

  db.query('SELECT disponivel FROM livros WHERE id = ?', [livro_id], (err, livros) => {
    if (err) return res.status(500).json({ erro: err.message });
    if (livros.length === 0) return res.status(404).json({ erro: 'Livro não encontrado' });
    if (!livros[0].disponivel) {
      return res.status(409).json({ erro: 'Livro já está emprestado' }); 
    }

    db.query('SELECT id FROM alunos WHERE id = ?', [aluno_id], (err, alunos) => {
      if (err) return res.status(500).json({ erro: err.message });
      if (alunos.length === 0) return res.status(404).json({ erro: 'Aluno não encontrado' });

      const data_emprestimo = new Date().toISOString().split('T')[0]; 

      db.query(
        'INSERT INTO emprestimos (aluno_id, livro_id, data_emprestimo) VALUES (?, ?, ?)',
        [aluno_id, livro_id, data_emprestimo],
        (err, result) => {
          if (err) return res.status(500).json({ erro: err.message });

          db.query('UPDATE livros SET disponivel = FALSE WHERE id = ?', [livro_id], (err) => {
            if (err) return res.status(500).json({ erro: err.message });

            const data_prevista = new Date();
            data_prevista.setDate(data_prevista.getDate() + 7);

            res.status(201).json({
              id: result.insertId,
              aluno_id,
              livro_id,
              data_emprestimo,
              data_prevista_devolucao: data_prevista.toISOString().split('T')[0],
              mensagem: 'Empréstimo registrado com sucesso'
            });
          });
        }
      );
    });
  });
});

router.patch('/:id/devolver', (req, res) => {
  db.query(
    'SELECT id, livro_id, data_devolucao FROM emprestimos WHERE id = ?',
    [req.params.id],
    (err, results) => {
      if (err) return res.status(500).json({ erro: err.message });
      if (results.length === 0) return res.status(404).json({ erro: 'Empréstimo não encontrado' });
      if (results[0].data_devolucao !== null) {
        return res.status(400).json({ erro: 'Este empréstimo já foi devolvido' });
      }

      const livro_id = results[0].livro_id;
      const data_devolucao = new Date().toISOString().split('T')[0];

      db.query(
        'UPDATE emprestimos SET data_devolucao = ? WHERE id = ?',
        [data_devolucao, req.params.id],
        (err) => {
          if (err) return res.status(500).json({ erro: err.message });

          db.query('UPDATE livros SET disponivel = TRUE WHERE id = ?', [livro_id], (err) => {
            if (err) return res.status(500).json({ erro: err.message });
            res.json({ mensagem: 'Devolução registrada com sucesso', data_devolucao });
          });
        }
      );
    }
  );
});

module.exports = router;