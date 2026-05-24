# ✦ Tarefas PWA

> Lista de tarefas pessoal como Progressive Web App — funciona offline, instala no dispositivo e salva dados localmente.

## 🚀 Funcionalidades

| Recurso | Detalhes |
|---|---|
| ✅ **Offline-first** | Funciona sem internet após o primeiro acesso via Service Worker |
| 📲 **Instalável** | Botão de instalação + `manifest.json` para adicionar à tela inicial |
| 💾 **Dados locais** | `localStorage` com validação e tratamento de erros |
| 🔄 **Cache inteligente** | Cache First para assets + Network First para navegação |
| 🌐 **Status de rede** | Detecta online/offline e notifica o usuário |
| ♿ **Acessibilidade** | ARIA labels, navegação por teclado, foco gerenciado |
| 🔒 **Segurança** | Sanitização de entrada (anti-XSS), IDs via `crypto.randomUUID` |
| 🎨 **Design dark** | Tema escuro com gradiente, tipografia refinada, animações CSS |
| 🔔 **Toasts** | Notificações não-intrusivas para ações do usuário |
| ⌨️ **Atalhos** | `Ctrl+Enter` adiciona · `Esc` limpa o campo |

## 🗂️ Estrutura

```
todo-pwa/
├── index.html      # Shell da aplicação com semântica e ARIA
├── app.js          # Lógica: tarefas, filtros, SW, instalação, conectividade
├── sw.js           # Service Worker: install/activate/fetch + estratégias de cache
├── styles.css      # Design system com CSS variables, dark theme, animações
├── manifest.json   # Manifesto PWA completo
├── icon-192.svg    # Ícone 192×192
├── icon-512.svg    # Ícone 512×512 (maskable)
└── README.md
```

## 🧪 Como testar

### 1. Servir localmente (Service Workers exigem HTTPS ou localhost)

```bash
# Python
python3 -m http.server 8080

# Node.js (npx)
npx serve .

# VS Code: extensão Live Server
```

Abra `http://localhost:8080`.

### 2. Verificar o Service Worker

1. DevTools → **Application** → **Service Workers**
2. Confira que o SW está `activated and running`
3. Marque **Offline** e recarregue a página → deve funcionar normalmente

### 3. Testar cache

- **Application → Cache Storage**: veja os caches `todo-pwa-static-v3` e `todo-pwa-dynamic-v3`
- **Network** tab: recursos servidos do cache aparecem com ⚙️ (Service Worker)

### 4. Instalar como app

- No Chrome desktop: ícone de instalação na barra de endereços
- No Android: banner "Adicionar à tela inicial"
- Ou use o botão **Instalar** no cabeçalho do app

### 5. Lighthouse

Rode a auditoria PWA no DevTools → Lighthouse para verificar a pontuação.

## 🔑 Conceitos PWA demonstrados

### Lifecycle do Service Worker

```
register() → install (pré-cacheia shell) → activate (limpa caches antigos) → fetch (intercepta)
```

- `skipWaiting()` no install → ativa imediatamente
- `clients.claim()` no activate → assume controle das abas abertas
- Evento `updatefound` → notifica usuário de nova versão

### Estratégias de cache

- **Cache First** (`cacheFirstWithDynamicFallback`) → assets CSS/JS/SVG
- **Network First** (`networkFirstWithFallback`) → navegação HTML

### Armazenamento local

- `localStorage` com try/catch e validação de schema ao carregar
- IDs únicos via `crypto.randomUUID()`

## 👥 Equipe

Desenvolvido para a Atividade 4 — PWA · Disciplina de Desenvolvimento Web.
