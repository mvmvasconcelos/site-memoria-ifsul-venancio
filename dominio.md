# Migração de Domínio — Estado Atual e Próximos Passos

**Criado em:** 25/03/2026  
**Para:** Agente de IA que irá continuar na próxima sessão

---

## O que já foi feito (concluído e estável)

### DNS (Registro.br) — 100% correto e propagado
- Removidos todos os registros antigos do GitHub Pages (4xA, 4xAAAA, CNAME para mvmvasconcelos.github.io).
- Criados dois registros novos:
  - `A` raiz → `200.132.86.251` (IP público do servidor IFVA)
  - `CNAME` `www` → `memoriaifsulvenancio.com.br`
- Propagação confirmada nos resolvedores públicos (8.8.8.8 e 1.1.1.1):
  - `dig @8.8.8.8 +short memoriaifsulvenancio.com.br A` → `200.132.86.251` ✅
  - `dig @8.8.8.8 +short www.memoriaifsulvenancio.com.br` → `memoriaifsulvenancio.com.br` → `200.132.86.251` ✅

### Container/App
- `curl -I http://127.0.0.1:8092/` → HTTP 200 OK ✅
- Aplicação rodando corretamente na porta interna `8092`.

### Nginx do host
- `sudo nginx -t` → syntax OK ✅
- `sudo systemctl status nginx` → ativo e rodando ✅
- Redirecionamento HTTP→HTTPS para ambos os hosts funcionando:
  - `curl -I http://memoriaifsulvenancio.com.br` → `301 Moved Permanently` para `https://memoriaifsulvenancio.com.br/` com `Server: nginx` ✅ (NÃO é mais GitHub Pages)

### Certificado SSL Let's Encrypt
- Certificado **emitido** com sucesso para `memoriaifsulvenancio.com.br` (somente raiz, sem www ainda).
- Certificado em: `/etc/letsencrypt/live/memoriaifsulvenancio.com.br/fullchain.pem`
- Chave em: `/etc/letsencrypt/live/memoriaifsulvenancio.com.br/privkey.pem`
- Validade: até 2026-06-23

---

## O que NÃO foi feito ainda (bloqueios pendentes)

### Problema principal: SAN mismatch no certificado
- `curl -I https://memoriaifsulvenancio.com.br` → `curl: (60) SSL: no alternative certificate subject name matches target host name` ❌
- O certificado foi emitido mas **não foi instalado** no Nginx porque o certbot não encontrou um `server_name memoriaifsulvenancio.com.br` no Nginx ativo.

### Causa raiz identificada
A infraestrutura Nginx deste servidor usa o seguinte padrão:

```
/etc/nginx/sites-enabled/principal.conf
  └── server { (ifva.duckdns.org)
        └── include /etc/nginx/conf.d/apps/*.conf  ← inclui DENTRO de server
      }
```

Portanto, qualquer arquivo em `/etc/nginx/conf.d/apps/` **só pode conter blocos `location`**, nunca `server { ... }`.

Tentativas anteriores de colocar um bloco `server { server_name memoriaifsulvenancio.com.br; ... }` em `conf.d/apps/` resultaram em erro `server directive is not allowed here`.

### Arquivos modificados até aqui
- `/etc/nginx/conf.d/apps/memoria-ifsul-venancio.conf` → **desativado** (renomeado para `.disabled`), backup existe.
- `/etc/nginx/conf.d/apps/memoria-ifsul-venancio-domain.conf` → **corrigido para snippet de location** (compatível com include dentro de server). Conteúdo atual: location /memoria/ proxy para 127.0.0.1:8092. Isso mantém o subpath `ifva.duckdns.org/memoria/` funcional.
- Arquivo de vhost dedicado em `/etc/nginx/sites-available/memoriaifsulvenancio.com.br.conf` **ainda NÃO existe** (essa é a pendência).

---

## O que o próximo agente deve fazer (em ordem)

### Passo 1 — Criar vhost dedicado em sites-available

Este arquivo deve conter blocos `server { }` próprios, **fora** do include de apps.  
O certbot consegue fazer matching por `server_name` apenas em arquivos nesse contexto.

```bash
sudo tee /etc/nginx/sites-available/memoriaifsulvenancio.com.br.conf > /dev/null <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name memoriaifsulvenancio.com.br www.memoriaifsulvenancio.com.br;
    return 301 https://memoriaifsulvenancio.com.br$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name memoriaifsulvenancio.com.br www.memoriaifsulvenancio.com.br;

    ssl_certificate /etc/letsencrypt/live/memoriaifsulvenancio.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/memoriaifsulvenancio.com.br/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:8092/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        proxy_cache_bypass $http_upgrade;
        proxy_redirect off;
    }

    access_log /var/log/nginx/memoria-ifsul-access.log;
    error_log /var/log/nginx/memoria-ifsul-error.log;
}
EOF
```

### Passo 2 — Habilitar o vhost

```bash
sudo ln -sf /etc/nginx/sites-available/memoriaifsulvenancio.com.br.conf \
            /etc/nginx/sites-enabled/memoriaifsulvenancio.com.br.conf
```

### Passo 3 — Validar e recarregar Nginx

```bash
sudo nginx -t && sudo systemctl reload nginx
```

Se `nginx -t` falhar, **não** recarregar. Reportar o erro antes de prosseguir.

### Passo 4 — Expandir certificado para incluir www

```bash
sudo certbot --nginx \
  --cert-name memoriaifsulvenancio.com.br \
  -d memoriaifsulvenancio.com.br \
  -d www.memoriaifsulvenancio.com.br \
  --expand --redirect \
  --non-interactive --agree-tos -m admin@memoriaifsulvenancio.com.br
```

### Passo 5 — Validações finais

```bash
sudo nginx -t
curl -I https://memoriaifsulvenancio.com.br
curl -I https://www.memoriaifsulvenancio.com.br
curl -s https://memoriaifsulvenancio.com.br/api/health
```

Resultados esperados:
- `curl -I https://memoriaifsulvenancio.com.br` → `HTTP/2 200` sem erros TLS
- `curl -I https://www.memoriaifsulvenancio.com.br` → `HTTP/2 301` redirect para raiz (sem www no final)
- `curl -s https://memoriaifsulvenancio.com.br/api/health` → JSON de healthcheck

### Passo 6 — Verificar renovação automática

```bash
sudo certbot renew --dry-run
```

---

## O que falhou e foi tentado (para não repetir)

| Abordagem | Por que falhou |
|---|---|
| Colocar `server {}` em `/etc/nginx/conf.d/apps/*.conf` | Esses arquivos são incluídos dentro de um bloco `server {}` existente em `principal.conf`. Nginx rejeita `server` dentro de `server`. |
| `sudo certbot --nginx -d ... --non-interactive` sem `--expand` | Certificado já existia para o raiz. Certbot abortou pedindo confirmação para expandir. |
| Usar `setup-nginx.sh --subpath` / `setup-nginx.sh` | O script copia para `conf.d/apps/` que é contexto errado para domínio dedicado. |
| `certbot install --cert-name ...` | Certbot não encontrou `server_name` correspondente no Nginx, pois o vhost dedicado não existia. |
| Certbot `--non-interactive` com `--expand` | Foi interrompido com ^C antes de concluir (problema operacional, não técnico). |

---

## Referência da infraestrutura Nginx do servidor

```
/etc/nginx/
├── nginx.conf                          # inclui sites-enabled/
├── sites-enabled/
│   └── principal.conf                  # server { ifva.duckdns.org, inclui conf.d/apps/*.conf }
│   └── (CRIAR) memoriaifsulvenancio.com.br.conf  ← vhost dedicado a criar aqui
└── conf.d/
    └── apps/
        ├── memoria-ifsul-venancio-domain.conf    # snippet location /memoria/ (ativo, correto)
        ├── memoria-ifsul-venancio.conf.disabled   # desativado, não remover
        └── outros apps como location {}
```

**Regra de ouro**: apenas `location {}` em `conf.d/apps/`. Blocos `server {}` só em `sites-available/` habilitados por symlink em `sites-enabled/`.

---

## Contexto de segurança

- O servidor tem múltiplos serviços rodando simultaneamente (ver info.md).
- **Nunca** fazer reload do Nginx sem `nginx -t` OK antes.
- **Nunca** editar `principal.conf` ou arquivos de outros serviços.
- O subpath `ifva.duckdns.org/memoria/` deve continuar funcionando como fallback.
