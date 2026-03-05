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

const TRABALHOS_FALLBACK_HTML = `
  <h1>Trabalhos mestrado ProfEPT servidores do câmpus</h1>
  <section class="trabalhos">
    <h2>Documentário Narrativas dos Sujeitos do PROEJA do Curso Secretariado do IFSul Câmpus Venâncio Aires</h2>
    <img src="src/images/trabalhos/image1.png" alt="Documentário Narrativas dos Sujeitos do PROEJA">
    <p>Para assistir o Documentário, acesse: <a href="https://www.youtube.com/watch?v=zUmkMOBWh8I" target="_blank">link</a></p>
  </section>

  <section class="trabalhos">
    <h2>Produto Educacional Mestrado ProfEPT Servidora Giselle Schweickardt “PROGRAMA MULHERES MIL NO CÂMPUS VENÂNCIO AIRES DO IFSUL: HISTÓRIAS DE INCLUSÃO E EMANCIPAÇÃO DE MULHERES”</h2>
    <img src="src/images/trabalhos/image2.png" alt="PROGRAMA MULHERES MIL NO CÂMPUS VENÂNCIO AIRES DO IFSUL">
    <p>Livro de memórias (e-book) intitulado “Programa Mulheres Mil no câmpus Venâncio Aires do IFSul: histórias de inclusão e emancipação de mulheres” <a href="https://educapes.capes.gov.br/handle/capes/747394" target="_blank">link</a></p>
  </section>

  <section class="trabalhos">
    <h2>Produto Educacional Mestrado ProfEPT Servidora Danielle Schweickardt “Oficina de bem-estar: um guia prático para atividades em público"</h2>
    <img src="src/images/trabalhos/image3.png" alt="Oficina de bem-estar: um guia prático para atividades em público">
    <p>Para acessar o guia, acesse: <a href="http://educapes.capes.gov.br/handle/capes/744665" target="_blank">link</a></p>
  </section>

  <section class="trabalhos">
    <h2>Produto Educacional Mestrado ProfEPT Servidora Daiana Schons</h2>
    <img src="src/images/trabalhos/lei12711.jpeg" alt="Produto Educacional Mestrado ProfEPT Servidora Daiana Schons">
    <p>Para acessar o guia, acesse: <a href="http://educapes.capes.gov.br/handle/capes/746048" target="_blank">link</a></p>
  </section>
`;

function renderTrabalhosContent(contentHtml) {
  const container = document.getElementById('trabalhos-content');
  if (!container) {
    return;
  }
  container.innerHTML = contentHtml;
}

async function loadTrabalhosContent() {
  try {
    const page = await fetch(buildApiUrl('/api/pages/trabalhos')).then((res) => {
      if (!res.ok) {
        throw new Error('Página trabalhos não encontrada');
      }
      return res.json();
    });

    const apiContent = (page.content || '').trim();
    renderTrabalhosContent(apiContent || TRABALHOS_FALLBACK_HTML);
  } catch (error) {
    renderTrabalhosContent(TRABALHOS_FALLBACK_HTML);
  }
}

document.addEventListener('DOMContentLoaded', loadTrabalhosContent);