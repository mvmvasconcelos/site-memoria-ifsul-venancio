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
      const page = await fetch(buildApiUrl('/api/pages/territorio')).then((res) => {
        if (!res.ok) throw new Error('Página território não encontrada');
        return res.json();
      });

      const cards = await fetch(buildApiUrl(`/api/cards/${page.id}`)).then((res) => {
        if (!res.ok) throw new Error('Cards de território indisponíveis');
        return res.json();
      });

      const adapted = cards.map((card) => ({
        date: card.date_label || '',
        title: card.title || '',
        imageUrl: card.image_path || '',
        altText: card.source || '',
        description: card.description || '',
      }));

      populateTimeline(adapted);
    } catch (error) {
      fetch('src/territorio.csv')
        .then(response => response.text())
        .then(data => {
          const parsedData = parseCSV(data);
          populateTimeline(parsedData);
        })
        .catch(csvError => console.error('Erro ao carregar território (API/CSV):', csvError || error));
    }
  }
  
  // Função para analisar os dados do CSV
  function parseCSV(data) {
    const lines = data.split('\n');
    const result = [];
    for (const line of lines) {
      // Divide cada linha em campos e remove aspas desnecessárias
      const [date, title, imageUrl, altText, description] = line.split('","').map(item => item.replace(/(^"|"$)/g, ''));
      // Verifica se os campos obrigatórios estão presentes antes de adicionar ao resultado
      if (date && title) {
        result.push({ date, title, imageUrl: imageUrl || '', altText: altText || '', description: description || '' });
      }
    }
    return result;
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