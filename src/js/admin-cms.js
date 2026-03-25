const state = {
  timelinePageId: null,
  currentCardsPageId: null,
  events: [],
  timelineDateSortDirection: 'asc',
  cards: [],
  pages: [],
  menuItems: [],
  mediaFiles: [],
  currentEditId: null,
  deleteId: null,
  currentCardEditId: null,
  deleteCardId: null,
  currentEditMediaId: null,
  deleteMediaId: null,
  eventFormInitialState: null,
  activePanel: 'dashboard',
  currentPageEditId: null,
  imagePickerContext: null, // 'event', 'card' ou 'editor'
};

const INSTITUTIONAL_PAGE_SLUGS = ['index', 'catalogacao', 'contact'];
const CARD_PAGE_SLUGS = ['territorio', 'campus', 'trabalhos'];

const MANAGED_PAGE_DEFS = [
  { slug: 'index', title: 'Início', type: 'page', menu_order: 0, is_visible: true },
  { slug: 'timeline', title: 'Linha do Tempo', type: 'timeline', menu_order: 1, is_visible: true },
  { slug: 'territorio', title: 'Transformações Territoriais', type: 'cards', menu_order: 2, is_visible: true },
  { slug: 'campus', title: 'Campus', type: 'cards', menu_order: 3, is_visible: true },
  { slug: 'trabalhos', title: 'Trabalhos', type: 'cards', menu_order: 4, is_visible: true },
  { slug: 'catalogacao', title: 'Catalogação', type: 'page', menu_order: 5, is_visible: true },
  { slug: 'contact', title: 'Contato', type: 'page', menu_order: 6, is_visible: true },
];

function getAppBasePath() {
  const path = window.location.pathname || '';
  
  // Check if we're running under /memoria subpath
  if (path.startsWith('/memoria/')) {
    return '/memoria';
  }
  if (path === '/memoria') {
    return '/memoria';
  }
  
  // If we're at root (nginx is stripping /memoria), return empty
  // because Flask is already at root in the container
  return '';
}

const APP_BASE_PATH = getAppBasePath();
const MAX_MEDIA_UPLOAD_MB = 10;
const MAX_MEDIA_UPLOAD_BYTES = MAX_MEDIA_UPLOAD_MB * 1024 * 1024;
let pageContentEditor = null;
let pageContentEditorInitialized = false;
let pageEditorViewMode = 'visual';
const PAGE_EDITOR_DRAFT_PREFIX = 'memoria-page-draft:';
const PAGE_EDITOR_HISTORY_LIMIT = 100;
let pageEditorHistory = [];
let pageEditorHistoryIndex = -1;
let pageEditorApplyingHistory = false;

function buildApiUrl(path) {
  return `${APP_BASE_PATH}${path}`;
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-message">${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function showModal(id) {
  document.getElementById(id).classList.add('show');
}

function hideModal(id) {
  document.getElementById(id).classList.remove('show');
}

function getEventFormState() {
  return {
    date: document.getElementById('eventDate').value.trim(),
    title: document.getElementById('eventTitle').value.trim(),
    imagePath: document.getElementById('eventImage').value.trim(),
    legend: document.getElementById('eventLegend').value.trim(),
    description: document.getElementById('eventText').value.trim(),
  };
}

function captureEventFormInitialState() {
  state.eventFormInitialState = JSON.stringify(getEventFormState());
}

function hasUnsavedEventChanges() {
  if (!state.eventFormInitialState) {
    return false;
  }
  return JSON.stringify(getEventFormState()) !== state.eventFormInitialState;
}

function closeEventModalSafely() {
  if (hasUnsavedEventChanges()) {
    const shouldDiscard = window.confirm('Existem alterações não salvas. Deseja descartar e fechar?');
    if (!shouldDiscard) {
      return;
    }
  }

  hideModal('eventModal');
}

function setLoading(isLoading) {
  const spinner = document.getElementById('loadingSpinner');
  const table = document.getElementById('timelineTableContainer');
  if (!spinner || !table) return;
  spinner.style.display = isLoading ? 'flex' : 'none';
  table.style.display = isLoading ? 'none' : 'block';
}

function setActivePanel(panelName) {
  state.activePanel = panelName;

  document.querySelectorAll('.admin-panel').forEach((panel) => {
    panel.classList.toggle('active', panel.dataset.panel === panelName);
  });

  document.querySelectorAll('.admin-nav-item').forEach((item) => {
    item.classList.toggle('active', item.dataset.panelTarget === panelName);
  });
}

function updateDashboardCards() {
  const lastSyncAt = document.getElementById('lastSyncAt');
  if (lastSyncAt) {
    const now = new Date();
    lastSyncAt.textContent = now.toLocaleString('pt-BR');
  }
}

function initPanelNavigation() {
  document.querySelectorAll('.admin-nav-item').forEach((item) => {
    item.addEventListener('click', () => {
      setActivePanel(item.dataset.panelTarget || 'dashboard');
    });
  });
}

function setSyncStatus(status, message) {
  const sync = document.getElementById('syncStatus');
  if (!sync) return;
  sync.className = `sync-status ${status}`;
  sync.textContent = message;
}

function updateSelectionPreview(previewId, imagePath, emptyMessage = 'Nenhuma imagem selecionada') {
  const preview = document.getElementById(previewId);
  if (!preview) return;

  const path = (imagePath || '').trim();
  if (!path) {
    preview.classList.add('empty');
    preview.innerHTML = emptyMessage;
    return;
  }

  preview.classList.remove('empty');
  const imageUrl = resolveAssetUrl(path);
  preview.innerHTML = `<img src="${sanitize(imageUrl)}" alt="Pré-visualização" />`;
}

function updateImagePreviewFromPath(imagePath) {
  updateSelectionPreview('imagePreview', imagePath);
}

function updateCardImagePreview(imagePath) {
  updateSelectionPreview('cardImagePreview', imagePath);
}

function updateImagePreviewFromFile(file) {
  const preview = document.getElementById('imagePreview');
  if (!preview) return;

  if (!file) {
    updateImagePreviewFromPath(document.getElementById('eventImage').value);
    return;
  }

  const objectUrl = URL.createObjectURL(file);
  preview.classList.remove('empty');
  preview.innerHTML = `<img src="${sanitize(objectUrl)}" alt="Pré-visualização do upload" />`;
}

function sanitize(value) {
  const div = document.createElement('div');
  div.textContent = value || '';
  return div.innerHTML;
}

function resolveAssetUrl(imagePath) {
  if (!imagePath) return '';
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  const normalizedPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `${APP_BASE_PATH}${normalizedPath}`;
}

function normalizeDateForInput(dateValue) {
  return normalizeTimelineDate(dateValue);
}

function normalizeTimelineDate(dateValue) {
  const value = (dateValue || '').trim();
  if (!value) return '';

  const match = value.match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/);
  if (!match) return '';

  const year = Number(match[1]);
  const month = match[2] ? Number(match[2]) : null;
  const day = match[3] ? Number(match[3]) : null;

  if (month !== null && (month < 1 || month > 12)) return '';

  if (day !== null) {
    if (month === null) return '';
    const date = new Date(Date.UTC(year, month - 1, day));
    const valid =
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day;
    if (!valid) return '';
  }

  if (day !== null) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  if (month !== null) {
    return `${match[1]}-${match[2]}`;
  }

  return match[1];
}

function formatTimelineDisplayDate(dateValue) {
  if (window.MemoriaDate?.formatDisplayDate) {
    return window.MemoriaDate.formatDisplayDate(dateValue);
  }
  return (dateValue || '').trim();
}

function getTimelineDateSortKey(dateValue) {
  const value = (dateValue || '').trim();
  if (!value) return Number.MAX_SAFE_INTEGER;

  const exactMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (exactMatch) {
    const [, year, month, day] = exactMatch;
    return Number(`${year}${month}${day}`);
  }

  const yearMonthMatch = value.match(/^(\d{4})-(\d{2})$/);
  if (yearMonthMatch) {
    const [, year, month] = yearMonthMatch;
    return Number(`${year}${month}00`);
  }

  const yearMatch = value.match(/^(\d{4})$/);
  if (yearMatch) {
    return Number(`${yearMatch[1]}0000`);
  }

  return Number.MAX_SAFE_INTEGER - 1;
}

function getSortedEvents(events) {
  const direction = state.timelineDateSortDirection === 'desc' ? 'desc' : 'asc';
  const multiplier = direction === 'desc' ? -1 : 1;

  return [...events].sort((first, second) => {
    const dateDiff = (getTimelineDateSortKey(first.date) - getTimelineDateSortKey(second.date)) * multiplier;
    if (dateDiff !== 0) return dateDiff;
    return String(first.title || '').localeCompare(String(second.title || ''), 'pt-BR') * multiplier;
  });
}

function updateTimelineSortButton() {
  const button = document.getElementById('timelineDateSortBtn');
  const indicator = document.getElementById('timelineDateSortIndicator');
  const isDescending = state.timelineDateSortDirection === 'desc';

  if (button) {
    button.setAttribute('aria-pressed', String(isDescending));
    button.setAttribute('title', isDescending ? 'Ordenado do mais recente para o mais antigo' : 'Ordenado do mais antigo para o mais recente');
  }

  if (indicator) {
    indicator.textContent = isDescending ? '↓' : '↑';
  }
}

async function apiRequest(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(options.headers || {}),
  };

  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(buildApiUrl(path), {
    credentials: 'same-origin',
    headers,
    ...options,
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const error = new Error(payload?.error || `Erro HTTP ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

async function checkSession() {
  try {
    await apiRequest('/api/auth/me');
    return true;
  } catch (_) {
    return false;
  }
}

async function login(username, password) {
  await apiRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

async function logout() {
  await apiRequest('/api/auth/logout', { method: 'POST' });
  window.location.href = APP_BASE_PATH ? `${APP_BASE_PATH}/` : '/';
}

async function changePassword(currentPassword, newPassword) {
  return apiRequest('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });
}

async function uploadImage(file, folder = 'timeline') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  return apiRequest('/api/upload', {
    method: 'POST',
    body: formData,
  });
}

async function getTimelinePageId() {
  const page = await apiRequest('/api/pages/timeline');
  state.timelinePageId = page.id;
}

async function loadEvents() {
  if (!state.timelinePageId) {
    await getTimelinePageId();
  }

  setSyncStatus('syncing', '⟳ Carregando...');
  const items = await apiRequest(`/api/timeline/${state.timelinePageId}`);
  state.events = items;
  renderEvents(items);
  setSyncStatus('synced', '✓ Sincronizado com API');
}

async function loadPages() {
  state.pages = await apiRequest('/api/pages');
}

async function loadMenu() {
  state.menuItems = await apiRequest('/api/menu');
  renderMenuTable();
}

async function loadCards() {
  if (!state.currentCardsPageId) {
    state.cards = [];
    renderCardsTable();
    return;
  }

  setSyncStatus('syncing', '⟳ Carregando cards...');
  state.cards = await apiRequest(`/api/cards/${state.currentCardsPageId}`);
  renderCardsTable();
  setSyncStatus('synced', '✓ Cards sincronizados');
}

async function loadCardsForCurrentPage() {
  await loadCards();
}

function renderCardsTable() {
  const tbody = document.getElementById('cardsTableBody');
  if (!tbody) return;

  const emptyState = document.getElementById('cardsEmptyState');
  const tableContainer = document.getElementById('cardsTableContainer');

  if (!state.currentCardsPageId) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="no-image">Nenhuma seção com cards disponível</td>
      </tr>
    `;
    if (emptyState) emptyState.style.display = 'block';
    if (tableContainer) tableContainer.style.display = 'none';
    return;
  }

  if (!state.cards.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="no-image">Nenhum card cadastrado para esta seção</td>
      </tr>
    `;
    if (emptyState) emptyState.style.display = 'block';
    if (tableContainer) tableContainer.style.display = 'none';
    return;
  }

  tbody.innerHTML = state.cards
    .map(
      (card, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${sanitize(card.title || '-')}</td>
        <td>
          ${card.image_path
            ? `<img class="event-image-thumb" src="${sanitize(resolveAssetUrl(card.image_path))}" alt="${sanitize(card.title || 'Card')}" />`
            : '<span class="no-image">Sem imagem</span>'}
        </td>
        <td class="event-date">${sanitize(card.date_label || '-')}</td>
        <td class="event-legend">${sanitize(card.source || '-')}</td>
        <td>
          <div class="table-actions">
            <button class="btn-secondary btn-small" data-card-action="edit" data-card-id="${card.id}">Editar</button>
            <button class="btn-danger btn-small" data-card-action="delete" data-card-id="${card.id}">Excluir</button>
          </div>
        </td>
      </tr>
    `
    )
    .join('');

  if (emptyState) emptyState.style.display = 'none';
  if (tableContainer) tableContainer.style.display = 'block';
}

function fillCardForm(card = null) {
  document.getElementById('cardModalTitle').textContent = card ? 'Editar Card' : 'Adicionar Card';
  document.getElementById('cardTitle').value = card?.title || '';
  document.getElementById('cardImage').value = card?.image_path || '';
  document.getElementById('cardDateLabel').value = card?.date_label || '';
  document.getElementById('cardSource').value = card?.source || '';
  document.getElementById('cardDescription').value = card?.description || '';
  updateCardImagePreview(card?.image_path || '');
}

function openCreateCardModal() {
  if (!state.currentCardsPageId) {
    showToast('Selecione uma seção antes de adicionar cards.', 'error');
    return;
  }

  state.currentCardEditId = null;
  fillCardForm();
  showModal('cardModal');
}

function openEditCardModal(cardId) {
  const card = state.cards.find((item) => Number(item.id) === Number(cardId));
  if (!card) return;

  state.currentCardEditId = Number(cardId);
  fillCardForm(card);
  showModal('cardModal');
}

function openDeleteCardModal(cardId) {
  const card = state.cards.find((item) => Number(item.id) === Number(cardId));
  if (!card) return;

  state.deleteCardId = Number(cardId);
  document.getElementById('deleteCardTitle').textContent = card.title || '';
  showModal('deleteCardModal');
}

async function saveCardFromForm(event) {
  event.preventDefault();

  if (!state.currentCardsPageId) {
    showToast('Selecione uma seção antes de salvar cards.', 'error');
    return;
  }

  const payload = {
    page_id: state.currentCardsPageId,
    title: document.getElementById('cardTitle').value.trim(),
    image_path: document.getElementById('cardImage').value.trim() || null,
    date_label: document.getElementById('cardDateLabel').value.trim() || null,
    source: document.getElementById('cardSource').value.trim() || null,
    description: document.getElementById('cardDescription').value.trim() || null,
  };

  if (!payload.title) {
    showToast('O título do card é obrigatório.', 'error');
    return;
  }

  try {
    setSyncStatus('syncing', '⟳ Salvando card...');

    if (state.currentCardEditId) {
      await apiRequest(`/api/cards/${state.currentCardEditId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      showToast('Card atualizado com sucesso.', 'success');
    } else {
      payload.order_index = state.cards.length;
      await apiRequest('/api/cards', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      showToast('Card criado com sucesso.', 'success');
    }

    hideModal('cardModal');
    state.currentCardEditId = null;
    await loadCards();
  } catch (error) {
    setSyncStatus('error', '⚠ Erro ao salvar card');
    showToast(error.message, 'error');
  }
}

async function confirmDeleteCard() {
  if (!state.deleteCardId) return;

  try {
    setSyncStatus('syncing', '⟳ Excluindo card...');
    await apiRequest(`/api/cards/${state.deleteCardId}`, { method: 'DELETE' });
    hideModal('deleteCardModal');
    state.deleteCardId = null;
    showToast('Card excluído com sucesso.', 'success');
    await loadCards();
  } catch (error) {
    setSyncStatus('error', '⚠ Erro ao excluir card');
    showToast(error.message, 'error');
  }
}

function formatHistoryTimestamp(isoValue) {
  if (!isoValue) return '-';
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return isoValue;
  return date.toLocaleString('pt-BR');
}

function buildPageOptions(selectedPageId) {
  const options = ['<option value="">(custom)</option>'];
  state.pages.forEach((page) => {
    const selected = Number(selectedPageId) === Number(page.id) ? 'selected' : '';
    options.push(`<option value="${page.id}" ${selected}>${sanitize(page.title)} (${sanitize(page.slug)})</option>`);
  });
  return options.join('');
}

function getPageById(pageId) {
  return state.pages.find((page) => Number(page.id) === Number(pageId));
}

function getPageBySlug(slug) {
  return state.pages.find((page) => page.slug === slug);
}

function getInstitutionalPages() {
  return state.pages.filter((page) => INSTITUTIONAL_PAGE_SLUGS.includes(page.slug));
}

function getCardManagedPages() {
  return state.pages.filter((page) => CARD_PAGE_SLUGS.includes(page.slug));
}

function renderCardPageOptions() {
  const select = document.getElementById('cardsPageSelect');
  if (!select) return;

  const cardPages = getCardManagedPages();
  if (!cardPages.length) {
    select.innerHTML = '<option value="">Nenhuma seção disponível</option>';
    state.currentCardsPageId = null;
    return;
  }

  if (!cardPages.some((page) => Number(page.id) === Number(state.currentCardsPageId))) {
    state.currentCardsPageId = Number(cardPages[0].id);
  }

  select.innerHTML = cardPages
    .map((page) => {
      const selected = Number(page.id) === Number(state.currentCardsPageId) ? 'selected' : '';
      return `<option value="${page.id}" ${selected}>${sanitize(page.title)}</option>`;
    })
    .join('');
}

function getPageType(slug) {
  return CARD_PAGE_SLUGS.includes(slug) ? 'cards' : 'content';
}

function renderPageManagerTable() {
  const tbody = document.getElementById('pageManagerTableBody');
  if (!tbody) return;

  // Show ALL managed pages (institutional + cards)
  const allPages = [...getInstitutionalPages(), ...getCardManagedPages()];
  allPages.sort((a, b) => (a.title || '').localeCompare(b.title || '', 'pt-BR'));

  if (!allPages.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="no-image">Nenhuma página disponível para edição</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = allPages
    .map((page) => {
      const pageType = getPageType(page.slug);
      const typeLabel = pageType === 'cards'
        ? '<span class="page-type-badge page-type-cards">Cards</span>'
        : '<span class="page-type-badge page-type-content">Conteúdo</span>';
      return `
      <tr>
        <td>${sanitize(page.title || '-')}</td>
        <td>${sanitize(page.slug || '-')}</td>
        <td>${typeLabel}</td>
        <td>${sanitize(formatHistoryTimestamp(page.updated_at) || '-')}</td>
        <td>
          <div class="table-actions">
            <button class="btn-secondary btn-small" data-page-action="edit" data-page-id="${page.id}" data-page-type="${pageType}">Editar</button>
          </div>
        </td>
      </tr>
    `;
    })
    .join('');
}

function showUnifiedPagesTable() {
  const tableContainer = document.getElementById('unifiedPagesTableContainer');
  const cardsEditor = document.getElementById('cardsEditorWrapper');
  const contentEditor = document.getElementById('pageEditorWrapper');
  if (tableContainer) tableContainer.style.display = 'block';
  if (cardsEditor) cardsEditor.style.display = 'none';
  if (contentEditor) contentEditor.style.display = 'none';
}

async function openPageEditor(pageId, pageType) {
  const page = getPageById(pageId);
  if (!page) return;

  const tableContainer = document.getElementById('unifiedPagesTableContainer');
  if (tableContainer) tableContainer.style.display = 'none';

  if (pageType === 'cards') {
    // Open cards editor
    state.currentCardsPageId = pageId;
    const cardsEditor = document.getElementById('cardsEditorWrapper');
    const titleEl = document.getElementById('cardsEditorTitle');
    if (titleEl) titleEl.textContent = `Cards: ${page.title}`;
    if (cardsEditor) cardsEditor.style.display = 'block';
    await loadCardsForCurrentPage();
  } else {
    // Open content editor
    await openPageContentEditor(pageId);
    const contentEditor = document.getElementById('pageEditorWrapper');
    if (contentEditor) contentEditor.style.display = 'block';
  }
}

function closePageContentEditor() {
  state.currentPageEditId = null;
  const wrapper = document.getElementById('pageEditorWrapper');
  const title = document.getElementById('pageEditorTitle');
  const pageTitleInput = document.getElementById('pageTitleInput');
  if (wrapper) wrapper.style.display = 'none';
  if (title) title.textContent = 'Editar página';
  if (pageTitleInput) pageTitleInput.value = '';
  setPageEditorView('visual');
  setPageEditorContent('');
}

function getCurrentEditingPage() {
  if (!state.currentPageEditId) return null;
  return getPageById(state.currentPageEditId);
}

function getPageDraftStorageKey(page) {
  if (!page?.slug) return null;
  return `${PAGE_EDITOR_DRAFT_PREFIX}${page.slug}`;
}

function updatePageEditorMeta(content) {
  const meta = document.getElementById('pageEditorMeta');
  if (!meta) return;

  const html = content || '';
  const temp = document.createElement('div');
  temp.innerHTML = html;
  const text = (temp.textContent || '').trim();
  meta.textContent = `${html.length} caracteres • ${text.length} texto`;
}

function savePageEditorDraft() {
  const page = getCurrentEditingPage();
  const storageKey = getPageDraftStorageKey(page);
  if (!storageKey) return;

  const content = getPageEditorContent();
  try {
    window.localStorage.setItem(storageKey, content);
  } catch (_) {
    // Sem persistência local (quota/bloqueio), segue sem interromper fluxo.
  }
}

function clearPageEditorDraft(page) {
  const storageKey = getPageDraftStorageKey(page);
  if (!storageKey) return;
  try {
    window.localStorage.removeItem(storageKey);
  } catch (_) {
    // Sem ação em caso de falha de storage.
  }
}

function buildCardTemplateHtml() {
  const page = getCurrentEditingPage();
  const isCampus = page?.slug === 'campus';
  const imagePath = 'src/images/territorio/image6.png';
  const imageAlt = isCampus ? 'Imagem do campus' : 'Imagem da transformação territorial';
  const defaultDate = isCampus ? '2012' : '2005';

  return `
<div class="territorio-entry">
  <h3>Título do Card</h3>
  <div class="image-container">
    <img src="${imagePath}" alt="${imageAlt}">
    <p class="date">${defaultDate}</p>
  </div>
  <p class="legend">Fonte: inserir referência</p>
  <p>Descreva aqui o conteúdo do card.</p>
</div>
  `.trim();
}

function getNormalizedEditorHtml(content) {
  const html = (content || '').trim();
  if (!html || html === '<br>' || html === '<p><br></p>') {
    return '';
  }
  return html;
}

function resetPageEditorHistory(content) {
  const normalized = getNormalizedEditorHtml(content);
  pageEditorHistory = [normalized];
  pageEditorHistoryIndex = 0;
}

function recordPageEditorHistory(content) {
  if (pageEditorApplyingHistory) return;

  const normalized = getNormalizedEditorHtml(content);
  const current = pageEditorHistory[pageEditorHistoryIndex] ?? '';
  if (normalized === current) return;

  if (pageEditorHistoryIndex < pageEditorHistory.length - 1) {
    pageEditorHistory = pageEditorHistory.slice(0, pageEditorHistoryIndex + 1);
  }

  pageEditorHistory.push(normalized);
  if (pageEditorHistory.length > PAGE_EDITOR_HISTORY_LIMIT) {
    pageEditorHistory.shift();
  }
  pageEditorHistoryIndex = pageEditorHistory.length - 1;
}

function applyPageEditorHistory(content) {
  pageEditorApplyingHistory = true;
  setPageEditorContent(content || '');
  pageEditorApplyingHistory = false;
}

function undoPageEditorChange() {
  if (pageEditorHistoryIndex <= 0) {
    showToast('Nada para desfazer.', 'info');
    return;
  }
  pageEditorHistoryIndex -= 1;
  applyPageEditorHistory(pageEditorHistory[pageEditorHistoryIndex] || '');
}

function redoPageEditorChange() {
  if (pageEditorHistoryIndex >= pageEditorHistory.length - 1) {
    showToast('Nada para refazer.', 'info');
    return;
  }
  pageEditorHistoryIndex += 1;
  applyPageEditorHistory(pageEditorHistory[pageEditorHistoryIndex] || '');
}

function insertHtmlAtCursor(html) {
  if (!pageContentEditor) return;

  pageContentEditor.focus();
  document.execCommand('insertHTML', false, html);
  syncPageEditorTextarea();
  recordPageEditorHistory(getPageEditorContent());
  savePageEditorDraft();
}

function insertCardTemplateIntoTerritorioSection(templateHtml) {
  const content = getPageEditorContent();
  const openTagMatch = content.match(/<section[^>]*id=["']territorio["'][^>]*>/i);
  if (!openTagMatch || openTagMatch.index === undefined) {
    return false;
  }

  const sectionContentStart = openTagMatch.index + openTagMatch[0].length;
  const sectionCloseIndex = content.indexOf('</section>', sectionContentStart);
  if (sectionCloseIndex === -1) {
    return false;
  }

  const separator = content[sectionCloseIndex - 1] === '\n' ? '' : '\n';
  const insertion = `${separator}${templateHtml}\n`;
  const nextContent = `${content.slice(0, sectionCloseIndex)}${insertion}${content.slice(sectionCloseIndex)}`;

  setPageEditorContent(nextContent);
  recordPageEditorHistory(nextContent);
  savePageEditorDraft();
  return true;
}

function ensurePageEditorStructure(wrapper, textarea) {
  const textareaGroup = textarea.closest('.form-group') || textarea.parentElement;
  const fieldContainer = textareaGroup?.parentElement || wrapper;
  const insertBeforeTarget = textareaGroup || null;
  let modeBar = document.getElementById('pageEditorModeBar');
  let toolbar = document.getElementById('pageEditorToolbar');
  let editorHost = document.getElementById('pageContentEditor');
  let preview = document.getElementById('pageContentPreview');

  if (!modeBar) {
    modeBar = document.createElement('div');
    modeBar.id = 'pageEditorModeBar';
    modeBar.className = 'page-editor-mode-bar';
    modeBar.setAttribute('aria-label', 'Modo de edição');
    modeBar.innerHTML = `
      <button type="button" class="btn-secondary btn-small active" data-editor-view="visual">Visual</button>
      <button type="button" class="btn-secondary btn-small" data-editor-view="html">HTML</button>
      <button type="button" class="btn-secondary btn-small" data-editor-view="preview">Preview</button>
      <span id="pageEditorMeta" class="page-editor-meta">0 caracteres</span>
    `;
    if (insertBeforeTarget) {
      fieldContainer.insertBefore(modeBar, insertBeforeTarget);
    } else {
      fieldContainer.appendChild(modeBar);
    }
  }

  if (!toolbar) {
    toolbar = document.createElement('div');
    toolbar.id = 'pageEditorToolbar';
    toolbar.className = 'page-editor-toolbar';
    toolbar.setAttribute('aria-label', 'Barra de ferramentas do editor');
    toolbar.innerHTML = `
      <button type="button" class="btn-secondary btn-small" data-editor-cmd="undo">Desfazer</button>
      <button type="button" class="btn-secondary btn-small" data-editor-cmd="redo">Refazer</button>
      <button type="button" class="btn-secondary btn-small" data-editor-cmd="formatBlock" data-editor-value="h2">H2</button>
      <button type="button" class="btn-secondary btn-small" data-editor-cmd="formatBlock" data-editor-value="h3">H3</button>
      <button type="button" class="btn-secondary btn-small" data-editor-cmd="bold"><strong>B</strong></button>
      <button type="button" class="btn-secondary btn-small" data-editor-cmd="italic"><em>I</em></button>
      <button type="button" class="btn-secondary btn-small" data-editor-cmd="underline"><u>U</u></button>
      <button type="button" class="btn-secondary btn-small" data-editor-cmd="insertOrderedList">Num.</button>
      <button type="button" class="btn-secondary btn-small" data-editor-cmd="insertUnorderedList">Lista</button>
      <button type="button" class="btn-secondary btn-small" data-editor-cmd="createLink">Link</button>
      <button type="button" class="btn-secondary btn-small" data-editor-cmd="insertImage">Imagem</button>
      <button type="button" class="btn-secondary btn-small" data-editor-cmd="insertHorizontalRule">Linha</button>
      <button type="button" class="btn-secondary btn-small" data-editor-cmd="removeFormat">Limpar</button>
    `;
    if (insertBeforeTarget) {
      fieldContainer.insertBefore(toolbar, insertBeforeTarget);
    } else {
      fieldContainer.appendChild(toolbar);
    }
  }

  if (!editorHost) {
    editorHost = document.createElement('div');
    editorHost.id = 'pageContentEditor';
    editorHost.className = 'page-wysiwyg-host';
    editorHost.setAttribute('contenteditable', 'true');
    editorHost.setAttribute('role', 'textbox');
    editorHost.setAttribute('aria-multiline', 'true');
    editorHost.setAttribute('aria-label', 'Editor de conteúdo');
    if (insertBeforeTarget) {
      fieldContainer.insertBefore(editorHost, insertBeforeTarget);
    } else {
      fieldContainer.appendChild(editorHost);
    }
  }

  if (!preview) {
    preview = document.createElement('div');
    preview.id = 'pageContentPreview';
    preview.className = 'page-editor-preview';
    preview.style.display = 'none';
    if (insertBeforeTarget?.nextSibling) {
      fieldContainer.insertBefore(preview, insertBeforeTarget.nextSibling);
    } else {
      fieldContainer.appendChild(preview);
    }
  }

  return {
    modeBar,
    toolbar,
    editorHost,
    preview,
  };
}

function setPageEditorView(mode) {
  const toolbar = document.getElementById('pageEditorToolbar');
  const textarea = document.getElementById('pageContentInput');
  const preview = document.getElementById('pageContentPreview');
  if (!textarea || !pageContentEditor || !toolbar || !preview) return;

  const nextMode = ['visual', 'html', 'preview'].includes(mode) ? mode : 'visual';

  if (nextMode === 'html') {
    textarea.value = getPageEditorContent();
  } else if (pageEditorViewMode === 'html') {
    pageContentEditor.innerHTML = textarea.value || '<p><br></p>';
    syncPageEditorTextarea();
  }

  if (nextMode === 'preview') {
    preview.innerHTML = getPageEditorContent() || '<p><em>Sem conteúdo para pré-visualizar.</em></p>';
  }

  pageEditorViewMode = nextMode;

  toolbar.style.display = nextMode === 'visual' ? 'flex' : 'none';
  pageContentEditor.style.display = nextMode === 'visual' ? 'block' : 'none';
  textarea.style.display = nextMode === 'html' ? 'block' : 'none';
  preview.style.display = nextMode === 'preview' ? 'block' : 'none';

  document.querySelectorAll('#pageEditorModeBar [data-editor-view]').forEach((button) => {
    button.classList.toggle('active', button.dataset.editorView === nextMode);
  });
}

function initializePageContentEditor() {
  if (pageContentEditorInitialized) return;

  const wrapper = document.getElementById('pageEditorWrapper');
  const textarea = document.getElementById('pageContentInput');
  if (!wrapper || !textarea) return;
  const { modeBar, toolbar, editorHost } = ensurePageEditorStructure(wrapper, textarea);

  pageContentEditor = editorHost;

  toolbar.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-editor-cmd]');
    if (!button) return;

    event.preventDefault();
    pageContentEditor.focus();

    const command = button.dataset.editorCmd;
    const commandValue = button.dataset.editorValue || null;

    if (command === 'undo') {
      undoPageEditorChange();
      savePageEditorDraft();
      return;
    }

    if (command === 'redo') {
      redoPageEditorChange();
      savePageEditorDraft();
      return;
    }

    if (command === 'createLink') {
      const url = window.prompt('Digite a URL do link:', 'https://');
      if (!url) return;
      document.execCommand('createLink', false, url);
    } else if (command === 'insertImage') {
      openImagePickerModal();
      return;
    } else if (command === 'insertTemplateCard') {
      const page = getCurrentEditingPage();
      const templateHtml = buildCardTemplateHtml();
      const insertedInTargetSection =
        (page?.slug === 'territorio' || page?.slug === 'campus') &&
        insertCardTemplateIntoTerritorioSection(templateHtml);

      if (!insertedInTargetSection) {
        insertHtmlAtCursor(templateHtml);
      }

      showToast('Template de card inserido no editor.', 'success');
      return;
    } else if (command === 'insertHorizontalRule') {
      document.execCommand('insertHorizontalRule', false, null);
    } else if (command === 'formatBlock') {
      document.execCommand('formatBlock', false, commandValue);
    } else {
      document.execCommand(command, false, commandValue);
    }

    syncPageEditorTextarea();
    recordPageEditorHistory(getPageEditorContent());
    savePageEditorDraft();
  });

  modeBar.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-editor-view]');
    if (!button) return;
    event.preventDefault();
    setPageEditorView(button.dataset.editorView);
  });

  editorHost.addEventListener('input', () => {
    syncPageEditorTextarea();
    recordPageEditorHistory(getPageEditorContent());
    savePageEditorDraft();
  });

  textarea.addEventListener('input', () => {
    updatePageEditorMeta(textarea.value || '');
    recordPageEditorHistory(textarea.value || '');
    savePageEditorDraft();
  });

  const saveWithShortcut = (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      saveSelectedPageContent();
    }
  };

  editorHost.addEventListener('keydown', saveWithShortcut);
  textarea.addEventListener('keydown', saveWithShortcut);

  setPageEditorView('visual');
  pageContentEditorInitialized = true;
}

function syncPageEditorTextarea() {
  const textarea = document.getElementById('pageContentInput');
  if (!textarea || !pageContentEditor) return;

  const html = (pageContentEditor.innerHTML || '').trim();
  textarea.value = html === '<br>' || html === '<p><br></p>' ? '' : html;
  updatePageEditorMeta(textarea.value || '');
}

function setPageEditorContent(content) {
  const textarea = document.getElementById('pageContentInput');
  const normalizedContent = content || '';

  if (textarea) {
    textarea.value = normalizedContent;
  }

  if (!pageContentEditor) {
    return;
  }

  pageContentEditor.innerHTML = normalizedContent || '<p><br></p>';
  syncPageEditorTextarea();
}

function getPageEditorContent() {
  const textarea = document.getElementById('pageContentInput');

  if (pageEditorViewMode === 'html' && textarea) {
    return (textarea.value || '').trim();
  }

  if (!pageContentEditor) {
    return textarea ? textarea.value : '';
  }

  const html = (pageContentEditor.innerHTML || '').trim();
  const normalizedHtml = html === '<p><br></p>' || html === '<br>' ? '' : html;

  if (textarea) {
    textarea.value = normalizedHtml;
  }

  return normalizedHtml;
}

async function openPageContentEditor(pageId) {
  const page = getPageById(pageId);
  if (!page) return;

  initializePageContentEditor();
  state.currentPageEditId = Number(page.id);
  const wrapper = document.getElementById('pageEditorWrapper');
  const title = document.getElementById('pageEditorTitle');
  const pageTitleInput = document.getElementById('pageTitleInput');
  if (wrapper) wrapper.style.display = 'block';
  if (title) title.textContent = `Editar: ${page.title} (${page.slug})`;
  if (pageTitleInput) pageTitleInput.value = page.title || '';
  setPageEditorView('visual');
  setPageEditorContent('<p>Carregando conteúdo...</p>');
  resetPageEditorHistory('');

  try {
    const payload = await apiRequest(`/api/pages/${page.slug}/editor-content`);
    const serverContent = payload?.content || '';
    setPageEditorContent(serverContent);
    resetPageEditorHistory(serverContent);

    const draftKey = getPageDraftStorageKey(page);
    const draft = draftKey ? window.localStorage.getItem(draftKey) : null;
    if (draft && draft !== serverContent) {
      clearPageEditorDraft(page);
    }

    if (payload?.source === 'generated') {
      showToast('Conteúdo inicial carregado a partir da versão atual do site. Salve para persistir no banco.', 'info');
      showToast('Nesta tela você edita o conteúdo principal da página (dentro de <main>).', 'info');
    }
  } catch (error) {
    setPageEditorContent(page?.content || '');
    resetPageEditorHistory(page?.content || '');
    showToast('Não foi possível carregar conteúdo inicial da página.', 'warning');
  }

  if (pageContentEditor) {
    pageContentEditor.focus();
  } else {
    const textarea = document.getElementById('pageContentInput');
    textarea?.focus();
  }
}

function initializeContentEditor() {
  initializePageContentEditor();
  renderPageManagerTable();
  showUnifiedPagesTable();
}

async function saveSelectedPageContent() {
  const selectedId = Number(state.currentPageEditId);
  if (!selectedId) {
    showToast('Selecione uma página na lista para editar.', 'error');
    return;
  }

  const content = getPageEditorContent();
  const titleInput = document.getElementById('pageTitleInput');
  const nextTitle = (titleInput?.value || '').trim();

  if (!nextTitle) {
    showToast('Informe um título para a página.', 'error');
    titleInput?.focus();
    return;
  }

  try {
    setSyncStatus('syncing', '⟳ Salvando conteúdo...');
    const updated = await apiRequest(`/api/pages/${selectedId}`, {
      method: 'PUT',
      body: JSON.stringify({ title: nextTitle, content }),
    });

    const index = state.pages.findIndex((page) => Number(page.id) === Number(selectedId));
    if (index >= 0) {
      state.pages[index] = updated;
    }

    clearPageEditorDraft(updated);

    renderPageManagerTable();

    setSyncStatus('synced', '✓ Conteúdo salvo');
    showToast('Conteúdo da página salvo com sucesso.', 'success');
  } catch (error) {
    setSyncStatus('error', '⚠ Erro ao salvar conteúdo');
    showToast(error.message, 'error');
  }
}

// Gallery functions removed - 2026-03-10

function renderMenuTable() {
  const tbody = document.getElementById('menuTableBody');
  if (!tbody) return;

  tbody.innerHTML = state.menuItems
    .map(
      (item, index) => `
      <tr data-index="${index}">
        <td>
          <select class="menu-page-id">
            ${buildPageOptions(item.page_id)}
          </select>
        </td>
        <td><input type="text" class="menu-label" value="${sanitize(item.label || '')}" placeholder="Rótulo" /></td>
        <td><input type="text" class="menu-url" value="${sanitize(item.url || '')}" placeholder="/pagina" /></td>
        <td><input type="checkbox" class="menu-visible" ${item.is_visible ? 'checked' : ''} /></td>
        <td>
          <div class="table-actions">
            <button class="btn-secondary btn-small" data-menu-action="up">↑</button>
            <button class="btn-secondary btn-small" data-menu-action="down">↓</button>
            <button class="btn-danger btn-small" data-menu-action="remove">Remover</button>
          </div>
        </td>
      </tr>
    `
    )
    .join('');

  updateDashboardCards();
}

function addMenuItem() {
  state.menuItems.push({
    page_id: null,
    label: '',
    url: '',
    is_visible: true,
  });
  renderMenuTable();
}

function moveMenuItem(index, direction) {
  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= state.menuItems.length) return;

  const temp = state.menuItems[index];
  state.menuItems[index] = state.menuItems[target];
  state.menuItems[target] = temp;
  renderMenuTable();
}

function removeMenuItem(index) {
  state.menuItems.splice(index, 1);
  renderMenuTable();
}

function syncMenuItemsFromTable() {
  const rows = Array.from(document.querySelectorAll('#menuTableBody tr'));
  state.menuItems = rows.map((row) => {
    const pageIdValue = row.querySelector('.menu-page-id').value;
    return {
      page_id: pageIdValue ? Number(pageIdValue) : null,
      label: row.querySelector('.menu-label').value.trim(),
      url: row.querySelector('.menu-url').value.trim(),
      is_visible: row.querySelector('.menu-visible').checked,
    };
  });
}

async function saveMenu() {
  syncMenuItemsFromTable();

  if (state.menuItems.some((item) => !item.label)) {
    showToast('Todos os itens do menu precisam de rótulo.', 'error');
    return;
  }

  const payload = {
    items: state.menuItems.map((item) => ({
      page_id: item.page_id,
      label: item.label,
      url: item.url || null,
      is_visible: item.is_visible,
    })),
  };

  try {
    setSyncStatus('syncing', '⟳ Salvando menu...');
    const saved = await apiRequest('/api/menu', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    state.menuItems = saved;
    renderMenuTable();
    setSyncStatus('synced', '✓ Menu salvo');
    showToast('Menu atualizado com sucesso.', 'success');
  } catch (error) {
    setSyncStatus('error', '⚠ Erro ao salvar menu');
    showToast(error.message, 'error');
  }
}

async function loadAdminData() {
  await loadPages();
  await ensureManagedPages();
  await loadPages();
  await Promise.all([loadEvents(), loadMenu(), loadMedia()]);
  initializeContentEditor();
  attachMediaEventListeners();
  updateDashboardCards();
}

async function ensureManagedPages() {
  const existingSlugs = new Set(state.pages.map((page) => page.slug));
  const missing = MANAGED_PAGE_DEFS.filter((pageDef) => !existingSlugs.has(pageDef.slug));
  if (!missing.length) {
    return;
  }

  for (const pageDef of missing) {
    try {
      await apiRequest('/api/pages', {
        method: 'POST',
        body: JSON.stringify({
          slug: pageDef.slug,
          title: pageDef.title,
          type: pageDef.type,
          content: null,
          is_visible: pageDef.is_visible,
          menu_order: pageDef.menu_order,
        }),
      });
    } catch (error) {
      if (!String(error.message || '').includes('Já existe')) {
        throw error;
      }
    }
  }
}

function renderEvents(events) {
  const tbody = document.getElementById('eventsTableBody');
  const emptyState = document.getElementById('emptyState');
  const tableContainer = document.getElementById('timelineTableContainer');
  const sortedEvents = getSortedEvents(events);

  updateTimelineSortButton();

  const totalEvents = document.getElementById('totalEvents');
  if (totalEvents) {
    totalEvents.textContent = `Total: ${events.length} eventos`;
  }

  if (!events.length) {
    tbody.innerHTML = '';
    tableContainer.style.display = 'none';
    emptyState.style.display = 'block';
    updateDashboardCards();
    return;
  }

  tableContainer.style.display = 'block';
  emptyState.style.display = 'none';

  tbody.innerHTML = sortedEvents
    .map(
      (event) => `
      <tr>
        <td class="event-date">${sanitize(formatTimelineDisplayDate(event.date))}</td>
        <td class="event-title">${sanitize(event.title)}</td>
        <td>
          ${event.image_path
            ? `<img class="event-image-thumb" src="${sanitize(resolveAssetUrl(event.image_path))}" alt="${sanitize(event.title)}" />`
            : '<span class="no-image">Sem imagem</span>'}
        </td>
        <td class="event-legend">${sanitize(event.source || '')}</td>
        <td>
          <div class="table-actions">
            <button class="btn-secondary btn-small" data-action="edit" data-id="${event.id}">Editar</button>
            <button class="btn-danger btn-small" data-action="delete" data-id="${event.id}">Excluir</button>
          </div>
        </td>
      </tr>
    `
    )
    .join('');

  updateDashboardCards();
}

function toggleTimelineDateSort() {
  state.timelineDateSortDirection = state.timelineDateSortDirection === 'asc' ? 'desc' : 'asc';
  renderEvents(state.events);
}

function fillEventForm(event = null) {
  document.getElementById('modalTitle').textContent = event ? 'Editar Evento' : 'Adicionar Evento';
  document.getElementById('eventDate').value = normalizeDateForInput(event?.date || '');
  document.getElementById('eventTitle').value = event?.title || '';
  document.getElementById('eventImage').value = event?.image_path || '';
  document.getElementById('eventLegend').value = event?.source || '';
  document.getElementById('eventText').value = event?.description || '';
  updateImagePreviewFromPath(event?.image_path || '');
  captureEventFormInitialState();
}

function openCreateModal() {
  state.currentEditId = null;
  fillEventForm();
  showModal('eventModal');
}

function openEditModal(id) {
  const event = state.events.find((item) => item.id === id);
  if (!event) return;
  state.currentEditId = id;
  fillEventForm(event);
  showModal('eventModal');
}

function openDeleteModal(id) {
  const event = state.events.find((item) => item.id === id);
  if (!event) return;
  state.deleteId = id;
  document.getElementById('deleteEventTitle').textContent = event.title;
  showModal('deleteModal');
}

async function saveEventFromForm(event) {
  event.preventDefault();

  const imagePath = document.getElementById('eventImage').value.trim();
  const normalizedDate = normalizeTimelineDate(document.getElementById('eventDate').value);

  const payload = {
    page_id: state.timelinePageId,
    date: normalizedDate,
    title: document.getElementById('eventTitle').value.trim(),
    image_path: null,
    source: document.getElementById('eventLegend').value.trim() || null,
    description: document.getElementById('eventText').value.trim() || null,
  };

  if (!payload.title) {
    showToast('Data e título são obrigatórios.', 'error');
    return;
  }

  if (!payload.date) {
    showToast('Data inválida. Use AAAA, AAAA-MM ou AAAA-MM-DD.', 'error');
    return;
  }

  try {
    payload.image_path = imagePath || null;
    setSyncStatus('syncing', '⟳ Salvando...');
    if (state.currentEditId) {
      await apiRequest(`/api/timeline/${state.currentEditId}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      showToast('Evento atualizado com sucesso.', 'success');
    } else {
      payload.order_index = state.events.length;
      await apiRequest('/api/timeline', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      showToast('Evento criado com sucesso.', 'success');
    }

    hideModal('eventModal');
    state.eventFormInitialState = null;
    await loadEvents();
  } catch (error) {
    setSyncStatus('error', '⚠ Erro ao salvar');
    showToast(error.message, 'error');
  }
}

async function confirmDelete() {
  if (!state.deleteId) return;

  try {
    setSyncStatus('syncing', '⟳ Excluindo...');
    await apiRequest(`/api/timeline/${state.deleteId}`, { method: 'DELETE' });
    hideModal('deleteModal');
    state.deleteId = null;
    showToast('Evento excluído com sucesso.', 'success');
    await loadEvents();
  } catch (error) {
    setSyncStatus('error', '⚠ Erro ao excluir');
    showToast(error.message, 'error');
  }
}

// ============= MEDIA MANAGER FUNCTIONS =============

async function loadMedia() {
  const folder = document.getElementById('mediaFolderFilter')?.value || '';
  
  try {
    setSyncStatus('syncing', '⟳ Carregando mídia...');
    const url = folder ? `/api/media/public-list?folder=${encodeURIComponent(folder)}` : '/api/media/public-list';
    const items = await apiRequest(url);
    state.mediaFiles = items || [];
    
    updateDashboardCards();
    renderMediaTable();
    renderMediaGrid();
    
    const emptyState = document.getElementById('emptyMediaState');
    if (emptyState) {
      emptyState.style.display = state.mediaFiles.length === 0 ? 'block' : 'none';
    }
    
    setSyncStatus('synced', '✓ Mídia carregada');
  } catch (error) {
    setSyncStatus('error', '⚠ Erro ao carregar mídia');
    showToast(error.message, 'error');
  }
}

function renderMediaTable() {
  const tbody = document.getElementById('mediaTableBody');
  if (!tbody) {
    return;
  }

  const rows = (state.mediaFiles || []).map((item) => {
    const filePath = sanitize(item.file_path || '');
    const imageUrl = `${APP_BASE_PATH}/media/serve/${filePath}`;
    const filename = sanitize(item.filename || 'Sem nome');
    const folder = sanitize(item.folder || 'uploads');
    const fileSize = formatFileSize(item.file_size || 0);
    const createdDate = item.created_at ? new Date(item.created_at).toLocaleDateString('pt-BR') : '-';

    return `
      <tr data-media-id="${item.id}">
        <td>
          <img class="media-thumb" src="${imageUrl}" alt="${filename}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22><rect fill=%22%23ccc%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2250%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22>Erro</text></svg>'">
        </td>
        <td><code>${filename}</code></td>
        <td>${folder}</td>
        <td>${fileSize}</td>
        <td>${createdDate}</td>
        <td>
          <div class="table-actions">
            <button class="btn-secondary btn-small" data-media-action="edit" data-media-id="${item.id}">✎ Editar</button>
            <button class="btn-danger btn-small" data-media-action="delete" data-media-id="${item.id}">🗑 Deletar</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  tbody.innerHTML = rows || '<tr><td colspan="6">Nenhuma mídia encontrada</td></tr>';
}

function renderMediaGrid() {
  const container = document.getElementById('mediaGridContainer');
  if (!container) {
    return;
  }

  const items = (state.mediaFiles || []).map((item) => {
    const filePath = sanitize(item.file_path || '');
    const imageUrl = `${APP_BASE_PATH}/media/serve/${filePath}`;
    const filename = sanitize(item.filename || 'Sem nome');
    const folder = sanitize(item.folder || 'uploads');

    return `
      <div class="media-grid-item" data-media-id="${item.id}">
        <div class="media-grid-image">
          <img src="${imageUrl}" alt="${filename}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22><rect fill=%22%23e0e0e0%22 width=%22200%22 height=%22200%22/><text x=%22100%22 y=%22100%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22>Erro ao carregar</text></svg>'">
        </div>
        <div class="media-grid-info">
          <div class="media-grid-name" title="${filename}">${filename}</div>
          <div class="media-grid-folder">${folder}</div>
          <div class="media-grid-actions">
            <button class="btn-secondary btn-small" data-media-action="edit" data-media-id="${item.id}">✎</button>
            <button class="btn-danger btn-small" data-media-action="delete" data-media-id="${item.id}">🗑</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = items || '<p style="grid-column: 1/-1; text-align: center; color: #999;">Nenhuma mídia encontrada</p>';
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function toggleMediaView() {
  const listView = document.getElementById('mediaListView');
  const gridView = document.getElementById('mediaGridView');
  const toggleBtn = document.getElementById('toggleMediaViewBtn');
  
  if (!listView || !gridView || !toggleBtn) return;

  const isCurrentlyGrid = gridView.style.display !== 'none';
  
  if (isCurrentlyGrid) {
    // Switch to list
    listView.style.display = 'block';
    gridView.style.display = 'none';
    toggleBtn.textContent = 'Grid';
    toggleBtn.dataset.view = 'grid';
  } else {
    // Switch to grid
    listView.style.display = 'none';
    gridView.style.display = 'block';
    toggleBtn.textContent = 'Lista';
    toggleBtn.dataset.view = 'list';
  }
}

function uploadMediaFile() {
  const fileInput = document.getElementById('mediaFileInput');
  if (fileInput) {
    fileInput.click();
  }
}

async function handleMediaFileSelection(file) {
  if (!file) return;

  if (file.size > MAX_MEDIA_UPLOAD_BYTES) {
    const fileSize = formatFileSize(file.size);
    showToast(
      `Arquivo muito grande (${fileSize}). O limite para upload é ${MAX_MEDIA_UPLOAD_MB} MB.`,
      'error'
    );
    document.getElementById('mediaFileInput').value = '';
    return;
  }

  const folder = document.getElementById('mediaFolderFilter')?.value || 'uploads';
  if (!['timeline', 'trabalhos', 'territorio', 'campus'].includes(folder)) {
    showToast('Selecione uma pasta válida antes de fazer upload.', 'error');
    document.getElementById('mediaFileInput').value = '';
    return;
  }

  try {
    setSyncStatus('syncing', '📤 Enviando arquivo...');
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const result = await apiRequest('/api/media', {
      method: 'POST',
      body: formData,
    });

    showToast(`Arquivo "${file.name}" enviado com sucesso.`, 'success');
    document.getElementById('mediaFileInput').value = '';
    await loadMedia();
  } catch (error) {
    setSyncStatus('error', '⚠ Erro ao enviar arquivo');

    if (error.status === 413) {
      const fileSize = formatFileSize(file.size);
      showToast(
        `Upload recusado: o arquivo "${file.name}" (${fileSize}) excede o limite de ${MAX_MEDIA_UPLOAD_MB} MB.`,
        'error'
      );
      return;
    }

    showToast(error.message || 'Não foi possível enviar o arquivo.', 'error');
  }
}

function openMediaEditModal(mediaId) {
  const media = state.mediaFiles.find(item => item.id === mediaId);
  if (!media) return;

  state.currentEditMediaId = mediaId;

  const preview = document.getElementById('mediaEditPreview');
  const altTextInput = document.getElementById('mediaEditAltText');
  const descriptionInput = document.getElementById('mediaEditDescription');
  const infoDiv = document.getElementById('mediaEditInfo');

  if (preview) {
    preview.src = `${APP_BASE_PATH}/media/serve/${sanitize(media.file_path)}`;
    preview.alt = media.alt_text || media.filename;
  }

  if (altTextInput) altTextInput.value = media.alt_text || '';
  if (descriptionInput) descriptionInput.value = media.description || '';

  if (infoDiv) {
    const fileSize = formatFileSize(media.file_size || 0);
    const createdDate = media.created_at ? new Date(media.created_at).toLocaleDateString('pt-BR') : '-';
    infoDiv.innerHTML = `
      <div class="info-row">
        <strong>Nome:</strong> <code>${sanitize(media.filename)}</code>
      </div>
      <div class="info-row">
        <strong>Pasta:</strong> ${sanitize(media.folder)}
      </div>
      <div class="info-row">
        <strong>Tamanho:</strong> ${fileSize}
      </div>
      <div class="info-row">
        <strong>Caminho:</strong> <code>${sanitize(media.file_path)}</code>
      </div>
      <div class="info-row">
        <strong>Data de upload:</strong> ${createdDate}
      </div>
    `;
  }

  showModal('mediaEditModal');
}

async function saveMediaEdit() {
  if (!state.currentEditMediaId) return;

  const altText = document.getElementById('mediaEditAltText')?.value || '';
  const description = document.getElementById('mediaEditDescription')?.value || '';

  try {
    setSyncStatus('syncing', '⟳ Salvando metadados...');
    
    await apiRequest(`/api/media/${state.currentEditMediaId}`, {
      method: 'PUT',
      body: JSON.stringify({
        alt_text: altText.trim() || null,
        description: description.trim() || null,
      }),
    });

    hideModal('mediaEditModal');
    state.currentEditMediaId = null;
    showToast('Metadados atualizados com sucesso.', 'success');
    await loadMedia();
  } catch (error) {
    setSyncStatus('error', '⚠ Erro ao salvar');
    showToast(error.message, 'error');
  }
}

function openDeleteMediaModal(mediaId) {
  const media = state.mediaFiles.find(item => item.id === mediaId);
  if (!media) return;

  state.deleteMediaId = mediaId;
  const filename = document.getElementById('deleteMediaFilename');
  if (filename) {
    filename.textContent = media.filename;
  }

  showModal('deleteMediaConfirmModal');
}

async function confirmDeleteMedia() {
  if (!state.deleteMediaId) return;

  try {
    setSyncStatus('syncing', '⟳ Deletando arquivo...');
    
    await apiRequest(`/api/media/${state.deleteMediaId}`, {
      method: 'DELETE',
    });

    hideModal('deleteMediaConfirmModal');
    state.deleteMediaId = null;
    showToast('Arquivo deletado com sucesso.', 'success');
    await loadMedia();
  } catch (error) {
    setSyncStatus('error', '⚠ Erro ao deletar');
    showToast(error.message, 'error');
  }
}

function attachMediaEventListeners() {
  const toggleBtn = document.getElementById('toggleMediaViewBtn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', toggleMediaView);
  }

  const uploadBtn = document.getElementById('uploadMediaBtn');
  if (uploadBtn) {
    uploadBtn.addEventListener('click', uploadMediaFile);
  }

  const fileInput = document.getElementById('mediaFileInput');
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (file) {
        handleMediaFileSelection(file);
      }
    });
  }

  const folderFilter = document.getElementById('mediaFolderFilter');
  if (folderFilter) {
    folderFilter.addEventListener('change', loadMedia);
  }

  const mediaTableBody = document.getElementById('mediaTableBody');
  if (mediaTableBody) {
    mediaTableBody.addEventListener('click', (event) => {
      const editBtn = event.target.closest('button[data-media-action="edit"]');
      const deleteBtn = event.target.closest('button[data-media-action="delete"]');

      if (editBtn) {
        const mediaId = Number(editBtn.dataset.mediaId);
        openMediaEditModal(mediaId);
      } else if (deleteBtn) {
        const mediaId = Number(deleteBtn.dataset.mediaId);
        openDeleteMediaModal(mediaId);
      }
    });
  }

  const mediaGridContainer = document.getElementById('mediaGridContainer');
  if (mediaGridContainer) {
    mediaGridContainer.addEventListener('click', (event) => {
      const editBtn = event.target.closest('button[data-media-action="edit"]');
      const deleteBtn = event.target.closest('button[data-media-action="delete"]');

      if (editBtn) {
        const mediaId = Number(editBtn.dataset.mediaId);
        openMediaEditModal(mediaId);
      } else if (deleteBtn) {
        const mediaId = Number(deleteBtn.dataset.mediaId);
        openDeleteMediaModal(mediaId);
      }
    });
  }

  const closeMediaEditBtn = document.getElementById('closeMediaEditBtn');
  if (closeMediaEditBtn) {
    closeMediaEditBtn.addEventListener('click', () => {
      state.currentEditMediaId = null;
      hideModal('mediaEditModal');
    });
  }

  const cancelMediaEditBtn = document.getElementById('cancelMediaEditBtn');
  if (cancelMediaEditBtn) {
    cancelMediaEditBtn.addEventListener('click', () => {
      state.currentEditMediaId = null;
      hideModal('mediaEditModal');
    });
  }

  const saveMediaEditBtn = document.getElementById('saveMediaEditBtn');
  if (saveMediaEditBtn) {
    saveMediaEditBtn.addEventListener('click', saveMediaEdit);
  }

  const deleteMediaBtn = document.getElementById('deleteMediaBtn');
  if (deleteMediaBtn) {
    deleteMediaBtn.addEventListener('click', () => {
      hideModal('mediaEditModal');
      if (state.currentEditMediaId) {
        openDeleteMediaModal(state.currentEditMediaId);
      }
    });
  }

  const cancelDeleteMediaBtn = document.getElementById('cancelDeleteMediaBtn');
  if (cancelDeleteMediaBtn) {
    cancelDeleteMediaBtn.addEventListener('click', () => {
      state.deleteMediaId = null;
      hideModal('deleteMediaConfirmModal');
    });
  }

  const confirmDeleteMediaBtn = document.getElementById('confirmDeleteMediaBtn');
  if (confirmDeleteMediaBtn) {
    confirmDeleteMediaBtn.addEventListener('click', confirmDeleteMedia);
  }
}

function attachEventListeners() {
  document.getElementById('loginBtn').addEventListener('click', async () => {
    const username = 'admin';
    const password = document.getElementById('passwordInput').value;
    const errorEl = document.getElementById('loginError');

    try {
      await login(username, password);
      document.getElementById('passwordInput').value = '';
      errorEl.textContent = '';
      hideModal('loginModal');
      document.getElementById('adminInterface').style.display = 'block';
      setLoading(true);
      await loadAdminData();
      setLoading(false);
    } catch (error) {
      errorEl.textContent = error.message;
    }
  });

  document.getElementById('passwordInput').addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      document.getElementById('loginBtn').click();
    }
  });

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await logout();
  });

  document.querySelectorAll('[data-dashboard-target]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.dashboardTarget;
      if (target) setActivePanel(target);
    });
  });

  document.getElementById('refreshBtn').addEventListener('click', async () => {
    setLoading(true);
    await loadAdminData();
    setLoading(false);
  });

  const timelineDateSortBtn = document.getElementById('timelineDateSortBtn');
  if (timelineDateSortBtn) {
    timelineDateSortBtn.addEventListener('click', toggleTimelineDateSort);
  }

  document.getElementById('addMenuItemBtn').addEventListener('click', addMenuItem);
  document.getElementById('saveMenuBtn').addEventListener('click', saveMenu);
  document.getElementById('savePageContentBtn').addEventListener('click', saveSelectedPageContent);
  document.getElementById('cancelPageContentBtn').addEventListener('click', () => {
    closePageContentEditor();
    showUnifiedPagesTable();
  });
  document.getElementById('cancelCardsEditorBtn').addEventListener('click', () => {
    state.currentCardsPageId = null;
    showUnifiedPagesTable();
  });
  document.getElementById('addCardBtn').addEventListener('click', openCreateCardModal);
  document.getElementById('closeCardModalBtn').addEventListener('click', () => hideModal('cardModal'));
  document.getElementById('cancelCardBtn').addEventListener('click', () => hideModal('cardModal'));
  document.getElementById('cardForm').addEventListener('submit', saveCardFromForm);
  document.getElementById('selectCardMediaBtn').addEventListener('click', (event) => {
    event.preventDefault();
    openImagePickerForCard();
  });
  document.getElementById('removeCardImageBtn').addEventListener('click', () => {
    document.getElementById('cardImage').value = '';
    updateCardImagePreview('');
  });
  document.getElementById('cardImage').addEventListener('input', (event) => {
    updateCardImagePreview(event.target.value);
  });
  document.getElementById('cancelDeleteCardBtn').addEventListener('click', () => {
    state.deleteCardId = null;
    hideModal('deleteCardModal');
  });
  document.getElementById('confirmDeleteCardBtn').addEventListener('click', confirmDeleteCard);
  document.getElementById('changePasswordBtn').addEventListener('click', async () => {
    const currentInput = document.getElementById('currentPasswordInput');
    const newInput = document.getElementById('newPasswordInput');
    const currentPassword = currentInput.value;
    const newPassword = newInput.value;

    if (!currentPassword || !newPassword) {
      showToast('Preencha senha atual e nova senha.', 'error');
      return;
    }
    if (newPassword.length < 8) {
      showToast('A nova senha deve ter pelo menos 8 caracteres.', 'error');
      return;
    }

    try {
      setSyncStatus('syncing', '⟳ Alterando senha...');
      const result = await changePassword(currentPassword, newPassword);
      currentInput.value = '';
      newInput.value = '';
      setSyncStatus('synced', '✓ Senha alterada');
      showToast(result?.message || 'Senha alterada com sucesso.', 'success');
    } catch (error) {
      setSyncStatus('error', '⚠ Erro ao alterar senha');
      showToast(error.message, 'error');
    }
  });
  document.getElementById('menuTableBody').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-menu-action]');
    if (!button) return;

    syncMenuItemsFromTable();

    const row = button.closest('tr');
    const index = Number(row?.dataset.index);
    const action = button.dataset.menuAction;

    if (action === 'up') {
      moveMenuItem(index, 'up');
    } else if (action === 'down') {
      moveMenuItem(index, 'down');
    } else if (action === 'remove') {
      removeMenuItem(index);
    }
  });

  document.getElementById('menuTableBody').addEventListener('change', (event) => {
    const target = event.target;
    if (!target.classList.contains('menu-page-id')) return;

    const pageId = target.value;
    const row = target.closest('tr');
    if (!row) return;

    if (!pageId) return;

    const page = getPageById(pageId);
    if (!page) return;

    const labelInput = row.querySelector('.menu-label');
    const urlInput = row.querySelector('.menu-url');

    if (!labelInput.value.trim()) {
      labelInput.value = page.title;
    }
    if (!urlInput.value.trim()) {
      urlInput.value = `/${page.slug}`;
    }
  });

  document.getElementById('addNewBtn').addEventListener('click', openCreateModal);
  document.getElementById('closeModalBtn').addEventListener('click', closeEventModalSafely);
  document.getElementById('cancelBtn').addEventListener('click', closeEventModalSafely);
  document.getElementById('eventForm').addEventListener('submit', saveEventFromForm);
  document.getElementById('removeImageBtn').addEventListener('click', () => {
    document.getElementById('eventImage').value = '';
    updateImagePreviewFromPath('');
  });

  document.getElementById('selectMediaBtn').addEventListener('click', (e) => {
    e.preventDefault();
    openImagePickerForEvent();
  });

  document.getElementById('eventImage').addEventListener('input', (event) => {
    updateImagePreviewFromPath(event.target.value);
  });

  document.getElementById('eventModal').addEventListener('click', (event) => {
    if (event.target.id === 'eventModal') {
      closeEventModalSafely();
    }
  });

  document.getElementById('cardModal').addEventListener('click', (event) => {
    if (event.target.id === 'cardModal') {
      hideModal('cardModal');
    }
  });

  document.getElementById('deleteModal').addEventListener('click', (event) => {
    if (event.target.id === 'deleteModal') {
      state.deleteId = null;
      hideModal('deleteModal');
    }
  });

  document.getElementById('deleteCardModal').addEventListener('click', (event) => {
    if (event.target.id === 'deleteCardModal') {
      state.deleteCardId = null;
      hideModal('deleteCardModal');
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') {
      return;
    }

    const eventModal = document.getElementById('eventModal');
    const cardModal = document.getElementById('cardModal');
    const deleteModal = document.getElementById('deleteModal');
    const deleteCardModal = document.getElementById('deleteCardModal');

    if (eventModal.classList.contains('show')) {
      closeEventModalSafely();
      return;
    }

    if (cardModal.classList.contains('show')) {
      hideModal('cardModal');
      return;
    }

    if (deleteModal.classList.contains('show')) {
      state.deleteId = null;
      hideModal('deleteModal');
      return;
    }

    if (deleteCardModal.classList.contains('show')) {
      state.deleteCardId = null;
      hideModal('deleteCardModal');
      return;
    }
  });

  document.getElementById('cancelDeleteBtn').addEventListener('click', () => {
    state.deleteId = null;
    hideModal('deleteModal');
  });
  document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);

  document.getElementById('eventsTableBody').addEventListener('click', (event) => {
    const target = event.target;
    if (!target.dataset.id) return;

    const id = Number(target.dataset.id);
    if (target.dataset.action === 'edit') {
      openEditModal(id);
    }
    if (target.dataset.action === 'delete') {
      openDeleteModal(id);
    }
  });

  document.getElementById('cardsTableBody').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-card-action]');
    if (!button) return;

    const cardId = Number(button.dataset.cardId);
    if (!cardId) return;

    if (button.dataset.cardAction === 'edit') {
      openEditCardModal(cardId);
    }
    if (button.dataset.cardAction === 'delete') {
      openDeleteCardModal(cardId);
    }
  });

  document.getElementById('pageManagerTableBody').addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-page-action="edit"]');
    if (!button) return;

    const pageId = Number(button.dataset.pageId);
    const pageType = button.dataset.pageType;
    if (!pageId) return;
    await openPageEditor(pageId, pageType);
  });
}

async function bootstrap() {
  initPanelNavigation();
  setActivePanel('dashboard');
  attachEventListeners();
  attachImagePickerListeners();

  const authenticated = await checkSession();
  if (authenticated) {
    document.getElementById('adminInterface').style.display = 'block';
    setLoading(true);
    try {
      await loadAdminData();
    } finally {
      setLoading(false);
    }
  } else {
    showModal('loginModal');
  }
}

// ============= IMAGE PICKER MODAL FUNCTIONS =============

let selectedImageForEditor = null;

async function loadImagesForPicker() {
  const folder = document.getElementById('imagePickerFolderFilter')?.value || '';
  const grid = document.getElementById('imagePickerGrid');

  if (!grid) return;

  try {
    grid.innerHTML = '<div class="loading">Carregando imagens...</div>';

    const url = folder 
      ? `/api/media/list-for-editor?folder=${encodeURIComponent(folder)}`
      : '/api/media/list-for-editor';

    const images = await apiRequest(url);

    if (!images || images.length === 0) {
      grid.innerHTML = `
        <div class="loading" style="grid-column: 1 / -1; color: #999;">
          Nenhuma imagem encontrada nesta pasta
        </div>
      `;
      return;
    }

    grid.innerHTML = images
      .map((img) => {
        const editorInsertUrl = img.url || '';
        const previewUrl = resolveAssetUrl(editorInsertUrl);
        const storedPath = editorInsertUrl.replace(/^\//, '');

        return `
        <div class="image-picker-item"
          data-image-id="${img.id}"
          data-image-url="${sanitize(previewUrl)}"
          data-image-insert-url="${sanitize(editorInsertUrl)}"
          data-image-path="${sanitize(storedPath)}"
          data-image-folder="${sanitize(img.folder || '')}"
          data-image-description="${sanitize(img.description || '')}"
          data-image-alt="${sanitize(img.alt_text || '')}"
          data-image-size="${sanitize(String(img.size || 0))}">
          <img src="${sanitize(previewUrl)}" alt="${sanitize(img.filename)}" loading="lazy">
          <div class="image-picker-item-check">✓</div>
          <div class="image-picker-item-name">${sanitize(img.filename)}</div>
        </div>
      `;
      })
      .join('');

    // Attach click listeners to image items
    grid.querySelectorAll('.image-picker-item').forEach((item) => {
      item.addEventListener('click', () => selectImageForEditor(item));
    });
  } catch (error) {
    grid.innerHTML = `<div class="loading" style="grid-column: 1 / -1; color: #e74c3c;">Erro ao carregar imagens: ${error.message}</div>`;
  }
}

function selectImageForEditor(element) {
  const grid = document.getElementById('imagePickerGrid');
  
  // Remove previous selection
  grid?.querySelectorAll('.image-picker-item.selected').forEach((item) => {
    item.classList.remove('selected');
  });

  // Add selection to clicked item
  element.classList.add('selected');

  // Store selected image data
  selectedImageForEditor = {
    id: Number(element.dataset.imageId),
    url: element.dataset.imageUrl,
    insertUrl: element.dataset.imageInsertUrl || element.dataset.imageUrl,
    filename: element.querySelector('.image-picker-item-name')?.textContent || 'Imagem',
    path: element.dataset.imagePath || element.dataset.imageUrl,
    folder: element.dataset.imageFolder || '',
    description: element.dataset.imageDescription || '',
    altText: element.dataset.imageAlt || '',
    size: Number(element.dataset.imageSize || 0),
  };

  // Update preview section
  updateImagePickerPreview();

  // Enable insert button
  const insertBtn = document.getElementById('imagePickerInsertBtn');
  if (insertBtn) {
    insertBtn.disabled = false;
  }
}

function updateImagePickerPreview() {
  const previewImg = document.getElementById('imagePickerPreviewImg');
  const noPreview = document.getElementById('imagePickerNoPreview');
  const infoDiv = document.getElementById('imagePickerPreviewInfo');
  const insertBtn = document.getElementById('imagePickerInsertBtn');
  const uploadHint = document.getElementById('imagePickerUploadHint');

  if (insertBtn) {
    insertBtn.disabled = !selectedImageForEditor;
  }

  if (uploadHint) {
    uploadHint.textContent = selectedImageForEditor
      ? 'Imagem pronta para uso. Clique na ação final para aplicar.'
      : 'Envie ou selecione uma imagem para habilitar a ação final.';
  }

  if (!selectedImageForEditor) {
    if (previewImg) previewImg.style.display = 'none';
    if (noPreview) noPreview.style.display = 'block';
    if (infoDiv) infoDiv.style.display = 'none';
    return;
  }

  if (previewImg) {
    previewImg.src = selectedImageForEditor.url;
    previewImg.style.display = 'block';
  }

  if (noPreview) {
    noPreview.style.display = 'none';
  }

  if (infoDiv) {
    infoDiv.innerHTML = `
      <p><strong>Nome:</strong> <span>${sanitize(selectedImageForEditor.filename)}</span></p>
      <p><strong>Pasta:</strong> <span>${sanitize(selectedImageForEditor.folder || document.getElementById('imagePickerFolderFilter')?.value || 'Todas')}</span></p>
      <p><strong>Tamanho:</strong> <span>${sanitize(formatFileSize(selectedImageForEditor.size || 0))}</span></p>
      <p><strong>Descrição:</strong> <span>${sanitize(selectedImageForEditor.description || '—')}</span></p>
      <p><strong>URL:</strong> <span>${sanitize(selectedImageForEditor.url)}</span></p>
    `;
    infoDiv.style.display = 'block';
  }
}

function getDefaultImagePickerFolder(context = 'editor') {
  if (context === 'event') {
    return 'timeline';
  }

  if (context === 'card') {
    const cardPage = state.pages.find((page) => Number(page.id) === Number(state.currentCardsPageId));
    const cardSlug = (cardPage?.slug || '').trim().toLowerCase();
    return CARD_PAGE_SLUGS.includes(cardSlug) ? cardSlug : '';
  }

  const currentPage = state.pages.find((page) => Number(page.id) === Number(state.currentPageEditId));
  const slug = (currentPage?.slug || '').trim().toLowerCase();

  if (['campus', 'territorio', 'timeline', 'trabalhos'].includes(slug)) {
    return slug;
  }

  return '';
}

function openImagePickerModal(context = 'editor') {
  state.imagePickerContext = context;
  const title = document.getElementById('imagePickerModalTitle');
  const insertBtn = document.getElementById('imagePickerInsertBtn');
  const folderFilter = document.getElementById('imagePickerFolderFilter');
  const searchInput = document.getElementById('imagePickerSearch');
  if (title) {
    if (context === 'event') {
      title.textContent = 'Selecionar Imagem para Evento';
    } else if (context === 'card') {
      title.textContent = 'Selecionar Imagem para Card';
    } else {
      title.textContent = 'Inserir Imagem no Editor';
    }
  }

  if (insertBtn) {
    insertBtn.textContent = context === 'event'
      ? '✓ Usar no Evento'
      : context === 'card'
        ? '✓ Usar no Card'
        : '✓ Inserir Imagem';
    insertBtn.disabled = true;
  }

  const defaultFolder = getDefaultImagePickerFolder(context);
  if (folderFilter) folderFilter.value = defaultFolder;
  if (searchInput) searchInput.value = '';

  // Pre-set upload folder to match context
  const pickerUploadFolder = document.getElementById('pickerUploadFolder');
  if (pickerUploadFolder) pickerUploadFolder.value = defaultFolder || 'timeline';

  // Reset upload tab state
  clearPickerUpload();

  selectedImageForEditor = null;
  updateImagePickerPreview();
  showModal('imagePickerModal');
  
  // Reset to select tab
  setImagePickerTab('select');
  
  // Load images
  loadImagesForPicker();
}

function closeImagePickerModal() {
  hideModal('imagePickerModal');
  selectedImageForEditor = null;
  state.imagePickerContext = null;
  updateImagePickerPreview();
}

// ============= IMAGE PICKER — UPLOAD TAB =============

let pickerSelectedFile = null;

function handlePickerFileSelected(file) {
  pickerSelectedFile = file;
  const preview = document.getElementById('pickerUploadPreview');
  const previewImg = document.getElementById('pickerUploadPreviewImg');
  const fileNameEl = document.getElementById('pickerUploadFileName');
  const prompt = document.getElementById('pickerDropzonePrompt');
  const uploadBtn = document.getElementById('pickerUploadBtn');
  const clearBtn = document.getElementById('pickerClearBtn');

  if (preview && previewImg && fileNameEl) {
    const reader = new FileReader();
    reader.onload = (e) => {
      previewImg.src = e.target.result;
      fileNameEl.textContent = file.name;
      preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
  }

  if (prompt) prompt.style.display = 'none';
  if (uploadBtn) uploadBtn.disabled = false;
  if (clearBtn) clearBtn.style.display = '';
}

function clearPickerUpload() {
  pickerSelectedFile = null;
  const preview = document.getElementById('pickerUploadPreview');
  const fileInput = document.getElementById('pickerFileInput');
  const prompt = document.getElementById('pickerDropzonePrompt');
  const uploadBtn = document.getElementById('pickerUploadBtn');
  const clearBtn = document.getElementById('pickerClearBtn');
  const progress = document.getElementById('pickerUploadProgress');
  const progressFill = document.getElementById('pickerProgressFill');

  if (preview) preview.style.display = 'none';
  if (fileInput) fileInput.value = '';
  if (prompt) prompt.style.display = 'block';
  if (uploadBtn) uploadBtn.disabled = true;
  if (clearBtn) clearBtn.style.display = 'none';
  if (progress) progress.style.display = 'none';
  if (progressFill) {
    progressFill.style.width = '0%';
    progressFill.style.background = '';
  }

  if (!selectedImageForEditor) {
    updateImagePickerPreview();
  }
}

async function uploadImageFromPicker() {
  if (!pickerSelectedFile) return;

  const folder = document.getElementById('pickerUploadFolder')?.value || 'timeline';
  const uploadBtn = document.getElementById('pickerUploadBtn');
  const clearBtn = document.getElementById('pickerClearBtn');
  const progress = document.getElementById('pickerUploadProgress');
  const progressFill = document.getElementById('pickerProgressFill');
  const progressLabel = document.getElementById('pickerProgressLabel');

  if (uploadBtn) uploadBtn.disabled = true;
  if (clearBtn) clearBtn.style.display = 'none';
  if (progress) progress.style.display = 'block';
  if (progressFill) progressFill.style.width = '30%';
  if (progressLabel) progressLabel.textContent = 'Enviando...';

  try {
    const formData = new FormData();
    formData.append('file', pickerSelectedFile);
    formData.append('folder', folder);

    if (progressFill) progressFill.style.width = '60%';

    const response = await fetch(`${APP_BASE_PATH}/api/media`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (progressFill) progressFill.style.width = '90%';

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Erro ${response.status}`);
    }

    const result = await response.json();
    if (progressFill) progressFill.style.width = '100%';
    if (progressLabel) progressLabel.textContent = 'Upload concluído!';

    // Build selectedImageForEditor from returned media record
    const servePath = `/media/serve/${result.file_path}`;
    selectedImageForEditor = {
      id: result.id,
      url: resolveAssetUrl(servePath),
      insertUrl: servePath,
      filename: result.filename,
      path: `media/serve/${result.file_path}`,
      folder: result.folder,
      description: result.description || '',
      altText: result.alt_text || '',
      size: result.file_size || 0,
    };

    updateImagePickerPreview();

    const insertBtn = document.getElementById('imagePickerInsertBtn');
    if (insertBtn) insertBtn.disabled = false;

    showToast(`Upload concluído: ${result.filename}`, 'success');

    // Switch to select tab and reload so the new image appears
    const folderFilter = document.getElementById('imagePickerFolderFilter');
    if (folderFilter) folderFilter.value = result.folder;
    setImagePickerTab('select');
    loadImagesForPicker();

    setTimeout(clearPickerUpload, 300);
  } catch (error) {
    if (progressLabel) progressLabel.textContent = `Erro: ${error.message}`;
    if (progressFill) {
      progressFill.style.width = '100%';
      progressFill.style.background = '#e74c3c';
    }
    if (uploadBtn) uploadBtn.disabled = false;
    if (clearBtn) clearBtn.style.display = '';
    showToast(`Erro no upload: ${error.message}`, 'error');
  }
}



function setImagePickerTab(tabName) {
  const tabs = document.querySelectorAll('.image-picker-tab-content');
  const tabButtons = document.querySelectorAll('.image-picker-tab');

  tabs.forEach((tab) => {
    const isActive = tab.id === `imagePicker${tabName.charAt(0).toUpperCase() + tabName.slice(1)}Tab`;
    tab.classList.toggle('active', isActive);
    tab.style.display = isActive ? 'block' : 'none';
  });

  tabButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
}

function insertSelectedImage() {
  if (!selectedImageForEditor) return;

  const context = state.imagePickerContext || 'editor';

  if (context === 'event') {
    const eventImageField = document.getElementById('eventImage');
    if (eventImageField) {
      const imagePath = selectedImageForEditor.path || selectedImageForEditor.filename;
      eventImageField.value = imagePath;
      updateImagePreviewFromPath(imagePath);
      showToast('Imagem selecionada para o evento.', 'success');
    }
  } else if (context === 'card') {
    const cardImageField = document.getElementById('cardImage');
    if (cardImageField) {
      const imagePath = selectedImageForEditor.path || selectedImageForEditor.filename;
      cardImageField.value = imagePath;
      updateCardImagePreview(imagePath);
      showToast('Imagem selecionada para o card.', 'success');
    }
  } else if (context === 'editor' && pageContentEditor) {
    pageContentEditor.focus();
    const editorImageUrl = selectedImageForEditor.url
      || resolveAssetUrl(selectedImageForEditor.insertUrl)
      || resolveAssetUrl(selectedImageForEditor.path);
    document.execCommand('insertImage', false, editorImageUrl);
    syncPageEditorTextarea();
    recordPageEditorHistory(getPageEditorContent());
    savePageEditorDraft();
    showToast('Imagem inserida no editor.', 'success');
  }

  closeImagePickerModal();
  selectedImageForEditor = null;
}

function openImagePickerForEvent() {
  openImagePickerModal('event');
}

function openImagePickerForCard() {
  openImagePickerModal('card');
}

function attachImagePickerListeners() {
  // Close buttons
  const closeBtn = document.getElementById('closeImagePickerBtn');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeImagePickerModal);
  }

  const cancelBtn = document.getElementById('imagePickerCancelBtn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', closeImagePickerModal);
  }

  // Tab buttons
  const tabButtons = document.querySelectorAll('.image-picker-tab');
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      setImagePickerTab(btn.dataset.tab);
    });
  });

  // Folder filter
  const folderFilter = document.getElementById('imagePickerFolderFilter');
  if (folderFilter) {
    folderFilter.addEventListener('change', loadImagesForPicker);
  }

  // Search input
  const searchInput = document.getElementById('imagePickerSearch');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.toLowerCase();
      const items = document.querySelectorAll('.image-picker-item');
      items.forEach((item) => {
        const name = item.querySelector('.image-picker-item-name')?.textContent.toLowerCase() || '';
        const description = (item.dataset.imageDescription || '').toLowerCase();
        const altText = (item.dataset.imageAlt || '').toLowerCase();
        const matches = !query || name.includes(query) || description.includes(query) || altText.includes(query);
        item.style.display = matches ? '' : 'none';
      });
    });
  }

  // Refresh button
  const refreshBtn = document.getElementById('imagePickerRefreshBtn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadImagesForPicker);
  }

  // Insert button
  const insertBtn = document.getElementById('imagePickerInsertBtn');
  if (insertBtn) {
    insertBtn.addEventListener('click', insertSelectedImage);
  }

  // Upload tab — browse button
  const pickerBrowseBtn = document.getElementById('pickerBrowseBtn');
  const pickerFileInput = document.getElementById('pickerFileInput');
  if (pickerBrowseBtn && pickerFileInput) {
    pickerBrowseBtn.addEventListener('click', () => pickerFileInput.click());
  }

  // Upload tab — file input change
  if (pickerFileInput) {
    pickerFileInput.addEventListener('change', () => {
      if (pickerFileInput.files.length > 0) {
        handlePickerFileSelected(pickerFileInput.files[0]);
      }
    });
  }

  // Upload tab — drop zone
  const pickerDropzone = document.getElementById('pickerDropzone');
  if (pickerDropzone) {
    pickerDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      pickerDropzone.classList.add('dragover');
    });
    pickerDropzone.addEventListener('dragleave', () => pickerDropzone.classList.remove('dragover'));
    pickerDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      pickerDropzone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) handlePickerFileSelected(file);
    });
    pickerDropzone.addEventListener('click', (e) => {
      // Only trigger if clicking the dropzone itself (not the browse button which handles its own click)
      if (e.target !== pickerDropzone && e.target.id !== 'pickerDropzonePrompt' && e.target.closest('#pickerBrowseBtn')) return;
      if (e.target.id !== 'pickerBrowseBtn' && !e.target.closest('#pickerBrowseBtn')) {
        pickerFileInput?.click();
      }
    });
  }

  // Upload tab — upload button
  const pickerUploadBtn = document.getElementById('pickerUploadBtn');
  if (pickerUploadBtn) {
    pickerUploadBtn.addEventListener('click', uploadImageFromPicker);
  }

  // Upload tab — clear button
  const pickerClearBtn = document.getElementById('pickerClearBtn');
  if (pickerClearBtn) {
    pickerClearBtn.addEventListener('click', clearPickerUpload);
  }

  // Modal backdrop click
  const modal = document.getElementById('imagePickerModal');
  if (modal) {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        closeImagePickerModal();
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', bootstrap);
