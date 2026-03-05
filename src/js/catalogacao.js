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

function renderCatalogacaoContent(contentHtml) {
  const container = document.getElementById('catalogacao-content');
  if (!container) {
    return;
  }
  container.innerHTML = contentHtml;
}

async function loadCatalogacaoContent() {
  try {
    const page = await apiGetJson('/api/pages/catalogacao');

    const apiContent = (page.content || '').trim();
    if (apiContent) {
      renderCatalogacaoContent(apiContent);
      return;
    }

    renderCatalogacaoContent('<p>Nenhum conteúdo de catalogação publicado no CMS.</p>');
  } catch (error) {
    console.error('Erro ao carregar catalogação da API:', error);
    renderCatalogacaoContent('<p>Não foi possível carregar a catalogação. Tente novamente em instantes.</p>');
  }
}

document.addEventListener('DOMContentLoaded', loadCatalogacaoContent);