/**
 * main.js - Bootstrap loader for header/footer and CMS page content
 * 
 * Responsibilities:
 * - Load and render header/footer components
 * - Load page content from CMS
 * - Load and render navigation menu
 * - Handle mobile hamburger menu toggle
 * 
 * Uses data-attributes instead of legacy IDs:
 * - [data-page] - Current page identifier (campus, territorio, etc.)
 * - [data-role="container"] - Content container
 * - [data-role="menu"] - Navigation menu marker
 */

/**
 * Path and URL utilities
 */
const PathUtils = {
  getAppBasePath() {
    const path = window.location.pathname || '';
    if (path.startsWith('/memoria/')) {
      return '/memoria';
    }
    if (path === '/memoria') {
      return '/memoria';
    }
    return '';
  },

  buildApiUrl(path) {
    return `${this.getAppBasePath()}${path}`;
  },

  buildAssetUrl(path) {
    const basePath = this.getAppBasePath();
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${basePath}${normalized}`;
  },

  getCurrentPageSlug() {
    const basePath = this.getAppBasePath();
    let path = window.location.pathname || '/';

    if (basePath && path.startsWith(basePath)) {
      path = path.slice(basePath.length) || '/';
    }

    const normalized = path.replace(/\/+$/, '');
    if (!normalized || normalized === '/') {
      return 'index';
    }

    return normalized.replace(/^\/+/, '');
  },

  buildMenuUrl(url) {
    const basePath = this.getAppBasePath();
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
  },
};

/**
 * CMS content loading
 */
const CmsLoader = {
  async loadPageContent() {
    const slug = PathUtils.getCurrentPageSlug();
    if (!slug || slug === 'admin') {
      return;
    }

    // Cards/timeline pages have their own loaders; avoid replacing their markup.
    if (document.querySelector('[data-view="cards"], [data-view="timeline"]')) {
      return;
    }

    const main = document.querySelector('main[data-role="container"]') || document.querySelector('main');
    if (!main) {
      console.warn('Main container not found');
      return;
    }

    try {
      const response = await fetch(PathUtils.buildApiUrl(`/api/pages/${slug}`), {
        cache: 'no-store',
      });

      if (!response.ok) {
        this.showError(main, 'Falha ao carregar conteúdo');
        console.warn(`Page load failed: ${response.status}`);
        return;
      }

      const page = await response.json();
      const content = (page?.content || '').trim();

      if (!content) {
        this.showError(main, 'Conteúdo não disponível');
        console.warn(`No content for page: ${slug}`);
        return;
      }

      main.innerHTML = content;
    } catch (error) {
      this.showError(main, 'Falha ao carregar conteúdo');
      console.error(`Error loading page ${slug}:`, error);
    }
  },

  showError(container, message) {
    container.innerHTML = `<section class="error-message" role="alert">
      <strong>Erro:</strong> ${message}. Tente novamente mais tarde.
    </section>`;
  },
};

/**
 * Navigation menu loading and rendering
 */
const MenuLoader = {
  async loadMenuFromApi() {
    try {
      const response = await fetch(PathUtils.buildApiUrl('/api/menu'), {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`API responded with ${response.status}`);
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('Invalid menu response: expected array');
      }

      return data;
    } catch (error) {
      console.warn('Failed to load menu from API:', error);
      return null;
    }
  },

  renderMenu(items) {
    const navList = document.querySelector('[data-role="menu"] ul') || document.querySelector('header nav ul');
    if (!navList) {
      console.warn('Navigation list not found');
      return;
    }

    if (!items || !Array.isArray(items)) {
      this.showMenuError(navList);
      return;
    }

    const visibleItems = items.filter((item) => item.is_visible !== false);
    if (!visibleItems.length) {
      console.warn('No visible menu items');
      return;
    }

    navList.innerHTML = visibleItems
      .map(
        (item) =>
          `<li><a href="${PathUtils.buildMenuUrl(item.url)}" ${item.is_active ? 'aria-current="page"' : ''}>${item.label}</a></li>`
      )
      .join('');
  },

  showMenuError(container) {
    container.innerHTML = '<li><a href="#" aria-disabled="true">Menu indisponível</a></li>';
  },

  normalizeStaticMenuLinks() {
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
        link.setAttribute('href', PathUtils.buildMenuUrl('/'));
        return;
      }

      if (href.endsWith('.html')) {
        const cleanSlug = href.replace(/\.html$/i, '');
        link.setAttribute('href', PathUtils.buildMenuUrl(`/${cleanSlug}`));
        return;
      }

      link.setAttribute('href', PathUtils.buildMenuUrl(href));
    });
  },
};

/**
 * Mobile menu toggle
 */
function setupMobileMenu() {
  const hamburger = document.querySelector('.hamburger');
  const nav = document.querySelector('header nav');

  if (!hamburger || !nav) {
    console.debug('Hamburger menu or nav not found');
    return;
  }

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    nav.classList.toggle('active');
  });

  // Close menu when link is clicked
  nav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      nav.classList.remove('active');
    });
  });
}

/**
 * Header and footer loading
 */
const LayoutLoader = {
  async loadHeaderFooter() {
    // Load and inject header
    try {
      const headerResponse = await fetch(PathUtils.buildAssetUrl('/header.html'), {
        cache: 'default',
      });
      if (headerResponse.ok) {
        const headerText = await headerResponse.text();
        const headerPlaceholder = document.getElementById('header-placeholder');
        if (headerPlaceholder) {
          headerPlaceholder.innerHTML = headerText;
        }
      }
    } catch (error) {
      console.error('Failed to load header:', error);
    }

    // Load and inject footer
    try {
      const footerResponse = await fetch(PathUtils.buildAssetUrl('/footer.html'), {
        cache: 'default',
      });
      if (footerResponse.ok) {
        const footerText = await footerResponse.text();
        const footerPlaceholder = document.getElementById('footer-placeholder');
        if (footerPlaceholder) {
          footerPlaceholder.innerHTML = footerText;
        }
      }
    } catch (error) {
      console.error('Failed to load footer:', error);
    }

    // Setup menu
    MenuLoader.normalizeStaticMenuLinks();
    await this.loadAndRenderDynamicMenu();
    setupMobileMenu();
  },

  async loadAndRenderDynamicMenu() {
    try {
      const items = await MenuLoader.loadMenuFromApi();
      if (items) {
        MenuLoader.renderMenu(items);
      }
    } catch (error) {
      console.warn('Could not load dynamic menu:', error);
    }
  },
};

/**
 * Application bootstrap
 */
async function initializeApp() {
  try {
    // Load header/footer and menu
    await LayoutLoader.loadHeaderFooter();

    // Load page content from CMS
    await CmsLoader.loadPageContent();
  } catch (error) {
    console.error('Application initialization failed:', error);
  }
}

// Export loadHeaderFooter globally for HTML pages that call it directly
async function loadHeaderFooter() {
  return LayoutLoader.loadHeaderFooter();
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);
  