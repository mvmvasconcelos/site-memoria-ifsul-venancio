# 📚 REFERÊNCIA TÉCNICA: SISTEMA UNIFICADO

## API ENDPOINTS

### Timeline (✅ FUNCIONANDO)
```
GET /api/pages/timeline
  → { id, slug, title, type, content }

GET /api/timeline/{page_id}
  → [ { id, title, date, description, image_path, source, order_index } ]
```

### Cards (Campus/Territorio)
```
GET /api/pages/campus
  → { id, slug, title="O Câmpus em Foco", type="cards", content="" }

GET /api/cards/{page_id}
  → [
      { 
        id, title, description, image_path, date_label, 
        source, order_index, page_id 
      }
    ]
```

### Gallery (Trabalhos)
```
GET /api/pages/trabalhos
  → { id, slug, title="Trabalhos Acadêmicos", type="gallery", content="" }

GET /api/gallery/{page_id}
  → [
      { 
        id, title, caption, image_path, 
        order_index, page_id 
      }
    ]
```

### Media Files
```
GET /api/media/public-list
  → [
      {
        id, filename, file_path (="campus/uuid.ext"), folder,
        file_size, mime_type, description, alt_text
      }
    ]

GET /media/serve/{file_path}
  → Binary image data (HTTP 200/304)
```

---

## MODELOS DE BANCO

### Page
```python
id           : Integer (PK)
slug         : String (unique)
title        : String
type         : String (timeline | cards | gallery | page)
content      : Text (HTML, usado por index/contact)
is_visible   : Boolean
menu_order   : Integer
created_at   : DateTime
updated_at   : DateTime
```

### TimelineItem
```python
id           : Integer (PK)
page_id      : Integer (FK→Page)
title        : String
date         : String (YYYY-MM-DD format)
image_path   : String (LEGADO: "src/images/..." ou UUID via media_id - FUTURO)
media_id     : Integer (FK→MediaFile) [A ADICIONAR]
source       : Text (credito/fonte)
description  : Text
order_index  : Integer
created_at   : DateTime
updated_at   : DateTime
```

### CardItem
```python
id           : Integer (PK)
page_id      : Integer (FK→Page)
title        : String
description  : Text
image_path   : String (LEGADO)
media_id     : Integer (FK→MediaFile) [A ADICIONAR]
date_label   : String (ex: "2023")
source       : Text
order_index  : Integer
created_at   : DateTime
updated_at   : DateTime
```

### GalleryItem
```python
id           : Integer (PK)
page_id      : Integer (FK→Page)
title        : String
caption      : Text
image_path   : String (LEGADO)
media_id     : Integer (FK→MediaFile) [A ADICIONAR]
order_index  : Integer
created_at   : DateTime
updated_at   : DateTime
```

### MediaFile
```python
id           : Integer (PK)
filename     : String (ex: "image23.jpeg")
file_path    : String (ex: "campus/7d0ed40bc10f4dc0b2ad48f2a302ffb8.png")
folder       : String (campus | territorio | trabalhos | uploads)
file_size    : Integer (bytes)
mime_type    : String (image/png, image/jpeg, etc)
description  : Text (alt_text)
alt_text     : String (acessibilidade)
created_at   : DateTime
updated_at   : DateTime
```

---

## ESTRUTURA DO FRONTEND

### Função Auxiliar (em todos os JS)
```javascript
function getAppBasePath() {
  // Detecta se está em /memoria/ subpath
  // Retorna "" se raiz, "/memoria" se subpath
}

function buildApiUrl(path) {
  return `${getAppBasePath()}${path}`;
}

function buildMediaUrl(filePath) {
  // filePath = "campus/uuid.jpg"
  return `${getAppBasePath()}/media/serve/${filePath}`;
}
```

### Padrão de Carregamento (Cards)
```javascript
async function loadCardsData(pageSlug) {
  try {
    // 1. Buscar page para pegar ID
    const page = await apiGetJson(`/api/pages/${pageSlug}`);
    
    // 2. Buscar cards usando page.id
    const cards = await apiGetJson(`/api/cards/${page.id}`);
    
    // 3. Renderizar
    populateCards(cards);
  } catch (error) {
    console.error('Erro ao carregar cards:', error);
    showError();
  }
}

function populateCards(cards) {
  const container = document.querySelector('.cards-container');
  container.innerHTML = cards
    .sort((a, b) => a.order_index - b.order_index)
    .map(card => renderCard(card))
    .join('');
}

function renderCard(card) {
  const imageUrl = card.media_id 
    ? buildMediaUrl(`${card.folder}/${card.media_file.file_path}`)
    : buildAssetUrl(card.image_path); // fallback legado
  
  return `
    <div class="card" data-id="${card.id}">
      <img src="${imageUrl}" alt="${card.title}" />
      <h3>${sanitize(card.title)}</h3>
      <p>${sanitize(card.description || '')}</p>
      ${card.date_label ? `<span class="date">${card.date_label}</span>` : ''}
    </div>
  `;
}
```

---

## SCRIPT DE MIGRAÇÃO: scan_and_import_legacy_images.py

**Objetivo:** Varrer `src/images/` e importar para MediaFile com mapa de correspondência

**Entrada:** Arquivo original em `src/images/campus/image23.jpeg`  
**Saída:** 
- Cópia em `uploads/campus/7d0ed40bc...jpeg` (UUID)
- Entrada em MediaFile
- Arquivo JSON com mapa: `{"src/images/campus/image23.jpeg": 12}`

**Lógica:**
```
1. Varrer src/images/ recursivamente
2. Para cada arquivo:
   a. Detectar tipo (campus, territorio, trabalhos, etc)
   b. Gerar UUID
   c. Copiar para uploads/{tipo}/uuid.ext
   d. Criar entry em MediaFile
   e. Guardar em mapa: original_path → media_id
3. Salvar mapa como JSON: scripts/legacy_image_map.json
4. Imprimir relatório: X imagens importadas, Y erros
```

**Verificações:**
- Extensão válida (jpg, png, jpeg, webp, gif)
- Arquivo não duplicado (usar hash MD5)
- Pasta destino existe ou criar
- Permissões de escrita OK

---

## SCRIPT DE MIGRAÇÃO: update_cards_with_media_id.py

**Objetivo:** Atualizar card_items com media_id baseado em image_path

**Lógica:**
```
1. Para cada card_item com image_path:
   a. Extrair filename de image_path (ex: "image23.jpeg")
   b. Buscar MediaFile.filename == filename
   c. Se encontrar → update card.media_id = media.id
   d. Log: "Card X atualizado com media_id Y"
2. Se não encontrar → log warning
3. Imprimir resumo: X atualizados, Y não encontrados
```

**Considerações:**
- Nomes duplicados? Usar estrutura de pasta para identificar
- Case-sensitive? Implementar fuzzy matching se necessário
- Remover espaços/caracteres especiais para matching

---

## SCRIPT DE MIGRAÇÃO: update_gallery_with_media_id.py

**Objetivo:** Mesmo que update_cards, mas para GalleryItem

---

## SEQUÊNCIA DE EXECUÇÃO

```bash
# 1. Backup
docker-compose exec -T memoria-cms python /app/scripts/backup.py
tar czf src-images-backup.tar.gz src/images/

# 2. Copiar scripts para container
docker cp scripts/scan_and_import_legacy_images.py memoria-cms:/app/scripts/
docker cp scripts/update_cards_with_media_id.py memoria-cms:/app/scripts/
docker cp scripts/update_gallery_with_media_id.py memoria-cms:/app/scripts/

# 3. Executar imports
docker-compose exec -T memoria-cms python /app/scripts/scan_and_import_legacy_images.py
docker-compose exec -T memoria-cms python /app/scripts/update_cards_with_media_id.py
docker-compose exec -T memoria-cms python /app/scripts/update_gallery_with_media_id.py

# 4. Copiar JS para container
docker cp src/js/cards.js memoria-cms:/app/src/js/
docker cp src/js/gallery.js memoria-cms:/app/src/js/

# 5. Teste
curl http://localhost:8092/api/cards/3 | jq '.[] | {title, media_id}'

# 6. Remover legado
rm -rf src/images/
```

---

## TESTES UNITÁRIOS (se tiver tempo)

### Test 1: Card Rendering
```javascript
const mockCard = {
  id: 1,
  title: "Test Card",
  description: "Test Description",
  media_id: 5,
  media_file: { folder: "campus", file_path: "campus/uuid.jpg" }
};
const html = renderCard(mockCard);
assert(html.includes('data-id="1"'));
assert(html.includes('/media/serve/campus/uuid.jpg'));
```

### Test 2: URL Building
```javascript
assert(buildApiUrl('/api/cards/3') === '/memoria/api/cards/3');
assert(buildMediaUrl('campus/uuid.jpg') === '/memoria/media/serve/campus/uuid.jpg');
```

---

## QUESTÕES ABERTAS

❓ **Q1:** GalleryItem ainda usa `order_index`? (Sim, para manter ordem)  
❓ **Q2:** CardItem deve ter `folder` field? (Proposto: adicionar, populado pelo script)  
❓ **Q3:** Manter `image_path` após migração? (Sim, por 1 sprint para safety)  
❓ **Q4:** Gerar soft migration ou hard migration? (Soft: manter fallback)  

---

## DEPENDENCIES

- Python 3.11
- PIL/Pillow (para validar imagens)
- Flask (já temos)
- SQLAlchemy (já temos)
- pathlib (stdlib)
- json (stdlib)
- uuid (stdlib)
- hashlib (stdlib)
