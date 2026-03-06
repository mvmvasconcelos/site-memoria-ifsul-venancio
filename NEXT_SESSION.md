# Próxima Sessão - Plano Objetivo

## Contexto consolidado (06/03/2026)

- Produção ativa em `https://ifva.duckdns.org/memoria/`
- CMS em modo público **DB-only** para páginas gerenciáveis
- Páginas ativas no fluxo: `index`, `territorio`, `campus`, `trabalhos`, `contact`, `timeline`
- `catalogacao` removida do fluxo ativo (`404` na rota limpa)
- Smoke operacional validado após deploy

## 1) Homologação funcional final (manual)

- Validar edição e publicação em cada página ativa:
  - abrir editor
  - editar no modo Visual
  - alternar para HTML
  - validar Preview
  - salvar
  - confirmar reflexo no público (hard reload)
- Validar especificamente em `campus` e `territorio`:
  - inserção por Template Card
  - manutenção do estilo visual esperado
  - comportamento responsivo (desktop e mobile)

Status: pendente.

## 2) Qualidade de conteúdo e UX

- Revisar mensagens de toast do editor para reduzir ruído.
- Avaliar inclusão de módulos extras de bloco (ex.: seção, imagem+legenda) no editor.
- Revisar consistência tipográfica após integração dos CSS globais.

Status: pendente.

## 3) Operação e segurança

- Rodar `scripts/smoke_memoria.sh` após cada deploy.
- Rodar `scripts/backup_memoria.sh` ao final da sessão.
- Registrar crescimento de `database/memoria.db` e `uploads/`.

Status: rotina obrigatória por sessão.

## Critério de encerramento da próxima sessão

- Homologação manual concluída sem divergência entre editor e público.
- Smoke e backup executados com sucesso.
- Documentação atualizada e commit final realizado.
