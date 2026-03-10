# 🐳 Instruções para Aplicar Migração em Container

## ⚠️ Status Atual (Fase 2 - Nginx)

Seu docker-compose usa apenas **Nginx** (sem Python). Para a migração, use a **Fase 3**:

## ✅ MIGRAÇÃO PARA FASE 3 (Recomendado)

### Passo 1: Fazer Backups

```bash
cd /home/ifsul/projects/site-memoria-ifsul-venancio

# Backup da base de dados
cp database/memoria.db database/memoria.db.backup.$(date +%s)

# Backup do docker-compose (Fase 2)
cp docker-compose.yml docker-compose.yml.phase2.backup
```

### Passo 2: Ativar Fase 3

```bash
# Usar a configuração fase 3
cp docker-compose.fase3.yml docker-compose.yml

# Parar container atual
docker-compose down

# Criar e subir novo container com Flask
docker-compose up -d
```

Aguarde os logs:
```bash
docker-compose logs -f memoria-cms
```

Quando ver "Running on", pressione CTRL+C.

### Passo 3: Aplicar Migração da Tabela de Mídia

```bash
docker-compose exec memoria-cms python migrate_media_table.py
```

**Output esperado:**
```
✓ Tabela 'media_file' criada com sucesso!
  Colunas: id, filename, file_path, folder, file_size, mime_type, description, alt_text, created_at, updated_at
```

### Passo 4: Verificar Tabela Criada

```bash
docker-compose exec memoria-cms sqlite3 database/memoria.db ".tables"
```

Deve listar:
```
gallery_item  media_file  menu_item  page  timeline_item  ...
```

## Para Docker (Sem Compose)

Se estiver usando Docker puro:

```bash
docker exec <container_id> python migrate_media_table.py
```

Obtenha o container ID com:

```bash
docker ps | grep web
```

## Verificação Completa

Para verificar a estrutura da tabela criada:

```bash
docker-compose exec web python -c "
from app import db, create_app
app = create_app()
with app.app_context():
    inspector = db.inspect(db.engine)
    cols = inspector.get_columns('media_file')
    for col in cols:
        print(f'{col[\"name\"]:15} {col[\"type\"]}')
"
```

## Se Der Erro de Importação

Se receber erro como `ModuleNotFoundError: No module named 'flask'`, a instalação de dependências pode ter falhado. Execute dentro do container:

```bash
docker-compose exec web pip install -r backend/requirements.txt
```

## Rollback (Se Necessário)

Se precisar reverter, simplesmente delete a tabela:

```bash
docker-compose exec web sqlite3 database/memoria.db "DROP TABLE IF EXISTS media_file;"
```

Depois reaplique a migração.
