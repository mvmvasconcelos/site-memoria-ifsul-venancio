document.addEventListener('DOMContentLoaded', function () {
  loadTimelineData();
});

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

function formatTimelineDate(dateValue) {
  const value = (dateValue || '').trim();
  const match = value.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/);
  if (!match) return value;

  const year = match[1];
  const month = match[2];
  const day = match[3];
  const months = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

  if (!month) {
    return year;
  }

  const monthIndex = Number(month) - 1;
  if (monthIndex < 0 || monthIndex > 11) {
    return value;
  }

  if (!day) {
    return `${months[monthIndex]} de ${year}`;
  }

  const dayNumber = Number(day);
  const formattedDay = dayNumber === 1 ? `${dayNumber}º` : String(dayNumber);
  return `${formattedDay} de ${months[monthIndex]} de ${year}`;
}

async function loadTimelineData() {
  try {
    const page = await apiGetJson('/api/pages/timeline');
    const items = await apiGetJson(`/api/timeline/${page.id}`);

    const adapted = items.map((item) => ({
      date: item.date,
      title: item.title,
      imageUrl: item.image_path || '',
      altText: item.source || '',
      description: item.description || '',
    }));

    populateTimeline(adapted);
  } catch (error) {
    console.error('Erro ao carregar timeline da API:', error);
    const timeline = document.getElementById('timeline');
    const years = document.getElementById('timeline-years');
    if (years) years.innerHTML = '';
    if (timeline) {
      timeline.innerHTML = '<p>Não foi possível carregar a timeline. Tente novamente em instantes.</p>';
    }
  }
}

let allEntries = []; // Store all entries globally

// Função para popular a linha do tempo com os dados analisados
function populateTimeline(data) {
  allEntries = data; // Store the entries
  const timelineYears = document.getElementById('timeline-years');
  const timeline = document.getElementById('timeline');
  const years = new Set();

  data.forEach(entry => {
    const year = entry.date.split('-')[0];
    years.add(year);
  });

  years.forEach(year => {
    const yearElement = document.createElement('div');
    yearElement.textContent = year;
    yearElement.classList.add('year');

    yearElement.addEventListener('click', function() {
      const allYears = document.querySelectorAll('.year');
      allYears.forEach(y => y.classList.remove('active-year'));
      this.classList.add('active-year');
      showEntriesForYear(year);
    });

    timelineYears.appendChild(yearElement);
  });

  // Set the first year as active by default and show its entries
  if (years.size > 0) {
    const firstYear = [...years][0];
    const firstYearElement = timelineYears.querySelector('.year');
    if (firstYearElement) {
      firstYearElement.classList.add('active-year');
      showEntriesForYear(firstYear);
    }
  }
}

// Função para exibir as entradas de um ano específico
function showEntriesForYear(year) {
  const entries = allEntries.filter(entry => entry.date.startsWith(year)); // Filter entries by year
  const timeline = document.getElementById('timeline');
  timeline.innerHTML = ''; // Clear existing entries
  entries.forEach(entry => {
    const timelineEntry = document.createElement('div');
    timelineEntry.classList.add('timeline-entry');
    timelineEntry.dataset.year = entry.date.split('-')[0];

    const formattedDate = formatTimelineDate(entry.date);

    // Define o conteúdo HTML da entrada da linha do tempo
    timelineEntry.innerHTML = `
      <h3>${entry.title}</h3>
      <div class="image-container">
        <img src="${resolveImageUrl(entry.imageUrl)}" alt="${entry.altText}">
        <p class="date">${formattedDate}</p> <!-- Exibe a data completa no formato "1º de janeiro de 1913" ou "8 de maio de 1913" -->
      </div>
      <p class="legend">${entry.altText}</p>
      <p>${entry.description}</p>
    `;

    // Adiciona a entrada à linha do tempo
    timeline.appendChild(timelineEntry);

    // Força a reflow para garantir que a animação seja aplicada
    void timelineEntry.offsetWidth;
    timelineEntry.style.opacity = 1;
  });
}