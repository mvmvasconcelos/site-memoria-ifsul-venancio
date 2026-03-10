const state = {
  timelinePageId: null,
  events: [],
  pages: [],
  menuItems: [],
  historyItems: [],
  mediaFiles: [],
  historyFilters: {
    entityType: '',
    action: '',
    limit: 100,
  },
  currentEditId: null,
  deleteId: null,
  currentEditMediaId: null,
  deleteMediaId: null,
  eventFormInitialState: null,
  activePanel: 'dashboard',
  currentPageEditId: null,
  imagePickerContext: null, // 'event' para formulário de eventos, 'editor' para editor de página
};

const MANAGED_PAGE_DEFS = [
  { slug: 'index', title: 'Início', type: 'page', menu_order: 0, is_visible: true },
  { slug: 'territorio', title: 'Transformações Territoriais', type: 'cards', menu_order: 2, is_visible: true },
  { slug: 'campus', title: 'Campus', type: 'cards', menu_order: 3, is_visible: true },
  { slug: 'contact', title: 'Contato', type: 'page', menu_order: 6, is_visible: true },
];

function getAppBasePath() {
  const path = window.location.pathname || '';
  console.log('[DEBUG] getAppBasePath() - window.location.pathname:', path);
  
  // Check if we're running under /memoria subpath
  if (path.startsWith('/memoria/')) {
    console.log('[DEBUG] getAppBasePath() - returning /memoria (from /memoria/ path)');
    return '/memoria';
  }
  if (path === '/memoria') {
    console.log('[DEBUG] getAppBasePath() - returning /memoria (exact match)');
    return '/memoria';
  }
  
  // If we're at root (nginx is stripping /memoria), return empty
  // because Flask is already at root in the container
  console.log('[DEBUG] getAppBasePath() - returning empty string (assuming nginx subpath)');
  return '';
}

const APP_BASE_PATH = getAppBasePath();
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
    hasSelectedFile: (document.getElementById('eventImageFile').files || []).length > 0,
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
  const timelineCount = document.getElementById('dashTimelineCount');
  const menuCount = document.getElementById('dashMenuCount');
  const mediaCount = document.getElementById('dashMediaCount');
  const historyCount = document.getElementById('dashHistoryCount');

  if (timelineCount) timelineCount.textContent = String(state.events.length || 0);
  if (menuCount) menuCount.textContent = String(state.menuItems.length || 0);
  if (mediaCount) mediaCount.textContent = String(state.mediaFiles.length || 0);
  if (historyCount) historyCount.textContent = String(state.historyItems.length || 0);
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
  sync.className = `sync-status ${status}`;
  sync.textContent = message;
}

function updateImagePreviewFromPath(imagePath) {
  const preview = document.getElementById('imagePreview');
  if (!preview) return;

  const path = (imagePath || '').trim();
  if (!path) {
    preview.classList.add('empty');
    preview.innerHTML = 'Nenhuma imagem selecionada';
    return;
  }

  preview.classList.remove('empty');
  const imageUrl = resolveAssetUrl(path);
  preview.innerHTML = `<img src="${sanitize(imageUrl)}" alt="Pré-visualização" />`;
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
    throw new Error(payload?.error || `Erro HTTP ${response.status}`);
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

async function loadHistory() {
  const params = new URLSearchParams();
  params.set('limit', String(state.historyFilters.limit || 100));
  if (state.historyFilters.entityType) {
    params.set('entity_type', state.historyFilters.entityType);
  }
  if (state.historyFilters.action) {
    params.set('action', state.historyFilters.action);
  }

  state.historyItems = await apiRequest(`/api/history?${params.toString()}`);
  renderHistoryTable();
}

function syncHistoryFiltersFromUI() {
  const entitySelect = document.getElementById('historyEntityFilter');
  const actionSelect = document.getElementById('historyActionFilter');
  const limitSelect = document.getElementById('historyLimitFilter');
  if (!entitySelect || !actionSelect || !limitSelect) return;

  state.historyFilters = {
    entityType: (entitySelect.value || '').trim(),
    action: (actionSelect.value || '').trim(),
    limit: Number(limitSelect.value) || 100,
  };
}

function formatHistoryTimestamp(isoValue) {
  if (!isoValue) return '-';
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return isoValue;
  return date.toLocaleString('pt-BR');
}

function renderHistoryTable() {
  const tbody = document.getElementById('historyTableBody');
  if (!tbody) return;

  if (!state.historyItems.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="no-image">Sem registros de histórico</td>
      </tr>
    `;
    updateDashboardCards();
    return;
  }

  tbody.innerHTML = state.historyItems
    .map(
      (item) => `
      <tr>
        <td>${sanitize(formatHistoryTimestamp(item.timestamp))}</td>
        <td>${sanitize(item.username || `user#${item.user_id}`)}</td>
        <td>${sanitize(item.entity_type || '-')}</td>
        <td>${sanitize(String(item.entity_id ?? '-'))}</td>
        <td>${sanitize(item.action || '-')}</td>
        <td>
          <button class="btn-secondary btn-small" data-history-action="restore" data-history-id="${item.id}">Restaurar</button>
        </td>
      </tr>
    `
    )
    .join('');

  updateDashboardCards();
}

async function restoreHistoryEntry(historyId) {
  const shouldRestore = window.confirm('Deseja restaurar este registro de histórico?');
  if (!shouldRestore) return;

  try {
    setSyncStatus('syncing', '⟳ Restaurando...');
    const result = await apiRequest(`/api/history/${historyId}/restore`, {
      method: 'POST',
    });
    showToast(result?.message || 'Restauração aplicada com sucesso.', 'success');
    await loadAdminData();
    setSyncStatus('synced', '✓ Restauração aplicada');
  } catch (error) {
    setSyncStatus('error', '⚠ Erro na restauração');
    showToast(error.message, 'error');
  }
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

function getEditablePages() {
  return state.pages.filter((page) => !['timeline', 'catalogacao'].includes(page.slug));
}

function renderPageManagerTable() {
  const tbody = document.getElementById('pageManagerTableBody');
  if (!tbody) return;

  const editablePages = getEditablePages();
  if (!editablePages.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="no-image">Nenhuma página disponível para edição</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = editablePages
    .map(
      (page) => `
      <tr>
        <td>${sanitize(page.title || '-')}</td>
        <td>${sanitize(page.slug || '-')}</td>
        <td>${sanitize(page.type || '-')}</td>
        <td>${sanitize(formatHistoryTimestamp(page.updated_at) || '-')}</td>
        <td class="table-actions">
          <button class="btn-secondary btn-small" data-page-action="edit" data-page-id="${page.id}">Editar</button>
        </td>
      </tr>
    `
    )
    .join('');
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
  const imagePath = isCampus ? 'src/images/campus/image1.jpg' : 'src/images/territorio/image6.png';
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
    wrapper.insertBefore(modeBar, textarea);
  }

  if (!toolbar) {
    toolbar = document.createElement('div');
    toolbar.id = 'pageEditorToolbar';
    toolbar.className = 'page-editor-toolbar';
    toolbar.setAttribute('aria-label', 'Barra de ferramentas do editor');
    toolbar.innerHTML = `
      <button type="button" class="btn-secondary btn-small" data-editor-cmd="undo">Desfazer</button>
      <button type="button" class="btn-secondary btn-small" data-editor-cmd="redo">Refazer</button>
      <button type="button" class="btn-secondary btn-small" data-editor-cmd="insertTemplateCard">Template Card</button>
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
    wrapper.insertBefore(toolbar, textarea);
  }

  if (!editorHost) {
    editorHost = document.createElement('div');
    editorHost.id = 'pageContentEditor';
    editorHost.className = 'page-wysiwyg-host';
    editorHost.setAttribute('contenteditable', 'true');
    editorHost.setAttribute('role', 'textbox');
    editorHost.setAttribute('aria-multiline', 'true');
    editorHost.setAttribute('aria-label', 'Editor de conteúdo');
    wrapper.insertBefore(editorHost, textarea);
  }

  if (!preview) {
    preview = document.createElement('div');
    preview.id = 'pageContentPreview';
    preview.className = 'page-editor-preview';
    preview.style.display = 'none';
    wrapper.insertBefore(preview, textarea.nextSibling);
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
  closePageContentEditor();
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
        <td class="table-actions">
          <button class="btn-secondary btn-small" data-menu-action="up">↑</button>
          <button class="btn-secondary btn-small" data-menu-action="down">↓</button>
          <button class="btn-danger btn-small" data-menu-action="remove">Remover</button>
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
  await Promise.all([loadEvents(), loadMenu(), loadMedia(), loadHistory()]);
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

  document.getElementById('totalEvents').textContent = `Total: ${events.length} eventos`;

  if (!events.length) {
    tbody.innerHTML = '';
    tableContainer.style.display = 'none';
    emptyState.style.display = 'block';
    updateDashboardCards();
    return;
  }

  tableContainer.style.display = 'block';
  emptyState.style.display = 'none';

  tbody.innerHTML = events
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
        <td class="table-actions">
          <button class="btn-secondary btn-small" data-action="edit" data-id="${event.id}">Editar</button>
          <button class="btn-danger btn-small" data-action="delete" data-id="${event.id}">Excluir</button>
        </td>
      </tr>
    `
    )
    .join('');

  updateDashboardCards();
}

function fillEventForm(event = null) {
  document.getElementById('modalTitle').textContent = event ? 'Editar Evento' : 'Adicionar Evento';
  document.getElementById('eventDate').value = normalizeDateForInput(event?.date || '');
  document.getElementById('eventTitle').value = event?.title || '';
  document.getElementById('eventImage').value = event?.image_path || '';
  document.getElementById('eventLegend').value = event?.source || '';
  document.getElementById('eventText').value = event?.description || '';
  document.getElementById('eventImageFile').value = '';
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

  const selectedFile = document.getElementById('eventImageFile').files[0];
  let imagePath = document.getElementById('eventImage').value.trim();
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
    if (selectedFile) {
      setSyncStatus('syncing', '⟳ Enviando imagem...');
      const uploadResult = await uploadImage(selectedFile);
      imagePath = uploadResult.image_path;
      document.getElementById('eventImage').value = imagePath;
      showToast('Imagem enviada com sucesso.', 'success');
    }

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
  console.log('[LOAD_MEDIA] Starting loadMedia(), folder:', folder);
  
  try {
    setSyncStatus('syncing', '⟳ Carregando mídia...');
    const url = folder ? `/api/media/public-list?folder=${encodeURIComponent(folder)}` : '/api/media/public-list';
    console.log('[LOAD_MEDIA] API URL:', url);
    const items = await apiRequest(url);
    console.log('[LOAD_MEDIA] API Response:', items);
    console.log('[LOAD_MEDIA] Number of items:', items ? items.length : 0);
    state.mediaFiles = items || [];
    console.log('[LOAD_MEDIA] state.mediaFiles updated, length:', state.mediaFiles.length);
    
    updateDashboardCards();
    console.log('[LOAD_MEDIA] Rendering both views (grid and table)');
    renderMediaTable();
    renderMediaGrid();
    
    const emptyState = document.getElementById('emptyMediaState');
    if (emptyState) {
      emptyState.style.display = state.mediaFiles.length === 0 ? 'block' : 'none';
    }
    
    setSyncStatus('synced', '✓ Mídia carregada');
    console.log('[LOAD_MEDIA] Finished successfully');
  } catch (error) {
    console.error('[LOAD_MEDIA] ERROR:', error);
    setSyncStatus('error', '⚠ Erro ao carregar mídia');
    showToast(error.message, 'error');
  }
}

function renderMediaTable() {
  console.log('[RENDER_TABLE] Starting renderMediaTable()');
  const tbody = document.getElementById('mediaTableBody');
  console.log('[RENDER_TABLE] tbody element:', tbody);
  if (!tbody) {
    console.error('[RENDER_TABLE] tbody not found!');
    return;
  }

  console.log('[RENDER_TABLE] Processing', state.mediaFiles.length, 'items');
  const rows = (state.mediaFiles || []).map((item) => {
    const filePath = sanitize(item.file_path || '');
    const imageUrl = `${APP_BASE_PATH}/media/serve/${filePath}`;
    console.log('[RENDER_TABLE] Item:', item.filename, '-> URL:', imageUrl);
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
          <button class="btn-secondary btn-small" data-media-action="edit" data-media-id="${item.id}">✎ Editar</button>
          <button class="btn-danger btn-small" data-media-action="delete" data-media-id="${item.id}">🗑 Deletar</button>
        </td>
      </tr>
    `;
  }).join('');

  tbody.innerHTML = rows || '<tr><td colspan="6">Nenhuma mídia encontrada</td></tr>';
  console.log('[RENDER_TABLE] DOM updated, tbody.innerHTML length:', tbody.innerHTML.length);
  console.log('[RENDER_TABLE] Finished');
}

function renderMediaGrid() {
  console.log('[RENDER_GRID] Starting renderMediaGrid()');
  const container = document.getElementById('mediaGridContainer');
  console.log('[RENDER_GRID] container element:', container);
  if (!container) {
    console.error('[RENDER_GRID] container not found!');
    return;
  }

  console.log('[RENDER_GRID] Processing', state.mediaFiles.length, 'items');
  const items = (state.mediaFiles || []).map((item) => {
    const filePath = sanitize(item.file_path || '');
    const imageUrl = `${APP_BASE_PATH}/media/serve/${filePath}`;
    console.log('[RENDER_GRID] Item:', item.filename, '-> URL:', imageUrl);
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
  console.log('[RENDER_GRID] DOM updated, container.innerHTML length:', container.innerHTML.length);
  console.log('[RENDER_GRID] Finished');
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

  const folder = document.getElementById('mediaFolderFilter')?.value || 'uploads';
  if (!['timeline', 'territorio', 'campus'].includes(folder)) {
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
    showToast(error.message, 'error');
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
    window.location.reload();
  });

  document.getElementById('refreshBtn').addEventListener('click', async () => {
    setLoading(true);
    await loadAdminData();
    setLoading(false);
  });

  document.getElementById('addMenuItemBtn').addEventListener('click', addMenuItem);
  document.getElementById('saveMenuBtn').addEventListener('click', saveMenu);
  document.getElementById('savePageContentBtn').addEventListener('click', saveSelectedPageContent);
  document.getElementById('cancelPageContentBtn').addEventListener('click', closePageContentEditor);
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
  document.getElementById('applyHistoryFiltersBtn').addEventListener('click', async () => {
    try {
      syncHistoryFiltersFromUI();
      setSyncStatus('syncing', '⟳ Aplicando filtros do histórico...');
      await loadHistory();
      setSyncStatus('synced', '✓ Histórico filtrado');
    } catch (error) {
      setSyncStatus('error', '⚠ Erro ao filtrar histórico');
      showToast(error.message, 'error');
    }
  });
  document.getElementById('refreshHistoryBtn').addEventListener('click', async () => {
    try {
      syncHistoryFiltersFromUI();
      setSyncStatus('syncing', '⟳ Carregando histórico...');
      await loadHistory();
      setSyncStatus('synced', '✓ Histórico atualizado');
    } catch (error) {
      setSyncStatus('error', '⚠ Erro ao carregar histórico');
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
    document.getElementById('eventImageFile').value = '';
    updateImagePreviewFromPath('');
  });

  document.getElementById('selectMediaBtn').addEventListener('click', (e) => {
    e.preventDefault();
    openImagePickerForEvent();
  });

  document.getElementById('eventImage').addEventListener('input', (event) => {
    updateImagePreviewFromPath(event.target.value);
  });

  document.getElementById('eventImageFile').addEventListener('change', (event) => {
    const file = event.target.files?.[0] || null;
    updateImagePreviewFromFile(file);
  });

  document.getElementById('eventModal').addEventListener('click', (event) => {
    if (event.target.id === 'eventModal') {
      closeEventModalSafely();
    }
  });

  document.getElementById('deleteModal').addEventListener('click', (event) => {
    if (event.target.id === 'deleteModal') {
      state.deleteId = null;
      hideModal('deleteModal');
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') {
      return;
    }

    const eventModal = document.getElementById('eventModal');
    const deleteModal = document.getElementById('deleteModal');

    if (eventModal.classList.contains('show')) {
      closeEventModalSafely();
      return;
    }

    if (deleteModal.classList.contains('show')) {
      state.deleteId = null;
      hideModal('deleteModal');
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

  document.getElementById('historyTableBody').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-history-action="restore"]');
    if (!button) return;

    const historyId = Number(button.dataset.historyId);
    if (!historyId) return;
    restoreHistoryEntry(historyId);
  });

  document.getElementById('pageManagerTableBody').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-page-action="edit"]');
    if (!button) return;

    const pageId = Number(button.dataset.pageId);
    if (!pageId) return;
    openPageContentEditor(pageId);
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
  const uploadFolder = document.getElementById('imagePickerUploadFolder');
  const searchInput = document.getElementById('imagePickerSearch');
  if (title) {
    if (context === 'event') {
      title.textContent = 'Selecionar Imagem para Evento';
    } else {
      title.textContent = 'Inserir Imagem no Editor';
    }
  }

  if (insertBtn) {
    insertBtn.textContent = context === 'event' ? '✓ Usar no Evento' : '✓ Inserir Imagem';
    insertBtn.disabled = true;
  }

  const defaultFolder = getDefaultImagePickerFolder(context);
  if (folderFilter) folderFilter.value = defaultFolder;
  if (uploadFolder) uploadFolder.value = defaultFolder || 'timeline';
  if (searchInput) searchInput.value = '';

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

  // Reset upload form when switching to upload tab
  if (tabName === 'upload') {
    const fileInput = document.getElementById('imagePickerFile');
    if (fileInput) fileInput.value = '';
  }
}

async function handleImagePickerUpload() {
  const fileInput = document.getElementById('imagePickerFile');
  const folderSelect = document.getElementById('imagePickerUploadFolder');
  const file = fileInput?.files?.[0];

  if (!file) {
    showToast('Selecione uma imagem para fazer upload.', 'error');
    return;
  }

  const folder = (folderSelect?.value || 'campus').toLowerCase();

  try {
    setSyncStatus('syncing', '📤 Fazendo upload da imagem...');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    formData.append('alt_text', document.getElementById('imagePickerUploadAlt')?.value || '');
    formData.append('description', document.getElementById('imagePickerUploadDescription')?.value || '');

    const result = await apiRequest('/api/media', {
      method: 'POST',
      body: formData,
    });

    showToast(`"${file.name}" enviado com sucesso!`, 'success');

    // Set as selected image
    selectedImageForEditor = {
      id: result.id,
      url: resolveAssetUrl(`/media/serve/${result.file_path}`),
      insertUrl: `/media/serve/${result.file_path}`,
      filename: result.filename,
      path: `media/serve/${result.file_path}`,
      folder: result.folder,
      description: result.description || '',
      altText: result.alt_text || '',
      size: Number(result.file_size || 0),
    };

    // Switch to select tab to show the new image
    setImagePickerTab('select');
    await loadImagesForPicker();
    updateImagePickerPreview();

    // Enable insert button
    const insertBtn = document.getElementById('imagePickerInsertBtn');
    if (insertBtn) insertBtn.disabled = false;

    setSyncStatus('synced', '✓ Imagem enviada');
  } catch (error) {
    setSyncStatus('error', '⚠ Erro ao enviar imagem');
    showToast(error.message, 'error');
  }
}

function insertSelectedImage() {
  if (!selectedImageForEditor) return;

  const context = state.imagePickerContext || 'editor';

  if (context === 'event') {
    // Inserir na imagem do evento
    const eventImageField = document.getElementById('eventImage');
    if (eventImageField) {
      const imagePath = selectedImageForEditor.path || selectedImageForEditor.filename;
      eventImageField.value = imagePath;
      document.getElementById('eventImageFile').value = '';
      updateImagePreviewFromPath(imagePath);
      showToast('Imagem selecionada para o evento.', 'success');
    }
  } else if (context === 'editor' && pageContentEditor) {
    // Inserir no editor de página
    pageContentEditor.focus();
    document.execCommand('insertImage', false, selectedImageForEditor.insertUrl || selectedImageForEditor.url);
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

  // Upload file input
  const fileInput = document.getElementById('imagePickerFile');
  if (fileInput) {
    fileInput.addEventListener('change', () => {
      const fileName = fileInput.files?.[0]?.name || '(nenhuma imagem selecionada)';
      const label = document.querySelector(`label[for="imagePickerFile"]`);
      if (label) {
        label.textContent = `Escolha uma imagem: ${fileName}`;
      }
    });
  }

  // Upload button
  const uploadBtn = document.getElementById('imagePickerUploadBtn');
  if (uploadBtn) {
    uploadBtn.addEventListener('click', handleImagePickerUpload);
  }

  // Insert button
  const insertBtn = document.getElementById('imagePickerInsertBtn');
  if (insertBtn) {
    insertBtn.addEventListener('click', insertSelectedImage);
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
