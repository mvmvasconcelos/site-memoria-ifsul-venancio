# Relatório de Paridade — 2026-03-10

## Escopo validado

- Início (`/`)
- Linha do Tempo (`/timeline`)
- Transformações do Território (`/territorio`)
- Câmpus Venâncio Aires (`/campus`)
- Trabalhos de Mestrado (`/trabalhos`)
- Publicações em Jornais (`/catalogacao`)

## Resumo executivo

- ✅ Backup baseline concluído.
- ✅ Discrepância crítica do image picker resolvida (`timeline` deixou de aparecer vazia).
- ✅ Página `catalogacao` incluída no fluxo DB e no menu.
- ✅ Conteúdo de `index`, `contact` e `catalogacao` sincronizado com produção.
- ✅ Reconciliação estruturada (`timeline/campus/territorio`) via CSV sem pendências no dry-run pós-apply.

## Evidências principais

- Backup: `backups/20260310-172257/`
- Auditoria e discrepâncias: `reports/reconciliation/20260310-172851/`
- Reclassificação de mídia timeline: `reports/reconciliation/20260310-172851/timeline_media_reclassification_report.json`
- Sync catalogação: `reports/reconciliation/20260310-175610/sync_catalogacao_report.json`
- Sync conteúdo estático: `reports/reconciliation/20260310-175738/sync_page_content_report.json`
- Sync estruturado CSV: `reports/reconciliation/20260310-175939/sync_structured_content_report.json`
- Checkpoint de paridade: `reports/reconciliation/20260310-175939/parity_checkpoint.json`

## Resultado por área

### 1) Mídia (picker/admin)

- Antes: `media_file` sem pasta `timeline`, itens da timeline classificados em `campus/trabalhos`.
- Depois: `timeline=28`, `campus=15`, `trabalhos=1` em `media_file`.
- Endpoint validado: `/api/media/list-for-editor?folder=timeline` retornando 28 itens.

#### Ajuste complementar de robustez

- Foi identificado risco de colisão de nome de arquivo entre contextos distintos (ex.: `image1.png` em timeline e trabalhos).
- Foi criado sincronizador idempotente por **uso real de conteúdo** para garantir presença de mídia por pasta alvo sem reintroduzir inconsistências:
	- `scripts/reconciliation/sync_media_registry_by_content_usage.py`
- Estado final validado no picker:
	- `timeline: 28`
	- `campus: 15`
	- `territorio: 1`
	- `trabalhos: 4`

### 2) Conteúdo estruturado

- `timeline_item`: 29 registros (igual ao CSV de referência), dry-run pós-apply sem alterações.
- `card_item` campus: 12 registros (igual ao CSV), sem alterações pendentes.
- `card_item` território: 1 registro (igual ao CSV local atual), sem alterações pendentes.
- `gallery_item` trabalhos: 4 imagens com paths iguais aos da produção.

### 3) Conteúdo de páginas estáticas no DB

- `index`: `page.content` em paridade com `<main>` da produção.
- `contact`: `page.content` em paridade com `<main>` da produção.
- `catalogacao`: página criada e `page.content` em paridade com produção.

### 4) Hardcoded legado

- `index.html` e `contact.html` convertidos para shell com placeholder.
- Conteúdo editorial dessas páginas agora vem do banco.
- `catalogacao.html` já nasce em formato shell + DB.

## Estado atual de rotas (smoke test)

- ✅ `/`, `/timeline`, `/territorio`, `/campus`, `/trabalhos`, `/catalogacao` respondendo `200`.
- ✅ `/api/pages` inclui slug `catalogacao`.
- ✅ `/api/pages/catalogacao` retorna conteúdo esperado.

## Pendências para fechamento definitivo

1. Validação visual manual final no navegador (conteúdo/ordem/layout) das 6 páginas.
2. Decisão de produto sobre manter ou remover `contact` do menu final (produção antiga lista contato, escopo principal do projeto não exigia).
3. Se necessário, consolidar relatório de comparação textual mais granular (linha a linha) para território, dado histórico de inconsistência de fonte CSV.
