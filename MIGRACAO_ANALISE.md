# Análise de Migração - Site Memória IFSul Venâncio Aires

**Data**: 4 de março de 2026  
**Status**: Análise técnica completa - Aguardando decisões antes de implementar

---

## 📊 Situação Atual

### Hospedagem Atual
- **Plataforma**: GitHub Pages  
- **URL Atual**: https://mvmvasconcelos.github.io/site-memoria-ifsul-venancio  
- **Domínio Registrado**: https://memoriaifsulvenancio.com.br (redirecionado para GitHub Pages)  
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

## ❓ Decisões Necessárias

### DECISÃO 1: Arquitetura de Dados
- [ ] A) SQLite + API REST (mais robusto, requer desenvolvimento)
- [ ] B) Manter CSV (mais rápido, sem admin)
- [ ] C) Backend API com CSV (intermediário)

### DECISÃO 2: Configuração de Domínio
- [ ] A) Começar em subpath `/memoria/` e depois migrar
- [ ] B) Subdomínio DuckDNS desde o início
- [ ] C) Domínio próprio direto desde o início

### DECISÃO 3: Área Administrativa
- [ ] A) Desabilitar por enquanto (mais rápido)
- [ ] B) Criar nova com SQLite + API
- [ ] C) Manter GitHub API com variável de ambiente

### DECISÃO 4: Porta do Host
- [x] Porta 8092 (confirmada disponível)

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
