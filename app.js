const DB = {
    livros: [],
    alunos: [],
    emprestimos: [],
    _nextEmpId: 1,

    load() {
        const saved = localStorage.getItem('sgbe_db');
        if (saved) {
            const d = JSON.parse(saved);
            this.livros = d.livros || [];
            this.alunos = d.alunos || [];
            this.emprestimos = d.emprestimos || [];
            this._nextEmpId = d._nextEmpId || 1;
        }
    },

    save() {
        localStorage.setItem('sgbe_db', JSON.stringify({
            livros: this.livros,
            alunos: this.alunos,
            emprestimos: this.emprestimos,
            _nextEmpId: this._nextEmpId,
        }));
    },

    livroDisponivel(id) {
        return !this.emprestimos.some(e => e.livroId === id && e.status === 'ativo');
    },

    empAtivoDoAluno(alunoId) {
        return this.emprestimos.filter(e => e.alunoId === alunoId && e.status === 'ativo');
    },
};

// ---- SEÇÃO ATUAL ----
let secaoAtual = 'livros';
let searchTerm = '';

// ---- NAVEGAÇÃO ----
document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
        const sec = btn.dataset.section;
        navegar(sec);
    });
});

function navegar(sec) {
    secaoAtual = sec;
    document.querySelectorAll('.nav-item').forEach(b =>
        b.classList.toggle('active', b.dataset.section === sec));
    document.querySelectorAll('.section').forEach(s =>
        s.classList.toggle('active', s.id === `sec-${sec}`));

    const titulos = {
        livros: 'Livros', alunos: 'Alunos', emprestimos: 'Empréstimos',
        devolucoes: 'Devoluções', atrasados: 'Em Atraso',
    };
    document.getElementById('page-title').textContent = titulos[sec] || sec;
    document.getElementById('search-input').value = '';
    searchTerm = '';

    const btnNovo = document.getElementById('btn-novo');
    btnNovo.style.display = ['devolucoes', 'atrasados'].includes(sec) ? 'none' : '';

    renderAll();
}

// ---- BOTÃO NOVO ----
document.getElementById('btn-novo').addEventListener('click', () => {
    const handlers = {
        livros: abrirModalLivro,
        alunos: abrirModalAluno,
        emprestimos: abrirModalEmprestimo,
    };
    if (handlers[secaoAtual]) handlers[secaoAtual](null);
});

// ---- BUSCA ----
document.getElementById('search-input').addEventListener('input', e => {
    searchTerm = e.target.value.toLowerCase().trim();
    renderAll();
});

// ---- RENDER ALL ----
function renderAll() {
    renderLivros();
    renderAlunos();
    renderEmprestimos();
    renderDevolucoes();
    renderAtrasados();
}

// ---- HELPERS ----
function hoje() {
    return new Date().toISOString().split('T')[0];
}

function dataPrevisao(data) {
    const d = new Date(data + 'T00:00:00');
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
}

function diasAtraso(prevDataStr) {
    const prev = new Date(prevDataStr + 'T00:00:00');
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diff = Math.floor((now - prev) / 86400000);
    return diff;
}

function fmtData(d) {
    if (!d) return '—';
    const [y, m, dia] = d.split('-');
    return `${dia}/${m}/${y}`;
}

function nomeAluno(id) {
    const a = DB.alunos.find(a => a.id === id);
    return a ? a.nome : `Aluno #${id}`;
}

function tituloLivro(id) {
    const l = DB.livros.find(l => l.id === id);
    return l ? l.titulo : `Livro #${id}`;
}

// ---- TOAST ----
let toastTimer;
function toast(msg, tipo = '') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = `toast${tipo ? ' ' + tipo : ''}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = 'toast hidden'; }, 3000);
}

// ---- MODAL ----
const overlay = document.getElementById('modal-overlay');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const btnSave = document.getElementById('modal-save');
const btnCancel = document.getElementById('modal-cancel');
const btnClose = document.getElementById('modal-close');

let onSaveCallback = null;

function abrirModal(titulo, html, onSave, labelSave = 'Salvar') {
    modalTitle.textContent = titulo;
    modalBody.innerHTML = html;
    btnSave.textContent = labelSave;
    onSaveCallback = onSave;
    overlay.classList.remove('hidden');
}

function fecharModal() {
    overlay.classList.add('hidden');
    onSaveCallback = null;
}

btnClose.addEventListener('click', fecharModal);
btnCancel.addEventListener('click', fecharModal);
overlay.addEventListener('click', e => { if (e.target === overlay) fecharModal(); });

btnSave.addEventListener('click', () => {
    if (onSaveCallback) onSaveCallback();
});

// ---- RF01 — LIVROS ----
function renderLivros() {
    const tbody = document.getElementById('tbody-livros');
    tbody.innerHTML = '';

    let lista = DB.livros.filter(l => {
        if (!searchTerm) return true;
        return l.titulo.toLowerCase().includes(searchTerm) ||
            l.autor.toLowerCase().includes(searchTerm) ||
            l.id.toLowerCase().includes(searchTerm);
    });

    document.getElementById('empty-livros').style.display = lista.length === 0 ? 'block' : 'none';
    document.getElementById('tabela-livros').style.display = lista.length === 0 ? 'none' : '';

    lista.forEach(l => {
        const disp = DB.livroDisponivel(l.id);
        const tr = document.createElement('tr');
        tr.innerHTML = `
        <td><code style="color:var(--amber2);font-size:12px">${l.id}</code></td>
        <td>${l.titulo}</td>
        <td style="color:var(--text2)">${l.autor}</td>
        <td>
          <span class="badge ${disp ? 'badge-ok' : 'badge-no'}">
            ${disp ? 'Disponível' : 'Emprestado'}
          </span>
        </td>
        <td>
          <button class="btn-action" title="Editar" onclick="abrirModalLivro('${l.id}')">✏️</button>
          <button class="btn-action" title="Excluir" onclick="excluirLivro('${l.id}')">🗑️</button>
        </td>
      `;
        tbody.appendChild(tr);
    });
}

function abrirModalLivro(id) {
    const livro = id ? DB.livros.find(l => l.id === id) : null;
    const html = `
      <div class="form-group">
        <label>Código</label>
        <input id="f-id" type="text" placeholder="Ex: LV001" value="${livro ? livro.id : ''}" ${livro ? 'readonly' : ''} />
      </div>
      <div class="form-group">
        <label>Título</label>
        <input id="f-titulo" type="text" placeholder="Título do livro" value="${livro ? livro.titulo : ''}" />
      </div>
      <div class="form-group">
        <label>Autor</label>
        <input id="f-autor" type="text" placeholder="Nome do autor" value="${livro ? livro.autor : ''}" />
      </div>
    `;

    abrirModal(livro ? 'Editar Livro' : 'Novo Livro', html, () => {
        const fId = document.getElementById('f-id').value.trim();
        const fTit = document.getElementById('f-titulo').value.trim();
        const fAut = document.getElementById('f-autor').value.trim();

        if (!fId || !fTit || !fAut) { toast('Preencha todos os campos.', 'error'); return; }

        if (!livro && DB.livros.find(l => l.id === fId)) {
            toast('Código já existe.', 'error'); return;
        }

        if (livro) {
            livro.titulo = fTit;
            livro.autor = fAut;
            toast('Livro atualizado.', 'success');
        } else {
            DB.livros.push({ id: fId, titulo: fTit, autor: fAut });
            toast('Livro cadastrado.', 'success');
        }

        DB.save();
        fecharModal();
        renderAll();
    });
}

function excluirLivro(id) {
    if (!DB.livroDisponivel(id)) {
        toast('Não é possível excluir: livro está emprestado.', 'error');
        return;
    }
    confirmar(`Excluir o livro "${tituloLivro(id)}"?`, () => {
        DB.livros = DB.livros.filter(l => l.id !== id);
        DB.save();
        renderAll();
        toast('Livro excluído.', 'success');
    });
}

// ---- RF02 — ALUNOS ----
function renderAlunos() {
    const tbody = document.getElementById('tbody-alunos');
    tbody.innerHTML = '';

    let lista = DB.alunos.filter(a => {
        if (!searchTerm) return true;
        return a.nome.toLowerCase().includes(searchTerm) ||
            a.id.toLowerCase().includes(searchTerm) ||
            (a.turma || '').toLowerCase().includes(searchTerm);
    });

    document.getElementById('empty-alunos').style.display = lista.length === 0 ? 'block' : 'none';
    document.getElementById('tabela-alunos').style.display = lista.length === 0 ? 'none' : '';

    lista.forEach(a => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><code style="color:var(--amber2);font-size:12px">${a.id}</code></td>
          <td>${a.nome}</td>
          <td style="color:var(--text2)">${a.turma || '—'}</td>
          <td>
            <button class="btn-action" title="Editar" onclick="abrirModalAluno('${a.id}')">✏️</button>
            <button class="btn-action" title="Excluir" onclick="excluirAluno('${a.id}')">🗑️</button>
          </td>
        `;
        tbody.appendChild(tr);
    });
}

function abrirModalAluno(id) {
    const aluno = id ? DB.alunos.find(a => a.id === id) : null;
    const html = `
        <div class="form-group">
          <label>Matrícula</label>
          <input id="f-id" type="text" placeholder="Ex: 2024001" value="${aluno ? aluno.id : ''}" ${aluno ? 'readonly' : ''} />
        </div>
        <div class="form-group">
          <label>Nome completo</label>
          <input id="f-nome" type="text" placeholder="Nome do aluno" value="${aluno ? aluno.nome : ''}" />
        </div>
        <div class="form-group">
          <label>Turma</label>
          <input id="f-turma" type="text" placeholder="Ex: 9A" value="${aluno ? (aluno.turma || '') : ''}" />
        </div>
      `;

    abrirModal(aluno ? 'Editar Aluno' : 'Novo Aluno', html, () => {
        const fId = document.getElementById('f-id').value.trim();
        const fNome = document.getElementById('f-nome').value.trim();
        const fTur = document.getElementById('f-turma').value.trim();

        if (!fId || !fNome) { toast('Preencha os campos obrigatórios.', 'error'); return; }

        if (!aluno && DB.alunos.find(a => a.id === fId)) {
            toast('Matrícula já existe.', 'error'); return;
        }

        if (aluno) {
            aluno.nome = fNome;
            aluno.turma = fTur;
            toast('Aluno atualizado.', 'success');
        } else {
            DB.alunos.push({ id: fId, nome: fNome, turma: fTur });
            toast('Aluno cadastrado.', 'success');
        }

        DB.save();
        fecharModal();
        renderAll();
    });
}

function excluirAluno(id) {
    const temEmp = DB.emprestimos.some(e => e.alunoId === id && e.status === 'ativo');
    if (temEmp) {
        toast('Aluno possui empréstimo ativo. Devolva antes de excluir.', 'error');
        return;
    }
    confirmar(`Excluir o aluno "${nomeAluno(id)}"?`, () => {
        DB.alunos = DB.alunos.filter(a => a.id !== id);
        DB.save();
        renderAll();
        toast('Aluno excluído.', 'success');
    });
}

// ---- RF03 — EMPRÉSTIMOS ----
function renderEmprestimos() {
    const tbody = document.getElementById('tbody-emp');
    tbody.innerHTML = '';

    let lista = DB.emprestimos.filter(e => e.status === 'ativo').filter(e => {
        if (!searchTerm) return true;
        return nomeAluno(e.alunoId).toLowerCase().includes(searchTerm) ||
            tituloLivro(e.livroId).toLowerCase().includes(searchTerm);
    });

    document.getElementById('empty-emp').style.display = lista.length === 0 ? 'block' : 'none';
    document.getElementById('tabela-emp').style.display = lista.length === 0 ? 'none' : '';

    lista.forEach(e => {
        const atraso = diasAtraso(e.prevDevolucao);
        const atrasado = atraso > 0;
        const tr = document.createElement('tr');
        if (atrasado) tr.style.background = 'rgba(192,57,43,0.07)';
        tr.innerHTML = `
          <td style="color:var(--text3);font-size:12px">#${e.id}</td>
          <td>${nomeAluno(e.alunoId)}</td>
          <td>${tituloLivro(e.livroId)}</td>
          <td>${fmtData(e.dataSaida)}</td>
          <td>${fmtData(e.prevDevolucao)}</td>
          <td>
            ${atrasado
                ? `<span class="badge badge-atraso">⚠️ ${atraso}d atraso</span>`
                : `<span class="badge badge-ativo">Ativo</span>`}
          </td>
          <td>
            <button class="btn-devolver" onclick="registrarDevolucao(${e.id})">↩ Devolver</button>
          </td>
        `;
        tbody.appendChild(tr);
    });
}

function abrirModalEmprestimo() {
    if (DB.alunos.length === 0) { toast('Cadastre alunos primeiro.', 'error'); return; }
    if (DB.livros.length === 0) { toast('Cadastre livros primeiro.', 'error'); return; }

    const livrosDisp = DB.livros.filter(l => DB.livroDisponivel(l.id));

    if (livrosDisp.length === 0) {
        toast('Nenhum livro disponível para empréstimo.', 'error');
        return;
    }

    const optsAlunos = DB.alunos.map(a =>
        `<option value="${a.id}">${a.nome} (${a.id})</option>`).join('');
    const optsLivros = livrosDisp.map(l =>
        `<option value="${l.id}">${l.titulo} (${l.id})</option>`).join('');

    const html = `
        <div class="form-group">
          <label>Aluno</label>
          <select id="f-aluno">${optsAlunos}</select>
        </div>
        <div class="form-group">
          <label>Livro (apenas disponíveis)</label>
          <select id="f-livro">${optsLivros}</select>
        </div>
        <div class="form-group">
          <label>Data de saída</label>
          <input id="f-data" type="date" value="${hoje()}" />
        </div>
        <div style="font-size:12px;color:var(--text3);margin-top:-8px">
          📅 Prazo de devolução: <strong style="color:var(--amber2)">7 dias</strong> a partir da data de saída (RF05)
        </div>
      `;

    abrirModal('Novo Empréstimo', html, () => {
        const alunoId = document.getElementById('f-aluno').value;
        const livroId = document.getElementById('f-livro').value;
        const data = document.getElementById('f-data').value;

        if (!alunoId || !livroId || !data) { toast('Preencha todos os campos.', 'error'); return; }

        if (!DB.livroDisponivel(livroId)) {
            toast('Este livro já está emprestado! (RF07)', 'error');
            return;
        }

        const prev = dataPrevisao(data);

        const emp = {
            id: DB._nextEmpId++,
            alunoId,
            livroId,
            dataSaida: data,
            prevDevolucao: prev,
            status: 'ativo',
            dataDevolucao: null,
        };

        DB.emprestimos.push(emp);
        DB.save();
        fecharModal();
        renderAll();
        toast(`Empréstimo registrado. Devolução prevista: ${fmtData(prev)}`, 'success');
    });
}

// ---- RF04 — DEVOLUÇÃO ----
function registrarDevolucao(empId) {
    const emp = DB.emprestimos.find(e => e.id === empId);
    if (!emp) return;

    confirmar(
        `Confirmar devolução do livro "${tituloLivro(emp.livroId)}" pelo aluno "${nomeAluno(emp.alunoId)}"?`,
        () => {
            emp.status = 'devolvido';
            emp.dataDevolucao = hoje();
            DB.save();
            renderAll();
            toast('Devolução registrada. Livro liberado! (RF04)', 'success');
        }
    );
}

function renderDevolucoes() {
    const tbody = document.getElementById('tbody-dev');
    tbody.innerHTML = '';

    let lista = DB.emprestimos.filter(e => e.status === 'devolvido').filter(e => {
        if (!searchTerm) return true;
        return nomeAluno(e.alunoId).toLowerCase().includes(searchTerm) ||
            tituloLivro(e.livroId).toLowerCase().includes(searchTerm);
    });

    document.getElementById('empty-dev').style.display = lista.length === 0 ? 'block' : 'none';
    document.getElementById('tabela-dev').style.display = lista.length === 0 ? 'none' : '';

    // ---- RF04 — DEVOLUÇÃO (Trecho a ser substituído) ----
    lista.slice().reverse().forEach(e => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
      <td style="color:var(--text3);font-size:12px">#${e.id}</td>
      <td>${nomeAluno(e.alunoId)}</td>
      <td>${tituloLivro(e.livroId)}</td>
      <td>${fmtData(e.dataSaida)}</td>
      <td>${fmtData(e.prevDevolucao)}</td> <!-- ADICIONE ESTA LINHA -->
      <td><span class="badge badge-devolvido">✔ ${fmtData(e.dataDevolucao)}</span></td>
    `;
        tbody.appendChild(tr);
    });

}

// ---- RF06 — EM ATRASO ----
function renderAtrasados() {
    const tbody = document.getElementById('tbody-atr');
    tbody.innerHTML = '';

    let lista = DB.emprestimos
        .filter(e => e.status === 'ativo' && diasAtraso(e.prevDevolucao) > 0)
        .filter(e => {
            if (!searchTerm) return true;
            return nomeAluno(e.alunoId).toLowerCase().includes(searchTerm) ||
                tituloLivro(e.livroId).toLowerCase().includes(searchTerm);
        });

    document.getElementById('empty-atr').style.display = lista.length === 0 ? 'block' : 'none';
    document.getElementById('tabela-atr').style.display = lista.length === 0 ? 'none' : '';

    const navAtr = document.querySelector('[data-section="atrasados"]');
    navAtr.style.color = lista.length > 0 ? '#e74c3c' : '';

    lista.sort((a, b) => diasAtraso(b.prevDevolucao) - diasAtraso(a.prevDevolucao));

    lista.forEach(e => {
        const dias = diasAtraso(e.prevDevolucao);
        const tr = document.createElement('tr');
        // ... código anterior da função renderEmprestimos
  tr.innerHTML = `
  <td style="color:var(--text3);font-size:12px">#${e.id}</td>
  <td>${nomeAluno(e.alunoId)}</td>
  <td>${tituloLivro(e.livroId)}</td>
  <td>${fmtData(e.dataSaida)}</td>
  <td>${fmtData(e.prevDevolucao)}</td>
  <td>
  ${atrasado
  ? `<span class="badge badge-atraso">⚠️ ${atraso}d
 atraso</span>`
  : `<span class="badge badge-ativo">Ativo</span>`}
  </td>
  <td>
  <button class="btn-devolver"
 onclick="registrarDevolucao(${e.id})">↩ Devolver</button>
  </td>
  `;
 // ... código posterior
 ;
        tbody.appendChild(tr);
    });
}

// ---- CONFIRM ----
function confirmar(msg, onConfirm) {
    const html = `<p class="confirm-text">${msg}</p>`;
    abrirModal('Confirmar', html, onConfirm, 'Confirmar');
}

// ---- INIT ----
DB.load();
renderAll();
