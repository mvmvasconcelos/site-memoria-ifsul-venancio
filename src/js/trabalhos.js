function getAppBasePath() {
  const path = window.location.pathname || '';
  if (path.startsWith('/memoria/')) {
    return '/memoria';
  }
  if (path === '/memoria') {
    return '/memoria';
  }
  return '';
}

function buildApiUrl(path) {
  return `${getAppBasePath()}${path}`;
}

async function apiGetJson(path) {
  const response = await fetch(buildApiUrl(path), { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Falha ao carregar ${path} (${response.status})`);
  }
  return response.json();
}

function sanitize(value) {
  const div = document.createElement('div');
  div.textContent = value || '';
  return div.innerHTML;
}

function resolveImageUrl(imagePath) {
  if (!imagePath) return '';
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  if (imagePath.startsWith('/')) {
    return `${getAppBasePath()}${imagePath}`;
  }

  return `${getAppBasePath()}/${imagePath}`;
}

function renderGalleryItems(galleryItems) {
  const sections = galleryItems.map((item) => {
    const title = sanitize(item.title || 'Trabalho acadêmico');
    const image = sanitize(resolveImageUrl(item.image_path || ''));
    const caption = item.caption || '';

    return `
      <section class="trabalhos">
        <h2>${title}</h2>
        ${image ? `<img src="${image}" alt="${title}">` : ''}
        ${caption ? `<p>${caption}</p>` : ''}
      </section>
    `;
  });

  return `<h1>Trabalhos mestrado ProfEPT servidores do câmpus</h1>${sections.join('')}`;
}

function renderTrabalhosContent(contentHtml) {
  const container = document.getElementById('trabalhos-content');
  if (!container) {
    return;
  }
  container.innerHTML = contentHtml;
}

async function loadTrabalhosContent() {
  try {
    const page = await apiGetJson('/api/pages/trabalhos');

    const apiContent = (page.content || '').trim();
    if (apiContent) {
      renderTrabalhosContent(apiContent);
      return;
    }

    const galleryItems = await apiGetJson(`/api/gallery/${page.id}`);

    if (Array.isArray(galleryItems) && galleryItems.length) {
      renderTrabalhosContent(renderGalleryItems(galleryItems));
      return;
    }

    renderTrabalhosContent('<p>Nenhum conteúdo de trabalhos publicado no CMS.</p>');
  } catch (error) {
    console.error('Erro ao carregar trabalhos da API:', error);
    renderTrabalhosContent('<p>Não foi possível carregar os trabalhos. Tente novamente em instantes.</p>');
  }
}

document.addEventListener('DOMContentLoaded', loadTrabalhosContent);