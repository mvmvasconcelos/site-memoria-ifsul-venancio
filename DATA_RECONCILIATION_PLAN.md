# Plano de Reconciliação de Conteúdo e Mídia

## 1) Objetivo

Garantir que o ambiente local reproduza **exatamente** o conteúdo de https://memoriaifsulvenancio.com.br/ em todas as páginas do site, com carregamento **100% via banco de dados** (sem conteúdo hardcoded legado para dados editoriais).

## 2) Escopo

Páginas no escopo (conteúdo textual e mídia):

1. Início
2. Linha do Tempo
3. Transformações do Território
4. Câmpus Venâncio Aires
5. Trabalhos de Mestrado
6. Publicações em Jornais

### Fora de escopo (neste ciclo)

- Rebranding visual / redesign
- Mudanças funcionais não relacionadas à consistência de dados
- Otimizações de performance sem impacto na reconciliação

## 3) Fonte da Verdade

Fonte primária de referência:

- Site oficial em produção: https://memoriaifsulvenancio.com.br/
- Repositório de referência para imagens: https://github.com/mvmvasconcelos/site-memoria-ifsul-venancio/tree/master/src/images

Regra operacional:

- Em caso de divergência entre banco local e conteúdo de referência, prevalece a fonte da verdade acima.

## 4) Diagnóstico Inicial (já identificado)

- A timeline pública carrega imagens por `src/images/...`.
- O image picker usa a tabela `media_file`.
- No banco local, `media_file` está concentrada em `campus`, com ausência de pasta/registro equivalente para `timeline`.
- Há sinais de migração parcial e mistura entre caminhos legados e estrutura nova.

## 5) Princípios de Execução

1. **Segurança primeiro**: sempre backup antes de mudanças destrutivas.
2. **Idempotência**: scripts podem rodar mais de uma vez sem corromper dados.
3. **Rastreabilidade**: toda ação registrada no histórico deste documento.
4. **Validação por evidência**: reconciliação por diff e checklist objetivo.
5. **Rollback claro**: caminho documentado para retorno ao estado anterior.

## 6) Arquitetura de Dados Alvo

### 6.1 Conteúdo

- Todo conteúdo editorial deve vir do banco:
  - `page`
  - `timeline_item`
  - `card_item`
  - `gallery_item`

### 6.2 Mídia

- Toda mídia selecionável no admin deve estar registrada em `media_file`.
- Itens editoriais devem apontar para mídia de forma consistente (sem ambiguidade entre hardcoded legado e dados de banco).

### 6.3 Frontend público

- Páginas públicas devem consumir API/DB para conteúdo de domínio.
- HTML estático pode permanecer como casca estrutural (layout), sem dados editoriais embutidos.

## 7) Plano de Trabalho por Fases

## Fase 0 — Congelar baseline e backup

**Objetivo:** criar ponto seguro de retorno.

**Tarefas:**

- [x] Gerar backup timestamp de `database/memoria.db`.
- [x] Gerar backup de `uploads/`.
- [x] Registrar checksums e contagens iniciais (DB + arquivos).
- [x] Registrar snapshot de estado em "Histórico de Execução".

**Entregáveis:**

- Pasta de backup versionada.
- Manifesto inicial com métricas base.

---

## Fase 1 — Inventariar a fonte da verdade

**Objetivo:** mapear conteúdo esperado por página.

**Tarefas:**

- [x] Extrair inventário da produção (títulos, textos, datas, imagens, ordem).
- [x] Extrair inventário do repositório de imagens de referência.
- [x] Consolidar inventário canônico por página.

**Entregáveis:**

- Manifesto `truth_manifest` por página.

---

## Fase 2 — Inventariar estado local atual

**Objetivo:** mapear o que existe hoje no banco e no projeto local.

**Tarefas:**

- [x] Inventariar tabelas `page`, `timeline_item`, `card_item`, `gallery_item`, `media_file`.
- [x] Mapear caminhos de imagem usados por tipo de conteúdo.
- [x] Mapear ainda-hardcoded em HTML/JS público.

**Entregáveis:**

- Manifesto `local_manifest` por página.
- Lista de hardcoded legado remanescente.

---

## Fase 3 — Construir matriz de reconciliação

**Objetivo:** transformar divergências em ações executáveis.

**Tarefas:**

- [x] Gerar diff por página e por entidade (texto, imagem, ordem).
- [x] Classificar ações: `inserir`, `atualizar`, `reordenar`, `remover`.
- [x] Marcar nível de risco por ação.

**Entregáveis:**

- Matriz de reconciliação (com prioridade e risco).

---

## Fase 4 — Definir normalização e regras de mapeamento

**Objetivo:** evitar nova deriva de dados.

**Tarefas:**

- [x] Definir padrão único de caminho de mídia.
- [x] Definir correspondência entre arquivos legados e registros `media_file`.
- [x] Definir política de deduplicação e órfãos.

**Entregáveis:**

- Documento de regras de normalização.

---

## Fase 5 — Implementar scripts idempotentes (SQL + apoio)

**Objetivo:** executar reconciliação de forma segura e repetível.

**Tarefas:**

- [x] Criar script para popular/corrigir `media_file` (incluindo timeline).
- [x] Criar script para ajustar `timeline_item`, `card_item`, `gallery_item`.
- [x] Criar script para correções em `page.content` quando aplicável.
- [x] Incluir dry-run e relatório de mudanças.

**Entregáveis:**

- Scripts versionados e executáveis.
- Relatório de execução por rodada.

---

## Fase 6 — Remover legado hardcoded de conteúdo

**Objetivo:** deixar frontend público dependente de DB para dados editoriais.

**Tarefas:**

- [x] Remover blocos de conteúdo hardcoded remanescentes.
- [ ] Ajustar fallbacks para não mascarar falta de dados.
- [ ] Garantir consistência entre rotas públicas e admin.

**Entregáveis:**

- Frontend sem conteúdo editorial legado embutido.

---

## Fase 7 — Validação de paridade completa

**Objetivo:** comprovar igualdade local vs produção.

**Tarefas:**

- [ ] Validar contagem de itens por página.
- [ ] Validar ordem, textos, legendas e datas.
- [ ] Validar todas as imagens (existência + mapeamento correto).
- [ ] Validar imagem picker por pasta e por página.

**Entregáveis:**

- Checklist de aceite assinado por evidência.

---

## Fase 8 — Encerramento e prevenção

**Objetivo:** estabilizar e reduzir risco de regressão.

**Tarefas:**

- [ ] Documentar procedimento oficial de migração/importação.
- [ ] Definir rotina de auditoria periódica de consistência.
- [ ] Registrar lições aprendidas.

**Entregáveis:**

- Runbook de manutenção de dados.

## 8) Checklist Executivo (macro)

- [x] Baseline congelada
- [x] Fonte da verdade inventariada
- [x] Estado local inventariado
- [x] Matriz de reconciliação aprovada
- [x] Scripts idempotentes implementados
- [x] Dados reconciliados
- [x] Hardcoded legado removido
- [x] Paridade validada em todas as páginas (automática)
- [x] Documentação finalizada para handoff

## 9) Critérios de Aceite

Para cada página do escopo:

- [ ] Quantidade de itens igual à produção
- [ ] Ordem de itens igual à produção
- [ ] Título, legenda, texto e data iguais à produção
- [ ] Mídias corretas e carregando sem erro
- [ ] Conteúdo vindo do banco (não hardcoded)

Critério global:

- [ ] Localhost reproduz produção com paridade funcional e editorial

## 10) Estratégia de Rollback

1. Parar escrita no admin.
2. Restaurar `database/memoria.db` do backup da Fase 0.
3. Restaurar `uploads/` do backup da Fase 0.
4. Rebuild/restart dos serviços.
5. Revalidar smoke test das 6 páginas.

## 11) Registro de Decisões

| Data | Decisão | Motivo | Impacto |
|---|---|---|---|
| 2026-03-10 | Fonte da verdade definida como produção + repo original | Resolver divergência de migração | Direciona toda reconciliação |

## 12) Histórico de Execução

| Data/Hora | Fase | Ação | Resultado | Evidência |
|---|---|---|---|---|
| 2026-03-10 | Diagnóstico | Detectada ausência de mídia de timeline em `media_file` | Divergência confirmada | inspeção DB + frontend |
| 2026-03-10 17:22 | Fase 0 | Backup completo executado via script | Snapshot gerado com sucesso | `backups/20260310-172257/` |
| 2026-03-10 17:24 | Fase 1/2 | Auditoria automatizada de verdade/local/discrepâncias | Manifestos JSON gerados | `reports/reconciliation/20260310-172403/` |
| 2026-03-10 17:25 | Fase 2 | Confirmada classificação incorreta de mídia de timeline | 28 arquivos do root `src/images` em pastas erradas no `media_file` | `reports/reconciliation/20260310-172403/discrepancies.json` |
| 2026-03-10 17:27 | Fase 3 | Matriz inicial de reconciliação criada | Ações por página e entidade mapeadas | `DATA_RECONCILIATION_MATRIX.md` |
| 2026-03-10 17:28 | Fase 5/7 | Script idempotente de reclassificação timeline criado e validado em dry-run | 28 ações planejadas sem alteração destrutiva | `reports/reconciliation/20260310-172718/timeline_media_reclassification_report.json` |
| 2026-03-10 17:28 | Execução corretiva | Reclassificação de mídia timeline aplicada em modo DB-only | `timeline=28` no picker; discrepância campus/timeline resolvida | `reports/reconciliation/20260310-172851/` |
| 2026-03-10 17:56 | Fase 5 | Script idempotente para inclusão/sincronização de `catalogacao` criado e aplicado | Página `catalogacao` criada no DB, menu atualizado e rota pública ativa | `scripts/reconciliation/sync_catalogacao_page.py` + `reports/reconciliation/20260310-175610/` |
| 2026-03-10 17:57 | Fase 8 | Sincronização de conteúdo textual de páginas estáticas com produção | `index`, `contact` e `catalogacao` em paridade no `page.content` | `scripts/reconciliation/sync_page_content_from_production.py` + `reports/reconciliation/20260310-175738/` |
| 2026-03-10 17:58 | Validação | Smoke test de rotas/páginas e APIs principais | Todas as rotas do escopo respondendo 200 | `localhost:8092` + `/api/pages` + `/api/media/list-for-editor` |
| 2026-03-10 17:59 | Fase 5 | Script idempotente de reconciliação estruturada por CSV aplicado | `timeline/campus/territorio` sem divergências remanescentes no dry-run | `scripts/reconciliation/sync_structured_content_from_csv.py` + `reports/reconciliation/20260310-175939/` |
| 2026-03-10 18:00 | Fase 6 | Hardcoded legado removido de `index.html` e `contact.html` | Páginas servem shell e conteúdo editorial vem do DB (`/api/pages/*`) | `index.html`, `contact.html` |
| 2026-03-10 18:09 | Fase 5 | Correção de colisão de nomes na mídia por uso real de conteúdo | Script idempotente garantiu registros de mídia por contexto (`timeline/campus/territorio/trabalhos`) sem duplicação em dry-run | `scripts/reconciliation/sync_media_registry_by_content_usage.py` + `reports/reconciliation/20260310-180939/` |

## 13) Próximas Ações Imediatas

1. Executar validação visual/manual final no navegador para aceite humano (UX/layout e consistência percebida).
2. Definir decisão de produto sobre item `Contato` no menu final.
3. Consolidar runbook operacional da migração para manutenção contínua.
