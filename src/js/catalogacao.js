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

const CATALOGACAO_FALLBACK_HTML = `
  <section>
    <h1>Cobertura Jornalística da Imprensa Local: A pesquisa Histórica</h1>
    <p>
      Linha do Tempo só foi possível de ser construída em virtude da colaboração do Jornal Folha do Mate que, gentilmente cedeu o acesso às Edições para que a pesquisa fosse realizada. Número de Edições pesquisadas:
    </p>
    <table>
      <tr>
        <th>ANO</th>
        <th>NÚMERO DE EDIÇÕES</th>
        <th>PÁGINAS COM REPORTAGENS</th>
      </tr>
      <tr>
        <td>2005</td>
        <td class="bold">103</td>
        <td>7</td>
      </tr>
      <tr>
        <td>2006</td>
        <td class="bold">104</td>
        <td>3</td>
      </tr>
      <tr>
        <td>2007</td>
        <td class="bold">106</td>
        <td>23</td>
      </tr>
      <tr>
        <td>2008</td>
        <td class="bold">154</td>
        <td>28</td>
      </tr>
      <tr>
        <td>2009</td>
        <td class="bold">154</td>
        <td>16</td>
      </tr>
      <tr>
        <td>2010</td>
        <td class="bold">153</td>
        <td>39</td>
      </tr>
      <tr>
        <td>2011</td>
        <td class="bold">172</td>
        <td>62</td>
      </tr>
      <tr>
        <td>2012</td>
        <td class="bold">256</td>
        <td>108</td>
      </tr>
      <tr>
        <td class="bold">TOTAL</td>
        <td class="bold">1.202</td>
        <td class="bold">286</td>
      </tr>
    </table>
    <p>Jornal Folha do Mate: <a href="https://folhadomate.com/noticias/geral/registros-de-uma-historia-marcada-pela-parceria-com-a-comunidade/" target="_blank" rel="noopener noreferrer">https://folhadomate.com/noticias/geral/registros-de-uma-historia-marcada-pela-parceria-com-a-comunidade/</a></p>
  </section>
`;

function renderCatalogacaoContent(contentHtml) {
  const container = document.getElementById('catalogacao-content');
  if (!container) {
    return;
  }
  container.innerHTML = contentHtml;
}

async function loadCatalogacaoContent() {
  try {
    const page = await fetch(buildApiUrl('/api/pages/catalogacao')).then((res) => {
      if (!res.ok) {
        throw new Error('Página catalogação não encontrada');
      }
      return res.json();
    });

    const apiContent = (page.content || '').trim();
    renderCatalogacaoContent(apiContent || CATALOGACAO_FALLBACK_HTML);
  } catch (error) {
    renderCatalogacaoContent(CATALOGACAO_FALLBACK_HTML);
  }
}

document.addEventListener('DOMContentLoaded', loadCatalogacaoContent);