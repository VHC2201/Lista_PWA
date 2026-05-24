/**
 * app.js — Lógica principal da Todo PWA
 * Boas práticas: estado imutável, sanitização de entrada, acessibilidade, sem eval.
 */

'use strict';

/* ── Constantes ───────────────────────────────────────────── */
const STORAGE_KEY  = 'todopwa_tasks_v2';
const MAX_LENGTH   = 120;
const TOAST_DURATION = 2800;

/* ── Referências DOM ─────────────────────────────────────── */
const taskInput    = document.getElementById('taskInput');
const addBtn       = document.getElementById('addBtn');
const taskList     = document.getElementById('taskList');
const statusMsg    = document.getElementById('statusMessage');
const installBtn   = document.getElementById('installBtn');
const offlineBadge = document.getElementById('offlineBadge');
const charCount    = document.getElementById('charCount');
const formError    = document.getElementById('formError');
const filterBar    = document.getElementById('filterBar');
const statsRow     = document.getElementById('statsRow');
const clearDoneBtn = document.getElementById('clearDoneBtn');
const numTotal     = document.getElementById('numTotal');
const numDone      = document.getElementById('numDone');
const numPending   = document.getElementById('numPending');
const subtitleText = document.getElementById('subtitleText');
const toastEl      = document.getElementById('toast');

/* ── Estado da aplicação ─────────────────────────────────── */
let tasks          = [];
let activeFilter   = 'all';
let deferredPrompt = null;
let toastTimer     = null;

/* ── Utilitários ─────────────────────────────────────────── */

/**
 * Sanitiza texto removendo HTML para prevenir XSS.
 * @param {string} str
 * @returns {string}
 */
function sanitize(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Formata data/hora para exibição.
 * @param {number} timestamp
 * @returns {string}
 */
function formatDate(timestamp) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit'
  }).format(new Date(timestamp));
}

/**
 * Exibe uma notificação toast temporária.
 * @param {string} message
 */
function showToast(message) {
  clearTimeout(toastTimer);
  toastEl.textContent = message;
  toastEl.classList.add('show');
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), TOAST_DURATION);
}

/* ── Persistência ────────────────────────────────────────── */

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (err) {
    console.error('[TodoPWA] Erro ao salvar tarefas:', err);
    showToast('⚠️ Não foi possível salvar. Armazenamento cheio?');
  }
}

function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Valida cada item para segurança
      tasks = parsed.filter(t =>
        t &&
        typeof t.id === 'string' &&
        typeof t.title === 'string' &&
        typeof t.done === 'boolean' &&
        typeof t.createdAt === 'number'
      );
    }
  } catch (err) {
    console.error('[TodoPWA] Erro ao carregar tarefas:', err);
    tasks = [];
  }
}

/* ── Gerenciamento de tarefas ────────────────────────────── */

/**
 * Cria uma nova tarefa com ID único baseado em crypto.randomUUID se disponível.
 * @param {string} title
 * @returns {Object}
 */
function createTask(title) {
  return {
    id: (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    title: title.trim().slice(0, MAX_LENGTH),
    done: false,
    createdAt: Date.now()
  };
}

function addTask(title) {
  const trimmed = title.trim();
  if (!trimmed) {
    showInputError('Por favor, escreva uma tarefa antes de adicionar.');
    return false;
  }
  if (trimmed.length > MAX_LENGTH) {
    showInputError(`Máximo de ${MAX_LENGTH} caracteres.`);
    return false;
  }
  tasks = [createTask(trimmed), ...tasks];
  saveTasks();
  renderAll();
  showToast('✅ Tarefa adicionada!');
  return true;
}

function toggleTask(id) {
  tasks = tasks.map(t => t.id === id ? { ...t, done: !t.done } : t);
  saveTasks();
  renderStats();
}

function removeTask(id) {
  const item = taskList.querySelector(`[data-id="${id}"]`);
  if (item) {
    item.classList.add('removing');
    item.addEventListener('animationend', () => {
      tasks = tasks.filter(t => t.id !== id);
      saveTasks();
      renderAll();
    }, { once: true });
  } else {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    renderAll();
  }
  showToast('🗑️ Tarefa removida.');
}

function clearDone() {
  const count = tasks.filter(t => t.done).length;
  if (count === 0) { showToast('Não há tarefas concluídas.'); return; }
  tasks = tasks.filter(t => !t.done);
  saveTasks();
  renderAll();
  showToast(`🧹 ${count} tarefa(s) removida(s).`);
}

/* ── Renderização ────────────────────────────────────────── */

function getFilteredTasks() {
  if (activeFilter === 'done')    return tasks.filter(t => t.done);
  if (activeFilter === 'pending') return tasks.filter(t => !t.done);
  return tasks;
}

function renderStats() {
  const total   = tasks.length;
  const done    = tasks.filter(t => t.done).length;
  const pending = total - done;

  numTotal.textContent   = total;
  numDone.textContent    = done;
  numPending.textContent = pending;

  statsRow.hidden  = total === 0;
  filterBar.hidden = total === 0;

  const suf = total === 1 ? 'tarefa' : 'tarefas';
  subtitleText.textContent = total === 0
    ? 'Lista pessoal offline'
    : `${pending} pendente(s) · ${done} concluída(s)`;
}

function renderTaskItem(task) {
  const li = document.createElement('li');
  li.className = `task-item${task.done ? ' completed' : ''}`;
  li.dataset.id = task.id;

  // Checkbox
  const check = document.createElement('input');
  check.type = 'checkbox';
  check.className = 'task-check';
  check.checked = task.done;
  check.setAttribute('aria-label', `Marcar como ${task.done ? 'pendente' : 'concluída'}: ${task.title}`);
  check.addEventListener('change', () => {
    li.classList.toggle('completed', check.checked);
    toggleTask(task.id);
  });

  // Corpo
  const body = document.createElement('div');
  body.className = 'task-body';

  const text = document.createElement('span');
  text.className = 'task-text';
  text.textContent = task.title; // textContent previne XSS

  const meta = document.createElement('time');
  meta.className = 'task-meta';
  meta.dateTime = new Date(task.createdAt).toISOString();
  meta.textContent = formatDate(task.createdAt);

  body.appendChild(text);
  body.appendChild(meta);

  // Botão deletar
  const del = document.createElement('button');
  del.className = 'btn-delete';
  del.setAttribute('aria-label', `Excluir tarefa: ${task.title}`);
  del.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/></svg>`;
  del.addEventListener('click', () => removeTask(task.id));

  li.appendChild(check);
  li.appendChild(body);
  li.appendChild(del);

  return li;
}

function renderTasks() {
  const filtered = getFilteredTasks();
  taskList.innerHTML = '';

  if (filtered.length === 0) {
    const msgs = {
      all:     tasks.length === 0 ? 'Nenhuma tarefa adicionada ainda.' : 'Nenhuma tarefa encontrada.',
      pending: 'Nenhuma tarefa pendente. 🎉',
      done:    'Nenhuma tarefa concluída ainda.'
    };
    statusMsg.textContent = msgs[activeFilter];
    statusMsg.hidden = false;
    return;
  }

  statusMsg.hidden = true;
  const fragment = document.createDocumentFragment();
  filtered.forEach(task => fragment.appendChild(renderTaskItem(task)));
  taskList.appendChild(fragment);
}

function renderAll() {
  renderStats();
  renderTasks();
}

/* ── Formulário ─────────────────────────────────────────── */

function showInputError(msg) {
  formError.textContent = msg;
  taskInput.classList.add('input-error');
  taskInput.focus();
}

function clearInputError() {
  formError.textContent = '';
  taskInput.classList.remove('input-error');
}

function handleAdd() {
  const value = taskInput.value;
  if (addTask(value)) {
    taskInput.value = '';
    updateCharCount('');
    clearInputError();
    taskInput.focus();
  }
}

function updateCharCount(value) {
  const len = value.length;
  charCount.textContent = `${len} / ${MAX_LENGTH}`;
  charCount.className = 'char-count' +
    (len >= MAX_LENGTH ? ' at-limit' : len >= MAX_LENGTH * 0.85 ? ' near-limit' : '');
}

/* ── Filtros ─────────────────────────────────────────────── */

function setupFilters() {
  filterBar.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeFilter = btn.dataset.filter;
      filterBar.querySelectorAll('.filter-btn[data-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderTasks();
    });
  });

  clearDoneBtn.addEventListener('click', clearDone);
}

/* ── Service Worker ──────────────────────────────────────── */

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.register('./sw.js', { scope: './' })
    .then(reg => {
      console.log('[TodoPWA] Service Worker registrado. Scope:', reg.scope);

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showToast('🔄 Nova versão disponível. Recarregue para atualizar.');
          }
        });
      });
    })
    .catch(err => console.error('[TodoPWA] Falha ao registrar SW:', err));
}

/* ── Instalação PWA ──────────────────────────────────────── */

function setupInstallButton() {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.hidden = false;
  });

  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[TodoPWA] Instalação:', outcome);
    showToast(outcome === 'accepted' ? '🎉 App instalado com sucesso!' : 'Instalação cancelada.');
    deferredPrompt = null;
    installBtn.hidden = true;
  });

  window.addEventListener('appinstalled', () => {
    installBtn.hidden = true;
    showToast('📲 App instalado!');
  });
}

/* ── Detecção de conectividade ───────────────────────────── */

function syncOnlineStatus() {
  const online = navigator.onLine;
  offlineBadge.hidden = online;
  document.title = online ? 'Tarefas — PWA' : 'Tarefas — Offline';
}

function setupConnectivityListeners() {
  syncOnlineStatus();
  window.addEventListener('online',  () => { syncOnlineStatus(); showToast('🌐 Conexão restaurada.'); });
  window.addEventListener('offline', () => { syncOnlineStatus(); showToast('📴 Você está offline. Dados salvos localmente.'); });
}

/* ── Teclas de atalho ────────────────────────────────────── */

function setupKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    // Ctrl/Cmd + Enter → adiciona tarefa
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
    // Esc → limpa input
    if (e.key === 'Escape' && document.activeElement === taskInput) {
      taskInput.value = '';
      updateCharCount('');
      clearInputError();
    }
  });
}

/* ── Inicialização ───────────────────────────────────────── */

function init() {
  loadTasks();
  renderAll();

  // Input: contador de caracteres + limpeza de erro
  taskInput.addEventListener('input', e => {
    updateCharCount(e.target.value);
    if (formError.textContent) clearInputError();
  });

  // Adicionar pelo botão
  addBtn.addEventListener('click', handleAdd);

  // Adicionar pelo Enter
  taskInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }
  });

  setupFilters();
  setupConnectivityListeners();
  setupKeyboardShortcuts();
  registerServiceWorker();
  setupInstallButton();
}

window.addEventListener('load', init);
