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

function buildAssetUrl(path) {
  const basePath = getAppBasePath();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${basePath}${normalized}`;
}

function buildMenuUrl(url) {
  const basePath = getAppBasePath();
  const raw = (url || '').trim();

  if (!raw) {
    return `${basePath || ''}/`;
  }

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw;
  }

  if (raw === '/') {
    return `${basePath}/`;
  }

  if (raw.startsWith('/')) {
    return `${basePath}${raw}`;
  }

  return `${basePath}/${raw}`;
}

async function loadMenuFromApi() {
  const response = await fetch(buildApiUrl('/api/menu'));
  if (!response.ok) {
    throw new Error(`Erro ao carregar menu (${response.status})`);
  }

  return response.json();
}

function renderDynamicMenu(items) {
  const navList = document.querySelector('header nav ul');
  if (!navList) {
    return;
  }

  const visibleItems = (items || []).filter((item) => item.is_visible);
  if (!visibleItems.length) {
    return;
  }

  navList.innerHTML = visibleItems
    .map((item) => `<li><a href="${buildMenuUrl(item.url)}">${item.label}</a></li>`)
    .join('');
}

function normalizeStaticMenuLinks() {
  const navLinks = document.querySelectorAll('header nav a[href]');
  if (!navLinks.length) {
    return;
  }

  navLinks.forEach((link) => {
    const href = (link.getAttribute('href') || '').trim();
    if (!href || href.startsWith('http://') || href.startsWith('https://') || href.startsWith('#')) {
      return;
    }

    if (href === 'index.html' || href === './' || href === '.') {
      link.setAttribute('href', buildMenuUrl('/'));
      return;
    }

    if (href.endsWith('.html')) {
      const cleanSlug = href.replace(/\.html$/i, '');
      link.setAttribute('href', buildMenuUrl(`/${cleanSlug}`));
      return;
    }

    link.setAttribute('href', buildMenuUrl(href));
  });
}

// Função para carregar o header e o footer
async function loadHeaderFooter() {
  const headerResponse = await fetch(buildAssetUrl('/header.html'));
  const headerText = await headerResponse.text();
  document.getElementById('header-placeholder').innerHTML = headerText;

  normalizeStaticMenuLinks();

  const footerResponse = await fetch(buildAssetUrl('/footer.html'));
  const footerText = await footerResponse.text();
  document.getElementById('footer-placeholder').innerHTML = footerText;

  try {
    const menuItems = await loadMenuFromApi();
    renderDynamicMenu(menuItems);
  } catch (error) {
    console.warn('Menu dinâmico indisponível, mantendo menu estático.', error);
  }

  const hamburger = document.querySelector('.hamburger');
  const nav = document.querySelector('header nav');

  if (hamburger && nav) {
    hamburger.addEventListener('click', function() {
      this.classList.toggle('active');
      nav.classList.toggle('active');
    });
  } else {
    console.error('Hamburger menu or navigation not found');
  }
}
  