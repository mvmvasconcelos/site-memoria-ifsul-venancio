# Site Memória IFSul Venâncio Aires

**Projeto de Memória - IFSul Campus Venâncio Aires**

[![Status](https://img.shields.io/badge/status-active-success.svg)]()
[![Version](https://img.shields.io/badge/version-2.0-blue.svg)]()
[![Deploy](https://img.shields.io/badge/deploy-subpath-yellow.svg)]()
[![License](https://img.shields.io/badge/license-MIT-green.svg)]()

---

## 🎯 Status Atual

**Ambiente**: Servidor IFVA (Docker)  
**URL Atual**: https://ifva.duckdns.org/memoria/  
**URL Futura**: https://memoriaifsulvenancio.com.br  
**Branch Ativa**: `migracao-servidor-docker`  
**Última Atualização**: 4 de março de 2026

### ✅ Implementado
- Container Docker rodando (porta 8092)
- Nginx proxy reverso configurado
- SSL/HTTPS ativo
- Site 100% funcional em subpath
- Área admin desabilitada (segurança)

### ⏯️ Pendente
- Migração DNS para domínio próprio
- Merge para branch master
- Refatoração com backend API

---

## 📚 Sobre o Projeto

Este site é oriundo da Pesquisa de Mestrado ProfEPT, intitulada: **IMPLANTAÇÃO DO CAMPUS VENÂNCIO AIRES. HISTÓRIA E MEMÓRIA: DO CAMPO AO CÂMPUS**.

O objetivo é resgatar a memória e a história da implantação do câmpus do Instituto Federal de Educação, Ciência e Tecnologia do Rio Grande do Sul, no município de Venâncio Aires, desde o período anterior à sua implantação em 2005 até a inauguração em 2012.

**Acesso Atual**: [https://ifva.duckdns.org/memoria/](https://ifva.duckdns.org/memoria/)  
**Acesso Futuro**: [https://memoriaifsulvenancio.com.br](https://memoriaifsulvenancio.com.br)

---

## 🚀 Tecnologias

- **Frontend**: HTML5, CSS3, JavaScript puro
- **Servidor**: Nginx (Alpine Linux)
- **Container**: Docker + Docker Compose
- **Proxy Reverso**: Nginx (host)
- **SSL**: Let's Encrypt
- **Dados**: CSV files (timeline, campus, território)

---

## 🏗️ Arquitetura

```
Internet
    ↓
memoriaifsulvenancio.com.br (DNS → IP do servidor)
    ↓
Nginx Host (Proxy Reverso) + SSL/TLS
    ↓
Container Docker (porta 8092)
    ↓
Nginx Alpine (porta 80 interna)
    ↓
HTML/CSS/JS estáticos + CSV
```

---

## 📦 Estrutura do Projeto

```
site-memoria-ifsul-venancio/
├── nginx/
│   ├── nginx.conf                    # Config interna do container
│   ├── memoria-ifsul-venancio.conf   # Config do host (proxy reverso)
│   └── setup-nginx.sh                # Script de instalação
├── src/
│   ├── css/                          # Estilos
│   ├── js/                           # Scripts
│   ├── images/                       # Imagens
│   ├── campus.csv                    # Dados do campus
│   ├── territorio.csv                # Dados territoriais
│   └── timeline.csv                  # Linha do tempo
├── *.html                            # Páginas do site
├── Dockerfile                        # Imagem Docker
├── docker-compose.yml                # Orquestração
└── README.md                         # Este arquivo
```

---

## 🔧 Deploy no Servidor

### Pré-requisitos

- Docker e Docker Compose instalados
- Acesso root/sudo
- DNS configurado (ver abaixo)

### Passo 1: Build e Iniciar Container

```bash
# Na raiz do projeto
docker-compose up -d --build
```

Isso irá:
- Fazer build da imagem Docker
- Iniciar container na porta 8092
- Configurar health check automático

### Passo 2: Configurar Nginx (Host)

```bash
# Instalar configuração do Nginx
sudo ./nginx/setup-nginx.sh
```

O script irá:
- Copiar configuração para `/etc/nginx/conf.d/apps/`
- Fazer backup da configuração anterior
- Testar e recarregar Nginx
- Mostrar próximos passos

### Passo 3: Configurar DNS

No painel do **Registro.br**, configure:

```
Tipo: A
Host: @
Valor: 200.132.86.251
TTL: 3600

Tipo: A
Host: www
Valor: 200.132.86.251
TTL: 3600
```

Aguarde propagação DNS (pode levar até 48h, geralmente 1-4h).

### Passo 4: Gerar Certificado SSL

Após propagação do DNS:

```bash
sudo certbot --nginx -d memoriaifsulvenancio.com.br -d www.memoriaifsulvenancio.com.br
```

Siga as instruções interativas do Certbot.

---

## 🔍 Verificações

### Testar Container Localmente

```bash
# Verificar se container está rodando
docker ps | grep memoria

# Verificar logs
docker-compose logs -f

# Testar acesso local
curl -I http://localhost:8092
```

### Testar Nginx

```bash
# Testar configuração
sudo nginx -t

# Ver logs
sudo tail -f /var/log/nginx/memoria-ifsul-access.log
sudo tail -f /var/log/nginx/memoria-ifsul-error.log
```

### Testar SSL

```bash
# Após configurar SSL
curl -I https://memoriaifsulvenancio.com.br
```

---

## 🛠️ Comandos Úteis

```bash
# Parar container
docker-compose down

# Rebuild completo
docker-compose down && docker-compose up -d --build

# Ver logs em tempo real
docker-compose logs -f

# Entrar no container
docker exec -it memoria-ifsul-venancio sh

# Reiniciar Nginx (host)
sudo systemctl reload nginx

# Status do health check
docker inspect memoria-ifsul-venancio | grep -A5 Health
```

---

## 📊 Dados (CSV)

Os dados do site são armazenados em arquivos CSV:

- **timeline.csv**: Eventos da linha do tempo
- **campus.csv**: Informações do campus
- **territorio.csv**: Dados territoriais

Para editar:
1. Edite diretamente os arquivos CSV
2. Commit e push para o repositório
3. Rebuild do container para atualizar

---

## 🔒 Segurança

### Medidas Implementadas

- ✅ SSL/TLS via Let's Encrypt
- ✅ Headers de segurança (HSTS, X-Frame-Options, etc.)
- ✅ Área administrativa desabilitada (anteriormente vulnerável)
- ✅ Arquivos sensíveis bloqueados pelo Nginx
- ✅ Health checks automáticos
- ✅ Logs separados para auditoria

### Área Administrativa

⚠️ **Status**: Desabilitada temporariamente

**Motivo**: Token GitHub estava exposto no código (risco de segurança)

**Futuro**: Implementar backend com SQLite + API REST + JWT

---

## 🔄 Backup

O projeto está incluído no sistema de backup automatizado do servidor.

Localização: `/home/ifsul/docs/pathtoprojects.json`

Backups são realizados diariamente e sincronizados com OneDrive.

---

## 📝 Manutenção

### Atualizar Conteúdo

1. Editar arquivos HTML/CSS/JS ou CSV
2. Commit e push para repositório
3. No servidor:
   ```bash
   git pull origin master
   docker-compose down && docker-compose up -d --build
   ```

### Renovar SSL (Automático)

O Certbot renova automaticamente via cron. Para forçar renovação:

```bash
sudo certbot renew
```

### Monitoramento

```bash
# Status do container
docker stats memoria-ifsul-venancio

# Uso de disco
docker system df

# Health status
curl http://localhost:8092/
```

---

## 🐛 Troubleshooting

### Container não inicia

```bash
# Ver logs detalhados
docker-compose logs

# Verificar porta em uso
ss -tlnp | grep 8092
```

### 502 Bad Gateway

```bash
# Verificar se container está rodando
docker ps

# Verificar health do container
docker inspect memoria-ifsul-venancio
```

### SSL não funciona

```bash
# Verificar certificados
sudo certbot certificates

# Testar configuração Nginx
sudo nginx -t
```

---

## 🔄 Migração para Domínio Próprio

**Status**: Planejado (aguardando período de testes)

### Quando Executar

Após validação completa do site em https://ifva.duckdns.org/memoria/

### Checklist de Migração

- [ ] **1. Backup completo**
  ```bash
  docker-compose stop
  tar -czf backup-pre-migracao.tar.gz /home/ifsul/projects/site-memoria-ifsul-venancio
  ```

- [ ] **2. Alterar DNS no Registro.br**
  - Remover registros A atuais (185.199.x.x)
  - Remover registros AAAA (IPv6)
  - Remover CNAME do www
  - Adicionar:
    - `Tipo: A | Nome: @ | Valor: 200.132.86.251`
    - `Tipo: A | Nome: www | Valor: 200.132.86.251`

- [ ] **3. Aguardar propagação DNS (1-4 horas)**
  ```bash
  # Testar propagação
  nslookup memoriaifsulvenancio.com.br
  dig memoriaifsulvenancio.com.br
  ```

- [ ] **4. Reconfigurar Nginx**
  ```bash
  sudo ./nginx/setup-nginx.sh  # sem --subpath
  ```

- [ ] **5. Gerar certificado SSL**
  ```bash
  sudo certbot --nginx -d memoriaifsulvenancio.com.br -d www.memoriaifsulvenancio.com.br
  ```

- [ ] **6. Testar domínio**
  ```bash
  curl -I https://memoriaifsulvenancio.com.br
  ```

- [ ] **7. Merge para master**
  ```bash
  git checkout master
  git merge migracao-servidor-docker
  git push origin master
  ```

---

## 🚀 Planejamento de Refatoração

**Status**: Requisitos definidos (4 Mar 2026)  
**Objetivo**: Sistema CMS completo com área administrativa

> 📖 Para requisitos detalhados, ver [MIGRACAO_ANALISE.md](MIGRACAO_ANALISE.md#fase-3-refatoração-completa-planejada)

### Resumo da Arquitetura

```
┌───────────────────────────────────────┐
│  Container Único Docker               │
│  ┌─────────────────────────────────┐ │
│  │ React/Vue Admin + Site Público  │ ││  └────────────┬────────────────────┘ │
│               │                       │
│  ┌────────────▼────────────────────┐ │
│  │ Flask API (REST)                │ │
│  │ - CRUD Pages/Timeline/Cards     │ │
│  │ - Auth (Session)                │ │
│  │ - Upload imagens                │ │
│  └────────────┬────────────────────┘ │
│               │                       │
│  ┌────────────▼────────────────────┐ │
│  │ SQLite (arquivo .db)            │ │
│  │ - Versionamento de conteúdo     │ │
│  └─────────────────────────────────┘ │
└───────────────────────────────────────┘
```

### Stack Tecnológica

| Camada | Tecnologia | Justificativa |
|--------|------------|---------------|
| **Frontend Admin** | React Admin ou Vue Admin | Framework pronto, desenvolvimento rápido |
| **Frontend Público** | React/Vue | Adapta design atual, consume API |
| **Backend** | Flask | Simples, familiar, Python |
| **ORM** | SQLAlchemy | Padrão Python, migrations com Alembic |
| **Banco** | SQLite | Arquivo único, backup fácil, suficiente para o caso |
| **Editor** | TinyMCE ou CKEditor | WYSIWYG visual e intuitivo |
| **Container** | Docker (único) | Simplicidade no deploy |

### Funcionalidades Principais

#### ✅ Páginas Editáveis
- Timeline (linha do tempo)
- Território (transformações territoriais)
- Campus
- Trabalhos (galeria)
- Catalogação
- Home (textos principais)
- **Contact permanece estática**

#### ✅ Tipos de Conteúdo
1. **Timeline**: Tabela de eventos (título, data, imagem, fonte)
2. **Cards**: Cards com imagem/texto + editor WYSIWYG
3. **Galeria**: Grid de imagens com legenda
4. **Lista**: Cards estruturados

#### ✅ Área Administrativa
- **Autenticação**: Usuário único no banco
- **CRUD Páginas**: Criar, editar, deletar, reordenar
- **CRUD Conteúdo**: Gerenciar timeline, cards, galeria
- **Editor WYSIWYG**: TinyMCE/CKEditor para textos ricos
- **Upload Imagens**: Interface drag-drop, validação
- **Menu Editável**: Adicionar/remover/reordenar itens
- **Drag and Drop**: Reordenação visual de itens
- **Versionamento**: Histórico de alterações, restauração

#### ✅ URLs Limpas
- `/territorio` ao invés de `/territorio.html`
- Roteamento pelo backend Flask

### Schema do Banco (Resumido)

```sql
user              -- Admin único
page              -- Páginas do site (slug, title, type, menu_order)
timeline_item     -- Eventos históricos (title*, date*, image, source)
card_item         -- Cards com texto/imagem (title, description, image)
gallery_item      -- Imagens da galeria (title, caption, image_path)
menu_item         -- Itens do menu (label, url, order_index, is_visible)
content_history   -- Auditoria/versionamento (entity, action, old/new data)
```

\* Campos obrigatórios

### API REST (Endpoints Principais)

```
Auth:      POST /api/auth/login, /logout, GET /me
Pages:     GET|POST|PUT|DELETE /api/pages, PUT /api/pages/reorder
Timeline:  GET|POST|PUT|DELETE /api/timeline, PUT /api/timeline/reorder
Cards:     GET|POST|PUT|DELETE /api/cards
Gallery:   GET|POST|DELETE /api/gallery
Menu:      GET|PUT /api/menu, PUT /api/menu/reorder
Upload:    POST /api/upload
History:   GET /api/history/:type/:id, POST /api/history/restore/:id
```

### MVP (Prioridade)

**Fase 1 - Essencial** (3-4 semanas)
- [x] Definir requisitos
- [ ] Setup Flask + SQLite + SQLAlchemy
- [ ] Autenticação (login/logout/session)
- [ ] CRUD Timeline (API + Admin)
- [ ] CRUD Cards/Páginas (API + Admin + WYSIWYG)
- [ ] Upload de imagens

**Fase 2 - Importante** (2-3 semanas)
- [ ] Drag and drop (timeline, cards, menu)
- [ ] Gerenciamento de menu
- [ ] Frontend público consumindo API
- [ ] Migração de dados CSV → SQLite

**Fase 3 - Desejável** (1-2 semanas)
- [ ] Versionamento e histórico
- [ ] Backup automático diário
- [ ] Preview antes de publicar
- [ ] Busca/filtros

**Total estimado**: 8-12 semanas

### Roadmap de Implementação

#### Etapa 1: Setup do Projeto
```bash
# Criar branch
git checkout -b refatoracao-cms

# Estrutura
mkdir -p backend/{app/routes,migrations,uploads}
mkdir -p frontend/{public,src/{admin,site,api}}
mkdir -p database/backups
```

#### Etapa 2: Backend Base
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install flask sqlalchemy alembic flask-cors flask-jwt-extended

# Criar models, routes, migrations
alembic init migrations
alembic revision --autogenerate -m "Initial schema"
alembic upgrade head
```

#### Etapa 3: Frontend Admin
```bash
cd frontend

# Opção A: React Admin
npx create-react-app . --template typescript
npm install react-admin ra-data-simple-rest

# Opção B: Vue Admin (alternativa)
npm create vue@latest
npm install vuetify
```

#### Etapa 4: Integração e Migração de Dados
```python
# Script para migrar CSVs
python scripts/migrate_csv_to_db.py

# Testar endpoints
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"senha"}'
```

#### Etapa 5: Container Único
```dockerfile
# Dockerfile multi-stage
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.11-alpine
WORKDIR /app
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ ./backend/
COPY --from=frontend-build /app/frontend/dist ./frontend/dist
EXPOSE 5000
CMD ["python", "backend/run.py"]
```

```yaml
# docker-compose.yml
services:
  memoria-cms:
    build: .
    ports:
      - "8092:5000"
    volumes:
      - ./database:/app/database
      - ./backend/uploads:/app/backend/uploads
    environment:
      - FLASK_ENV=production
      - SECRET_KEY=${SECRET_KEY}
    restart: unless-stopped
```

### Migração de Dados

#### CSVs Atuais
- `src/campus.csv` (2KB, ~10 itens)
- `src/territorio.csv` (689B, ~3 itens)
- `src/timeline.csv` (7KB, ~30 eventos)

#### Script de Migração
```python
# scripts/migrate_csv_to_db.py
import csv
from app import db
from app.models import Page, TimelineItem, CardItem

def migrate_timeline():
    page = Page.query.filter_by(slug='timeline').first()
    with open('src/timeline.csv', 'r') as f:
        reader = csv.DictReader(f)
        for idx, row in enumerate(reader):
            item = TimelineItem(
                page_id=page.id,
                title=row['titulo'],
                date=row['data'],
                image_path=row.get('imagem'),
                source=row.get('fonte'),
                order_index=idx
            )
            db.session.add(item)
    db.session.commit()

# Similar para campus.csv e territorio.csv
```

### Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| Complexidade do editor WYSIWYG | Usar biblioteca pronta (TinyMCE), testar antes |
| Perda de dados na migração | Múltiplos backups, ambiente de staging |
| Performance com imagens grandes | Validar tamanho no upload (max 5MB), comprimir |
| Container único muito pesado | Monitorar recursos, separar se necessário |
| Downtime durante deploy | Blue-green deployment ou manutenção programada |

### Checklist Pré-Desenvolvimento

- [x] Requisitos funcionais definidos
- [x] Arquitetura validada (1 container)
- [x] Stack tecnológica escolhida
- [x] Schema do banco desenhado
- [x] API endpoints mapeados
- [x] Documentação atualizada
- [ ] Criar issues/tasks no GitHub
- [ ] Setup ambiente de desenvolvimento
- [ ] Protótipo de tela (Figma/wireframe)?

---

## 📞 Suporte

**Responsável**: André Ruschel de Assumpção  
**Orientadora**: Professora Maria Raquel Caetano  
**Programa**: ProfEPT/2025  
**Instituição**: IFSul Campus Venâncio Aires

---

## 📄 Licença

Este projeto está sob licença MIT.

---

## 🙏 Agradecimentos

Agradecimentos especiais a todos que contribuíram para a história do IFSul Campus Venâncio Aires e para a preservação de sua memória.

---

**Última atualização**: Março 2026  
**Versão**: 2.0 (Migração para servidor próprio)
