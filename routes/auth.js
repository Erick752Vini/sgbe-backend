const jwt = require('jsonwebtoken');

app.post('/login', (req, res) => {
  const { email, senha } = req.body;
  const sql = "SELECT * FROM alunos WHERE email = ? AND senha = ?";
  
  db.query(sql, [email, senha], (err, results) => {
    if (err) return res.status(500).json(err);
    if (results.length > 0) {
      const token = jwt.sign({ id: results[0].id }, process.env.JWT_SECRET, { expiresIn: '1h' });
      return res.json({ auth: true, token });
    }
    res.status(401).json({ auth: false, mensagem: "E-mail ou senha incorretos!" });
  });
});
