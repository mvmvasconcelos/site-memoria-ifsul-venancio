function cardsGetAppBasePath() {
  const path = window.location.pathname || '';
  if (path.startsWith('/memoria/')) {
    return '/memoria';
  }
  if (path === '/memoria') {
    return '/memoria';
  }
  return '';
}

function cardsBuildApiUrl(path) {
  return `${cardsGetAppBasePath()}${path}`;
}

function cardsBuildMediaUrl(filePath) {
  if (!filePath) return '';
  return `${cardsGetAppBasePath()}/media/serve/${filePath}`;
}

function cardsBuildAssetUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  if (path.startsWith('/')) {
    return `${cardsGetAppBasePath()}${path}`;
  }
  return `${cardsGetAppBasePath()}/${path}`;
}

function cardsSanitize(value) {
  const el = document.createElement('div');
  el.textContent = value || '';
  return el.innerHTML;
}

async function cardsApiGetJson(path) {
  const response = await fetch(cardsBuildApiUrl(path), { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Falha ao carregar ${path} (${response.status})`);
  }
  return response.json();
}

function resolveCardImageUrl(card) {
  if (card?.media_file?.file_path) {
    return cardsBuildMediaUrl(card.media_file.file_path);
  }
  if (card?.image_path) {
    return cardsBuildAssetUrl(card.image_path);
  }
  return '';
}

function renderCard(card, yearKeyOverride) {
  const imageUrl = resolveCardImageUrl(card);
  const title = cardsSanitize(card?.title || '');
  const dateLabel = cardsSanitize(card?.date_label || '');
  const source = cardsSanitize(card?.source || '');
  const description = cardsSanitize(card?.description || '');
  const yearKey = cardsSanitize(yearKeyOverride || dateLabel || 'Sem data');

  return `
    <div class="card" data-id="${card.id}" data-year="${yearKey}">
      ${imageUrl ? `<img src="${imageUrl}" alt="${title}" class="card-image" />` : ''}
      <div class="card-content">
        <h3>${title}</h3>
        ${dateLabel ? `<p class="card-date">${dateLabel}</p>` : ''}
        ${description ? `<p class="card-desc">${description}</p>` : ''}
        ${source ? `<p class="card-source">Fonte: ${source}</p>` : ''}
      </div>
    </div>
  `;
}

function renderTrabalhosCard(card) {
  const imageUrl = resolveCardImageUrl(card);
  const title = cardsSanitize(card?.title || '');
  const descriptionHtml = card?.description || '';

  return `
    <section class="trabalhos territorio-entry" data-id="${card.id}">
      <h2>${title}</h2>
      ${imageUrl ? `<img src="${imageUrl}" alt="${title}" class="card-image" />` : ''}
      ${descriptionHtml ? `<div class="card-desc">${descriptionHtml}</div>` : ''}
    </section>
  `;
}

function populateCards(cards, pageSlug) {
  const containerYears = document.getElementById('territorio-years');
  const containerItems = document.getElementById('territorio');

  if (!containerItems) {
    console.error('[CARDS] Container #territorio não encontrado');
    showCardsError();
    return;
  }

  if (pageSlug === 'trabalhos' || pageSlug === 'campus') {
    if (containerYears) {
      containerYears.innerHTML = '';
      containerYears.style.display = 'none';
    }
    containerItems.innerHTML = cards.map((card) => renderTrabalhosCard(card)).join('');
    return;
  }

  if (!containerYears) {
    console.error('[CARDS] Container #territorio-years não encontrado');
    showCardsError();
    return;
  }

  containerYears.style.display = '';

  const extractYear = (rawLabel) => {
    const label = (rawLabel || '').trim();
    const match = label.match(/\b(19|20)\d{2}\b/);
    return match ? match[0] : (label || 'Sem data');
  };

  const years = Array.from(new Set(cards.map((card) => extractYear(card?.date_label))))
    .filter((year) => year && year !== 'Sem data')
    .sort((a, b) => b.localeCompare(a));

  containerYears.innerHTML = [
    '<button class="year-btn active" data-year="__all__">Todos</button>',
    ...years.map((year) => `<button class="year-btn" data-year="${cardsSanitize(year)}">${cardsSanitize(year)}</button>`),
  ].join('');

  // Preserve backend order (order_index asc) to respect CMS ordering.
  containerItems.innerHTML = cards
    .map((card) => renderCard(card, extractYear(card?.date_label)))
    .join('');

  const setYearFilter = (selectedYear) => {
    document.querySelectorAll('#territorio .card').forEach((cardElement) => {
      const cardYear = cardElement.dataset.year || 'Sem data';
      cardElement.style.display = selectedYear === '__all__' || cardYear === selectedYear ? 'block' : 'none';
    });

    document.querySelectorAll('.year-btn').forEach((btn) => {
      btn.classList.toggle('active', (btn.dataset.year || '__all__') === selectedYear);
    });
  };

  document.querySelectorAll('.year-btn').forEach((btn) => {
    btn.addEventListener('click', function onClick() {
      setYearFilter(this.dataset.year || '__all__');
    });
  });

  setYearFilter('__all__');
}

function showCardsError() {
  const container = document.getElementById('territorio');
  if (container) {
    container.innerHTML = '<p>Não foi possível carregar os cards. Tente novamente em instantes.</p>';
  }
}

async function loadCardsData(pageSlug) {
  try {
    const page = await cardsApiGetJson(`/api/pages/${pageSlug}`);
    const cards = await cardsApiGetJson(`/api/cards/${page.id}`);
    populateCards(cards || [], pageSlug);
  } catch (error) {
    console.error('[CARDS] Erro ao carregar cards:', error);
    showCardsError();
  }
}
