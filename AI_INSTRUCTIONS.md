# Instruções para Agente de IA - Site Memória IFSul Venâncio Aires

> **Data de Criação**: 5 de Março de 2026  
> **Projeto**: Sistema de Memória Institucional do IFSul Campus Venâncio Aires  
> **Status Atual**: Fase 1 concluída (deploy em subpath) | Fase 3 em planejamento (refatoração CMS)

---

## 🚨 REGRAS CRÍTICAS - LEIA PRIMEIRO

### ⛔ NUNCA FAÇA ISSO

1. **NUNCA instale pacotes diretamente no servidor host**
   - ❌ `sudo apt install python3-flask`
   - ❌ `pip install sqlalchemy`
   - ❌ `npm install -g vite`
   - ✅ Tudo deve ser feito **DENTRO dos containers Docker**

2. **NUNCA execute aplicações diretamente no terminal do host**
   - ❌ `python app.py`
   - ❌ `npm run dev`
   - ❌ `flask run`
   - ✅ Use `docker-compose up` ou `docker exec`

3. **NUNCA modifique configurações globais do Nginx host sem backup**
   - ❌ Editar `/etc/nginx/sites-available/default` diretamente
   - ✅ Use arquivos em `/etc/nginx/conf.d/apps/` (já existe setup-nginx.sh)

4. **NUNCA exponha portas além das já configuradas**
   - Firewall permite apenas: 80, 443, 9090-9095
   - Porta 8092 já está em uso para este projeto
   - ✅ Use o Nginx reverse proxy na porta 443

5. **NUNCA commite credenciais, tokens ou senhas**
   - ❌ Tokens de API no código
   - ❌ Senhas em arquivos de configuração
   - ✅ Use variáveis de ambiente (`.env` no `.gitignore`)

---

## 📁 Contexto do Projeto

### Informações Gerais

- **Nome**: Site Memória IFSul Venâncio Aires
- **Domínio Futuro**: https://memoriaifsulvenancio.com.br
- **URL Atual**: https://ifva.duckdns.org/memoria/
- **Repositório**: GitHub (branch: `migracao-servidor-docker`)
- **Responsável**: André Ruschel de Assumpção
- **Orientadora**: Professora Maria Raquel Caetano
- **Programa**: ProfEPT/2025

### Objetivo do Projeto

Preservar e divulgar a memória institucional do IFSul Campus Venâncio Aires através de:
- Linha do tempo histórica
- Transformações territoriais
- Dados do campus
- Trabalhos acadêmicos
- Catalogação de documentos

---

## 🏗️ Arquitetura do Servidor

### Estrutura do Host

```
Servidor: ifva.duckdns.org
IP Público: 200.132.86.251
IP Interno: 128.1.1.49
OS: Ubuntu Server 24.04
```

### Infraestrutura

```
┌────────────────────────────────────────┐
│        Internet (HTTPS/HTTP)           │
└────────────────┬───────────────────────┘
                 │ Portas 80/443
┌────────────────▼───────────────────────┐
│  Nginx Reverse Proxy (Host)            │
│  - Let's Encrypt SSL                   │
│  - /etc/nginx/conf.d/apps/*.conf       │
└────────────────┬───────────────────────┘
                 │ Proxy Pass
    ┌────────────┼────────────┐
    │            │            │
┌───▼───┐   ┌───▼───┐   ┌───▼───┐
│ Cont1 │   │ Cont2 │   │ ContN │
│ :9090 │   │ :8092 │   │ :9095 │
└───────┘   └───────┘   └───────┘
              ↑
         Memoria IFSul
         (Este Projeto)
```

### Portas e Firewall

- **Portas Abertas Externamente**: 80 (HTTP), 443 (HTTPS)
- **Portas Internas para Containers**: 9090-9095, 8092
- **Porta deste Projeto**: 8092 (container:80 → host:8092)
- **Acesso Externo**: Via Nginx reverse proxy na porta 443

### Nginx Host

- **Versão**: 1.24.0 (Ubuntu)
- **Configuração Principal**: `/etc/nginx/nginx.conf`
- **Apps**: `/etc/nginx/conf.d/apps/`
- **SSL**: Let's Encrypt (auto-renovação configurada)
- **Config Atual**: `/etc/nginx/conf.d/apps/memoria-ifsul-venancio.conf`

---

## 🐳 Docker - Estado Atual

### Container Ativo

```yaml
Nome: memoria-ifsul-venancio
Image: site-memoria-ifsul-venancio-web
Base: nginx:alpine
Porta: 8092:80
Status: Running
Health Check: Ativado
```

### Arquivos Docker

- `Dockerfile` - Nginx Alpine com site estático
- `docker-compose.yml` - Orquestração do container
- `.dockerignore` - Otimização de build
- `nginx/nginx.conf` - Config interna do container
- `nginx/memoria-ifsul-venancio-subpath.conf` - Proxy reverso (ativo)
- `nginx/memoria-ifsul-venancio.conf` - Config para domínio (futuro)
- `nginx/setup-nginx.sh` - Script de instalação automática

### Comandos Docker Úteis

```bash
# Acessar projeto
cd /home/ifsul/projects/site-memoria-ifsul-venancio

# Rebuild e restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Logs
docker-compose logs -f

# Shell dentro do container
docker exec -it memoria-ifsul-venancio sh

# Verificar saúde
docker ps
docker inspect memoria-ifsul-venancio | grep -A 5 Health
```

---

## 📂 Estrutura do Projeto

### Arquivos Importantes

```
/home/ifsul/projects/site-memoria-ifsul-venancio/
├── index.html              # Página inicial
├── timeline.html           # Linha do tempo
├── territorio.html         # Transformações territoriais
├── campus.html             # Dados do campus
├── trabalhos.html          # Trabalhos acadêmicos
├── catalogacao.html        # Catalogação
├── contact.html            # Contato (estática)
├── header.html             # Cabeçalho compartilhado
├── footer.html             # Rodapé compartilhado
├── app.py                  # Python (funcionalidades futuras)
│
├── src/
│   ├── css/                # Estilos
│   ├── js/                 # Scripts
│   ├── images/             # Imagens
│   └── *.csv               # Dados (timeline, campus, territorio)
│
├── nginx/                  # Configs Nginx
├── Dockerfile              # Build do container
├── docker-compose.yml      # Orquestração
│
├── README.md               # Documentação pública
├── README_DEPLOY.md        # Doc de deployment
├── MIGRACAO_ANALISE.md     # Análise técnica detalhada
├── ADMIN_README.md         # Instruções administrativas
└── AI_INSTRUCTIONS.md      # Este arquivo
```

### Dados Atuais (CSV)

- `src/timeline.csv` - ~30 eventos históricos (7KB)
- `src/campus.csv` - ~10 itens do campus (2KB)
- `src/territorio.csv` - ~3 transformações (689B)

**⚠️ IMPORTANTE**: Admin desabilitado (admin.html bloqueado pelo Nginx). Sistema antigo não funcional.

---

## 🔄 Estado da Migração

### ✅ Fase 1: CONCLUÍDA (Deploy em Subpath)

- Container Docker criado e funcional
- Nginx configurado com reverse proxy
- Site acessível em https://ifva.duckdns.org/memoria/
- SSL/HTTPS funcionando via Let's Encrypt
- Bugs corrigidos:
  - Link "Início" (href="/" → href="index.html")
  - CSS faltando em campus.html
  - Paths de favicon absolutos → relativos

**Branch Git**: `migracao-servidor-docker` (5 commits)

### ⏸️ Fase 2: PENDENTE (Migração DNS)

Aguardando decisão para:
1. Alterar DNS no Registro.br (A records → 200.132.86.251)
2. Aguardar propagação (1-4h)
3. Reconfigurar Nginx (sem --subpath)
4. Gerar certificado SSL para domínio
5. Merge para master

### 🔄 Fase 3: PLANEJADO (Refatoração CMS)

**Status**: Requisitos definidos (4-5 Mar 2026)

Transformar site estático em CMS completo:
- Backend: Flask + SQLAlchemy + SQLite
- Frontend Admin: React Admin ou Vue Admin
- Frontend Público: React/Vue
- Container único Docker
- CRUD de páginas e conteúdo
- Editor WYSIWYG (TinyMCE/CKEditor)
- Menu editável
- Versionamento de conteúdo
- URLs limpas (sem .html)

**Estimativa**: 8-12 semanas  
**Ver detalhes**: [MIGRACAO_ANALISE.md](MIGRACAO_ANALISE.md#fase-3-refatoração-completa-planejada)

---

## 🛠️ Workflow de Desenvolvimento

### 1. Modificações no Código

```bash
# 1. Entrar no diretório
cd /home/ifsul/projects/site-memoria-ifsul-venancio

# 2. Editar arquivos (HTML, CSS, JS)
# Use o editor de sua preferência

# 3. Testar localmente (via container)
docker-compose down
docker-compose up --build -d

# 4. Verificar logs
docker-compose logs -f

# 5. Testar no navegador
curl -I https://ifva.duckdcs.org/memoria/
```

### 2. Modificações no Container/Dockerfile

```bash
# 1. Editar Dockerfile ou docker-compose.yml

# 2. Rebuild completo
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# 3. Validar
docker ps
docker logs memoria-ifsul-venancio
```

### 3. Modificações no Nginx (Proxy Reverso)

```bash
# 1. Editar arquivo de config
vim nginx/memoria-ifsul-venancio-subpath.conf

# 2. Usar script de setup (recomendado)
sudo ./nginx/setup-nginx.sh --subpath

# 3. OU instalar manualmente:
sudo cp nginx/memoria-ifsul-venancio-subpath.conf /etc/nginx/conf.d/apps/
sudo nginx -t
sudo systemctl reload nginx

# 4. Verificar
sudo nginx -t
curl -I https://ifva.duckdns.org/memoria/
```

### 4. Controle de Versão (Git)

```bash
# Status
git status
git log --oneline -5

# Adicionar mudanças
git add arquivo.html
git commit -m "feat: descrição da funcionalidade"

# Ver diferenças
git diff
git diff --staged

# Branch
git branch
git checkout -b nova-feature

# NUNCA commite diretamente na master sem teste
```

---

## 🔐 Segurança

### Boas Práticas

1. **Variáveis de Ambiente**
   ```bash
   # Criar .env (já está no .gitignore)
   echo "SECRET_KEY=valor_aleatorio_seguro" > .env
   echo "DB_PASSWORD=senha_forte" >> .env
   
   # Usar no docker-compose.yml
   environment:
     - SECRET_KEY=${SECRET_KEY}
   ```

2. **Tokens e Credenciais**
   - NUNCA hardcode em código
   - Use variáveis de ambiente
   - Revogue tokens expostos imediatamente

3. **Backup Antes de Mudanças**
   ```bash
   # Backup do projeto
   tar -czf backup-$(date +%Y%m%d-%H%M%S).tar.gz \
     /home/ifsul/projects/site-memoria-ifsul-venancio
   
   # Backup do banco (futuro)
   cp database/memoria.db database/backups/memoria-$(date +%Y%m%d).db
   ```

---

## 📚 Documentação de Referência

### Arquivos de Documentação

1. **[README.md](README.md)** - Visão geral do projeto (pública)
2. **[README_DEPLOY.md](README_DEPLOY.md)** - Guia completo de deployment
3. **[MIGRACAO_ANALISE.md](MIGRACAO_ANALISE.md)** - Análise técnica da migração
4. **[AI_INSTRUCTIONS.md](AI_INSTRUCTIONS.md)** - Instruções para agente de IA (este arquivo)
5. **[info.md](info.md)** - Link simbólico para `/home/ifsul/docs/info.md` (infraestrutura do servidor)

### Comandos de Referência Rápida

```bash
# Ver documentação do servidor
cat /home/ifsul/docs/info.md

# Ver estrutura do projeto
tree -L 2 /home/ifsul/projects/site-memoria-ifsul-venancio

# Ver containers ativos
docker ps

# Ver configurações Nginx
ls -lh /etc/nginx/conf.d/apps/

# Testar SSL
curl -I https://ifva.duckdns.org/memoria/

# Ver logs do Nginx host
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

---

## 🎯 Tarefas Comuns

### Adicionar Nova Página

```bash
# 1. Criar HTML
cat > nova-pagina.html << 'EOF'
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Nova Página</title>
    <link rel="stylesheet" href="src/css/styles.css">
</head>
<body>
    <div id="header"></div>
    <main>
        <!-- Conteúdo -->
    </main>
    <div id="footer"></div>
    <script src="src/js/main.js"></script>
</body>
</html>
EOF

# 2. Adicionar link no header.html
# (editar manualmente)

# 3. Rebuild container
docker-compose up --build -d

# 4. Testar
curl https://ifva.duckdns.org/memoria/nova-pagina.html
```

### Adicionar Dados ao CSV

```bash
# 1. Editar CSV
vim src/timeline.csv

# 2. Validar formato (opcional)
head -n 3 src/timeline.csv

# 3. Não precisa rebuild (arquivos estáticos)
# Apenas recarregue a página no navegador

# 4. Commit mudanças
git add src/timeline.csv
git commit -m "data: adiciona novo evento na timeline"
```

### Atualizar Imagem

```bash
# 1. Upload da imagem para src/images/
scp imagem.jpg usuario@ifva.duckdns.org:/home/ifsul/projects/site-memoria-ifsul-venancio/src/images/timeline/

# 2. Verificar permissões
chmod 644 src/images/timeline/imagem.jpg

# 3. Rebuild (se necessário)
docker-compose up --build -d

# 4. Testar URL
curl -I https://ifva.duckdns.org/memoria/src/images/timeline/imagem.jpg
```

### Debugar Problema

```bash
# 1. Ver logs do container
docker-compose logs -f

# 2. Ver logs do Nginx host
sudo tail -f /var/log/nginx/error.log

# 3. Entrar no container
docker exec -it memoria-ifsul-venancio sh
ls -la /usr/share/nginx/html/

# 4. Testar configuração Nginx
sudo nginx -t

# 5. Ver status do container
docker ps -a
docker inspect memoria-ifsul-venancio

# 6. Verificar saúde
docker inspect memoria-ifsul-venancio | grep -A 10 Health
```

---

## 🚀 Preparação para Refatoração (Fase 3)

### Quando Iniciar a Implementação do CMS

#### 1. Criar Nova Branch

```bash
git checkout -b refatoracao-cms
```

#### 2. Criar Estrutura de Diretórios

```bash
mkdir -p backend/{app/routes,migrations,uploads}
mkdir -p frontend/{public,src/{admin,site,api}}
mkdir -p database/backups
```

#### 3. Setup Backend (Dentro do Container)

**⚠️ IMPORTANTE**: Não instalar no host!

Criar `backend/requirements.txt`:
```txt
Flask==3.0.0
Flask-SQLAlchemy==3.1.1
Flask-Migrate==4.0.5
Flask-CORS==4.0.0
Werkzeug==3.0.1
python-dotenv==1.0.0
```

Criar `backend/Dockerfile`:
```dockerfile
FROM python:3.11-alpine
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["python", "run.py"]
```

#### 4. Setup Frontend (Dentro do Container)

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
```

#### 5. Docker Compose Unificado

```yaml
services:
  memoria-cms:
    build: .
    ports:
      - "8092:5000"
    volumes:
      - ./database:/app/database
      - ./uploads:/app/uploads
    environment:
      - FLASK_ENV=production
      - SECRET_KEY=${SECRET_KEY}
    restart: unless-stopped
```

#### 6. Migração de Dados

```bash
# Dentro do container
docker exec -it memoria-cms python scripts/migrate_csv_to_db.py
```

---

## ❓ Troubleshooting

### Container não inicia

```bash
# Ver erro específico
docker-compose logs

# Rebuild do zero
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### Site não carrega (502/503)

```bash
# Verificar se container está rodando
docker ps | grep memoria

# Verificar logs
docker logs memoria-ifsul-venancio

# Verificar Nginx host
sudo nginx -t
sudo systemctl status nginx
```

### CSS/JS não carrega

```bash
# Verificar paths no container
docker exec -it memoria-ifsul-venancio sh
ls -la /usr/share/nginx/html/src/css/
ls -la /usr/share/nginx/html/src/js/

# Verificar permissões
# Devem ser legíveis (644 para arquivos)
```

### Mudanças não aparecem

```bash
# Cache do navegador - force refresh (Ctrl+Shift+R)

# Rebuild container
docker-compose up --build -d

# Verificar se arquivo foi copiado
docker exec -it memoria-ifsul-venancio cat /usr/share/nginx/html/index.html
```

---

## 📞 Contatos e Recursos

### Documentação Técnica

- **Docker**: https://docs.docker.com/
- **Nginx**: https://nginx.org/en/docs/
- **Flask**: https://flask.palletsprojects.com/
- **SQLAlchemy**: https://docs.sqlalchemy.org/
- **React Admin**: https://marmelab.com/react-admin/

### Arquivos de Configuração do Servidor

- `/home/ifsul/docs/info.md` - Documentação completa do servidor
- `/home/ifsul/docs/configs/` - Configurações diversas

---

## ✅ Checklist Antes de Cada Tarefa

- [ ] Li a documentação relevante (README_DEPLOY.md, MIGRACAO_ANALISE.md)
- [ ] Entendi que tudo deve rodar em containers
- [ ] Fiz backup antes de mudanças críticas
- [ ] Estou na branch correta (`migracao-servidor-docker` ou outra)
- [ ] Testei localmente antes de commit
- [ ] Verifiquei logs após mudanças
- [ ] Documentei mudanças significativas
- [ ] Não commitei credenciais ou tokens

---

## 🎓 Resumo Executivo para IA

**VOCÊ É UM AGENTE DE IA TRABALHANDO EM:**
- Projeto de memória institucional (site educacional)
- Servidor com múltiplos containers Docker
- Infraestrutura containerizada (NUNCA instale no host)
- Nginx como proxy reverso (já configurado)
- Em processo de refatoração (estático → CMS)

**RESPONSABILIDADES:**
- Seguir arquitetura containerizada
- Respeitar configurações existentes do servidor
- Fazer backups antes de mudanças críticas
- Documentar decisões importantes
- Testar no container antes de commit

**NUNCA:**
- Instalar pacotes diretamente no host
- Expor novas portas sem configurar proxy
- Commitar credenciais
- Modificar configurações globais sem backup
- Executar código fora de containers

**SEMPRE:**
- Usar Docker para tudo
- Consultar documentação existente
- Testar mudanças localmente
- Verificar logs após deploy
- Documentar em PT-BR

---

**Última Atualização**: 5 de Março de 2026  
**Versão**: 1.0  
**Autor**: Sistema de IA baseado em análise do projeto

