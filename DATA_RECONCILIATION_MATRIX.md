# Matriz Inicial de Reconciliação (Fase 3)

> Status: documento histórico da análise inicial. Para estado final desta sessão, usar `reports/reconciliation/PARITY_REPORT_20260310.md` e os relatórios JSON mais recentes em `reports/reconciliation/`.

Data base: 2026-03-10

Referências de evidência:

- Backup baseline: `backups/20260310-172257/`
- Auditoria automática: `reports/reconciliation/20260310-172510/`
- Plano macro: `DATA_RECONCILIATION_PLAN.md`

## 1) Achados críticos consolidados

1. **Classificação incorreta de mídia da timeline no `media_file`**
   - 28 arquivos do root `src/images` (imagens da timeline) estão cadastrados em pastas erradas (`campus`/`trabalhos`) no banco.
   - Evidência: `misclassified_media_count = 28` em `discrepancies.json`.

2. **Inconsistência estrutural entre produção estática e local DB-driven**
   - Produção é servida de forma estática (GitHub Pages), sem API `/api/*`.
   - Local depende de DB/API para carregar conteúdo dinâmico.

3. **Página de Publicações em Jornais ausente no banco local**
   - `page.slug` local não contém `catalogacao`/`publicacoes`.
   - Produção possui conteúdo válido em `catalogacao.html`.

4. **Fonte de verdade da página Território precisa ser validada manualmente**
   - O CSV local `src/territorio.csv` apresenta formatação inconsistente e não deve ser usado isoladamente como canônico.

## 2) Matriz por página (verdade vs local)

| Página | Fonte de verdade operacional | Estado local atual | Gap | Ação principal |
|---|---|---|---|---|
| Início | Produção (`/`) | Existe em `page.slug=index`, sem inventário textual final | Médio | Extrair texto da produção e reconciliar `page.content` |
| Linha do Tempo | Produção + `src/timeline.csv` + `src/images/*` | 29 itens em `timeline_item`; conteúdo base parece completo | Alto (mídia) | Corrigir classificação de mídia no `media_file` para pasta `timeline` |
| Transformações do Território | Produção + imagens `src/images/territorio/` | 1 card no DB (compatível com estado CSV local atual), validação textual pendente | Médio | Confirmar estrutura canônica da produção e ajustar `card_item` se necessário |
| Câmpus Venâncio Aires | Produção + `src/campus.csv` + imagens `src/images/campus/` | 12 cards no DB, paths coerentes | Baixo | Validar texto/ordem fina e sincronizar metadados de mídia |
| Trabalhos de Mestrado | Produção + `src/images/trabalhos/` | 4 `gallery_item` no DB | Médio | Validar títulos/caption e vinculação correta em `media_file` |
| Publicações em Jornais | Produção (`/catalogacao.html`) | **Não existe página equivalente no DB** | Alto | Criar `page` + conteúdo + menu + eventual estrutura de dados específica |

## 3) Matriz por entidade (DB)

| Entidade | Estado atual | Gap | Ação |
|---|---|---|---|
| `page` | 6 páginas (`index`, `timeline`, `territorio`, `campus`, `trabalhos`, `contact`) | Falta `catalogacao/publicacoes` | Inserir página e posicionamento no menu |
| `timeline_item` | 29 registros | Conteúdo ok em contagem; dependência de imagem ainda legada | Manter conteúdo; ajustar integração com `media_file` |
| `card_item` | 13 registros (12 campus, 1 território) | Revisar território e ordenação fina | Validar contra produção e ajustar texto/ordem |
| `gallery_item` | 4 registros | Validar título/caption | Ajuste pontual por diff |
| `media_file` | 44 registros (`campus=38`, `territorio=2`, `trabalhos=4`, `timeline=0`) | Classificação incorreta de 28 mídias de timeline | Reclassificar `folder/file_path` sem perda de vínculo |

## 4) Lista de ações técnicas (ordem recomendada)

### Bloco A — Preparação

1. Congelar escrita no admin durante execução dos scripts.
2. Confirmar backup baseline válido (`backups/20260310-172257/`).

### Bloco B — Reconciliação de mídia (alta prioridade)

1. Criar script idempotente para:
   - detectar arquivos de timeline (root `src/images`, exceto imagens institucionais),
   - reclassificar registros `media_file` para `folder='timeline'`,
   - ajustar `file_path` para `timeline/<nome_gerado>` preservando arquivo físico em `uploads`.
2. Criar relatório `antes/depois` com contagem por pasta.
3. Validar image picker por pasta após ajuste.

### Bloco C — Reconciliação de conteúdo

1. Criar manifesto canônico consolidado de produção para as 6 páginas.
2. Gerar diff por página (`inserir`, `atualizar`, `reordenar`, `remover`).
3. Aplicar scripts idempotentes por entidade:
   - `page` (incluindo `catalogacao/publicacoes`),
   - `timeline_item`,
   - `card_item`,
   - `gallery_item`.

### Bloco D — Remoção de legado hardcoded

1. Eliminar dependência de conteúdo editorial embutido nas páginas públicas.
2. Manter apenas estrutura de layout estática.
3. Garantir fallback explícito de erro (sem mascarar ausência de dados).

### Bloco E — Validação final

1. Comparar localhost vs produção por página (contagem, ordem, títulos, textos, legendas, imagens).
2. Rodar smoke test de navegação nas 6 páginas + admin picker.
3. Registrar aceite final com evidências no plano.

## 5) Critérios de pronto para iniciar alterações em massa

- [x] Backup recente confirmado
- [x] Inventário local automatizado gerado
- [x] Discrepâncias críticas identificadas
- [ ] Manifesto canônico final de produção consolidado
- [ ] Scripts idempotentes de correção implementados e testados em dry-run

## 6) Próximo passo imediato (execução)

Implementar o **primeiro script idempotente de correção da `media_file`** (reclassificação timeline), com `--dry-run` e relatório detalhado, antes de alterar conteúdo textual.
