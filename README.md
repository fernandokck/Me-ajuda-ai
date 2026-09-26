# 🤝 Me ajuda aí - Finanças Pessoais (PWA)

Aplicativo web progressivo (PWA) de gestão financeira pessoal com diagnóstico inteligente, controle de gastos recorrentes, conquistas financeiras gamificadas e gráficos mensais.

---

## 📱 Como funciona como APP (PWA)
Quando você publicar a URL na internet:
* **No Android (Google Chrome / Brave / Edge)**: Aparecerá automaticamente o botão **"Instalar App"** no topo da tela ou na barra do navegador. Ao instalar, ele cria um ícone na grade de aplicativos do celular e abre em tela cheia (sem barra de navegação).
* **No iPhone / iPad (Safari)**: Clique no botão **Compartilhar (ícone de quadrado com seta para cima)** e selecione **"Adicionar à Tela de Início"**. O app funcionará como um aplicativo nativo no iOS.
* **No Computador (Chrome / Edge)**: Clique no ícone de instalação ao lado da barra de endereço para ter um app desktop dedicado.
* **Offline First**: Graças ao Service Worker (`public/sw.js`), o app continua abrindo mesmo se o usuário estiver sem conexão à internet.

---

## 📁 Estrutura do Projeto

```
├── public/
│   ├── favicon.svg             # Ícone do navegador
│   ├── manifest.webmanifest    # Configuração PWA (nome, cores, splash)
│   ├── sw.js                   # Service Worker (Cache offline & PWA)
│   └── icons/
│       └── icon.svg            # Ícone do aplicativo em alta resolução
├── src/
│   ├── components/
│   │   ├── header.js           # Topbar com dados do usuário, tema e botão PWA
│   │   ├── login.js            # Tela de login (Google OAuth e E-mail)
│   │   ├── onboarding.js       # Questionário de diagnóstico financeiro
│   │   ├── badgeReveal.js      # Revelação comemorativa do perfil/badge
│   │   ├── dashboard.js        # KPIs, lançamentos, regras recorrentes e gráficos
│   │   ├── achievements.js     # Painel com 14 conquistas e patentes (Bronze a Platina)
│   │   ├── profile.js          # Resumo de perfil, metas e backup/restauração JSON
│   │   └── toast.js            # Alertas flutuantes elegantes
│   ├── services/
│   │   ├── auth.js             # Gerenciamento de sessão e provedores de login
│   │   ├── finance.js          # Cálculos, regras de recorrência e estatísticas
│   │   ├── gamification.js     # Regras de badges, perguntas e 14 conquistas
│   │   ├── pwa.js              # Gerenciador do instalador PWA
│   │   └── storage.js          # Camada de armazenamento e backup de dados
│   ├── styles/
│   │   ├── variables.css       # Tokens de cores, temas claro/escuro e sombras
│   │   ├── global.css          # Reset e estilos base
│   │   ├── components.css      # Botões, cartões, tabelas e formulários
│   │   └── layout.css          # Animações de fundo, telas e grids
│   └── main.js                 # Inicializador e roteamento de abas
├── index.html                  # HTML principal com tags PWA e viewport móvel
├── package.json                # Dependências e scripts
└── vite.config.js              # Configurações do Vite
```

---

## 🛠️ Comandos de Execução

### 1. Rodar localmente em desenvolvimento:
```bash
npm run dev
```

### 2. Gerar versão de produção para publicar:
```bash
npm run build
```

---

## 🚀 Como Publicar na Internet (Gratuito)

### Opção 1: Vercel (Recomendado - 2 minutos)
1. Crie uma conta gratuita em [vercel.com](https://vercel.com).
2. Conecte seu repositório do GitHub ou instale a CLI com `npm i -g vercel`.
3. No terminal desta pasta, digite:
   ```bash
   npx vercel
   ```
4. O Vercel gerará automaticamente um link seguro com SSL HTTPS (obrigatório para PWA).

### Opção 2: Netlify
1. Acesse [netlify.com](https://netlify.com).
2. Arraste a pasta `dist/` (gerada após o `npm run build`) para a tela do Netlify ou conecte com o GitHub.
