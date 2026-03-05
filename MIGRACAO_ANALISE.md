# Análise de Migração - Site Memória IFSul Venâncio Aires

**Data Inicial**: 4 de março de 2026  
**Última Atualização**: 4 de março de 2026 - 19:00  
**Status**: ✅ **MIGRAÇÃO FASE 1 CONCLUÍDA COM SUCESSO**

---

## 🎉 STATUS ATUAL DA MIGRAÇÃO

### ✅ Fase 1: Implementação em Subpath (CONCLUÍDA)
- **URL Ativa**: https://ifva.duckdns.org/memoria/
- **Container**: Rodando e saudável (porta 8092)
- **Nginx**: Proxy reverso configurado e funcionando
- **SSL/HTTPS**: Ativo via Let's Encrypt
- **Status**: 100% funcional, todas as páginas testadas

### ⏯️ Fase 2: Migração para Domínio Próprio (PENDENTE)
- **Aguardando**: Decisão para alteração DNS
- **DNS Atual**: Ainda aponta para GitHub Pages
- **Quando executar**: Após período de testes em subpath

### 🔄 Fase 3: Refatoração (PLANEJADA)
- **Backend**: Migração de CSV para SQLite/PostgreSQL
- **Admin**: Nova área administrativa com autenticação JWT
- **API**: Backend REST (Flask/FastAPI)

---

## 📊 Situação Anterior (Antes da Migração)

### Hospedagem Original
- **Plataforma**: GitHub Pages  
- **URL**: https://mvmvasconcelos.github.io/site-memoria-ifsul-venancio  
- **Domínio**: https://memoriaifsulvenancio.com.br (redirecionado para GitHub Pages)  
- **Registrador**: Registro.br

### Tecnologias Usadas
- **Frontend**: HTML/CSS/JavaScript puro
- **Servidor**: Flask (apenas file server básico, pode ser substituído)
- **Dados**: CSV files (timeline.csv, campus.csv, territorio.csv)
- **Admin**: Área administrativa usando GitHub API (atualmente não funcional)
- **Problema**: Token GitHub exposto no código (risco de segurança)

---

## 🎯 Objetivo da Migração

Migrar o site para o servidor `ifva.duckdns.org` e depois redirecionar o domínio `memoriaifsulvenancio.com.br` para o novo local.

---

## 🔧 Análise Técnica do Servidor Destino

### Servidor IFVA
- **URL**: https://ifva.duckdns.org  
- **IP Externo**: 200.132.86.251  
- **IP Interno**: 128.1.1.49  
- **SSL**: Let's Encrypt (válido e renovável)  
- **Proxy Reverso**: Nginx configurado  
- **Containerização**: Docker Compose (todos os projetos)

### Infraestrutura Disponível
- ✅ Nginx com proxy reverso funcionando
- ✅ SSL/TLS configurado automaticamente
- ✅ Scripts de deploy automatizados (`novo.sh`, `exclui.sh`)
- ✅ Sistema de backup automatizado
- ✅ Portas disponíveis: 8080-8084, 8087-8089, 8091-8092, etc.

---

## 🚀 Opções de Implementação

### OPÇÃO 1: Site Estático com Nginx (RECOMENDADA)

**Descrição**: Servir HTML/CSS/JS diretamente via Nginx, sem Flask

**Vantagens**:
- ✅ Mais rápido e eficiente
- ✅ Menos overhead (sem Python/Flask)
- ✅ Padrão usado nos outros projetos do servidor
- ✅ Mais simples de manter

**Desvantagens**:
- ⚠️ Requer refazer área administrativa (já não funciona)

**Stack**:
```
Nginx (host) → Docker Container (Nginx Alpine) → HTML/CSS/JS estáticos
```

### OPÇÃO 2: Flask Dockerizado

**Descrição**: Manter Flask + Gunicorn em container Docker

**Vantagens**:
- ✅ Mantém estrutura atual
- ✅ Permite expansão futura com Python

**Desvantagens**:
- ❌ Mais pesado que Nginx puro
- ❌ Overhead desnecessário para site estático

**Stack**:
```
Nginx (host proxy) → Docker Container (Flask + Gunicorn) → HTML/CSS/JS
```

---

## 🗄️ Gerenciamento de Dados

### Situação Atual
- **Armazenamento**: CSV files
- **Edição**: GitHub API (não funcional, token exposto)
- **Localização**: Dentro do repositório

### OPÇÃO A: Substituir por SQLite (RECOMENDADA)

**Estrutura**:
```
Frontend (HTML/JS) ←→ API REST (Flask/FastAPI) ←→ SQLite
```

**Vantagens**:
- ✅ Banco de dados real
- ✅ Área administrativa própria e segura
- ✅ Backup mais confiável
- ✅ Queries mais flexíveis
- ✅ Sem dependência do GitHub

**Considerações**:
- Requer criar API backend
- Requer criar nova interface administrativa
- Mais trabalho inicial, mas sistema robusto

### OPÇÃO B: Manter CSV (Simples)

**Estrutura**:
```
Frontend (HTML/JS) → Lê CSVs diretamente (fetch)
```

**Vantagens**:
- ✅ Zero mudanças no frontend
- ✅ Implementação imediata
- ✅ Simples de manter

**Desvantagens**:
- ❌ Edição manual dos CSVs
- ❌ Sem área administrativa funcional
- ❌ Menos profissional

### OPÇÃO C: Backend API com CSV (Intermediária)

**Estrutura**:
```
Frontend (HTML/JS) ←→ API REST (Flask/FastAPI) ←→ CSV files
```

**Vantagens**:
- ✅ Mantém CSVs (fácil migração)
- ✅ API permite área administrativa
- ✅ Preparado para migrar para SQL depois

---

## 🌐 Configuração de Domínio - A QUESTÃO CRÍTICA

### Cenário Atual
- Domínio registrado: `memoriaifsulvenancio.com.br` (Registro.br)
- Redirecionamento atual: aponta para GitHub Pages

### OPÇÃO 1: Subpath `/memoria/` (Mais Rápida)

**URL Final**: `https://ifva.duckdns.org/memoria/`

**Configuração**:
- Nginx serve em subpath
- Usa SSL já existente
- Implementação em minutos

**Problema do Domínio**:
- ❌ **DNS não consegue redirecionar domínio para subpath!**
- `memoriaifsulvenancio.com.br` **NÃO PODE** apontar para `ifva.duckdns.org/memoria/`
- DNS só funciona com domínios/subdomínios completos, não paths

**Soluções para o Domínio**:
1. **Redirecionamento HTML/JS** (temporário):
   - Deixar no GitHub Pages uma página que redireciona
   - Rápido mas não elegante
   
2. **Desistir do domínio próprio**:
   - Usuários acessam direto `ifva.duckdns.org/memoria/`
   - Atualizar materiais/links

### OPÇÃO 2: Subdomínio DuckDNS (Intermediária)

**URL Final**: `https://memoria.ifva.duckdns.org`

**Configuração**:
```dns
memoriaifsulvenancio.com.br  →  CNAME  →  memoria.ifva.duckdns.org
```

**Passos**:
1. Criar subdomínio no DuckDNS
2. Configurar Nginx `server_name memoria.ifva.duckdns.org`
3. Gerar certificado SSL para o subdomínio
4. No Registro.br: criar CNAME apontando para `memoria.ifva.duckdns.org`

**Vantagens**:
- ✅ Domínio próprio funciona
- ✅ URL limpa sem subpath
- ✅ Usa infraestrutura DuckDNS

**Desvantagens**:
- ⚠️ Depende do DuckDNS aceitar subdomínios
- ⚠️ Mais complexo que subpath simples
- ⚠️ Precisa configurar novo certificado SSL

### OPÇÃO 3: Domínio Próprio Direto (Mais Profissional)

**URL Final**: `https://memoriaifsulvenancio.com.br`

**Configuração**:
```dns
memoriaifsulvenancio.com.br  →  A record  →  200.132.86.251 (IP do servidor)
```

**Passos**:
1. No Registro.br: Alterar DNS para apontar para IP do servidor
2. Configurar Nginx `server_name memoriaifsulvenancio.com.br`
3. Gerar certificado SSL Let's Encrypt para o domínio
4. Criar configuração separada do Nginx

**Vantagens**:
- ✅ Domínio próprio 100% funcional
- ✅ Mais profissional
- ✅ Independente do DuckDNS
- ✅ URL raiz limpa

**Desvantagens**:
- ⚠️ Se mudar de servidor, precisa alterar DNS novamente
- ⚠️ TTL de DNS pode levar horas para propagar

---

## 🔒 Questões de Segurança

### Área Administrativa
**Situação**: Desabilitada permanentemente na Fase 1

**Histórico**:
- Sistema antigo tentou usar GitHub como backend (limitações do GitHub Pages)
- Token exposto foi revogado em Março/2026
- Área admin bloqueada pelo Nginx (retorna 404)
- Código mantido apenas como referência

**Solução**: Fase 3 implementará backend próprio (Flask + SQLite + autenticação JWT)

**Opções**:
1. Desabilitar completamente
2. Criar nova com autenticação segura
3. Usar SQLite + API com JWT

---

## 📋 Recomendação Final

### Arquitetura Recomendada
```
Usuário 
  ↓
memoriaifsulvenancio.com.br (DNS aponta para IP do servidor)
  ↓
Nginx (server_name memoriaifsulvenancio.com.br) + SSL Let's Encrypt
  ↓
Docker Container (Nginx Alpine servindo HTML/CSS/JS)
  ↓
SQLite (para dados) + API REST opcional (para admin futuro)
```

### Passos Sugeridos (Fase 1 - MVP Rápido)
1. ✅ Criar Docker container com Nginx servindo site estático
2. ✅ Usar porta 8092 do host
3. ✅ Configurar Nginx para servir em `/memoria/` temporariamente
4. ✅ Manter CSVs (sem área admin)
5. ✅ Testar funcionamento completo
6. ⏸️ Depois decidir: domínio próprio ou subdomínio

### Passos Futuros (Fase 2 - Domínio)
7. Configurar DNS do domínio próprio
8. Criar certificado SSL para memoriaifsulvenancio.com.br
9. Atualizar Nginx para server_name com domínio próprio
10. Testar propagação DNS

### Passos Futuros (Fase 3 - Admin)
11. Migrar CSV para SQLite
12. Criar API REST (Flask ou FastAPI)
13. Criar nova área administrativa segura
14. Implementar autenticação JWT

---

## ❓ Decisões Tomadas e Implementadas

### ✅ DECISÃO 1: Arquitetura de Dados
- [x] **B) Manter CSV** - IMPLEMENTADO
  - Estrutura atual preservada
  - Sem área admin por enquanto
  - Preparado para migração futura

### ✅ DECISÃO 2: Configuração de Domínio
- [x] **A) Começar em subpath `/memoria/`** - IMPLEMENTADO
  - Site funcional em https://ifva.duckdns.org/memoria/
  - DNS ainda aponta para GitHub Pages
  - Migração para domínio próprio planejada

### ✅ DECISÃO 3: Área Administrativa
- [x] **A) Desabilitar por enquanto** - IMPLEMENTADO
  - Token GitHub exposto removido
  - Acesso bloqueado pelo Nginx (404)
  - Nova implementação planejada na refatoração

### ✅ DECISÃO 4: Porta do Host
- [x] **Porta 8092** - IMPLEMENTADO E FUNCIONANDO

---

## 🔧 Problemas Resolvidos Durante Implementação

### Problema 1: Link "Início" quebrado
- **Sintoma**: Redirecionava para raiz ao invés do subpath
- **Causa**: `href="/"` (path absoluto)
- **Solução**: Alterado para `href="index.html"` (path relativo)
- **Arquivo**: header.html
- **Commit**: `05b9faf`

### Problema 2: CSS não carregando em campus.html
- **Sintoma**: Página sem formatação
- **Causa**: Faltava `styles.css` (apenas territorio.css estava incluído)
- **Solução**: Adicionado `<link rel="stylesheet" href="src/css/styles.css">`
- **Arquivo**: campus.html
- **Commit**: `7322ecc`

### Problema 3: Favicons com path absoluto
- **Sintoma**: 404 nos favicons
- **Causa**: Paths começando com `/` apontavam para raiz
- **Solução**: Removido `/` inicial de todos os favicons
- **Arquivos**: campus.html, contact.html, timeline.html
- **Commit**: `7322ecc`

---

## 📋 Implementação Realizada

### Arquivos Criados
1. **Dockerfile** - Imagem Nginx Alpine otimizada
2. **docker-compose.yml** - Orquestração (porta 8092)
3. **nginx/nginx.conf** - Config interna do container
4. **nginx/memoria-ifsul-venancio-subpath.conf** - Config proxy reverso (subpath)
5. **nginx/memoria-ifsul-venancio.conf** - Config para domínio próprio (futuro)
6. **nginx/setup-nginx.sh** - Script automatizado de instalação
7. **.dockerignore** - Otimização de build
8. **README_DEPLOY.md** - Documentação completa de deploy
9. **MIGRACAO_ANALISE.md** - Este documento

### Arquivos Modificados
1. **admin.html** - Desabilitado com comentário explicativo
2. **header.html** - Link "Início" corrigido
3. **campus.html** - CSS adicionado, favicons corrigidos
4. **contact.html** - Favicons corrigidos
5. **timeline.html** - Favicons corrigidos

### Commits na Branch
```
0aa629d - feat: migração para Docker + Nginx com subpath
05b9faf - fix: corrige link Início para funcionar em subpath
7322ecc - fix: corrige CSS e paths de favicons para subpath
```

---

## 🎯 Próximos Passos (Roadmap)

### Fase 2: Migração DNS (Quando Decidir)

#### Passo 1: Alterar DNS no Registro.br
1. Remover todos registros A (185.199.x.x)
2. Remover registros AAAA (IPv6)
3. Remover CNAME do www
4. Adicionar:
   ```
   Tipo: A | Nome: @ | Valor: 200.132.86.251
   Tipo: A | Nome: www | Valor: 200.132.86.251
   ```

#### Passo 2: Aguardar Propagação (1-4h)
```bash
# Testar propagação
nslookup memoriaifsulvenancio.com.br
dig memoriaifsulvenancio.com.br
```

#### Passo 3: Reconfigurar Nginx
```bash
sudo ./nginx/setup-nginx.sh  # sem --subpath
```

#### Passo 4: Gerar SSL
```bash
sudo certbot --nginx -d memoriaifsulvenancio.com.br -d www.memoriaifsulvenancio.com.br
```

#### Passo 5: Merge e Deploy
```bash
git checkout master
git merge migracao-servidor-docker
git push origin master
```

### Fase 3: Refatoração Completa (Planejada)

> **Status**: Requisitos definidos em 4 de Março de 2026  
> **Objetivo**: Sistema CMS completo para gerenciar todo o conteúdo do site

---

#### 📋 Requisitos Funcionais Detalhados

##### 🔐 Autenticação
- **Usuário único** (apenas um administrador)
- Login simples: usuário e senha armazenados no banco SQLite
- Não haverá multi-usuários ou diferentes níveis de permissão

##### 📄 Gerenciamento de Páginas
- **CRUD completo de páginas**
  - Criar novas páginas
  - Editar páginas existentes
  - Excluir páginas
  - Reordenar páginas (drag and drop)
- **Páginas editáveis**:
  - ✅ `index.html` - tela inicial (apenas textos principais, mantém estrutura)
  - ✅ `timeline.html` - linha do tempo
  - ✅ `territorio.html` - transformações territoriais
  - ✅ `campus.html` - campus
  - ✅ `trabalhos.html` - trabalhos acadêmicos
  - ✅ `catalogacao.html` - catalogação
  - ❌ `contact.html` - continua estática
- **Páginas sem extensão**: URLs limpas (`/territorio` ao invés de `/territorio.html`)

##### 🎨 Tipos de Conteúdo

**1. Timeline (Linha do Tempo)**
- Tabela com lista de eventos
- Campos por item:
  - ✅ **Título** (obrigatório)
  - ✅ **Data** (obrigatório)
  - ⭕ Imagem (opcional)
  - ⭕ Fonte (opcional)
- Botões editar/excluir em cada linha
- **Drag and drop** para reordenar itens
- Ordenação customizável pelo admin

**2. Cards com Imagem/Texto** (estilo territorio.html)
- Para páginas como território, campus
- Campos por card:
  - Título
  - Texto/Descrição (com editor WYSIWYG)
  - Imagem
- Editor de texto rico (WYSIWYG)

**3. Galeria de Imagens** (trabalhos.html)
- Grid de imagens
- Upload múltiplo
- Título/legenda por imagem

**4. Lista/Cards de Itens** (catalogacao.html)
- Cards com informações estruturadas
- Campos customizáveis

##### ✏️ Editor de Conteúdo
- **Editor WYSIWYG** (TinyMCE ou CKEditor)
- Recursos necessários:
  - Negrito, itálico, sublinhado
  - Listas (ordenadas e não-ordenadas)
  - Links
  - Inserir imagens
  - Títulos/subtítulos
  - Alinhamento

##### 🖼️ Gerenciamento de Imagens
- **Upload via interface admin**
- **Armazenamento no filesystem** (pasta `uploads/` ou similar)
- Validação de tipo (PNG, JPG, etc.)
- Limite de tamanho (ex: 5MB)

##### 🧭 Menu de Navegação
- **Editável pelo admin**
- Funcionalidades:
  - Adicionar/remover itens do menu
  - Reordenar itens (drag and drop)
  - Definir título exibido
  - Definir visibilidade (mostrar/ocultar)
  - Link para páginas internas

##### 📦 Versionamento e Backup
- **Histórico de alterações**
- Rastrear quem editou e quando
- Possibilidade de restaurar versões anteriores
- Backup automático do banco SQLite

---

#### 🏗️ Arquitetura Técnica

##### Stack Tecnológica Definida
```
┌──────────────────────────────────────┐
│    CONTAINER ÚNICO (Docker)          │
│                                      │
│  ┌────────────────────────────────┐ │
│  │  Frontend (React Admin/Vue)    │ │
│  │  - Área pública                │ │
│  │  - Área administrativa         │ │
│  └────────────┬───────────────────┘ │
│               │ HTTP/REST API       │
│  ┌────────────▼───────────────────┐ │
│  │  Backend (Flask)               │ │
│  │  - API REST                    │ │
│  │  - Autenticação Session/JWT    │ │
│  │  - Upload de arquivos          │ │
│  └────────────┬───────────────────┘ │
│               │ SQLAlchemy ORM      │
│  ┌────────────▼───────────────────┐ │
│  │  Banco de Dados (SQLite)       │ │
│  │  - arquivo .db no volume       │ │
│  └────────────────────────────────┘ │
│                                      │
└──────────────────────────────────────┘
         │
         │ Porta 8092
         ▼
┌──────────────────────────────────────┐
│    Nginx Reverse Proxy (Host)        │
│    - SSL/HTTPS (Let's Encrypt)       │
│    - Proxy para o container          │
└──────────────────────────────────────┘
```

##### Tecnologias
- **Backend**: Flask (Python)
- **Frontend Admin**: React Admin ou Vue Admin
- **Frontend Público**: React/Vue (adaptando design atual)
- **Banco de Dados**: SQLite (arquivo único, fácil backup)
- **ORM**: SQLAlchemy
- **Editor WYSIWYG**: TinyMCE ou CKEditor
- **Deploy**: 1 container Docker (tudo junto)

##### Estrutura do Banco de Dados (Schema Proposto)

```sql
-- Usuário admin
CREATE TABLE user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Páginas do site
CREATE TABLE page (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT UNIQUE NOT NULL,          -- 'timeline', 'territorio', etc
    title TEXT NOT NULL,                -- título exibido
    type TEXT NOT NULL,                 -- 'timeline', 'cards', 'gallery', 'list'
    content TEXT,                       -- conteúdo geral (JSON ou HTML)
    is_visible BOOLEAN DEFAULT 1,       -- visível no menu?
    menu_order INTEGER DEFAULT 0,       -- ordem no menu
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Itens de timeline (eventos históricos)
CREATE TABLE timeline_item (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    date TEXT NOT NULL,                 -- ou DATE type
    image_path TEXT,
    source TEXT,
    order_index INTEGER DEFAULT 0,      -- para drag and drop
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (page_id) REFERENCES page(id) ON DELETE CASCADE
);

-- Cards (para território, campus, etc)
CREATE TABLE card_item (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,                   -- HTML do editor WYSIWYG
    image_path TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (page_id) REFERENCES page(id) ON DELETE CASCADE
);

-- Galeria de imagens (para trabalhos)
CREATE TABLE gallery_item (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_id INTEGER NOT NULL,
    title TEXT,
    caption TEXT,
    image_path TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (page_id) REFERENCES page(id) ON DELETE CASCADE
);

-- Menu de navegação
CREATE TABLE menu_item (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_id INTEGER,                    -- pode ser NULL para links externos
    label TEXT NOT NULL,
    url TEXT,                           -- URL customizada (ex: /contact)
    is_visible BOOLEAN DEFAULT 1,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (page_id) REFERENCES page(id) ON DELETE SET NULL
);

-- Histórico de alterações (audit log)
CREATE TABLE content_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,          -- 'page', 'timeline_item', 'card_item', etc
    entity_id INTEGER NOT NULL,
    action TEXT NOT NULL,               -- 'create', 'update', 'delete'
    old_data TEXT,                      -- JSON do estado anterior
    new_data TEXT,                      -- JSON do estado novo
    user_id INTEGER NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id)
);
```

##### API REST (Endpoints Principais)

```
Autenticação
POST   /api/auth/login          - Login
POST   /api/auth/logout         - Logout
GET    /api/auth/me             - Dados do usuário logado

Páginas
GET    /api/pages               - Listar todas páginas
GET    /api/pages/:slug         - Obter página específica
POST   /api/pages               - Criar página
PUT    /api/pages/:id           - Atualizar página
DELETE /api/pages/:id           - Deletar página
PUT    /api/pages/reorder       - Reordenar páginas

Timeline
GET    /api/timeline/:page_id   - Listar itens
POST   /api/timeline            - Criar item
PUT    /api/timeline/:id        - Atualizar item
DELETE /api/timeline/:id        - Deletar item
PUT    /api/timeline/reorder    - Reordenar itens (drag and drop)

Cards
GET    /api/cards/:page_id      - Listar cards
POST   /api/cards               - Criar card
PUT    /api/cards/:id           - Atualizar card
DELETE /api/cards/:id           - Deletar card

Galeria
GET    /api/gallery/:page_id    - Listar imagens
POST   /api/gallery             - Upload imagem
DELETE /api/gallery/:id         - Deletar imagem

Menu
GET    /api/menu                - Obter estrutura do menu
PUT    /api/menu                - Atualizar menu completo
PUT    /api/menu/reorder        - Reordenar itens

Upload
POST   /api/upload              - Upload de imagem/arquivo

Histórico
GET    /api/history/:entity_type/:entity_id  - Histórico de um item
POST   /api/history/restore/:id              - Restaurar versão anterior
```

---

#### 🎯 MVP (Mínimo Produto Viável)

##### Prioridade 1 - Essencial
- [x] Definir requisitos (CONCLUÍDO)
- [ ] Setup do projeto Flask
- [ ] Criar schema do banco SQLite
- [ ] **Autenticação básica**
  - Login/logout
  - Session management
  - Proteção de rotas admin
- [ ] **CRUD Timeline**
  - Endpoints API completos
  - Interface admin para gerenciar eventos
  - Migrar dados do CSV atual
- [ ] **CRUD Cards/Páginas**
  - Editor WYSIWYG integrado (TinyMCE)
  - Upload de imagens
  - Sistema de páginas básico

##### Prioridade 2 - Importante
- [ ] **Drag and drop** para reordenação
  - Timeline items
  - Cards
  - Menu items
- [ ] **Gerenciamento de menu**
  - Adicionar/remover itens
  - Visibilidade
  - Ordenação
- [ ] Frontend público consumindo API

##### Prioridade 3 - Desejável
- [ ] Versionamento e histórico
- [ ] Backup automático
- [ ] Galeria de imagens
- [ ] Busca/filtros na admin
- [ ] Preview antes de publicar

---

#### 📦 Estrutura do Projeto (Sugestão)

```
site-memoria-ifsul-venancio/
├── backend/                    # Flask API
│   ├── app/
│   │   ├── __init__.py
│   │   ├── models.py          # SQLAlchemy models
│   │   ├── routes/
│   │   │   ├── auth.py
│   │   │   ├── pages.py
│   │   │   ├── timeline.py
│   │   │   ├── cards.py
│   │   │   └── upload.py
│   │   ├── schemas.py         # Pydantic validation
│   │   └── database.py        # DB config
│   ├── migrations/            # Alembic migrations
│   ├── uploads/               # Imagens uploadadas
│   ├── requirements.txt
│   └── run.py
│
├── frontend/                   # React/Vue Admin + Público
│   ├── public/                # Assets públicos
│   ├── src/
│   │   ├── admin/             # Área administrativa
│   │   │   ├── pages/
│   │   │   ├── components/
│   │   │   └── App.jsx
│   │   ├── site/              # Site público
│   │   │   ├── pages/
│   │   │   └── components/
│   │   └── api/               # Cliente API
│   ├── package.json
│   └── vite.config.js
│
├── database/                   # SQLite database
│   ├── memoria.db
│   └── backups/
│
├── Dockerfile                  # Build único
├── docker-compose.yml
├── nginx/
│   └── nginx.conf
└── README_REFATORACAO.md       # Doc técnica detalhada
```

---

#### ⏱️ Estimativa de Desenvolvimento

| Fase | Descrição | Tempo | Status |
|------|-----------|-------|--------|
| **Planejamento** | Requisitos e arquitetura | 1 semana | ✅ Concluído |
| **Setup** | Projeto Flask + DB + Migrations | 3-5 dias | 🔄 Em andamento (base pronta) |
| **Backend MVP** | Auth + CRUD Timeline + Cards | 2-3 semanas | 🔄 Em andamento |
| **Frontend Admin** | React Admin / Vue Admin setup | 2-3 semanas | 🔄 Em andamento (admin HTML integrado à API) |
| **Integração** | Frontend público + API | 1-2 semanas | ⏸️ Aguardando |
| **Features Extras** | Drag-drop, menu, histórico | 1-2 semanas | ⏸️ Aguardando |
| **Testes** | QA, ajustes, bugs | 1 semana | ⏸️ Aguardando |
| **Deploy** | Container unificado + produção | 2-3 dias | ⏸️ Aguardando |
| **Total** | | **8-12 semanas** | |

### ✅ Atualização em 05/03/2026 - Início efetivo da Fase 3

- Estrutura `backend/` criada com Flask + SQLAlchemy + SQLite
- Endpoints implementados:
  - `auth`: login/logout/me
  - `pages`: CRUD + reorder
  - `timeline`: CRUD + reorder
  - `cards`: CRUD + reorder
  - `gallery`: CRUD + reorder
- Script de migração CSV → SQLite implementado (`backend/scripts/migrate_csv_to_db.py`)
- Stack dedicada da fase 3 criada (`Dockerfile.fase3`, `docker-compose.fase3.yml`)
- `admin.html` integrado ao backend novo com credencial inicial:
  - usuário: `admin`
  - senha: `ifsul2025`
- Fluxo ajustado para operação em subpath remoto:
  - acesso público via `https://ifva.duckdns.org/memoria/`
  - admin via `https://ifva.duckdns.org/memoria/admin`
  - API via `https://ifva.duckdns.org/memoria/api/*`
- Upload de imagens implementado:
  - endpoint autenticado `POST /api/upload`
  - integração no modal de evento da timeline (upload antes de salvar)
- CRUD de menu implementado:
  - `GET /api/menu`
  - `PUT /api/menu`
  - `PUT /api/menu/reorder`
  - carga inicial de menu via migração (`migrate_csv_to_db.py`)
- Interface admin para menu implementada:
  - adicionar/remover item
  - editar rótulo/URL
  - visibilidade (mostrar/ocultar)
  - ordenação manual (subir/descer)
  - persistência via `PUT /api/menu`
- Interface admin para conteúdo de páginas implementada:
  - edição de `content` para páginas `trabalhos` e `catalogacao`
  - persistência via `PUT /api/pages/:id`
- Interface admin para galeria de trabalhos implementada:
  - edição inline de itens (título, imagem e legenda)
  - adicionar/remover item
  - ordenação manual (subir/descer)
  - upload de imagem por item (integração com `POST /api/upload`, pasta `trabalhos`)
  - pré-visualização imediata da imagem na linha ao selecionar arquivo/caminho
  - persistência via endpoints `/api/gallery`
- Header público integrado ao menu dinâmico:
  - carregamento de `GET /api/menu` em `src/js/main.js`
  - fallback para menu estático em caso de erro da API
  - suporte ao subpath remoto `/memoria`
- Conteúdo público parcialmente migrado para API:
  - `src/js/timeline.js` consumindo `/api/pages/timeline` + `/api/timeline/:page_id`
  - `src/js/campus.js` consumindo `/api/pages/campus` + `/api/cards/:page_id`
  - `src/js/territorio.js` consumindo `/api/pages/territorio` + `/api/cards/:page_id`
  - `src/js/trabalhos.js` consumindo `/api/pages/trabalhos` (API-first com fallback para conteúdo estático)
    - sem `content`, fallback intermediário para `/api/gallery/:page_id`
  - `src/js/catalogacao.js` consumindo `/api/pages/catalogacao` (API-first com fallback para conteúdo estático)
  - fallback para CSV/HTML estático mantido para segurança operacional

- [ ] Otimizações de performance

#### 3.4 Infraestrutura
- [ ] Configurar backup de banco de dados
- [ ] Monitoramento e alertas
- [ ] CI/CD pipeline
- [ ] Testes automatizados
- [ ] Documentação de API

---

## 💡 Recomendações para Refatoração

### Arquitetura Sugerida
```
Frontend (HTML/JS ou React)
    ↓ HTTP/HTTPS
API REST (FastAPI/Flask)
    ↓
ORM (SQLAlchemy)
    ↓
Banco de Dados (PostgreSQL ou SQLite)
```

### Tecnologias Recomendadas

**Backend API**:
- **FastAPI** (recomendado): Moderno, rápido, documentação automática
- **Flask**: Mais simples, boa para APIs leves
- **SQLAlchemy**: ORM poderoso para ambos

**Banco de Dados**:
- **PostgreSQL**: Se precisar de escalabilidade e queries complexas
- **SQLite**: Se o volume de dados for pequeno/médio (atual uso com CSVs sugere isso)

**Frontend**:
- **Manter HTML/JS**: Menos trabalho, já funciona
- **React**: Se quiser interface moderna e interativa
- **Vue.js**: Mais leve que React, curva de aprendizado menor

**Autenticação**:
- **JWT**: Tokens stateless, ideal para APIs
- **OAuth2**: Se precisar login social (Google, etc.)

### Estrutura de Projeto Sugerida
```
site-memoria-ifsul-venancio/
├── frontend/              # Site público
│   ├── index.html
│   ├── src/
│   └── ...
├── admin-frontend/        # Painel admin (pode ser separado)
│   └── ...
├── backend/              # API REST
│   ├── app/
│   │   ├── __init__.py
│   │   ├── models.py     # Models do banco
│   │   ├── schemas.py    # Schemas Pydantic
│   │   ├── crud.py       # Operações DB
│   │   ├── api/          # Endpoints
│   │   └── auth/         # Autenticação
│   ├── tests/
│   ├── requirements.txt
│   └── main.py
├── database/
│   └── migrations/
├── docker-compose.yml    # Frontend + Backend + DB
└── README.md
```

---

## 📝 Notas Técnicas

### Recursos do Servidor Usados
- **Porta Host**: 8092
- **Porta Container**: 80 (Nginx interno)
- **Acesso Público**: HTTPS via proxy reverso
- **SSL**: Let's Encrypt (compartilhado ou novo certificado)
- **Backup**: Será incluído no backup automatizado do servidor

### Conformidade com Padrões do Servidor
- ✅ Docker Compose
- ✅ Nginx proxy reverso
- ✅ Estrutura de diretórios padronizada
- ✅ Scripts de setup automatizados
- ✅ Configuração em `/home/ifsul/docs/configs/`
- ✅ Inclusão no `pathtoprojects.json`

---

## 🎯 Próximos Passos

**Aguardando decisões do usuário sobre**:
1. Arquitetura de dados (CSV vs SQLite)
2. Estratégia de domínio (subpath, subdomínio ou domínio direto)
3. Prioridade (MVP rápido vs. Solução completa)

**Após decisões**:
- Criar estrutura Docker
- Configurar Nginx
- Implementar conforme escolhas
- Documentar setup final
