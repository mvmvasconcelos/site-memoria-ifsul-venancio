# ✅ CHECKLIST PRONTA PARA PRÓXIMA SESSÃO

## 📌 FASE 1: PREPARAÇÃO (5 min)

- [ ] Ler `NEXT_SESSION_QUICK_GUIDE.md` (resumo executivo)
- [ ] Ler `MIGRATION_UNIFIED_SYSTEM.md` (plano detalhado)
- [ ] Ler `MIGRATION_TECHNICAL_REFERENCE.md` (referência técnica)
- [ ] Backup do banco: `docker-compose exec -T memoria-cms python /app/scripts/backup.py`
- [ ] Backup de src/images: `tar czf src-images-backup.tar.gz src/images/`

---

## 📝 FASE 2: CRIAR ARQUIVOS JS (15 min)

### 2.1 Criar `src/js/cards.js`
- [ ] Copiar template de `MIGRATION_CODE_TEMPLATES.md` → sections "1. cards.js"
- [ ] Validar sintaxe (F2 → "Go to Definition" em VSCode)
- [ ] Testar em navegador: abrir Dev Tools Console

### 2.2 Criar `src/js/gallery.js`
- [ ] Copiar template de `MIGRATION_CODE_TEMPLATES.md` → section "2. gallery.js"
- [ ] Validar sintaxe
- [ ] Criar `<div id="gallery-container">` em trabalhos.html se não existir

---

## 🔧 FASE 3: MODIFICAR HTML (5 min)

### 3.1 Atualizar `campus.html`
- [ ] Adicionar antes de `</body>`:
```html
<script src="src/js/cards.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', () => {
    loadCardsData('campus');
  });
</script>
```

### 3.2 Atualizar `territorio.html`
- [ ] Adicionar mesmo trecho, mas com `loadCardsData('territorio')`

### 3.3 Atualizar `trabalhos.html`
- [ ] Verificar se existe `<div id="gallery-container">` (se não, criar)
- [ ] Adicionar antes de `</body>`:
```html
<script src="src/js/gallery.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', () => {
    loadGalleryData();
  });
</script>
```

---

## 🐍 FASE 4: CRIAR SCRIPTS PYTHON (10 min)

### 4.1 Criar `scripts/scan_and_import_legacy_images.py`
- [ ] Copiar template de `MIGRATION_CODE_TEMPLATES.md` → section "3."
- [ ] Validar: `python -m py_compile scripts/scan_and_import_legacy_images.py`
- [ ] Adicionar docstring
- [ ] Testar com `--dry-run` se implementado

### 4.2 Criar `scripts/update_cards_with_media_id.py`
- [ ] Copiar template → section "4."
- [ ] Validar sintaxe

### 4.3 Criar `scripts/update_gallery_with_media_id.py`
- [ ] Copiar template → section "5."
- [ ] Validar sintaxe

---

## 🐳 FASE 5: DEPLOY PARA CONTAINER (10 min)

### 5.1 Copiar JS para container
```bash
docker cp src/js/cards.js memoria-cms:/app/src/js/
docker cp src/js/gallery.js memoria-cms:/app/src/js/
```
- [ ] Confirmar: `docker-compose exec -T memoria-cms ls -la /app/src/js/ | grep -E 'cards|gallery'`

### 5.2 Copiar HTML para container
```bash
docker cp campus.html memoria-cms:/app/
docker cp territorio.html memoria-cms:/app/
docker cp trabalhos.html memoria-cms:/app/
```
- [ ] Confirmar com `docker-compose exec -T memoria-cms cat /app/campus.html | grep -i 'cards.js'`

### 5.3 Copiar scripts Python para container
```bash
docker cp scripts/scan_and_import_legacy_images.py memoria-cms:/app/scripts/
docker cp scripts/update_cards_with_media_id.py memoria-cms:/app/scripts/
docker cp scripts/update_gallery_with_media_id.py memoria-cms:/app/scripts/
```

---

## 🚀 FASE 6: EXECUTAR MIGRAÇÕES (20 min)

### 6.1 Scan & Import Images
```bash
docker-compose exec -T memoria-cms python /app/scripts/scan_and_import_legacy_images.py
```
- [ ] Procurar por: "✅ IMPORT" lines (mínimo 40 imagens)
- [ ] Procurar por: "Map salvo em:" (deve criar JSON)
- [ ] Erros? Consultar "ROLLBACK PLAN" em MIGRATION_UNIFIED_SYSTEM.md

### 6.2 Update Cards
```bash
docker-compose exec -T memoria-cms python /app/scripts/update_cards_with_media_id.py
```
- [ ] Procurar por: "✅ UPDATE" lines (mínimo 12)
- [ ] Resultado esperado: "Atualizados: 12"

### 6.3 Update Gallery
```bash
docker-compose exec -T memoria-cms python /app/scripts/update_gallery_with_media_id.py
```
- [ ] Procurar por: "✅ UPDATE" lines (mínimo 4)
- [ ] Resultado esperado: "Atualizados: 4"

---

## 🧪 FASE 7: TESTES (30 min)

### 7.1 API Tests
```bash
# Test Cards
curl http://localhost:8092/api/cards/3 | jq '.[] | {id, title, media_id}' | head -6
# Deve retornar 12 cards com media_id >= 1

# Test Gallery
curl http://localhost:8092/api/gallery/4 | jq '.[] | {id, title, media_id}'
# Deve retornar 4 items com media_id >= 1

# Test Media
curl http://localhost:8092/api/media/public-list | jq '.[] | {filename, folder}' | head -10
# Deve retornar >=40 arquivo
```
- [ ] Todos os curls retornam JSON válido (não 500)

### 7.2 Browser Tests
**Abrir DevTools (F12) → Console limpo?**

#### Campus
- [ ] Abrir: `https://ifva.duckdns.org/memoria/campus`
- [ ] Procurar: 12 cards visíveis
- [ ] Procurar: Imagens carregando (não quebrada)
- [ ] Procurar: Nenhuma mensagem de erro (console limpo)

#### Territorio
- [ ] Abrir: `https://ifva.duckdns.org/memoria/territorio`
- [ ] Procurar: 1 card visível
- [ ] Procurar: Imagem carregando
- [ ] Procurar: Console limpo

#### Trabalhos
- [ ] Abrir: `https://ifva.duckdns.org/memoria/trabalhos`
- [ ] Procurar: 4 imagens em grid
- [ ] Procurar: Títulos visíveis
- [ ] Procurar: Console limpo

#### Network Tab
- [ ] Abrir DevTools → Network
- [ ] Recarregar página
- [ ] Procurar por `/media/serve/` requests
- [ ] Todos devem retornar **200** (não 404)
- [ ] Tamanho deve ser > 50KB (imagens reais)

---

## 🗑️ FASE 8: CLEANUP (10 min)

### 8.1 Remover src/images (DEPOIS DE VALIDAR TUDO)
```bash
# PRIMEIRO: Validar que não precisa más
ls src/images/ | wc -l  # Conte quantas

# DEPOIS: Remover
rm -rf src/images/
```
- [ ] Confirmar que página ainda funciona (recarregar)
- [ ] Confirmar que nenhuma 404 aparece

### 8.2 Limpar debug logs
- [ ] Remover `console.log('[DEBUG]')` de bootstrap() em admin-cms.js
- [ ] Verificar que ainda há `console.log('[LOAD_MEDIA]')` (útil para debug)

### 8.3 Git Commit
```bash
git add .
git commit -m "✨ feat: Sistema unificado de conteúdo

- Cards (campus, territorio) agora carregam de API
- Gallery (trabalhos) carrega de API
- Todas as imagens importadas para MediaFile
- src/images/ removido (tudo via /media/serve/)
- Frontend 100% dinâmico
- Closes: Sistema unificado"
```
- [ ] Commit feito com sucesso

---

## 🔍 FASE 9: VALIDAÇÃO FINAL (10 min)

### 9.1 Checklist Final
- [ ] Campus mostra 12 cards com imagens
- [ ] Territorio mostra 1 card com imagem
- [ ] Trabalhos mostra 4 imagens
- [ ] Index tem conteúdo (não vazio)
- [ ] Contact tem conteúdo (não vazio)
- [ ] Menu navegante em todas as páginas
- [ ] Timeline funciona (já estava funcionando)
- [ ] Console limpo (F12 → Console, sem erros)
- [ ] Responsivo (testar em mobile)
- [ ] Todas as URLs são `/memoria/...` quando em subpath

### 9.2 Se algo quebrou
- [ ] Consultar ROLLBACK PLAN em MIGRATION_UNIFIED_SYSTEM.md
- [ ] Restaurar backup: `docker-compose exec -T memoria-cms python /app/scripts/restore.py [date]`
- [ ] Restaurar arquivos: `tar xzf src-images-backup.tar.gz`

---

## 📞 NOTAS IMPORTANTES

## ❓ Se o script `scan_and_import_legacy_images.py` não funcionar:

1. Verificar se `/app/src/images/` existe no container:
   ```bash
   docker-compose exec -T memoria-cms ls -l /app/src/images/ | head
   ```

2. Verificar se database está acessível:
   ```bash
   docker-compose exec -T memoria-cms python -c "from app import create_app; from app.extensions import db; app = create_app(); print(db.engine.url)"
   ```

3. Se erro de permissão:
   ```bash
   docker-compose exec -T memoria-cms chmod 755 /app/scripts/*.py
   ```

---

## ❓ Se a imagem 404 no navegador:

1. Verificar se URL está correta:
   ```bash
   curl -I http://localhost:8092/media/serve/campus/[uuid].jpg
   # Deve ser HTTP 200
   ```

2. Verificar se arquivo existe:
   ```bash
   docker-compose exec -T memoria-cms ls -la /app/uploads/campus/ | head
   ```

3. Verificar se media_id está correto no banco:
   ```bash
   docker-compose exec -T memoria-cms python -c "from app import create_app; from app.models import CardItem; app = create_app(); \
   with app.app_context(): print([(c.id, c.media_id, c.media_file.file_path if c.media_file else None) for c in CardItem.query.limit(3)])"
   ```

---

## ⏱️ TIMELINE

| Fase | Tarefas | Tempo |
|------|---------|-------|
| 1 | Preparação | 5 min |
| 2 | Criar JS | 15 min |
| 3 | Modify HTML | 5 min |
| 4 | Criar Python | 10 min |
| 5 | Deploy | 10 min |
| 6 | Executar Scripts | 20 min |
| 7 | Testes | 30 min |
| 8 | Cleanup | 10 min |
| 9 | Validação | 10 min |
| **TOTAL** | | **≈ 2 horas** |

---

## 🎉 PRONTO?

Quando acabar:
- [ ] Crie um branch `feature/sistema-unificado`
- [ ] Push para GitHub
- [ ] Abra um PR com description clara
- [ ] Merge para `main`
- [ ] Celebrate! 🎊

---

**Go go go! 🚀**
