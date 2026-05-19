const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const livrosRoutes = require('./routes/livros');
const alunosRoutes = require('./routes/alunos');
const emprestimosRoutes = require('./routes/emprestimos');

app.use('/livros', livrosRoutes);
app.use('/alunos', alunosRoutes);
app.use('/emprestimos', emprestimosRoutes);

app.get('/', (req, res) => {
  res.json({ mensagem: 'API SGBE - Sistema de Gerenciamento de Biblioteca Escolar' });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
