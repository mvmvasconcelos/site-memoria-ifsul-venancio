const state = {
  timelinePageId: null,
  trabalhosPageId: null,
  events: [],
  pages: [],
  menuItems: [],
  historyItems: [],
  galleryItems: [],
  deletedGalleryIds: [],
  editablePageSlugs: ['trabalhos', 'catalogacao'],
  currentEditId: null,
  deleteId: null,
  eventFormInitialState: null,
};

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
  const table = document.querySelector('.table-container');
  spinner.style.display = isLoading ? 'flex' : 'none';
  table.style.display = isLoading ? 'none' : 'block';
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
  const value = (dateValue || '').trim();
  if (!value) return '';

  const yearOnly = /^\d{4}$/;
  if (yearOnly.test(value)) {
    return `${value}-01-01`;
  }

  const isoDate = /^\d{4}-\d{2}-\d{2}$/;
  if (isoDate.test(value)) {
    return value;
  }

  const brDate = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const brMatch = value.match(brDate);
  if (brMatch) {
    const [, day, month, year] = brMatch;
    return `${year}-${month}-${day}`;
  }

  return '';
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
  state.historyItems = await apiRequest('/api/history?limit=100');
  renderHistoryTable();
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
  return state.pages.filter((page) => state.editablePageSlugs.includes(page.slug));
}

function populateContentEditorSelect() {
  const select = document.getElementById('pageContentPageSelect');
  if (!select) return;

  const editablePages = getEditablePages();
  select.innerHTML = editablePages
    .map((page) => `<option value="${page.id}">${sanitize(page.title)} (${sanitize(page.slug)})</option>`)
    .join('');
}

function loadSelectedPageContent() {
  const select = document.getElementById('pageContentPageSelect');
  const textarea = document.getElementById('pageContentInput');
  if (!select || !textarea) return;

  const selectedId = Number(select.value);
  const page = getPageById(selectedId);
  textarea.value = page?.content || '';
}

function initializeContentEditor() {
  populateContentEditorSelect();
  loadSelectedPageContent();
}

async function saveSelectedPageContent() {
  const select = document.getElementById('pageContentPageSelect');
  const textarea = document.getElementById('pageContentInput');
  if (!select || !textarea) return;

  const selectedId = Number(select.value);
  if (!selectedId) {
    showToast('Selecione uma página para salvar o conteúdo.', 'error');
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
  await Promise.all([loadEvents(), loadMenu(), loadGallery(), loadHistory()]);
  initializeContentEditor();
}

function renderEvents(events) {
  const tbody = document.getElementById('eventsTableBody');
  const emptyState = document.getElementById('emptyState');
  const tableContainer = document.querySelector('.table-container');

  document.getElementById('totalEvents').textContent = `Total: ${events.length} eventos`;

  if (!events.length) {
    tbody.innerHTML = '';
    tableContainer.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }

  tableContainer.style.display = 'block';
  emptyState.style.display = 'none';

  tbody.innerHTML = events
    .map(
      (event) => `
      <tr>
        <td class="event-date">${sanitize(event.date)}</td>
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

  const payload = {
    page_id: state.timelinePageId,
    date: document.getElementById('eventDate').value,
    title: document.getElementById('eventTitle').value.trim(),
    image_path: null,
    source: document.getElementById('eventLegend').value.trim() || null,
    description: document.getElementById('eventText').value.trim() || null,
  };

  if (!payload.date || !payload.title) {
    showToast('Data e título são obrigatórios.', 'error');
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
  document.getElementById('pageContentPageSelect').addEventListener('change', loadSelectedPageContent);
  document.getElementById('addGalleryItemBtn').addEventListener('click', addGalleryItem);
  document.getElementById('saveGalleryBtn').addEventListener('click', saveGallery);
  document.getElementById('refreshHistoryBtn').addEventListener('click', async () => {
    try {
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
}

async function bootstrap() {
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
