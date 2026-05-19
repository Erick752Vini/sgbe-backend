const express = require('express');
const cors = require('cors');
const app = express();
const db = require('./db'); // Importe o banco para usar no login

app.use(cors());
app.use(express.json());

const livrosRoutes = require('./routes/livros');
const alunosRoutes = require('./routes/alunos');
const emprestimosRoutes = require('./routes/emprestimos');

app.use('/livros', livrosRoutes);
app.use('/alunos', alunosRoutes);
app.use('/emprestimos', emprestimosRoutes);

// --- ROTA DE LOGIN ADICIONADA ---
app.post('/login', (req, res) => {
  const { email, senha } = req.body;
  const sql = "SELECT * FROM alunos WHERE email = ? AND senha = ?";
  
  db.query(sql, [email, senha], (err, results) => {
    if (err) return res.status(500).json({ erro: err.message });
    
    if (results.length > 0) {
      // Retorna um token simples para o front-end salvar
      res.json({ auth: true, token: 'sgbe-token-sessao-' + results[0].id });
    } else {
      res.status(401).json({ auth: false, mensagem: 'E-mail ou senha incorretos!' });
    }
  });
});
// --------------------------------

app.get('/', (req, res) => {
  res.json({ mensagem: 'API SGBE - Sistema de Gerenciamento de Biblioteca Escolar' });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
