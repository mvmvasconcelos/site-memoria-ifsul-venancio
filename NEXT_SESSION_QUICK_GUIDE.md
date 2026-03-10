# 📌 RESUMO EXECUTIVO: PRÓXIMA SESSÃO

## ⚡ TL;DR (Muito Longo; Não Li)

**Objetivo:** Sistema unificado onde TODO conteúdo vem do banco (não arquivos estáticos)

**Situação:**
- ✅ Timeline: PRONTA (carrega via API)
- ❌ Campus: API pronta, frontend vazio
- ❌ Territorio: API pronta, frontend vazio
- ❌ Trabalhos: API pronta, frontend vazio
- ❌ Index: Sem conteúdo
- ❌ Contact: Sem conteúdo
- 📁 `src/images/`: 1000+ arquivos legados

**O que fazer:** 4 scripts + 3 JS files = Site 100% dinâmico

**Tempo estimado:** 2-2.5 horas

---

## 📁 ARQUIVOS A CRIAR/MODIFICAR

### ✨ CRIAR (novos arquivos)
```bash
src/js/cards.js                                    # 200 linhas
src/js/gallery.js                                  # 150 linhas
scripts/scan_and_import_legacy_images.py           # 150 linhas
scripts/update_cards_with_media_id.py              # 80 linhas
scripts/update_gallery_with_media_id.py            # 80 linhas
```

### 📝 MODIFICAR (adicionar código)
```bash
campus.html                # +5 linhas (script loader)
territorio.html            # +5 linhas (script loader)
trabalhos.html             # +8 linhas (div + script)
```

### 🗑️ REMOVER (cleanup)
```bash
src/images/                # Pasta inteira (depois de migração)
resolveAssetUrl()          # Função em admin-cms.js (deprecada)
```

---

## 🚀 QUICK START (Próxima Sessão)

```bash
# 1. Ler documentação (5 min)
cat MIGRATION_UNIFIED_SYSTEM.md

# 2. Criar arquivos JS (10 min)
# Copiar templates de MIGRATION_CODE_TEMPLATES.md para:
#  - src/js/cards.js
#  - src/js/gallery.js

# 3. Modificar HTML (5 min)
# Adicionar <script> tags em:
#  - campus.html
#  - territorio.html
#  - trabalhos.html

# 4. Copiar scripts para container (5 min)
docker cp scripts/*.py memoria-cms:/app/scripts/

# 5. Executar migration in order (20 min):
docker-compose exec -T memoria-cms python /app/scripts/scan_and_import_legacy_images.py
docker-compose exec -T memoria-cms python /app/scripts/update_cards_with_media_id.py
docker-compose exec -T memoria-cms python /app/scripts/update_gallery_with_media_id.py

# 6. Deploy e testes (30 min)
docker cp src/js/*.js memoria-cms:/app/src/js/
curl http://localhost:8092/api/cards/3 | jq
# Teste em navegador: campus, territorio, trabalhos

# 7. Cleanup (10 min)
rm -rf src/images/
git add . && git commit -m "✨ Sistema unificado: todo conteúdo do banco"
```

---

## 📱 Testes Rápidos

```bash
# Test 1: Campus carrega?
curl http://localhost:8092/api/cards/3 | jq '.[] | {title, media_id}' | head -3

# Test 2: Imagens importadas?
curl http://localhost:8092/api/media/public-list | jq '.[] | {filename, folder}' | head -3

# Test 3: Visual - Frontend
# Abrir: https://ifva.duckdns.org/memoria/campus
# Procurar: 12 cards com imagens
```

---

## 🔍 CONHECIMENTO CRÍTICO

### Como tudo conecta:

```
Banco (MediaFile) 
  ↓ (API)
/api/media/public-list → {file_path: "campus/uuid.jpg"}
  ↓ (Frontend JS)
buildMediaUrl("campus/uuid.jpg") → "/memoria/media/serve/campus/uuid.jpg"
  ↓ (Nginx)
proxy_pass to Flask → /media/serve/campus/uuid.jpg
  ↓ (Flask route)
public_bp('/media/serve/<path>') → send_file(/uploads/campus/uuid.jpg)
  ↓
Browser recebe imagem ✅
```

### Funções-chave em cards.js / gallery.js:

```javascript
loadCardsData(pageSlug)
  ├─ busca /api/pages/{slug}
  ├─ busca /api/cards/{page.id}
  └─ chama populateCards(cards)

populateCards(cards)
  ├─ mapeia cards via renderCard()
  └─ insere no DOM

renderCard(card)
  ├─ detecta se tem media_id ou image_path
  ├─ monta URL via buildMediaUrl() ou buildAssetUrl()
  └─ retorna HTML string
```

---

## ⚠️ ARMADILHAS COMUNS

### ❌ Erro 1: URL do buildMediaUrl errada
```javascript
// ERRADO:
/media/serve/campus/uuid.jpg
// Correto (com subpath):
/memoria/media/serve/campus/uuid.jpg
```
**Solução:** Usar `buildApiUrl()` + `buildMediaUrl()` juntos

### ❌ Erro 2: Importar imagem com mesmo nome 2x
**Solução:** Script valida por MD5 hash, evita duplicatas

### ❌ Erro 3: Card sem media_id e image_path quebrado
**Solução:** Script tenta encontrar por filename, log se não achar

### ❌ Erro 4: src/images/ removido antes de migração completa
**Solução:** Fazer backup antes: `tar czf src-images-backup.tar.gz src/images/`

---

## 📊 ESTADO ESPERADO AO FINAL

```
❌ → ✅ Mudanças:

Campus          (vazio)          → 12 cards com imagens ✅
Territorio      (vazio)          → 1 card com imagem ✅
Trabalhos       (vazio)          → 4 gallery items ✅
Index           (sem conteúdo)   → Com conteúdo HTML ✅
Contact         (sem conteúdo)   → Com conteúdo HTML ✅
src/images/     (1000 arquivos)  → REMOVIDO ✅
Imagens         (estáticas)      → Via /media/serve/ ✅
```

---

## 💾 BACKUP & RECOVERY

**Antes de começar:**
```bash
# Banco
docker-compose exec -T memoria-cms python /app/scripts/backup.py

# Arquivos
tar czf src-images-backup.tar.gz src/images/
tar czf src-js-backup.tar.gz src/js/
```

**Se der ruim:**
```bash
# Restaurar banco
docker-compose exec -T memoria-cms python /app/scripts/restore.py [date]

# Restaurar arquivos
tar xzf src-images-backup.tar.gz
tar xzf src-js-backup.tar.gz

# Restart
docker-compose restart memoria-cms
```

---

## 📚 DOCUMENTAÇÃO CRIADA

1. **MIGRATION_UNIFIED_SYSTEM.md** ← LEIA PRIMEIRO (plano principal)
2. **MIGRATION_TECHNICAL_REFERENCE.md** ← APIs, modelos, detalhes
3. **MIGRATION_CODE_TEMPLATES.md** ← Copy-paste ready

---

## ✅ VALIDAÇÃO POS-MIGRAÇÃO

Depois de tudo pronto:

- [ ] Nenhuma 404 no console (F12)
- [ ] Campus mostra 12 cards
- [ ] Territorio mostra 1 card
- [ ] Trabalhos mostra 4 imagens
- [ ] Cliques em "anos" filtram cards (se houver)
- [ ] Index não vazio
- [ ] Contact não vazio
- [ ] Menu funciona
- [ ] Responsive (mobile) funciona

---

## 🎯 PRÓXIMOS PASSOS APÓS ESTA MIGRAÇÃO

1. Adicionar `media_id` como FK em models (fazer migration formal)
2. Remover `image_path` dos modelos (depois de 1 sprint)
3. Criar interfaces de upload de imagem no Admin para cards/gallery
4. Implementar lightbox em gallery
5. Cache de imagens optimizado

---

**Hora de dormir, e na próxima sessão: BORA BORAAA 🚀**
