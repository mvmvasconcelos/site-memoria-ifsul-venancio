# ⚡ Checklist Rápido - Gerenciador de Mídia

## ✅ Verificação pré-migração

- [ ] Banco de dados atual: `database/memoria.db` (fazer backup!)
- [ ] Docker-compose rodando: `docker-compose ps`
- [ ] Espaço em disco disponível: `df -h`
- [ ] Permissões de escrita em `uploads/`

## 🚀 Executar Migração (5 min)

```bash
# 1. Backup
cp database/memoria.db database/memoria.db.backup.$(date +%s)

# 2. Migrar para Fase 3  
cp docker-compose.fase3.yml docker-compose.yml
docker-compose down && docker-compose up -d

# 3. Aguardar ~30 segundos e criar tabela
sleep 30
docker-compose exec -T memoria-cms python migrate_media_table.py

# 4. Validar
docker-compose exec -T memoria-cms sqlite3 database/memoria.db "SELECT COUNT(*) FROM media_file;"
```

## ✨ Resultado Esperado

```
✓ Tabela 'media_file' criada com sucesso!
  Colunas: 10 (id, filename, file_path, folder, file_size, mime_type, description, alt_text, created_at, updated_at)
```

## 🔍 Acessar Admin

**URL**: http://localhost:8092/admin

**Nova seção**: Sidebar → "🖼️ Mídia" (próximo a "Gerenciar Páginas")

## 📊 API Endpoints Disponíveis

- `GET /api/media` - Listar todos os arquivos
- `GET /api/media?folder=timeline` - Filtrar por pasta
- `POST /api/media` - Upload novo (multipart/form-data)
- `PUT /api/media/{id}` - Editar metadados
- `DELETE /api/media/{id}` - Deletar arquivo

## 🔙 Desfazer (Volta para Nginx)

```bash
docker-compose down
cp docker-compose.yml.nginx.backup docker-compose.yml
docker-compose up -d
```

---

**Tempo estimado**: 15-20 minutos (incluindo build da imagem Docker)

**Próximas features** (opcional):
- Busca/filtro por nome
- Edição em lote
- Drag & drop
- Compressão automática
