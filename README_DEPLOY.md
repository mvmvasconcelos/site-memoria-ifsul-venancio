# Site Memória IFSul Venâncio Aires

**Projeto de Memória - IFSul Campus Venâncio Aires**

[![Status](https://img.shields.io/badge/status-active-success.svg)]()
[![Version](https://img.shields.io/badge/version-2.0-blue.svg)]()
[![License](https://img.shields.io/badge/license-MIT-green.svg)]()

---

## 📚 Sobre o Projeto

Este site é oriundo da Pesquisa de Mestrado ProfEPT, intitulada: **IMPLANTAÇÃO DO CAMPUS VENÂNCIO AIRES. HISTÓRIA E MEMÓRIA: DO CAMPO AO CÂMPUS**.

O objetivo é resgatar a memória e a história da implantação do câmpus do Instituto Federal de Educação, Ciência e Tecnologia do Rio Grande do Sul, no município de Venâncio Aires, desde o período anterior à sua implantação em 2005 até a inauguração em 2012.

**Acesso**: [https://memoriaifsulvenancio.com.br](https://memoriaifsulvenancio.com.br)

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
