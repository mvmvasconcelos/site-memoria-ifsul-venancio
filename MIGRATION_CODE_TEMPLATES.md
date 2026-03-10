# 📝 TEMPLATES DE CÓDIGO

## 1. `src/js/cards.js` (NOVO)

```javascript
/**
 * Cards Loader - Carrega e renderiza cards (Campus/Territorio)
 * Arquivo: src/js/cards.js
 * Responsável por: GET /api/cards/{page_id}
 * 
 * Uso em: campus.html, territorio.html
 * <script src="src/js/cards.js"></script>
 * <script>
 *   document.addEventListener('DOMContentLoaded', () => {
 *     loadCardsData('campus');
 *   });
 * </script>
 */

function getAppBasePath() {
  const path = window.location.pathname || '';
  if (path.startsWith('/memoria/')) return '/memoria';
  if (path === '/memoria') return '/memoria';
  return '';
}

function buildApiUrl(path) {
  return `${getAppBasePath()}${path}`;
}

function buildMediaUrl(filePath) {
  if (!filePath) return '';
  return `${getAppBasePath()}/media/serve/${filePath}`;
}

function sanitize(html) {
  const el = document.createElement('div');
  el.textContent = html;
  return el.innerHTML;
}

async function apiGetJson(path) {
  try {
    const response = await fetch(buildApiUrl(path), { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('[CARDS] Erro ao buscar:', path, error);
    throw error;
  }
}

async function loadCardsData(pageSlug) {
  try {
    console.log(`[CARDS] Carregando ${pageSlug}...`);
    
    // 1. Buscar page
    const page = await apiGetJson(`/api/pages/${pageSlug}`);
    console.log(`[CARDS] Page encontrada:`, page);
    
    // 2. Buscar cards
    const cards = await apiGetJson(`/api/cards/${page.id}`);
    console.log(`[CARDS] ${cards.length} cards encontrados`);
    
    // 3. Renderizar
    populateCards(cards);
  } catch (error) {
    console.error('[CARDS] Erro ao carregar:', error);
    showError();
  }
}

function populateCards(cards) {
  const yearNamesMap = {
    territorio: 'territorio-years',
    campus: 'territorio-years'  // mesmo container, mesmo CSS
  };

  const containerYears = document.getElementById('territorio-years');
  const containerItems = document.getElementById('territorio');

  if (!containerYears || !containerItems) {
    console.error('[CARDS] Containers não encontrados');
    return;
  }

  // Agrupar por year/data_label
  const grouped = {};
  cards.forEach(card => {
    const year = card.date_label || 'Sem data';
    if (!grouped[year]) grouped[year] = [];
    grouped[year].push(card);
  });

  // Renderizar anos (botões)
  const years = Object.keys(grouped).sort().reverse();
  containerYears.innerHTML = years
    .map(year => `<button class="year-btn" data-year="${year}">${year}</button>`)
    .join('');

  // Renderizar cards
  containerItems.innerHTML = cards
    .sort((a, b) => (b.date_label || '').localeCompare(a.date_label || ''))
    .map(card => renderCard(card))
    .join('');

  // Adicionar event listeners aos anos
  document.querySelectorAll('.year-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const selectedYear = this.dataset.year;
      document.querySelectorAll('.card').forEach(card => {
        const cardYear = card.dataset.year || 'Sem data';
        card.style.display = cardYear === selectedYear ? 'block' : 'none';
      });
    });
  });

  // Mostrar primeiro ano por padrão
  if (years.length > 0) {
    document.querySelectorAll('.card').forEach(card => {
      const cardYear = card.dataset.year || 'Sem data';
      card.style.display = cardYear === years[0] ? 'block' : 'none';
    });
  }
}

function renderCard(card) {
  const imageUrl = card.media_id && card.media_file
    ? buildMediaUrl(card.media_file.file_path)
    : card.image_path ? buildAssetUrl(card.image_path)
    : '';

  const html = `
    <div class="card" data-id="${card.id}" data-year="${card.date_label || 'Sem data'}">
      ${imageUrl ? `<img src="${imageUrl}" alt="${sanitize(card.title)}" class="card-image" />` : ''}
      <div class="card-content">
        <h3>${sanitize(card.title || '')}</h3>
        ${card.date_label ? `<p class="card-date">${sanitize(card.date_label)}</p>` : ''}
        ${card.description ? `<p class="card-desc">${sanitize(card.description)}</p>` : ''}
        ${card.source ? `<p class="card-source">Fonte: ${sanitize(card.source)}</p>` : ''}
      </div>
    </div>
  `;

  return html;
}

function buildAssetUrl(path) {
  // Fallback para imagens legadas
  if (!path) return '';
  const basePath = getAppBasePath();
  if (path.startsWith('http')) return path;
  if (!path.startsWith('/')) return `${basePath}/${path}`;
  return `${basePath}${path}`;
}

function showError() {
  const container = document.getElementById('territorio');
  if (container) {
    container.innerHTML = '<p style="color: red; text-align: center;">Erro ao carregar conteúdo. Tente novamente mais tarde.</p>';
  }
}
```

---

## 2. `src/js/gallery.js` (NOVO)

```javascript
/**
 * Gallery Loader - Carrega e renderiza galeria (Trabalhos)
 * Arquivo: src/js/gallery.js
 * Responsável por: GET /api/gallery/{page_id}
 * 
 * Uso em: trabalhos.html
 */

function getAppBasePath() {
  const path = window.location.pathname || '';
  if (path.startsWith('/memoria/')) return '/memoria';
  if (path === '/memoria') return '/memoria';
  return '';
}

function buildApiUrl(path) {
  return `${getAppBasePath()}${path}`;
}

function buildMediaUrl(filePath) {
  if (!filePath) return '';
  return `${getAppBasePath()}/media/serve/${filePath}`;
}

function sanitize(html) {
  const el = document.createElement('div');
  el.textContent = html;
  return el.innerHTML;
}

async function apiGetJson(path) {
  try {
    const response = await fetch(buildApiUrl(path), { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('[GALLERY] Erro:', error);
    throw error;
  }
}

async function loadGalleryData() {
  try {
    console.log('[GALLERY] Carregando galeria...');
    
    const page = await apiGetJson('/api/pages/trabalhos');
    const items = await apiGetJson(`/api/gallery/${page.id}`);
    
    console.log('[GALLERY]', items.length, 'items encontrados');
    populateGallery(items);
  } catch (error) {
    console.error('[GALLERY] Erro ao carregar:', error);
    showError();
  }
}

function populateGallery(items) {
  const container = document.getElementById('gallery-container');
  if (!container) {
    console.error('[GALLERY] Container #gallery-container não encontrado');
    return;
  }

  if (!items || items.length === 0) {
    container.innerHTML = '<p>Nenhum item na galeria.</p>';
    return;
  }

  container.innerHTML = items
    .sort((a, b) => a.order_index - b.order_index)
    .map(item => renderGalleryItem(item))
    .join('');

  // Lightbox (se existir)
  attachLightboxListeners();
}

function renderGalleryItem(item) {
  const imageUrl = item.media_id && item.media_file
    ? buildMediaUrl(item.media_file.file_path)
    : item.image_path ? buildAssetUrl(item.image_path)
    : '';

  if (!imageUrl) {
    console.warn('[GALLERY] Item sem imagem:', item);
    return '';
  }

  return `
    <div class="gallery-item" data-id="${item.id}">
      <img 
        src="${imageUrl}" 
        alt="${sanitize(item.title || '')}"
        class="gallery-image"
        data-image="${imageUrl}"
      />
      ${item.title ? `<h4>${sanitize(item.title)}</h4>` : ''}
      ${item.caption ? `<p>${sanitize(item.caption)}</p>` : ''}
    </div>
  `;
}

function buildAssetUrl(path) {
  // Fallback para imagens legadas
  if (!path) return '';
  const basePath = getAppBasePath();
  if (path.startsWith('http')) return path;
  if (!path.startsWith('/')) return `${basePath}/${path}`;
  return `${basePath}${path}`;
}

function attachLightboxListeners() {
  // If lightbox library exists (e.g., GLightbox)
  if (typeof GLightbox !== 'undefined') {
    GLightbox({ selector: '.gallery-image' });
  }
}

function showError() {
  const container = document.getElementById('gallery-container');
  if (container) {
    container.innerHTML = '<p style="color: red;">Erro ao carregar galeria.</p>';
  }
}
```

---

## 3. `scripts/scan_and_import_legacy_images.py` (NOVO)

```python
#!/usr/bin/env python3
"""
Scan Legacy Images and Import to MediaFile

Objetivo: Varrer src/images/ e importar cada arquivo para MediaFile com UUID

Uso:
  python scripts/scan_and_import_legacy_images.py

Output:
  - Cria uploads/{folder}/{uuid}.{ext}
  - Entrada em MediaFile
  - Arquivo JSON: scripts/legacy_image_map.json
"""

import os
import shutil
import json
from pathlib import Path
from uuid import uuid4
from hashlib import md5
from datetime import datetime

# Setup Flask app context
import sys
sys.path.insert(0, '/app')
os.chdir('/app')

from app import create_app, db
from app.models import MediaFile

app = create_app()
UPLOAD_ROOT = Path(app.config['UPLOAD_FOLDER'])
IMAGE_ROOT = Path('/app/src/images')

ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'webp', 'gif'}
FOLDER_MAPPING = {
    'campus': 'campus',
    'territorio': 'territorio',
    'trabalhos': 'trabalhos',
    'default': 'uploads'
}

def get_folder_from_path(original_path):
    """Detecta folder baseado no path"""
    parts = original_path.parts
    for part in parts:
        if part.lower() in FOLDER_MAPPING:
            return FOLDER_MAPPING[part.lower()]
    return FOLDER_MAPPING['default']

def is_valid_image(filepath):
    """Valida se é imagem"""
    try:
        ext = filepath.suffix.lower().lstrip('.')
        return ext in ALLOWED_EXTENSIONS
    except:
        return False

def get_file_hash(filepath):
    """Calcula MD5 do arquivo"""
    hash_md5 = md5()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()

def main():
    print("\n" + "="*60)
    print("🔍 SCAN & IMPORT LEGACY IMAGES")
    print("="*60 + "\n")
    
    if not IMAGE_ROOT.exists():
        print(f"❌ Pasta não encontrada: {IMAGE_ROOT}")
        return
    
    stats = {
        'total': 0,
        'imported': 0,
        'duplicates': 0,
        'errors': 0,
        'imported_files': []
    }
    
    image_map = {}
    processed_hashes = set()
    
    with app.app_context():
        # Varrer src/images/
        for root, dirs, files in os.walk(IMAGE_ROOT):
            for filename in files:
                original_path = Path(root) / filename
                stats['total'] += 1
                
                if not is_valid_image(original_path):
                    print(f"⏭️  SKIP {original_path.relative_to(IMAGE_ROOT)} (extensão inválida)")
                    continue
                
                try:
                    # Detectar folder
                    folder = get_folder_from_path(original_path.relative_to(IMAGE_ROOT))
                    
                    # Criar pasta destino
                    dest_folder = UPLOAD_ROOT / folder
                    dest_folder.mkdir(parents=True, exist_ok=True)
                    
                    # Gerar UUID
                    ext = original_path.suffix.lower()
                    new_name = f"{uuid4().hex}{ext}"
                    dest_path = dest_folder / new_name
                    
                    # Verificar duplicados por hash
                    file_hash = get_file_hash(original_path)
                    if file_hash in processed_hashes:
                        print(f"⚠️  DUP  {original_path.relative_to(IMAGE_ROOT)} (conteúdo duplicado)")
                        stats['duplicates'] += 1
                        continue
                    processed_hashes.add(file_hash)
                    
                    # Copiar arquivo
                    shutil.copy2(original_path, dest_path)
                    
                    # Criar MediaFile
                    file_size = dest_path.stat().st_size
                    media = MediaFile(
                        filename=filename,
                        file_path=f"{folder}/{new_name}",
                        folder=folder,
                        file_size=file_size,
                        mime_type=f"image/{ext.lstrip('.')}",
                        description=filename,
                        alt_text=filename
                    )
                    db.session.add(media)
                    db.session.flush()
                    
                    # Guardar no mapa
                    original_relative = str(original_path.relative_to(IMAGE_ROOT))
                    image_map[original_relative] = media.id
                    
                    stats['imported'] += 1
                    stats['imported_files'].append({
                        'original': original_relative,
                        'media_id': media.id,
                        'file_path': media.file_path
                    })
                    
                    print(f"✅ IMPORT {original_relative} → {folder}/{new_name} (ID={media.id})")
                    
                except Exception as e:
                    print(f"❌ ERROR {original_path.relative_to(IMAGE_ROOT)}: {e}")
                    stats['errors'] += 1
        
        # Confirmar todas as mudanças
        db.session.commit()
    
    # Salvar mapa
    map_file = Path('/app/scripts/legacy_image_map.json')
    with open(map_file, 'w') as f:
        json.dump(image_map, f, indent=2)
    
    print("\n" + "="*60)
    print("📊 RESULTADO")
    print("="*60)
    print(f"Total processados: {stats['total']}")
    print(f"Importados: {stats['imported']}")
    print(f"Duplicados: {stats['duplicates']}")
    print(f"Erros: {stats['errors']}")
    print(f"Map salvo em: {map_file}")
    print("="*60 + "\n")

if __name__ == '__main__':
    main()
```

---

## 4. `scripts/update_cards_with_media_id.py` (NOVO)

```python
#!/usr/bin/env python3
"""
Update Cards with media_id

Objetivo: Atualizar card_items para referenciar MediaFile

Uso:
  python scripts/update_cards_with_media_id.py
"""

import sys
import json
from pathlib import Path

sys.path.insert(0, '/app')
import os
os.chdir('/app')

from app import create_app, db
from app.models import CardItem, MediaFile

app = create_app()

def main():
    print("\n" + "="*60)
    print("🔄 UPDATE CARDS WITH MEDIA_ID")
    print("="*60 + "\n")
    
    stats = {'updated': 0, 'not_found': 0, 'already_set': 0}
    
    with app.app_context():
        # Carregar mapa se existir
        map_file = Path('/app/scripts/legacy_image_map.json')
        image_map = {}
        if map_file.exists():
            with open(map_file) as f:
                image_map = json.load(f)
        
        cards = CardItem.query.all()
        print(f"Processando {len(cards)} cards...\n")
        
        for card in cards:
            # Se já tem media_id, pular
            if card.media_id:
                print(f"⏭️  SKIP Card {card.id}: já tem media_id={card.media_id}")
                stats['already_set'] += 1
                continue
            
            # Se não tem image_path, pular
            if not card.image_path:
                print(f"⏭️  SKIP Card {card.id}: sem image_path")
                continue
            
            # Extrair filename
            filename = Path(card.image_path).name
            
            # Buscar media por filename
            media = MediaFile.query.filter_by(filename=filename).first()
            
            if media:
                card.media_id = media.id
                db.session.commit()
                stats['updated'] += 1
                print(f"✅ UPDATE Card {card.id} → media_id={media.id}")
            else:
                print(f"⚠️  MISS Card {card.id}: {filename} não encontrado em MediaFile")
                stats['not_found'] += 1
    
    print("\n" + "="*60)
    print("📊 RESULTADO")
    print("="*60)
    print(f"Atualizados: {stats['updated']}")
    print(f"Não encontrados: {stats['not_found']}")
    print(f"Já tinham ID: {stats['already_set']}")
    print("="*60 + "\n")

if __name__ == '__main__':
    main()
```

---

## 5. `scripts/update_gallery_with_media_id.py` (NOVO)

*Mesmo padrão que update_cards, mas para GalleryItem*

```python
#!/usr/bin/env python3
"""similar ao update_cards, mas para GalleryItem"""

import sys
sys.path.insert(0, '/app')
import os
os.chdir('/app')

from app import create_app, db
from app.models import GalleryItem, MediaFile

app = create_app()

def main():
    print("\n" + "="*60)
    print("🔄 UPDATE GALLERY WITH MEDIA_ID")
    print("="*60 + "\n")
    
    stats = {'updated': 0, 'not_found': 0, 'already_set': 0}
    
    with app.app_context():
        items = GalleryItem.query.all()
        print(f"Processando {len(items)} items...\n")
        
        for item in items:
            if item.media_id:
                print(f"⏭️  SKIP Item {item.id}: já tem media_id")
                stats['already_set'] += 1
                continue
            
            if not item.image_path:
                print(f"⏭️  SKIP Item {item.id}: sem image_path")
                continue
            
            filename = Path(item.image_path).name
            media = MediaFile.query.filter_by(filename=filename).first()
            
            if media:
                item.media_id = media.id
                db.session.commit()
                stats['updated'] += 1
                print(f"✅ UPDATE Item {item.id} → media_id={media.id}")
            else:
                print(f"⚠️  MISS Item {item.id}: {filename} não encontrado")
                stats['not_found'] += 1
    
    print("\n" + "="*60)
    print("📊 RESULTADO")
    print("="*60)
    print(f"Atualizados: {stats['updated']}")
    print(f"Não encontrados: {stats['not_found']}")
    print(f"Já tinham ID: {stats['already_set']}")
    print("="*60 + "\n")

if __name__ == '__main__':
    main()
```

---

## Modificações em HTML

### campus.html (adicionar antes de `</body>`)
```html
<script src="src/js/cards.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', () => {
    loadCardsData('campus');
  });
</script>
```

### territorio.html (adicionar antes de `</body>`)
```html
<script src="src/js/cards.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', () => {
    loadCardsData('territorio');
  });
</script>
```

### trabalhos.html (adicionar antes de `</body>`)
```html
<div id="gallery-container" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; padding: 20px;"></div>
<script src="src/js/gallery.js"></script>
<script>
  document.addEventListener('DOMContentLoaded', () => {
    loadGalleryData();
  });
</script>
```

