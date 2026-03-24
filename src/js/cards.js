/**
 * cards.js - Card list rendering for campus, territorio, trabalhos pages
 * 
 * Responsibilities:
 * - Load cards from CMS API
 * - Render cards in responsive grid layout
 * - Manage year filter toggle (territorio only)
 * - Handle responsive image loading
 * 
 * Uses data-attributes:
 * - [data-page="campus|territorio|trabalhos"] - Current page context
 * - [data-view="cards"] - Container role
 * - [data-role="container|filter|list|item"] - Semantic identifiers
 * - [data-id] - Card unique identifier
 * - [data-year] - Year filter value
 */

/**
 * Shared path utilities (mirror from main.js pathutils for standalone usage)
 */
const CardsPathUtils = {
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

  buildMediaUrl(filePath) {
    if (!filePath) return '';
    return `${this.getAppBasePath()}/media/serve/${filePath}`;
  },

  buildAssetUrl(path) {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    if (path.startsWith('/')) {
      return `${this.getAppBasePath()}${path}`;
    }
    return `${this.getAppBasePath()}/${path}`;
  },
};

/**
 * Utility functions
 */
const CardsUtils = {
  sanitize(value) {
    const el = document.createElement('div');
    el.textContent = value || '';
    return el.innerHTML;
  },

  extractYear(rawLabel) {
    const label = (rawLabel || '').trim();
    const match = label.match(/\b(19|20)\d{2}\b/);
    return match ? match[0] : (label || 'Sem data');
  },

  normalizeSource(rawSource) {
    const source = (rawSource || '').trim();
    if (!source) return '';
    return source.replace(/^Fonte:\s*/i, '').trim();
  },

  resolveCardImageUrl(card) {
    if (card?.media_file?.file_path) {
      return CardsPathUtils.buildMediaUrl(card.media_file.file_path);
    }
    if (card?.image_path) {
      return CardsPathUtils.buildAssetUrl(card.image_path);
    }
    return '';
  },

  async fetchJson(path) {
    try {
      const response = await fetch(CardsPathUtils.buildApiUrl(path), {
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch ${path}:`, error);
      throw error;
    }
  },
};

/**
 * Card rendering
 */
const CardRenderer = {
  renderCard(card, yearKeyOverride) {
    const imageUrl = CardsUtils.resolveCardImageUrl(card);
    const title = CardsUtils.sanitize(card?.title || '');
    const dateLabel = CardsUtils.sanitize(card?.date_label || '');
    const source = CardsUtils.sanitize(CardsUtils.normalizeSource(card?.source || ''));
    const description = CardsUtils.sanitize(card?.description || '');
    const yearKey = CardsUtils.sanitize(yearKeyOverride || dateLabel || 'Sem data');

    return `
      <div class="card" data-id="${card.id}" data-year="${yearKey}" data-role="item">
        ${imageUrl ? `<img src="${imageUrl}" alt="${title}" class="card-image" loading="lazy" />` : ''}
        <div class="card-content">
          <h3 class="card-title">${title}</h3>
          ${dateLabel ? `<p class="card-date">${dateLabel}</p>` : ''}
          ${description ? `<p class="card-description">${description}</p>` : ''}
          ${source ? `<p class="card-source"><small>Fonte: ${source}</small></p>` : ''}
        </div>
      </div>
    `;
  },

  renderTrabalhosCard(card) {
    const imageUrl = CardsUtils.resolveCardImageUrl(card);
    const title = CardsUtils.sanitize(card?.title || '');
    const descriptionHtml = card?.description || '';

    return `
      <section class="trabalhos" data-id="${card.id}" data-role="item">
        <h2>${title}</h2>
        ${imageUrl ? `<img src="${imageUrl}" alt="${title}" class="card-image" loading="lazy" />` : ''}
        ${descriptionHtml ? `<div class="card-description">${descriptionHtml}</div>` : ''}
      </section>
    `;
  },

  renderCampusCard(card) {
    const imageUrl = CardsUtils.resolveCardImageUrl(card);
    const title = CardsUtils.sanitize(card?.title || '');
    const year = CardsUtils.sanitize(CardsUtils.extractYear(card?.date_label || ''));
    const source = CardsUtils.sanitize(CardsUtils.normalizeSource(card?.source || ''));
    const description = CardsUtils.sanitize(card?.description || '');

    return `
      <article class="campus-card" data-id="${card.id}" data-year="${year}" data-role="item">
        <h3 class="campus-card-title">${title}</h3>
        ${imageUrl ? `
          <div class="campus-card-media">
            <img src="${imageUrl}" alt="${title}" class="campus-card-image" loading="lazy" />
            ${year && year !== 'Sem data' ? `<span class="campus-card-year">${year}</span>` : ''}
          </div>
        ` : ''}
        ${source ? `<p class="campus-card-legend">${source}</p>` : ''}
        ${description ? `<p class="campus-card-description">${description}</p>` : ''}
      </article>
    `;
  },

  renderTerritorioPlanoDiretor(cards) {
    if (!cards.length) {
      return '';
    }

    return `
      <h2>Transformações no Plano Diretor do Município</h2>
      <div class="territorio-plano-diretor-grid list-grid">
        ${cards.map((card) => this.renderCard(card, CardsUtils.extractYear(card?.date_label))).join('')}
      </div>
    `;
  },
};

/**
 * Year filter management (territorio only)
 */
const YearFilterManager = {
  extractYears(cards) {
    return Array.from(
      new Set(
        cards
          .map((card) => CardsUtils.extractYear(card?.date_label))
          .filter((year) => year && year !== 'Sem data')
      )
    ).sort((a, b) => b.localeCompare(a));
  },

  renderYearButtons(years) {
    return [
      '<button class="year-btn btn-pill active" data-year="__all__">Todos</button>',
      ...years.map(
        (year) => `<button class="year-btn btn-pill" data-year="${CardsUtils.sanitize(year)}">${CardsUtils.sanitize(year)}</button>`
      ),
    ].join('');
  },

  setupYearFilter() {
    const containerItems = document.querySelector('[data-page][data-view="cards"][data-role="list"]') || document.getElementById('territorio');

    if (!containerItems) {
      console.warn('Card list container not found');
      return;
    }

    const setYearFilter = (selectedYear) => {
      containerItems.querySelectorAll('.card').forEach((cardElement) => {
        const cardYear = cardElement.dataset.year || 'Sem data';
        cardElement.style.display = selectedYear === '__all__' || cardYear === selectedYear ? 'block' : 'none';
      });

      document.querySelectorAll('.year-btn').forEach((btn) => {
        btn.classList.toggle('active', (btn.dataset.year || '__all__') === selectedYear);
      });
    };

    document.querySelectorAll('.year-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        setYearFilter(btn.dataset.year || '__all__');
      });
    });

    // Initialize with "Todos"
    setYearFilter('__all__');
  },
};

/**
 * Main card population logic
 */
function populateCards(cards, pageSlug) {
  const containerYears = document.querySelector('[data-page][data-role="filter"]') || document.getElementById('territorio-years');
  const containerItems = document.querySelector('[data-page][data-view="cards"][data-role="list"]') || document.getElementById('territorio');

  if (!containerItems) {
    console.error('Card list container not found');
    showCardsError();
    return;
  }

  // Trabalhos: single-column cards, no year filter
  if (pageSlug === 'trabalhos') {
    if (containerYears) {
      containerYears.innerHTML = '';
      containerYears.style.display = 'none';
    }
    containerItems.innerHTML = cards.map((card) => CardRenderer.renderTrabalhosCard(card)).join('');
    containerItems.classList.remove('list-grid');
    containerItems.classList.add('list-stack');
    return;
  }

  // Campus: vertical list with year and legend
  if (pageSlug === 'campus') {
    if (containerYears) {
      containerYears.innerHTML = '';
      containerYears.style.display = 'none';
    }
    containerItems.innerHTML = cards.map((card) => CardRenderer.renderCampusCard(card)).join('');
    containerItems.classList.remove('list-grid');
    containerItems.classList.add('list-stack');
    return;
  }

  // Territorio: no year filter, horizontal cards
  if (pageSlug === 'territorio') {
    if (containerYears) {
      containerYears.innerHTML = '';
      containerYears.style.display = 'none';
    }
    containerItems.classList.remove('list-grid');
    containerItems.classList.add('list-stack');
    const territorioCards = cards.filter((card) => !/Mapa Zoneamento/i.test(card?.title || ''));
    const planoDiretorCards = cards.filter((card) => /Mapa Zoneamento/i.test(card?.title || ''));
    const planoDiretorSection = document.getElementById('territorio-plano-diretor');

    containerItems.innerHTML = territorioCards
      .map((card) => CardRenderer.renderCard(card, CardsUtils.extractYear(card?.date_label)))
      .join('');

    if (planoDiretorSection) {
      planoDiretorSection.innerHTML = CardRenderer.renderTerritorioPlanoDiretor(planoDiretorCards);
      planoDiretorSection.style.display = planoDiretorCards.length ? '' : 'none';
    }

    return;
  }
}

/**
 * Error display
 */
function showCardsError() {
  const containerItems = document.querySelector('[data-page][data-view="cards"][data-role="list"]') || document.getElementById('territorio');

  if (containerItems) {
    containerItems.innerHTML = `
      <div class="error-message" role="alert">
        <strong>Erro:</strong> Não foi possível carregar os conteúdos. Tente novamente mais tarde.
      </div>
    `;
  }
}

/**
 * Main entry point for cards loading
 */
async function loadCardsData(pageSlug) {
  try {
    const page = await CardsUtils.fetchJson(`/api/pages/${pageSlug}`);
    if (!page || !page.id) {
      throw new Error('Page not found or invalid response');
    }

    const cards = await CardsUtils.fetchJson(`/api/cards/${page.id}`);
    if (!Array.isArray(cards)) {
      throw new Error('Invalid cards response');
    }

    populateCards(cards || [], pageSlug);
  } catch (error) {
    console.error(`Failed to load cards for page "${pageSlug}":`, error);
    showCardsError();
  }
}
