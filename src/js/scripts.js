document.addEventListener('DOMContentLoaded', function () {
  // Carrega o arquivo CSV quando o DOM estiver totalmente carregado
  fetch('src/timeline.csv')
    .then(response => response.text())
    .then(data => {
      // Analisa os dados do CSV
      const parsedData = parseCSV(data);
      // Popula a linha do tempo com os dados analisados
      populateTimeline(parsedData);
    })
    .catch(error => console.error('Erro ao buscar o arquivo CSV:', error));

  // Adiciona o evento de clique ao menu hamburger
  const hamburger = document.querySelector('.hamburger');
  const nav = document.querySelector('header nav');

  if (hamburger && nav) {
    hamburger.addEventListener('click', function() {
      console.log('Hamburger menu clicked');
      this.classList.toggle('active');
      nav.classList.toggle('active');
      console.log('Hamburger class:', this.classList);
      console.log('Nav class:', nav.classList);
    });
  } else {
    console.error('Hamburger menu or navigation not found');
  }
});

// Função para carregar o header e o footer
async function loadHeaderFooter() {
  const headerResponse = await fetch('header.html');
  const headerText = await headerResponse.text();
  document.getElementById('header-placeholder').innerHTML = headerText;
  
  const footerResponse = await fetch('footer.html');
  const footerText = await footerResponse.text();
  document.getElementById('footer-placeholder').innerHTML = footerText;

  // Adiciona o evento de clique ao menu hamburger após carregar o header
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
  
  // Função para popular a linha do tempo com os dados analisados
  function populateTimeline(data) {
    const timelineYears = document.getElementById('timeline-years');
    const timeline = document.getElementById('timeline');
    const years = new Set();
  
    data.forEach(entry => {
      // Extrai o ano da data
      const year = entry.date.split('-')[0];
      // Adiciona o ano ao conjunto de anos se ainda não estiver presente
      years.add(year);
    });
  
    // Ordena os anos em ordem crescente
    const sortedYears = Array.from(years).sort((a, b) => a - b);
  
    // Adiciona os anos ordenados ao DOM
    sortedYears.forEach(year => {
      const yearLink = document.createElement('a');
      yearLink.href = `#${year}`;
      yearLink.textContent = year;
      yearLink.addEventListener('click', (event) => {
        event.preventDefault();
        showEntriesForYear(year);
      });
      timelineYears.appendChild(yearLink);
    });
  
    // Ordena os dados por data em ordem crescente
    const sortedData = data.sort((a, b) => new Date(a.date) - new Date(b.date));
  
    sortedData.forEach((entry, index) => {
      // Cria um novo elemento de entrada na linha do tempo
      const timelineEntry = document.createElement('div');
      timelineEntry.className = 'timeline-entry';
      timelineEntry.dataset.year = entry.date.split('-')[0];
  
      // Adiciona a classe de animação com base na posição
      if (index % 2 === 0) {
        timelineEntry.classList.add('slide-in-left');
      } else {
        timelineEntry.classList.add('slide-in-right');
      }
  
      // Converte a data para o formato "1º de janeiro de 1913" ou "8 de maio de 1913"
      const [yyyy, mm, dd] = entry.date.split('-');
      let formattedDate;
      if (mm && dd) {
        const months = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
        const day = parseInt(dd) === 1 ? `${parseInt(dd)}º` : parseInt(dd);
        formattedDate = `${day} de ${months[parseInt(mm) - 1]} de ${yyyy}`;
      } else {
        formattedDate = yyyy;
      }
      // Define o conteúdo HTML da entrada da linha do tempo
      timelineEntry.innerHTML = `
      <h3>${entry.title}</h3>
      <div class="image-container">
        <img src="src/images/${entry.imageUrl}" alt="${entry.altText}">
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
  
    // Exibe as entradas do ano mais antigo por padrão
    if (sortedYears.length > 0) {
      showEntriesForYear(sortedYears[0]);
    }
  }
  
  // Função para exibir as entradas de um ano específico
  function showEntriesForYear(year) {
    const entries = document.querySelectorAll('.timeline-entry');
    entries.forEach(entry => {
      if (entry.dataset.year === year) {
        entry.style.display = 'block';
        // Adiciona a classe de animação novamente para garantir que a transição ocorra
        if (entry.classList.contains('slide-in-left')) {
          entry.classList.remove('slide-in-left');
          void entry.offsetWidth; // Força reflow
          entry.classList.add('slide-in-left');
        } else if (entry.classList.contains('slide-in-right')) {
          entry.classList.remove('slide-in-right');
          void entry.offsetWidth; // Força reflow
          entry.classList.add('slide-in-right');
        }
      } else {
        entry.style.display = 'none';
      }
    });
  }
  