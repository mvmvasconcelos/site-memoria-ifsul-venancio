# Instruções para Agente de IA - Site Memória IFSul Venâncio Aires

> Atualizado em: 05/03/2026  
> Branch de trabalho: `migracao-servidor-docker`

## 1) Regras críticas

1. **Não instalar pacotes no host**
   - Sempre usar containers Docker.
2. **Não executar app fora do container**
   - Nada de `python app.py` no host.
3. **Não expor novas portas sem planejamento**
   - Projeto usa `8092` no host.
4. **Não versionar credenciais**
   - Usar `.env` e variáveis de ambiente.
5. **Antes de alterar infraestrutura host, fazer backup**
   - Principalmente configs de Nginx host.

## 2) Estado atual do projeto

- URL atual: `https://ifva.duckdns.org/memoria/`
- Admin: `https://ifva.duckdns.org/memoria/admin`
- Stack principal ativa: **CMS**
   - `docker-compose.yml`
  - Serviço `memoria-cms` (Flask + SQLite)

## 3) Funcionalidades já prontas

- Autenticação admin por sessão
- Gestão de timeline
- Gestão de menu
- Gestão de galeria (com upload)
- Gestão de páginas (exceto timeline)
- Histórico com restauração
- Editor de páginas com:
  - modo Visual / HTML / Preview
  - atalho `Ctrl+S`
  - rascunho local
  - botão de template de card
  - desfazer/refazer com histórico próprio

## 4) Rotina padrão de trabalho

```bash
cd /home/ifsul/projects/site-memoria-ifsul-venancio

# subir stack correta

docker-compose up --build -d

# logs

docker-compose logs -f
```

## 5) Verificação mínima após mudanças

```bash
curl -I https://ifva.duckdns.org/memoria/
curl -I https://ifva.duckdns.org/memoria/admin
curl -I https://ifva.duckdns.org/memoria/api/health
```

## 6) Banco e usuário admin (quando necessário)

```bash
docker exec -it memoria-cms flask --app backend/run.py init-db
docker exec -it memoria-cms flask --app backend/run.py create-admin
```

## 7) Backup e restauração

```bash
bash scripts/backup_memoria.sh
bash scripts/restore_memoria.sh latest
```

## 8) Diretrizes para mudanças de código

- Priorizar alterações pequenas e focadas.
- Evitar refatoração ampla sem necessidade.
- Manter compatibilidade com subpath `/memoria`.
- Se alterar JS/CSS do admin, versionar asset (`?v=...`) para evitar cache.
- Sempre registrar resumo da sessão em documentação.

## 9) O que evitar (desatualizado)

- Não assumir que “admin está desabilitado”.
- Não assumir que dados públicos dependem de CSV como fonte principal.
- Não usar documentação antiga como verdade sem checar o estado atual do código.

## 10) Próxima sessão

Consultar o arquivo [NEXT_SESSION.md](NEXT_SESSION.md) para o backlog imediato.
