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

**Status**: Em planejamento  
**Objetivo**: Modernizar arquitetura com backend API e banco de dados

### Motivação

- Substituir CSVs por banco de dados relacional
- Criar área administrativa funcional e segura
- Facilitar manutenção e adição de conteúdo
- Preparar para escalabilidade futura

### Arquitetura Proposta

```
┌─────────────┐
│   Frontend  │  HTML/CSS/JS ou React/Vue
│   (Público)  │
└──────┬──────┘
       │ HTTPS/REST API
┌──────▼──────┐
│  Backend    │  FastAPI ou Flask
│  (API REST) │  + JWT Auth
└──────┬──────┘
       │ ORM (SQLAlchemy)
┌──────▼──────┐
│   Database  │  PostgreSQL ou SQLite
│   (Dados)   │
└─────────────┘
```

### Stack Tecnológica Recomendada

#### Backend
- **FastAPI** (preferencial) ou **Flask**
  - FastAPI: performance, validação automática, docs Swagger
  - Flask: simplicidade, familiaridade
- **SQLAlchemy**: ORM poderoso e flexível
- **Pydantic**: Validação de dados
- **JWT**: Autenticação stateless
- **Alembic**: Migrations de banco

#### Banco de Dados
- **PostgreSQL**: Produção robusta, escalável
- **SQLite**: Desenvolvimento e POC rápido

#### Frontend Admin
- **React Admin** ou **Vue + Vuetify**
- **HTML/JS puro**: Opção mais simples

#### DevOps
- **Docker Compose**: Orquestração multi-container
- **GitHub Actions**: CI/CD
- **Pytest**: Testes automatizados

### Fases da Refatoração

#### Fase 1: Design e Preparação
- [ ] Definir schema do banco de dados
- [ ] Criar diagramas ER
- [ ] Definir endpoints da API
- [ ] Documentar especificação OpenAPI
- [ ] Definir estratégia de migração de dados

#### Fase 2: Backend API (MVP)
- [ ] Setup projeto FastAPI/Flask
- [ ] Configurar SQLAlchemy e models
- [ ] Implementar migrations (Alembic)
- [ ] Migrar dados CSV → Banco
- [ ] Endpoints CRUD básicos:
  - `/api/timeline` - Eventos da linha do tempo
  - `/api/campus` - Dados do campus
  - `/api/territorio` - Transformações territoriais
- [ ] Autenticação JWT
- [ ] Documentação Swagger

#### Fase 3: Área Administrativa
- [ ] Interface de login
- [ ] Dashboard
- [ ] CRUD timeline events
- [ ] CRUD campus data
- [ ] CRUD territorio data
- [ ] Upload de imagens
- [ ] Preview antes de salvar

#### Fase 4: Integração Frontend
- [ ] Adaptar frontend para consumir API
- [ ] Manter compatibilidade visual
- [ ] Loading states
- [ ] Error handling
- [ ] Otimizações de performance

#### Fase 5: Testes e Deploy
- [ ] Testes unitários (backend)
- [ ] Testes de integração
- [ ] Testes E2E (admin)
- [ ] Deploy em ambiente de staging
- [ ] Testes de carga
- [ ] Deploy em produção
- [ ] Monitoramento

### Estimativa de Esforço

| Fase | Descrição | Tempo Estimado | Prioridade |
|------|-----------|----------------|------------|
| Fase 1 | Design e Preparação | 1-2 semanas | Alta |
| Fase 2 | Backend API MVP | 3-4 semanas | Alta |
| Fase 3 | Área Admin | 2-3 semanas | Média |
| Fase 4 | Integração Frontend | 1-2 semanas | Média |
| Fase 5 | Testes e Deploy | 1-2 semanas | Alta |
| **Total** | | **8-13 semanas** | |

### Riscos e Mitigações

| Risco | Impacto | Probabilidade | Mitigação |
|-------|---------|---------------|-----------|
| Perda de dados na migração | Alto | Baixa | Múltiplos backups, testes |
| Downtime durante deploy | Médio | Média | Blue-green deployment |
| Bugs no backend | Médio | Média | Testes automatizados |
| Mudanças de escopo | Alto | Alta | Definir MVP claro |

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
