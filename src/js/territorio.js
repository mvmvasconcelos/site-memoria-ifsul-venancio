document.addEventListener('DOMContentLoaded', function () {
    loadTerritorioData();
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

  async function loadTerritorioData() {
    try {
      const page = await apiGetJson('/api/pages/territorio');

      const apiContent = (page.content || '').trim();
      if (apiContent) {
        const timeline = document.getElementById('territorio');
        if (timeline) {
          timeline.innerHTML = apiContent;
        }
        return;
      }

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
      console.error('Erro ao carregar território da API:', error);
      const timeline = document.getElementById('territorio');
      if (timeline) {
        timeline.innerHTML = '<p>Não foi possível carregar os dados do território. Tente novamente em instantes.</p>';
      }
    }
  }
  
  function populateTimeline(data) {
    const timeline = document.getElementById('territorio');
    data.forEach(entry => {
      const timelineEntry = document.createElement('div');
      timelineEntry.classList.add('territorio-entry');
      timelineEntry.dataset.year = entry.date.split('-')[0]; // Assume que a data está no formato YYYY-MM-DD ou apenas YYYY
  
      let formattedDate;
      if (entry.date.length === 4) { // Verifica se a data contém apenas o ano
        formattedDate = entry.date;
      } else {
        // Formata a data para o formato "1º de janeiro de 1913" ou "8 de maio de 1913"
        const date = new Date(entry.date);
        const options = { day: 'numeric', month: 'long', year: 'numeric' };
        formattedDate = date.toLocaleDateString('pt-BR', options);
      }
  
      timelineEntry.innerHTML = `
        <h3>${entry.title}</h3>
        <div class="image-container">
          <img src="${resolveImageUrl(entry.imageUrl)}" alt="${entry.altText}">
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