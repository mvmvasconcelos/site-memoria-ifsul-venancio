const state = {
  timelinePageId: null,
  events: [],
  pages: [],
  menuItems: [],
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

async function uploadImage(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', 'timeline');

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
  await Promise.all([loadPages(), loadEvents(), loadMenu()]);
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
