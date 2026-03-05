(function () {
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

  window.MemoriaDate = {
    formatDisplayDate,
  };
})();
