/* ========================================
   Admin Panel - Timeline CRM
   Memorial IFSul Campus Venâncio Aires
   ======================================== */

// ========================================
// CONFIGURATION
// ========================================

const CONFIG = {
  // GitHub Configuration
  GITHUB_OWNER: 'MVMVASCONCELOS',
  GITHUB_REPO: 'site-memoria-ifsul-venancio',
  GITHUB_TOKEN: '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',
  GITHUB_BRANCH: 'master',
  
  // File Paths
  CSV_PATH: 'src/timeline.csv',
  IMAGES_PATH: 'src/images/timeline/',
  
  // Password Hash (SHA-256 de "ifsul2025")
  PASSWORD_HASH: '067c2857adcf2d7dceba07bd3ae401d63dec8780f0fc6efdb6aef4d2a4de73ae',
  
  // Session
  SESSION_KEY: 'admin_authenticated',
};

// ========================================
// STATE MANAGEMENT
// ========================================

let currentEvents = [];
let currentEditIndex = -1;
let csvSha = null; // GitHub file SHA for updates

// ========================================
// AUTHENTICATION
// ========================================

/**
 * Generate SHA-256 hash of a string
 */
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Check if user is authenticated
 */
function isAuthenticated() {
  return sessionStorage.getItem(CONFIG.SESSION_KEY) === 'true';
}

/**
 * Authenticate user with password
 */
async function authenticate(password) {
  const hash = await sha256(password);
  
  // For development: Log the hash to help setup
  console.log('Password hash:', hash);
  
  if (hash === CONFIG.PASSWORD_HASH) {
    sessionStorage.setItem(CONFIG.SESSION_KEY, 'true');
    return true;
  }
  return false;
}

/**
 * Logout user
 */
function logout() {
  sessionStorage.removeItem(CONFIG.SESSION_KEY);
  location.reload();
}

// ========================================
// UI HELPERS
// ========================================

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };
  
  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span class="toast-message">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;
  
  container.appendChild(toast);
  
  // Auto remove after 5 seconds
  setTimeout(() => toast.remove(), 5000);
}

/**
 * Show/hide loading spinner
 */
function setLoading(isLoading) {
  const spinner = document.getElementById('loadingSpinner');
  const table = document.querySelector('.table-container');
  
  if (isLoading) {
    spinner.style.display = 'flex';
    if (table) table.style.display = 'none';
  } else {
    spinner.style.display = 'none';
    if (table) table.style.display = 'block';
  }
}

/**
 * Update sync status indicator
 */
function updateSyncStatus(status, message = '') {
  const statusEl = document.getElementById('syncStatus');
  statusEl.className = `sync-status ${status}`;
  
  const messages = {
    synced: '✓ Sincronizado',
    syncing: '⟳ Sincronizando...',
    error: '⚠ Erro ao sincronizar'
  };
  
  statusEl.textContent = message || messages[status] || '';
}

/**
 * Show/hide modal
 */
function showModal(modalId) {
  document.getElementById(modalId).classList.add('show');
}

function hideModal(modalId) {
  document.getElementById(modalId).classList.remove('show');
}

// ========================================
// GITHUB API INTEGRATION
// ========================================

/**
 * Make GitHub API request
 */
async function githubRequest(endpoint, method = 'GET', data = null) {
  const url = `https://api.github.com/repos/${CONFIG.GITHUB_OWNER}/${CONFIG.GITHUB_REPO}/${endpoint}`;
  
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${CONFIG.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    }
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `GitHub API Error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('GitHub API Error:', error);
    throw error;
  }
}

/**
 * Load CSV file from GitHub
 */
async function loadTimelineFromGitHub() {
  try {
    updateSyncStatus('syncing');
    
    const data = await githubRequest(`contents/${CONFIG.CSV_PATH}?ref=${CONFIG.GITHUB_BRANCH}`);
    
    csvSha = data.sha; // Store SHA for future updates
    
    // Decode base64 content
    const content = atob(data.content);
    
    // Parse CSV
    currentEvents = parseCSV(content);
    
    updateSyncStatus('synced');
    return currentEvents;
  } catch (error) {
    updateSyncStatus('error');
    throw error;
  }
}

/**
 * Save CSV file to GitHub
 */
async function saveTimelineToGitHub(events) {
  try {
    updateSyncStatus('syncing', '⟳ Salvando...');
    
    // Convert events to CSV
    const csvContent = eventsToCSV(events);
    
    // Encode to base64
    const encodedContent = btoa(unescape(encodeURIComponent(csvContent)));
    
    // Commit to GitHub
    const commitData = {
      message: `[Admin] Atualização da timeline - ${new Date().toLocaleString('pt-BR')}`,
      content: encodedContent,
      sha: csvSha,
      branch: CONFIG.GITHUB_BRANCH
    };
    
    const response = await githubRequest(`contents/${CONFIG.CSV_PATH}`, 'PUT', commitData);
    
    csvSha = response.content.sha; // Update SHA
    
    updateSyncStatus('synced');
    showToast('Alterações salvas com sucesso!', 'success');
    
    return response;
  } catch (error) {
    updateSyncStatus('error');
    showToast(`Erro ao salvar: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Upload image to GitHub
 */
async function uploadImageToGitHub(file) {
  try {
    showToast('Enviando imagem...', 'info');
    
    // Read file as base64
    const base64Content = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    
    // Generate unique filename
    const timestamp = Date.now();
    const filename = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const path = `${CONFIG.IMAGES_PATH}${filename}`;
    
    // Upload to GitHub
    const commitData = {
      message: `[Admin] Upload de imagem: ${filename}`,
      content: base64Content,
      branch: CONFIG.GITHUB_BRANCH
    };
    
    await githubRequest(`contents/${path}`, 'PUT', commitData);
    
    showToast('Imagem enviada com sucesso!', 'success');
    
    return filename;
  } catch (error) {
    showToast(`Erro ao enviar imagem: ${error.message}`, 'error');
    throw error;
  }
}

// ========================================
// CSV PARSING & CONVERSION
// ========================================

/**
 * Parse CSV string to array of objects
 */
function parseCSV(csvString) {
  const lines = csvString.trim().split('\n');
  const events = [];
  
  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    
    // Parse CSV line (handles quotes)
    const matches = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
    if (!matches || matches.length < 2) continue;
    
    const [date, title, image, legend, text] = matches.map(field => 
      field.replace(/^"|"$/g, '').trim()
    );
    
    if (date && title) {
      events.push({ date, title, image, legend, text });
    }
  }
  
  return events;
}

/**
 * Convert events array to CSV string
 */
function eventsToCSV(events) {
  let csv = 'date,title,image,legend,text\n';
  
  events.forEach(event => {
    const row = [
      event.date || '',
      event.title || '',
      event.image || '',
      event.legend || '',
      event.text || ''
    ].map(field => `"${field}"`).join(',');
    
    csv += row + '\n';
  });
  
  return csv;
}

// ========================================
// DATA OPERATIONS
// ========================================

/**
 * Load and display all events
 */
async function loadEvents() {
  try {
    setLoading(true);
    
    const events = await loadTimelineFromGitHub();
    
    renderEventsTable(events);
    
    document.getElementById('totalEvents').textContent = `Total: ${events.length} eventos`;
    
    setLoading(false);
  } catch (error) {
    setLoading(false);
    showToast(`Erro ao carregar eventos: ${error.message}`, 'error');
  }
}

/**
 * Render events table
 */
function renderEventsTable(events) {
  const tbody = document.getElementById('eventsTableBody');
  const emptyState = document.getElementById('emptyState');
  const tableContainer = document.querySelector('.table-container');
  
  if (events.length === 0) {
    tableContainer.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }
  
  tableContainer.style.display = 'block';
  emptyState.style.display = 'none';
  
  tbody.innerHTML = events.map((event, index) => {
    const imageHtml = event.image 
      ? `<img src="src/images/timeline/${event.image}" class="event-image-thumb" alt="${event.title}" onerror="this.style.display='none'">`
      : '<span class="no-image">Sem imagem</span>';
    
    return `
      <tr>
        <td class="event-date">${event.date}</td>
        <td class="event-title">${event.title}</td>
        <td>${imageHtml}</td>
        <td class="event-legend">${event.legend || '-'}</td>
        <td class="table-actions">
          <button class="btn-primary btn-small" onclick="editEvent(${index})">✏️ Editar</button>
          <button class="btn-danger btn-small" onclick="deleteEvent(${index})">🗑️ Excluir</button>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Add new event
 */
function addEvent() {
  currentEditIndex = -1;
  document.getElementById('modalTitle').textContent = 'Adicionar Novo Evento';
  document.getElementById('eventForm').reset();
  document.getElementById('imagePreview').innerHTML = '';
  showModal('eventModal');
}

/**
 * Edit existing event
 */
function editEvent(index) {
  currentEditIndex = index;
  const event = currentEvents[index];
  
  document.getElementById('modalTitle').textContent = 'Editar Evento';
  document.getElementById('eventDate').value = event.date;
  document.getElementById('eventTitle').value = event.title;
  document.getElementById('eventImage').value = event.image;
  document.getElementById('eventLegend').value = event.legend;
  document.getElementById('eventText').value = event.text;
  
  // Show image preview if exists
  if (event.image) {
    document.getElementById('imagePreview').innerHTML = `
      <img src="src/images/timeline/${event.image}" alt="Preview">
    `;
  }
  
  showModal('eventModal');
}

/**
 * Delete event
 */
function deleteEvent(index) {
  currentEditIndex = index;
  const event = currentEvents[index];
  
  document.getElementById('deleteEventTitle').textContent = event.title;
  showModal('deleteModal');
}

/**
 * Save event (add or update)
 */
async function saveEvent(formData) {
  try {
    const event = {
      date: formData.get('date'),
      title: formData.get('title'),
      image: formData.get('image'),
      legend: formData.get('legend'),
      text: formData.get('text')
    };
    
    // Handle image file upload
    const imageFile = document.getElementById('eventImageFile').files[0];
    if (imageFile) {
      const filename = await uploadImageToGitHub(imageFile);
      event.image = filename;
    }
    
    // Add or update event
    if (currentEditIndex === -1) {
      currentEvents.push(event);
    } else {
      currentEvents[currentEditIndex] = event;
    }
    
    // Sort by date
    currentEvents.sort((a, b) => a.date.localeCompare(b.date));
    
    // Save to GitHub
    await saveTimelineToGitHub(currentEvents);
    
    // Refresh table
    renderEventsTable(currentEvents);
    document.getElementById('totalEvents').textContent = `Total: ${currentEvents.length} eventos`;
    
    hideModal('eventModal');
  } catch (error) {
    showToast(`Erro ao salvar evento: ${error.message}`, 'error');
  }
}

/**
 * Confirm delete event
 */
async function confirmDelete() {
  try {
    currentEvents.splice(currentEditIndex, 1);
    
    await saveTimelineToGitHub(currentEvents);
    
    renderEventsTable(currentEvents);
    document.getElementById('totalEvents').textContent = `Total: ${currentEvents.length} eventos`;
    
    hideModal('deleteModal');
    showToast('Evento excluído com sucesso!', 'success');
  } catch (error) {
    showToast(`Erro ao excluir evento: ${error.message}`, 'error');
  }
}

// ========================================
// EVENT LISTENERS
// ========================================

document.addEventListener('DOMContentLoaded', function() {
  // Check authentication
  if (isAuthenticated()) {
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('adminInterface').style.display = 'block';
    loadEvents();
  } else {
    document.getElementById('loginModal').classList.add('show');
  }
  
  // Login
  document.getElementById('loginBtn').addEventListener('click', async function() {
    const password = document.getElementById('passwordInput').value;
    const errorEl = document.getElementById('loginError');
    
    if (await authenticate(password)) {
      hideModal('loginModal');
      document.getElementById('adminInterface').style.display = 'block';
      loadEvents();
    } else {
      errorEl.textContent = 'Senha incorreta. Tente novamente.';
    }
  });
  
  // Login on Enter key
  document.getElementById('passwordInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      document.getElementById('loginBtn').click();
    }
  });
  
  // Logout
  document.getElementById('logoutBtn').addEventListener('click', logout);
  
  // Add new event
  document.getElementById('addNewBtn').addEventListener('click', addEvent);
  
  // Refresh
  document.getElementById('refreshBtn').addEventListener('click', loadEvents);
  
  // Close modals
  document.getElementById('closeModalBtn').addEventListener('click', () => hideModal('eventModal'));
  document.getElementById('cancelBtn').addEventListener('click', () => hideModal('eventModal'));
  document.getElementById('cancelDeleteBtn').addEventListener('click', () => hideModal('deleteModal'));
  
  // Close modal on outside click
  window.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
      e.target.classList.remove('show');
    }
  });
  
  // Save event form
  document.getElementById('eventForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    await saveEvent(formData);
  });
  
  // Confirm delete
  document.getElementById('confirmDeleteBtn').addEventListener('click', confirmDelete);
  
  // Image preview on file select
  document.getElementById('eventImageFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        document.getElementById('imagePreview').innerHTML = `
          <img src="${e.target.result}" alt="Preview">
        `;
      };
      reader.readAsDataURL(file);
      
      // Clear text input when file is selected
      document.getElementById('eventImage').value = '';
    }
  });
});

// Make functions available globally
window.editEvent = editEvent;
window.deleteEvent = deleteEvent;
