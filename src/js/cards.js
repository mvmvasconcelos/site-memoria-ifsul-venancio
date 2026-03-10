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

function renderCard(card) {
  const imageUrl = resolveCardImageUrl(card);
  const title = cardsSanitize(card?.title || '');
  const dateLabel = cardsSanitize(card?.date_label || '');
  const source = cardsSanitize(card?.source || '');
  const description = cardsSanitize(card?.description || '');
  const yearKey = dateLabel || 'Sem data';

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

function populateCards(cards) {
  const containerYears = document.getElementById('territorio-years');
  const containerItems = document.getElementById('territorio');

  if (!containerYears || !containerItems) {
    console.error('[CARDS] Containers #territorio-years ou #territorio não encontrados');
    return;
  }

  const grouped = {};
  cards.forEach((card) => {
    const year = (card?.date_label || 'Sem data').trim() || 'Sem data';
    if (!grouped[year]) grouped[year] = [];
    grouped[year].push(card);
  });

  const years = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
  containerYears.innerHTML = years
    .map((year) => `<button class="year-btn" data-year="${cardsSanitize(year)}">${cardsSanitize(year)}</button>`)
    .join('');

  const sortedCards = [...cards].sort((a, b) => {
    const yearA = a?.date_label || '';
    const yearB = b?.date_label || '';
    return yearB.localeCompare(yearA);
  });

  containerItems.innerHTML = sortedCards.map((card) => renderCard(card)).join('');

  const showOnlyYear = (selectedYear) => {
    document.querySelectorAll('#territorio .card').forEach((cardElement) => {
      const cardYear = cardElement.dataset.year || 'Sem data';
      cardElement.style.display = cardYear === selectedYear ? 'block' : 'none';
    });
  };

  document.querySelectorAll('.year-btn').forEach((btn) => {
    btn.addEventListener('click', function onClick() {
      showOnlyYear(this.dataset.year || 'Sem data');
    });
  });

  if (years.length > 0) {
    showOnlyYear(years[0]);
  }
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
    populateCards(cards || []);
  } catch (error) {
    console.error('[CARDS] Erro ao carregar cards:', error);
    showCardsError();
  }
}
