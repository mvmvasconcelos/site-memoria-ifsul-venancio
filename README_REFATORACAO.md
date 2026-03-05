# README - Fase 3 (Refatoração CMS)

Este documento inicia a **fase 3** da migração: backend CMS em Flask + SQLite, sem mudanças de DNS nesta etapa.

## O que já está implementado

- Backend Flask em `backend/`
- Banco SQLite com SQLAlchemy (`Page`, `TimelineItem`, `CardItem`, `MenuItem`, `ContentHistory`)
- Autenticação por sessão (`/api/auth/login`, `/api/auth/logout`, `/api/auth/me`)
- Troca de senha autenticada (`POST /api/auth/change-password`)
- CRUD inicial para:
  - `pages` (`/api/pages`)
  - `timeline` (`/api/timeline`)
  - `cards` (`/api/cards`)
  - `gallery` (`/api/gallery`)
  - `menu` (`/api/menu`)
- Rotas públicas sem extensão (`/timeline`, `/territorio`, `/campus`, etc.)
- Script de migração de CSV para banco (`backend/scripts/migrate_csv_to_db.py`)
- Stack de execução dedicada em `docker-compose.fase3.yml`
- Tela `admin.html` integrada ao backend Flask (login + CRUD de timeline)
- Tabela da timeline no admin com thumbnail de imagem
- Normalização de data anual no editor (`2005` → `2005-01-01` no campo de data)
- Upload real de imagens no admin (endpoint `/api/upload`)
- Preview de imagem no modal (arquivo selecionado ou caminho informado)
- Botão para remover imagem atual antes de salvar o evento
- Fechamento do modal ao clicar fora, com alerta para alterações não salvas
- Fechamento por tecla `Esc` com a mesma proteção de alterações não salvas
- Gestão de menu no admin (adicionar, editar, remover, ordenar e salvar)
- Edição de conteúdo HTML de páginas no admin:
  - seleção de página (`trabalhos` e `catalogacao`)
  - salvamento via `PUT /api/pages/:id` (campo `content`)
- Gestão de galeria de trabalhos no admin:
  - adicionar, editar, remover e ordenar itens
  - upload de imagem por item (pasta `uploads/trabalhos`)
  - limpar imagem por item (com confirmação)
  - pré-visualização imediata da miniatura ao selecionar arquivo/caminho
  - persistência via `/api/gallery` (`POST`, `PUT`, `DELETE`)
- Histórico de alterações no admin:
  - listagem das últimas ações (entidade, ação, usuário e data/hora)
  - filtros por entidade, ação e limite
  - recarga manual da lista
  - restauração por registro via botão `Restaurar`
- Seção de segurança no admin:
  - alteração de senha (senha atual + nova senha)
- Header público consumindo menu dinâmico via `GET /api/menu`
- Páginas públicas com consumo de API:
  - `timeline.html` via `/api/pages/timeline` + `/api/timeline/:page_id`
  - `campus.html` via `/api/pages/campus` + `/api/cards/:page_id`
  - `territorio.html` via `/api/pages/territorio` + `/api/cards/:page_id`
  - `trabalhos.html` via `/api/pages/trabalhos` (conteúdo CMS) e, sem conteúdo, via `/api/gallery/:page_id`
  - `catalogacao.html` via `/api/pages/catalogacao` (conteúdo CMS) com fallback para HTML estático atual
  - fallback para CSV em caso de indisponibilidade da API

## Subir fase 3 em container

No diretório do projeto:

```bash
docker-compose -f docker-compose.fase3.yml down
docker-compose -f docker-compose.fase3.yml up --build -d
```

## URL de acesso remoto (SSH)

Para testar remotamente, use sempre o domínio público com subpath:

- Site: `https://ifva.duckdns.org/memoria/`
- Admin: `https://ifva.duckdns.org/memoria/admin`
- Healthcheck API: `https://ifva.duckdns.org/memoria/api/health`

## Inicializar banco e admin

```bash
docker exec -it memoria-cms flask --app backend/run.py init-db
docker exec -it memoria-cms flask --app backend/run.py create-admin
```

Usuário inicial padrão:

- usuário: `admin`
- senha: `ifsul2025`

> Recomendado: alterar senha logo após o primeiro login.

## Migrar dados CSV para SQLite

```bash
docker exec -it memoria-cms python backend/scripts/migrate_csv_to_db.py
```

## Endpoints principais

- `GET /api/health`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/change-password`
- `GET|POST /api/pages`
- `GET /api/pages/<slug>`
- `PUT|DELETE /api/pages/<id>`
- `PUT /api/pages/reorder`
- `GET /api/timeline/<page_id>`
- `POST /api/timeline`
- `PUT|DELETE /api/timeline/<id>`
- `PUT /api/timeline/reorder`
- `GET /api/cards/<page_id>`
- `POST /api/cards`
- `PUT|DELETE /api/cards/<id>`
- `PUT /api/cards/reorder`
- `GET /api/gallery/<page_id>`
- `POST /api/gallery`
- `PUT|DELETE /api/gallery/<id>`
- `PUT /api/gallery/reorder`
- `GET /api/menu`
- `PUT /api/menu`
- `PUT /api/menu/reorder`
- `GET /api/history?limit=100&entity_type=...&action=...` (autenticado)
- `POST /api/history/<history_id>/restore` (autenticado)
- `POST /api/upload` (multipart/form-data, até 5MB, PNG/JPG/JPEG/WEBP/GIF)

## Próximas entregas da fase 3

- Refinos de UX para gestão de galeria (pré-visualização/local upload)
- Frontend admin moderno (React/Vue) - opcional após estabilização do admin atual
- Consolidação da edição de conteúdo de páginas (`content`) no admin
- Versionamento/restauração avançados
