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

### Token GitHub Exposto
**Risco**: Token `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` está hardcoded no código

**Ação Necessária**:
1. ⚠️ **URGENTE**: Revogar este token no GitHub
2. Remover do código fonte
3. Se manter GitHub, usar variável de ambiente

### Área Administrativa
**Situação**: Não funcional atualmente

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

### Fase 3: Refatoração (Planejada)

#### 3.1 Backend e Banco de Dados
- [ ] Escolher tecnologia (SQLite vs PostgreSQL)
- [ ] Criar schema do banco de dados
- [ ] Migrar dados dos CSVs
- [ ] Criar API REST (Flask ou FastAPI)
  - Endpoints CRUD para timeline
  - Endpoints CRUD para campus
  - Endpoints CRUD para território
  - Autenticação JWT
  - Documentação Swagger/OpenAPI

#### 3.2 Nova Área Administrativa
- [ ] Interface de login segura
- [ ] Dashboard administrativo
- [ ] CRUD de eventos da timeline
- [ ] CRUD de dados do campus
- [ ] CRUD de transformações territoriais
- [ ] Upload de imagens
- [ ] Gestão de usuários
- [ ] Logs de auditoria

#### 3.3 Frontend (Opcional)
- [ ] Avaliar migração para framework moderno (React, Vue, etc.)
- [ ] Ou manter HTML/JS consumindo API REST
- [ ] Melhorias de UX/UI
- [ ] Progressive Web App (PWA)?
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
