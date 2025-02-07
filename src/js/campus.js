document.addEventListener('DOMContentLoaded', function () {
    // Carrega o arquivo CSV quando o DOM estiver totalmente carregado
    fetch('src/campus.csv')
      .then(response => response.text())
      .then(data => {
        // Analisa os dados do CSV
        const parsedData = parseCSV(data);
        // Popula a linha do tempo com os dados analisados
        populateTimeline(parsedData);
      })
      .catch(error => console.error('Erro ao buscar o arquivo CSV:', error));
  });
  
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
          <img src="src/images/campus/${entry.imageUrl}" alt="${entry.altText}">
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