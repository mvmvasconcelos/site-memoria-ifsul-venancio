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
  