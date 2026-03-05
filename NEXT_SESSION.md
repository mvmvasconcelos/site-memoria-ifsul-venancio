# Próxima Sessão - Plano Objetivo

## 1) Validação final do editor de páginas

- Testar fluxo completo em `index`, `campus`, `territorio`, `trabalhos`, `catalogacao`, `contact`:
  - abrir editor
  - editar no modo Visual
  - alternar para HTML
  - validar Preview
  - salvar
  - confirmar reflexo no público

## 2) Melhorias rápidas de UX (se necessário)

- Ajustar template de card para variantes por página (`campus` e `territorio`).
- Adicionar botão de “duplicar bloco” no editor (opcional, baixo risco).
- Rever mensagens de toast para reduzir ruído.

## 3) Estabilidade operacional

- Rodar `scripts/smoke_memoria.sh` após deploy.
- Confirmar backup com `scripts/backup_memoria.sh`.
- Registrar tamanho do banco e pasta `uploads/` para controle de crescimento.

## 4) Pendências de médio prazo

- Revisar `MIGRACAO_ANALISE.md` e marcar itens já concluídos.
- Definir política simples de versionamento de conteúdo (quantidade e retenção).
- Planejar migração DNS (quando autorizado), sem bloquear evolução do CMS.

## Critério de encerramento da próxima sessão

- Editor validado em todas as páginas gerenciáveis.
- Smoke e backup executados sem erro.
- Commit com mensagem clara e documentação atualizada.
