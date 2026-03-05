function getPageContentBasePath() {
  const path = window.location.pathname || '';
  if (path.startsWith('/memoria/')) {
    return '/memoria';
  }
  if (path === '/memoria') {
    return '/memoria';
  }
  return '';
}

function buildPageContentApiUrl(path) {
  return `${getPageContentBasePath()}${path}`;
}

async function loadPageContent(slug, targetSelector) {
  const target = document.querySelector(targetSelector);
  if (!target) {
    return;
  }

  try {
    const response = await fetch(buildPageContentApiUrl(`/api/pages/${slug}`), { cache: 'no-store' });
    if (!response.ok) {
      return;
    }

    const page = await response.json();
    const content = (page?.content || '').trim();
    if (content) {
      target.innerHTML = content;
    }
  } catch (error) {
    console.warn(`Falha ao carregar conteúdo da página ${slug}:`, error);
  }
}

window.MemoriaPageContent = {
  loadPageContent,
};
