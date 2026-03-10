# 📋 Passos para Aplicar a Migração do Gerenciador de Mídia

## 🎯 Status Atual

- ✅ **Backend**: Novo modelo `MediaFile` + rota `/api/media` criados
- ✅ **Frontend**: Interface "🖼️ Mídia" implementada em HTML/JS/CSS
- ⏳ **BD**: Tabela precisa ser criada no SQLite  
- 🔄 **Deploy**: Usar `docker-compose.fase3.yml` (com Flask)

---

## 🚀 PASSO A PASSO

### Passo 1: Fazer Backup (IMPORTANTE!)

```bash
cd /home/ifsul/projects/site-memoria-ifsul-venancio

# Backup do banco de dados
cp database/memoria.db database/memoria.db.backup.$(date +%Y%m%d-%H%M%S)

# Backup do docker-compose atual
cp docker-compose.yml docker-compose.yml.nginx.backup
```

### Passo 2: Migrar para Fase 3 (Flask)

```bash
# Usar nova configuração com Flask
cp docker-compose.fase3.yml docker-compose.yml

# Parar container Nginx
docker-compose down

# Subir novo container Flask
docker-compose up -d
```

**Aguarde o container inicializar:**
```bash
docker-compose logs -f memoria-cms
```

Quando ver "Running on http://0.0.0.0:5000", está pronto. CTRL+C para sair.

### Passo 3: Criar Tabela de Mídia

```bash
docker-compose exec memoria-cms python migrate_media_table.py
```

**Esperado:**
```
✓ Tabela 'media_file' criada com sucesso!
  Colunas: id, filename, file_path, folder, file_size, mime_type, description, alt_text, created_at, updated_at
```

### Passo 4: Verificar

```bash
# Ver todas as tabelas
docker-compose exec memoria-cms sqlite3 database/memoria.db ".tables"
```

Deve incluir: `media_file`

### Passo 5: Acessar Admin

Abra no navegador: **http://localhost:8092/admin**

Você verá:
- ✅ Novo menu "🖼️ Mídia" na sidebar
- ✅ Card "Arquivos de Mídia" no Dashboard
- ✅ Painel completo com upload e grid

---

## ✅ Funcionalidades Disponíveis

Após concluir os passos acima:

### 📤 Upload
1. Selecione pasta (timeline, trabalhos, etc.)
2. Clique "📤 Upload de Arquivo"
3. Escolha uma imagem
4. Pronto! Arquivo salvo em `/uploads/{pasta}/{uuid}.{ext}`

### 🔄 Visualização
- **Tabela**: Clique "Grid" para mudar para miniaturas
- **Grid**: Clique "Lista" para tabela

### ✎ Editar Metadados
1. Clique "✎ Editar" em qualquer arquivo
2. Adicione "Texto Alternativo" (acessibilidade)
3. Adicione "Descrição"
4. Salve

### 🗑️ Deletar
1. Clique "🗑️ Deletar"
2. Confirme (não pode desf azer!)

### 🔍 Filtrar
Use dropdown "Pasta: Todos" para filtrar

---

## 🔙 Se Precisar Voltar (Rollback)

```bash
# Para Flask
docker-compose down

# Restaurar config Nginx
cp docker-compose.yml.nginx.backup docker-compose.yml

# Subir Nginx novamente
docker-compose up -d
```

---

## 📊 Arquivos Modificados

- ✅ `backend/app/models.py` - Novo modelo `MediaFile`
- ✅ `backend/app/routes/media.py` - Nova rota de API
- ✅ `backend/app/__init__.py` - Registrado `media_bp`
- ✅ `admin.html` - Novo painel "🖼️ Mídia"
- ✅ `src/js/admin-cms.js` - Funções para media manager
- ✅ `src/css/admin.css` - Estilos grid e tabela
- ✅ `migrate_media_table.py` - Script de migração

---

## 🆘 Problemas Comuns

### Erro "port 8092 already in use"
```bash
docker-compose down --remove-orphans
docker-compose up -d
```

### Erro ao executar migrate_media_table.py
```bash
# Checar se container está rodando
docker-compose ps

# Ver logs
docker-compose logs memoria-cms
```

### Interface não aparece no admin
- Limpe cache do navegador: CTRL+SHIFT+DEL
- Ou use incógnito: CTRL+SHIFT+N

---

## 📞 Suporte

Para dúvidas, consulte:
- [MEDIA_MANAGER_README.md](MEDIA_MANAGER_README.md) - Documentação completa
- [docker-compose.fase3.yml](docker-compose.fase3.yml) - Configuração Flask
- [Dockerfile.fase3](Dockerfile.fase3) - Imagem Docker com Python
