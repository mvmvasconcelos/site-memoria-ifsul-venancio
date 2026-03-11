# Handoff — Próxima Sessão (2026-03-10)

## Estado atual (resumo)

- Reconciliação de dados e mídia executada com scripts idempotentes.
- Discrepância do image picker (`timeline` vazia) resolvida.
- Página `catalogacao` integrada ao fluxo DB e menu.
- Conteúdo de `index`, `contact`, `catalogacao` sincronizado da produção para `page.content`.
- Conteúdo estruturado (`timeline/campus/territorio`) sincronizado via CSV canônico.
- Hardcoded legado removido de páginas estáticas principais (`index`, `contact`).

## Documentos de referência para iniciar

1. `DATA_RECONCILIATION_PLAN.md` (status e histórico)
2. `reports/reconciliation/PARITY_REPORT_20260310.md` (resultado consolidado)
3. `DATA_RECONCILIATION_MATRIX.md` (histórico da análise inicial)

## Scripts principais (idempotentes)

- `scripts/reconciliation/generate_reconciliation_audit.py`
- `scripts/reconciliation/reclassify_timeline_media.py`
- `scripts/reconciliation/sync_catalogacao_page.py`
- `scripts/reconciliation/sync_page_content_from_production.py`
- `scripts/reconciliation/sync_structured_content_from_csv.py`
- `scripts/reconciliation/sync_media_registry_by_content_usage.py`

## Evidências técnicas (últimas)

- `reports/reconciliation/20260310-180939/sync_media_registry_by_content_usage_report.json`
- `reports/reconciliation/20260310-175939/parity_checkpoint.json`
- `reports/reconciliation/PARITY_REPORT_20260310.md`

## Pendências para fechamento humano

1. Validação visual/manual final de UX/layout das 6 páginas.
2. Decisão de produto: manter ou remover `Contato` do menu final.
3. Consolidar runbook operacional contínuo.

## Comandos úteis

- Rebuild e subir: `docker-compose up -d --build`
- Healthcheck: `curl -s http://localhost:8092/api/health`
- Picker timeline: `curl -s 'http://localhost:8092/api/media/list-for-editor?folder=timeline'`
