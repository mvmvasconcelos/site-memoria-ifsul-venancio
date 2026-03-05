document.addEventListener('DOMContentLoaded', function () {
    loadCampusData();
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

  function formatDisplayDate(dateValue) {
    const value = (dateValue || '').trim();
    const match = value.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/);
    if (!match) return value;

    const year = match[1];
    const month = match[2];
    const day = match[3];
    const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

    if (!month) {
      return year;
    }

    const monthIndex = Number(month) - 1;
    if (monthIndex < 0 || monthIndex > 11) {
      return value;
    }

    if (!day) {
      return `${months[monthIndex]} - ${year}`;
    }

    return `${Number(day)} de ${months[monthIndex]} de ${year}`;
  }

  async function loadCampusData() {
    try {
      const page = await apiGetJson('/api/pages/campus');
      const cards = await apiGetJson(`/api/cards/${page.id}`);

      const adapted = cards.map((card) => ({
        date: card.date_label || '',
        title: card.title || '',
        imageUrl: card.image_path || '',
        altText: card.source || '',
        description: card.description || '',
      }));

      populateTimeline(adapted);
    } catch (error) {
      console.error('Erro ao carregar campus da API:', error);
      const timeline = document.getElementById('territorio');
      if (timeline) {
        timeline.innerHTML = '<p>Não foi possível carregar os dados do campus. Tente novamente em instantes.</p>';
      }
    }
  }
  
  function populateTimeline(data) {
    const timeline = document.getElementById('territorio');
    data.forEach(entry => {
      const timelineEntry = document.createElement('div');
      timelineEntry.classList.add('territorio-entry');
      timelineEntry.dataset.year = entry.date.split('-')[0]; // Assume que a data está no formato YYYY-MM-DD ou apenas YYYY
  
      const formattedDate = formatDisplayDate(entry.date);
  
      timelineEntry.innerHTML = `
        <h3>${entry.title}</h3>
        <div class="image-container">
          <img src="${resolveImageUrl(entry.imageUrl)}" alt="${entry.altText}">
          <p class="date">${formattedDate}</p>
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