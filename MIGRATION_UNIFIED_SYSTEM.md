# 🎯 PLANO DE MIGRAÇÃO: SISTEMA UNIFICADO DE CONTEÚDO

**Data Planejamento:** 09/03/2026  
**Objetivo:** Unificar todo conteúdo do site em um sistema dinâmico baseado em banco de dados  
**Status:** ⏳ Planejado para próxima sessão

---

## 📊 ESTADO ATUAL

### Base de Dados
```
✅ page (6):           timeline, territorio, campus, trabalhos, index, contact
✅ timeline_item (29): Todos na page "timeline"
✅ card_item (13):     1 em territorio, 12 em campus
✅ gallery_item (4):   Todos em trabalhos
✅ media_file (44):    Importados, prontos
```

### Frontend
```
✅ timeline.js:        FUNCIONANDO (carrega /api/timeline/)
❌ campus.js:          NÃO EXISTE
❌ territorio.js:      NÃO EXISTE
❌ trabalhos.js:       NÃO EXISTE
❌ index:              SEM CONTEÚDO
❌ contact:            SEM CONTEÚDO
```

### Imagens
```
📁 src/images/:        1000+ imagens estáticas (LEGADO)
📁 uploads/:           44 imagens no banco (NOVO SISTEMA)
```

---

## 🛠️ FASES DE EXECUÇÃO

### FASE 1: Criar Scripts de Carregamento de Dados
**Duração estimada:** 30 min  
**Status:** 🔴 Não iniciado

#### 1.1 Criar `src/js/cards.js`
- Função genérica para carregar cards (campus/territorio)
- **Arquivo:** `/src/js/cards.js` (NOVO)
- **Responsabilidades:**
  - `loadCardsData(pageSlug)` - carrega `/api/cards/{page_id}`
  - `populateCards(data)` - renderiza cards em grid
  - `resolveCardImageUrl(card)` - monta URL correta da imagem
  - Integração com página HTML

```javascript
// PSEUDOCÓDIGO
async function loadCardsData(pageSlug) {
  const page = await apiGetJson(`/api/pages/${pageSlug}`);
  const cards = await apiGetJson(`/api/cards/${page.id}`);
  // cards = [{ id, title, description, image_path, ... }]
  populateCards(cards);
}

function populateCards(cards) {
  const main = document.querySelector('main section');
  main.innerHTML = cards.map(card => `
    <div class="card">
      <img src="${resolveCardImageUrl(card)}" />
      <h3>${card.title}</h3>
      <p>${card.description}</p>
    </div>
  `).join('');
}

function resolveCardImageUrl(card) {
  // Check se é media_id ou image_path
  // Retorna: /media/serve/campus/uuid.jpg ou /src/images/...
}
```

**Arquivos a modificar:**
- `campus.html` - adicionar `<script src="src/js/cards.js"></script>`
- `territorio.html` - adicionar `<script src="src/js/cards.js"></script>`

**Código HTML a adicionar** (em ambas):
```html
<script>
  document.addEventListener('DOMContentLoaded', function() {
    const slug = window.location.pathname.includes('campus') ? 'campus' : 'territorio';
    loadCardsData(slug);
  });
</script>
```

---

#### 1.2 Criar `src/js/gallery-frontend.js` (renomear trabalhos.js)
- **Arquivo:** `/src/js/gallery.js` (NOVO)
- **Responsabilidades:**
  - `loadGalleryData(pageSlug)` - carrega `/api/gallery/{page_id}`
  - `populateGallery(data)` - renderiza galeria em grid
  
```javascript
async function loadGalleryData(pageSlug) {
  const page = await apiGetJson(`/api/pages/${pageSlug}`);
  const items = await apiGetJson(`/api/gallery/${page.id}`);
  populateGallery(items);
}

function populateGallery(items) {
  const grid = document.querySelector('.gallery-grid');
  grid.innerHTML = items.map(item => `
    <div class="gallery-item">
      <img src="${resolveGalleryImageUrl(item)}" />
      <h4>${item.title || 'Sem título'}</h4>
      <p>${item.caption || ''}</p>
    </div>
  `).join('');
}
```

**Arquivo a modificar:**
- `trabalhos.html` - adicionar `<script src="src/js/gallery.js"></script>`

---

### FASE 2: Adicionar Conteúdo ao Banco (Pages)
**Duração estimada:** 10 min  
**Status:** 🔴 Não iniciado

#### 2.1 Criar conteúdo para `index`
**SQL:**
```sql
UPDATE page 
SET content = '<section class="home-intro"><h1>Bem-vindo ao Memorial</h1><p>Conteúdo descritivo...</p></section>'
WHERE slug = 'index';
```

**Opções:**
- A) Criar via script Python
- B) Criar via Admin CMS
- C) Executar SQL direto

#### 2.2 Criar conteúdo para `contact`
**SQL:**
```sql
UPDATE page 
SET content = '<section class="contact"><h1>Contato</h1><form>...</form></section>'
WHERE slug = 'contact';
```

---

### FASE 3: Integrar Imagens com MediaFile
**Duração estimada:** 45 min  
**Status:** 🔴 Não iniciado

#### 3.1 Migrar imagens de `src/images/` para `uploads/`
- **Script:** Criar `scripts/scan_and_import_legacy_images.py`
- **O que fazer:**
  1. Varrer `src/images/` recursivamente
  2. Para cada imagem, criar entrada em MediaFile
  3. Nomear com UUID (padrão do sistema novo)
  4. Guardar mapa: `original_path -> media_id`

**Pseudocódigo:**
```python
def scan_legacy_images():
    import_map = {}
    for root, dirs, files in os.walk('src/images'):
        for filename in files:
            if is_image(filename):
                original_path = os.path.join(root, filename)
                # Copy para uploads/campus ou uploads/trabalhos
                # Criar entry em MediaFile
                media = MediaFile(
                    filename=filename,
                    file_path=f"campus/{new_uuid}.{ext}",
                    folder="campus"
                )
                import_map[original_path] = media.id
    return import_map
```

**Comando para executar:**
```bash
docker-compose exec -T memoria-cms python /app/scripts/scan_and_import_legacy_images.py
```

#### 3.2 Atualizar card_items com media_id
- **Script:** Criar `scripts/update_cards_with_media_id.py`
- **O que fazer:**
  1. Para cada card_item que tem `image_path`
  2. Encontrar matching media_file (por nome ou hash)
  3. Atualizar `media_id` do card_item
  4. (Manter `image_path` para compatibilidade por enquanto)

**Pseudocódigo:**
```python
def update_cards_with_media():
    cards = CardItem.query.all()
    for card in cards:
        if card.image_path:
            # Buscar media pelo nome
            media = MediaFile.query.filter_by(filename=Path(card.image_path).name).first()
            if media:
                card.media_id = media.id
                db.session.commit()
```

#### 3.3 Atualizar gallery_items com media_id
- Mesmo processo que 3.2, mas para GalleryItem

---

### FASE 4: Remover Sistema Legado
**Duração estimada:** 20 min  
**Status:** 🔴 Não iniciado

#### 4.1 Remover `src/images/`
```bash
rm -rf src/images/
```

#### 4.2 Limpar JavaScript
- Remover função `resolveAssetUrl()` (linhas 192-199 em admin-cms.js)
- Remover referências legadas em timeline.js
- Verificar se cards.js e gallery.js usam `/media/serve/` sempre

#### 4.3 Verificar APIs
- Remover hardcoded URLs em templates
- Confirmar que `/media/serve/` é usado em todos os lugares

---

## 📋 CHECKLIST DETALHADO

### Pré-Requisitos
- [ ] Backup do banco: `docker-compose exec -T memoria-cms python /app/scripts/backup.py`
- [ ] Backup de `src/images/`: `tar czf src-images-backup.tar.gz src/images/`

### Fase 1: Scripts
- [ ] Criar `src/js/cards.js`
- [ ] Criar `src/js/gallery.js`
- [ ] Atualizar `campus.html` com script loader
- [ ] Atualizar `territorio.html` com script loader
- [ ] Atualizar `trabalhos.html` com script loader
- [ ] Testar em `http://localhost:8092/memoria/campus`
- [ ] Testar em `http://localhost:8092/memoria/territorio`
- [ ] Testar em `http://localhost:8092/memoria/trabalhos`

### Fase 2: Conteúdo
- [ ] Atualizar page "index" com conteúdo
- [ ] Atualizar page "contact" com conteúdo
- [ ] Testar em `http://localhost:8092/memoria/`
- [ ] Testar em `http://localhost:8092/memoria/contact`

### Fase 3: Imagens
- [ ] Criar script `scan_and_import_legacy_images.py`
- [ ] Executar script de import
- [ ] Criar script `update_cards_with_media_id.py`
- [ ] Executar script de atualização de cards
- [ ] Criar script `update_gallery_with_media_id.py`
- [ ] Executar script de atualização de gallery
- [ ] Verificar no Admin que imagens aparecem com `/media/serve/`
- [ ] Teste visual: carregar página, imagens devem aparecer

### Fase 4: Cleanup
- [ ] Remover `src/images/`
- [ ] Remover `resolveAssetUrl()` do JS
- [ ] Teste completo de todas as páginas
- [ ] Verificar console do navegador (sem erros 404)

---

## 🧪 TESTES

### Teste 1: Carregar Campus
```bash
curl http://localhost:8092/api/cards/3 | jq
# Deve retornar 12 cards
```

### Teste 2: Carregar Imagens
```bash
curl -I http://localhost:8092/media/serve/campus/[uuid].jpg
# Deve retornar HTTP 200
```

### Teste 3: Renderizar no Navegador
```
https://ifva.duckdns.org/memoria/campus
# Deve mostrar 12 cards com imagens
```

### Teste 4: Verificar Console
- Abrir DevTools (F12 → Console)
- Procurar por erros 404
- Verificar logs de carregamento

---

## 🔄 ROLLBACK PLAN

Se algo der errado:

```bash
# 1. Restaurar banco
docker-compose exec -T memoria-cms python /app/scripts/restore.py [backup_date]

# 2. Restaurar src/images
tar xzf src-images-backup.tar.gz

# 3. Revert scripts JS
git checkout src/js/cards.js src/js/gallery.js *.html

# 4. Reiniciar container
docker-compose restart memoria-cms
```

---

## 📁 ARQUIVOS A CRIAR/MODIFICAR

### ✨ NOVOS ARQUIVOS
1. `src/js/cards.js` - 100 linhas
2. `src/js/gallery.js` - 80 linhas
3. `scripts/scan_and_import_legacy_images.py` - 120 linhas
4. `scripts/update_cards_with_media_id.py` - 80 linhas
5. `scripts/update_gallery_with_media_id.py` - 80 linhas

### 📝 ARQUIVOS A MODIFICAR
1. `campus.html` - adicionar 5 linhas de script
2. `territorio.html` - adicionar 5 linhas de script
3. `trabalhos.html` - adicionar 5 linhas de script
4. `src/js/admin-cms.js` - remover ~10 linhas legadas
5. `src/js/timeline.js` - remover ~10 linhas legadas

### 🗑️ ARQUIVOS A REMOVER
1. `src/images/` (pasta inteira)
2. `resolveAssetUrl()` em admin-cms.js

---

## ⏱️ TIMELINE ESTIMADO

| Fase | Tarefas | Duração | Acumulado |
|------|---------|---------|-----------|
| 1 | Scripts JS | 30 min | 30 min |
| 2 | Conteúdo Pages | 10 min | 40 min |
| 3 | Migração Imagens | 45 min | 85 min |
| 4 | Cleanup | 20 min | 105 min |
| - | Testes | 15 min | 120 min |
| - | **TOTAL** | - | **~2 horas** |

---

## 🎯 OBJETIVOS AO FINAL

✅ Todo conteúdo vem do banco  
✅ Todas as imagens em `/media/serve/`  
✅ Zero dependências de arquivos estáticos (exceto CSS/JS framework)  
✅ Admin pode gerenciar 100% do conteúdo  
✅ `src/images/` removido  
✅ Estrutura limpa e escalável  

---

## 📞 NOTAS

- Se encontrar imagens com mesmo nome em pastas diferentes, usar UUID para diferenciar
- Manter `image_path` em cards/gallery por enquanto (compatibilidade), remover em próxima spike
- Documentar cada script com `--help` para facilitar reuso futuro
- Executar testes em cada fase, não esperar final para testar

---

**Próximos Passos:** Executar este plano na próxima sessão seguindo as fases em ordem.
