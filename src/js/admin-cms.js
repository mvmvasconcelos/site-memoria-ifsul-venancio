const state = {
  timelinePageId: null,
  trabalhosPageId: null,
  events: [],
  pages: [],
  menuItems: [],
  historyItems: [],
  historyFilters: {
    entityType: '',
    action: '',
    limit: 100,
  },
  galleryItems: [],
  deletedGalleryIds: [],
  currentEditId: null,
  deleteId: null,
  eventFormInitialState: null,
  activePanel: 'dashboard',
  currentPageEditId: null,
};

const MANAGED_PAGE_DEFS = [
  { slug: 'index', title: 'Início', type: 'page', menu_order: 0, is_visible: true },
  { slug: 'territorio', title: 'Transformações Territoriais', type: 'cards', menu_order: 2, is_visible: true },
  { slug: 'campus', title: 'Campus', type: 'cards', menu_order: 3, is_visible: true },
  { slug: 'trabalhos', title: 'Trabalhos Acadêmicos', type: 'gallery', menu_order: 4, is_visible: true },
  { slug: 'catalogacao', title: 'Catalogação', type: 'list', menu_order: 5, is_visible: true },
  { slug: 'contact', title: 'Contato', type: 'page', menu_order: 6, is_visible: true },
];

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

const APP_BASE_PATH = getAppBasePath();

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
  const galleryCount = document.getElementById('dashGalleryCount');
  const historyCount = document.getElementById('dashHistoryCount');

  if (timelineCount) timelineCount.textContent = String(state.events.length || 0);
  if (menuCount) menuCount.textContent = String(state.menuItems.length || 0);
  if (galleryCount) galleryCount.textContent = String(state.galleryItems.length || 0);
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
  return state.pages.filter((page) => page.slug !== 'timeline');
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
  const textarea = document.getElementById('pageContentInput');
  if (wrapper) wrapper.style.display = 'none';
  if (title) title.textContent = 'Editar página';
  if (textarea) textarea.value = '';
}

async function openPageContentEditor(pageId) {
  const page = getPageById(pageId);
  if (!page) return;

  state.currentPageEditId = Number(page.id);
  const wrapper = document.getElementById('pageEditorWrapper');
  const title = document.getElementById('pageEditorTitle');
  const textarea = document.getElementById('pageContentInput');
  if (wrapper) wrapper.style.display = 'block';
  if (title) title.textContent = `Editar: ${page.title} (${page.slug})`;
  if (!textarea) return;
  textarea.value = 'Carregando conteúdo...';

  try {
    const payload = await apiRequest(`/api/pages/${page.slug}/editor-content`);
    textarea.value = payload?.content || '';
    if (payload?.source === 'generated') {
      showToast('Conteúdo inicial carregado a partir da versão atual do site. Salve para persistir no banco.', 'info');
    }
  } catch (error) {
    textarea.value = page?.content || '';
    showToast('Não foi possível carregar conteúdo inicial da página.', 'warning');
  }

  textarea.focus();
}

function initializeContentEditor() {
  renderPageManagerTable();
  closePageContentEditor();
}

async function saveSelectedPageContent() {
  const textarea = document.getElementById('pageContentInput');
  if (!textarea) return;

  const selectedId = Number(state.currentPageEditId);
  if (!selectedId) {
    showToast('Selecione uma página na lista para editar.', 'error');
    return;
  }

  try {
    setSyncStatus('syncing', '⟳ Salvando conteúdo...');
    const updated = await apiRequest(`/api/pages/${selectedId}`, {
      method: 'PUT',
      body: JSON.stringify({ content: textarea.value }),
    });

    const index = state.pages.findIndex((page) => Number(page.id) === Number(selectedId));
    if (index >= 0) {
      state.pages[index] = updated;
    }

    renderPageManagerTable();

    setSyncStatus('synced', '✓ Conteúdo salvo');
    showToast('Conteúdo da página salvo com sucesso.', 'success');
  } catch (error) {
    setSyncStatus('error', '⚠ Erro ao salvar conteúdo');
    showToast(error.message, 'error');
  }
}

async function loadGallery() {
  const trabalhosPage = getPageBySlug('trabalhos');
  if (!trabalhosPage) {
    state.trabalhosPageId = null;
    state.galleryItems = [];
    renderGalleryTable();
    return;
  }

  state.trabalhosPageId = trabalhosPage.id;
  state.deletedGalleryIds = [];
  state.galleryItems = await apiRequest(`/api/gallery/${state.trabalhosPageId}`);
  renderGalleryTable();
}

function renderGalleryTable() {
  const tbody = document.getElementById('galleryTableBody');
  if (!tbody) return;

  tbody.innerHTML = state.galleryItems
    .map(
      (item, index) => `
      <tr data-index="${index}" data-id="${item.id || ''}">
        <td>
          ${item.image_path
            ? `<img class="gallery-thumb" src="${sanitize(resolveAssetUrl(item.image_path))}" alt="${sanitize(item.title || 'Imagem da galeria')}" data-default-src="${sanitize(resolveAssetUrl(item.image_path))}" />`
            : '<span class="no-image">Sem imagem</span>'}
        </td>
        <td>
          <input type="text" class="gallery-title" value="${sanitize(item.title || '')}" placeholder="Título" />
        </td>
        <td>
          <input type="text" class="gallery-image-path" value="${sanitize(item.image_path || '')}" placeholder="src/images/trabalhos/exemplo.jpg" />
          <div class="gallery-upload-inline">
            <input type="file" class="gallery-image-file" accept="image/*" />
            <button class="btn-secondary btn-small" data-gallery-action="upload">Upload</button>
          </div>
        </td>
        <td>
          <textarea class="gallery-caption" rows="2" placeholder="Legenda (aceita HTML)">${sanitize(item.caption || '')}</textarea>
        </td>
        <td class="table-actions">
          <button class="btn-secondary btn-small" data-gallery-action="up">↑</button>
          <button class="btn-secondary btn-small" data-gallery-action="down">↓</button>
          <button class="btn-secondary btn-small" data-gallery-action="clear-image">Limpar imagem</button>
          <button class="btn-danger btn-small" data-gallery-action="remove">Remover</button>
        </td>
      </tr>
    `
    )
    .join('');

  updateDashboardCards();
}

function syncGalleryItemsFromTable() {
  const rows = Array.from(document.querySelectorAll('#galleryTableBody tr'));
  state.galleryItems = rows.map((row) => {
    const idValue = row.dataset.id;
    return {
      id: idValue ? Number(idValue) : null,
      title: row.querySelector('.gallery-title').value.trim() || null,
      image_path: row.querySelector('.gallery-image-path').value.trim(),
      caption: row.querySelector('.gallery-caption').value.trim() || null,
    };
  });
}

function addGalleryItem() {
  state.galleryItems.push({
    id: null,
    title: '',
    image_path: '',
    caption: '',
  });
  renderGalleryTable();
}

function moveGalleryItem(index, direction) {
  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= state.galleryItems.length) return;

  const temp = state.galleryItems[index];
  state.galleryItems[index] = state.galleryItems[target];
  state.galleryItems[target] = temp;
  renderGalleryTable();
}

function removeGalleryItem(index) {
  const item = state.galleryItems[index];
  if (item?.id) {
    state.deletedGalleryIds.push(item.id);
  }
  state.galleryItems.splice(index, 1);
  renderGalleryTable();
}

function clearGalleryItemImage(index) {
  const item = state.galleryItems[index];
  if (!item) return;

  const shouldClear = window.confirm('Deseja remover a imagem deste item da galeria?');
  if (!shouldClear) return;

  item.image_path = '';
  renderGalleryTable();
}

async function saveGallery() {
  if (!state.trabalhosPageId) {
    showToast('Página trabalhos não encontrada para salvar galeria.', 'error');
    return;
  }

  syncGalleryItemsFromTable();

  if (state.galleryItems.some((item) => !item.image_path)) {
    showToast('Todos os itens da galeria precisam de caminho de imagem.', 'error');
    return;
  }

  try {
    setSyncStatus('syncing', '⟳ Salvando galeria...');

    for (const itemId of state.deletedGalleryIds) {
      await apiRequest(`/api/gallery/${itemId}`, { method: 'DELETE' });
    }

    for (let index = 0; index < state.galleryItems.length; index += 1) {
      const item = state.galleryItems[index];
      const payload = {
        title: item.title,
        image_path: item.image_path,
        caption: item.caption,
        order_index: index,
      };

      if (item.id) {
        await apiRequest(`/api/gallery/${item.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await apiRequest('/api/gallery', {
          method: 'POST',
          body: JSON.stringify({
            page_id: state.trabalhosPageId,
            ...payload,
          }),
        });
      }
    }

    await loadGallery();
    setSyncStatus('synced', '✓ Galeria salva');
    showToast('Galeria de trabalhos salva com sucesso.', 'success');
  } catch (error) {
    setSyncStatus('error', '⚠ Erro ao salvar galeria');
    showToast(error.message, 'error');
  }
}

function updateGalleryRowPreviewFromFile(row, file) {
  const thumb = row.querySelector('.gallery-thumb');
  if (!thumb || !file) return;

  const objectUrl = URL.createObjectURL(file);
  thumb.src = objectUrl;
  thumb.dataset.tempObjectUrl = objectUrl;
}

function updateGalleryRowPreviewFromPath(row, imagePath) {
  const thumb = row.querySelector('.gallery-thumb');
  if (!thumb) return;

  const path = (imagePath || '').trim();
  if (!path) return;
  thumb.src = resolveAssetUrl(path);
  thumb.dataset.defaultSrc = resolveAssetUrl(path);
}

async function uploadGalleryRowImage(row) {
  const fileInput = row.querySelector('.gallery-image-file');
  const imagePathInput = row.querySelector('.gallery-image-path');
  const file = fileInput?.files?.[0];

  if (!file) {
    showToast('Selecione uma imagem antes de enviar.', 'error');
    return;
  }

  try {
    setSyncStatus('syncing', '⟳ Enviando imagem da galeria...');
    const uploadResult = await uploadImage(file, 'trabalhos');
    imagePathInput.value = uploadResult.image_path;
    syncGalleryItemsFromTable();
    renderGalleryTable();
    setSyncStatus('synced', '✓ Imagem enviada');
    showToast('Imagem enviada e vinculada ao item da galeria.', 'success');
  } catch (error) {
    setSyncStatus('error', '⚠ Erro no upload da imagem');
    showToast(error.message, 'error');
  }
}

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
  await Promise.all([loadEvents(), loadMenu(), loadGallery(), loadHistory()]);
  initializeContentEditor();
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
  document.getElementById('addGalleryItemBtn').addEventListener('click', addGalleryItem);
  document.getElementById('saveGalleryBtn').addEventListener('click', saveGallery);
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

  document.getElementById('galleryTableBody').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-gallery-action]');
    if (!button) return;

    const row = button.closest('tr');
    const index = Number(row?.dataset.index);
    const action = button.dataset.galleryAction;

    if (action === 'upload') {
      uploadGalleryRowImage(row);
      return;
    }

    syncGalleryItemsFromTable();

    if (action === 'up') {
      moveGalleryItem(index, 'up');
    } else if (action === 'down') {
      moveGalleryItem(index, 'down');
    } else if (action === 'clear-image') {
      clearGalleryItemImage(index);
    } else if (action === 'remove') {
      removeGalleryItem(index);
    }
  });

  document.getElementById('galleryTableBody').addEventListener('change', (event) => {
    const target = event.target;
    if (!target.classList.contains('gallery-image-file')) return;

    const row = target.closest('tr');
    const file = target.files?.[0];
    if (!row || !file) return;

    updateGalleryRowPreviewFromFile(row, file);
  });

  document.getElementById('galleryTableBody').addEventListener('input', (event) => {
    const target = event.target;
    if (!target.classList.contains('gallery-image-path')) return;

    const row = target.closest('tr');
    if (!row) return;

    updateGalleryRowPreviewFromPath(row, target.value);
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

document.addEventListener('DOMContentLoaded', bootstrap);
