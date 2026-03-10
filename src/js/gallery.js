function galleryGetAppBasePath() {
  const path = window.location.pathname || '';
  if (path.startsWith('/memoria/')) {
    return '/memoria';
  }
  if (path === '/memoria') {
    return '/memoria';
  }
  return '';
}

function galleryBuildApiUrl(path) {
  return `${galleryGetAppBasePath()}${path}`;
}

function galleryBuildMediaUrl(filePath) {
  if (!filePath) return '';
  return `${galleryGetAppBasePath()}/media/serve/${filePath}`;
}

function galleryBuildAssetUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  if (path.startsWith('/')) {
    return `${galleryGetAppBasePath()}${path}`;
  }
  return `${galleryGetAppBasePath()}/${path}`;
}

function gallerySanitize(value) {
  const el = document.createElement('div');
  el.textContent = value || '';
  return el.innerHTML;
}

async function galleryApiGetJson(path) {
  const response = await fetch(galleryBuildApiUrl(path), { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Falha ao carregar ${path} (${response.status})`);
  }
  return response.json();
}

function resolveGalleryImageUrl(item) {
  if (item?.media_file?.file_path) {
    return galleryBuildMediaUrl(item.media_file.file_path);
  }
  if (item?.image_path) {
    return galleryBuildAssetUrl(item.image_path);
  }
  return '';
}

function renderGalleryItem(item) {
  const imageUrl = resolveGalleryImageUrl(item);
  if (!imageUrl) {
    return '';
  }

  const title = gallerySanitize(item?.title || '');
  const caption = gallerySanitize(item?.caption || '');

  return `
    <div class="gallery-item" data-id="${item.id}">
      <img src="${imageUrl}" alt="${title}" class="gallery-image" />
      ${title ? `<h4>${title}</h4>` : ''}
      ${caption ? `<p>${caption}</p>` : ''}
    </div>
  `;
}

function populateGallery(items) {
  const container = document.getElementById('gallery-container');
  if (!container) {
    console.error('[GALLERY] Container #gallery-container não encontrado');
    return;
  }

  if (!Array.isArray(items) || items.length === 0) {
    container.innerHTML = '<p>Nenhum item na galeria.</p>';
    return;
  }

  const sorted = [...items].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  container.innerHTML = sorted.map((item) => renderGalleryItem(item)).join('');
}

function showGalleryError() {
  const container = document.getElementById('gallery-container');
  if (container) {
    container.innerHTML = '<p>Não foi possível carregar a galeria. Tente novamente em instantes.</p>';
  }
}

async function loadGalleryData() {
  try {
    const page = await galleryApiGetJson('/api/pages/trabalhos');
    const items = await galleryApiGetJson(`/api/gallery/${page.id}`);
    populateGallery(items || []);
  } catch (error) {
    console.error('[GALLERY] Erro ao carregar galeria:', error);
    showGalleryError();
  }
}
