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
}