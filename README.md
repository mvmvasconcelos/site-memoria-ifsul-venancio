# Site Memória IFSul Venâncio Aires

Sistema de memória institucional do IFSul Campus Venâncio Aires.

## Status atual

- Ambiente ativo: `https://ifva.duckdns.org/memoria/`
- Stack principal em produção: **Flask + SQLite** (Fase 3)
- Admin funcional em `.../memoria/admin`
- Edição de páginas com editor visual (WYSIWYG), modo HTML/Preview, rascunho local e histórico de alterações

## Funcionalidades implementadas

- Autenticação por sessão no admin
- CRUD de timeline
- CRUD de páginas (exceto timeline, que é entidade própria)
- Menu dinâmico
- Galeria de trabalhos com upload
- Histórico com restauração
- Fallback de conteúdo no editor para páginas sem `content` no banco

## Estrutura resumida

```text
backend/                 API Flask + modelos + rotas
database/                SQLite e backups locais
uploads/                 uploads de imagens
src/css/ src/js/         frontend público + admin
admin.html               painel administrativo
docker-compose.fase3.yml stack CMS (porta 8092 -> 5000)
docker-compose.yml       stack estático legada (somente referência)
```

## Como rodar (CMS/Fase 3)

```bash
docker-compose -f docker-compose.fase3.yml up --build -d
```

Após subir:

- Site: `http://localhost:8092/memoria/` (ou domínio configurado no host)
- Admin: `http://localhost:8092/admin`
- Healthcheck: `http://localhost:8092/api/health`

## Comandos úteis

```bash
# logs
docker-compose -f docker-compose.fase3.yml logs -f

# parar
docker-compose -f docker-compose.fase3.yml down

# criar banco e usuário admin (primeira execução)
docker exec -it memoria-cms flask --app backend/run.py init-db
docker exec -it memoria-cms flask --app backend/run.py create-admin
```

## Documentação complementar

- Deploy e operação: [README_DEPLOY.md](README_DEPLOY.md)
- Plano técnico da migração: [MIGRACAO_ANALISE.md](MIGRACAO_ANALISE.md)
- Diretrizes operacionais para IA: [AI_INSTRUCTIONS.md](AI_INSTRUCTIONS.md)
