# Deploy e Operação - Site Memória IFSul

Este guia cobre apenas o fluxo operacional atual (Fase 3 / CMS).

## Stack em uso

- Serviço: `memoria-cms`
- Compose: `docker-compose.fase3.yml`
- Porta: `8092 -> 5000`
- URL pública atual: `https://ifva.duckdns.org/memoria/`

## Subir e atualizar

```bash
cd /home/ifsul/projects/site-memoria-ifsul-venancio

docker-compose -f docker-compose.fase3.yml down
docker-compose -f docker-compose.fase3.yml up --build -d
```

## Verificação rápida (smoke)

```bash
curl -I https://ifva.duckdns.org/memoria/
curl -I https://ifva.duckdns.org/memoria/admin
curl -I https://ifva.duckdns.org/memoria/api/health
```

## Logs

```bash
docker-compose -f docker-compose.fase3.yml logs -f
```

## Inicialização (primeira execução)

```bash
docker exec -it memoria-cms flask --app backend/run.py init-db
docker exec -it memoria-cms flask --app backend/run.py create-admin
```

## Backup e restauração

```bash
# backup
bash scripts/backup_memoria.sh

# restauração do último
bash scripts/restore_memoria.sh latest
```

Saída dos backups: pasta `backups/`.

## Notas importantes

- `docker-compose.yml` é stack legada estática; não usar para o CMS.
- Evitar instalar dependências no host; executar tudo via containers.
- Após mudanças em JS/CSS do admin, usar versionamento de assets (`?v=...`) para evitar cache antigo.
