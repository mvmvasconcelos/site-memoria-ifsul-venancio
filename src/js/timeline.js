/**
 * timeline.js - Timeline entry rendering for timeline.html page
 * 
 * Responsibilities:
 * - Load timeline events from CMS API
 * - Render vertical timeline layout with year filtering
 * - Handle year button interactions
 * - Manage date formatting
 * 
 * Uses data-attributes:
 * - [data-page="timeline"] - Page context
 * - [data-view="timeline"] - Container role
 * - [data-role="container|filter|list|item"] - Semantic identifiers
 * - [data-year] - Year filter value
 */

/**
 * Shared path utilities (mirror from main.js for standalone usage)
 */
const TimelinePathUtils = {
  getAppBasePath() {
    const path = window.location.pathname || '';
    if (path.startsWith('/memoria/')) {
      return '/memoria';
    }
    if (path === '/memoria') {
      return '/memoria';
    }
    return '';
  },

  buildApiUrl(path) {
    return `${this.getAppBasePath()}${path}`;
  },

  buildMediaUrl(filePath) {
    if (!filePath) return '';
    return `${this.getAppBasePath()}/media/serve/${filePath}`;
  },

  buildAssetUrl(path) {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    if (path.startsWith('/')) {
      return `${this.getAppBasePath()}${path}`;
    }
    return `${this.getAppBasePath()}/${path}`;
  },
};

/**
 * Utility functions
 */
const TimelineUtils = {
  sanitize(value) {
    const el = document.createElement('div');
    el.textContent = value || '';
    return el.innerHTML;
  },

  formatDate(dateStr) {
    // Use custom formatter if available, fallback to string
    if (window.MemoriaDate?.formatDisplayDate) {
      return window.MemoriaDate.formatDisplayDate(dateStr);
    }
    return dateStr || '';
  },

  resolveImageUrl(imagePath) {
    if (!imagePath) return '';
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    if (imagePath.startsWith('uploads/')) {
      return TimelinePathUtils.buildMediaUrl(imagePath);
    }
    return TimelinePathUtils.buildAssetUrl(imagePath);
  },

  extractYear(dateStr) {
    return dateStr ? dateStr.split('-')[0] : 'Sem data';
  },

  async fetchJson(path) {
    try {
      const response = await fetch(TimelinePathUtils.buildApiUrl(path), {
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch ${path}:`, error);
      throw error;
    }
  },
};

/**
 * Timeline rendering
 */
const TimelineRenderer = {
  renderEntry(entry, positionIndex) {
    const imageUrl = TimelineUtils.resolveImageUrl(entry.image_path);
    const title = TimelineUtils.sanitize(entry.title || '');
    const source = TimelineUtils.sanitize(entry.source || '');
    const description = TimelineUtils.sanitize(entry.description || '');
    const formattedDate = TimelineUtils.formatDate(entry.date);
    const year = TimelineUtils.extractYear(entry.date);

    // Build image HTML with date overlay
    let imageHtml = '';
    if (imageUrl) {
      imageHtml = `
        <div class="timeline-image-container">
          <img src="${imageUrl}" alt="${title}" class="timeline-image" loading="lazy" />
          ${formattedDate ? `<div class="timeline-date-overlay">${formattedDate}</div>` : ''}
        </div>
      `;
    }

    return `
      <article class="timeline-entry" data-id="${entry.id}" data-year="${year}" data-role="item">
        <div class="timeline-content">
          <h3 class="timeline-title">${title}</h3>
          ${imageHtml}
          ${description ? `<p class="timeline-description">${description}</p>` : ''}
          ${source ? `<p class="timeline-source"><small>Fonte: ${source}</small></p>` : ''}
        </div>
      </article>
    `;
  },
};

/**
 * Year filter management
 */
const TimelineYearFilter = {
  extractYears(entries) {
    const years = new Set(entries.map((entry) => TimelineUtils.extractYear(entry.date)));
    return Array.from(years).sort((a, b) => {
      // Sort numerically from oldest to newest
      const aNum = parseInt(a, 10);
      const bNum = parseInt(b, 10);
      if (isNaN(aNum)) return 1; // "Sem data" goes to end
      if (isNaN(bNum)) return -1;
      return aNum - bNum; // Ascending order (oldest first)
    });
  },

  renderYearButtons(years) {
    return years.map((year) => `<button class="year-btn btn-pill" data-year="${TimelineUtils.sanitize(year)}">${TimelineUtils.sanitize(year)}</button>`).join('');
  },

  setupYearFilter() {
    const timelineContainer = document.querySelector('[data-page="timeline"][data-view="timeline"][data-role="list"]') || document.getElementById('timeline');

    if (!timelineContainer) {
      console.warn('Timeline container not found');
      return;
    }

    const setYearFilter = (selectedYear) => {
      timelineContainer.querySelectorAll('.timeline-entry').forEach((entry) => {
        const entryYear = entry.dataset.year || 'Sem data';
        entry.style.display = selectedYear === '__all__' || entryYear === selectedYear ? 'block' : 'none';
      });

      document.querySelectorAll('[data-role="filter"] .year-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.year === selectedYear);
      });
    };

    // Add "Todos" button AFTER all year buttons
    const filterContainer = document.querySelector('[data-page="timeline"][data-role="filter"]') || document.getElementById('timeline-years');
    const yearBtns = Array.from(document.querySelectorAll('[data-role="filter"] .year-btn'));
    let oldestYear = null;
    
    if (yearBtns.length > 0) {
      // Get the first year button (already sorted, so first is oldest)
      oldestYear = yearBtns[0].dataset.year;
    }
    
    if (filterContainer) {
      const todosBtn = document.createElement('button');
      todosBtn.className = 'year-btn btn-pill';
      todosBtn.textContent = 'Todos';
      todosBtn.dataset.year = '__all__';
      todosBtn.addEventListener('click', () => setYearFilter('__all__'));
      filterContainer.appendChild(todosBtn); // Append to end instead of prepend
    }

    document.querySelectorAll('[data-role="filter"] .year-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        setYearFilter(btn.dataset.year);
      });
    });

    // Initialize with oldest year (not "Todos")
    if (oldestYear) {
      setYearFilter(oldestYear);
    }
  },
};

/**
 * Main timeline population logic
 */
function populateTimeline(entries) {
  const filterContainer = document.querySelector('[data-page="timeline"][data-role="filter"]') || document.getElementById('timeline-years');
  const timelineContainer = document.querySelector('[data-page="timeline"][data-view="timeline"][data-role="list"]') || document.getElementById('timeline');

  if (!timelineContainer) {
    console.error('Timeline container not found');
    showTimelineError();
    return;
  }

  // Sort entries chronologically (oldest first)
  const sortedEntries = [...entries].sort((a, b) => {
    // Extract year from date string (format: YYYY-MM-DD or similar)
    const getYear = (dateStr) => {
      if (!dateStr) return 0;
      const year = parseInt(dateStr.split('-')[0], 10);
      return isNaN(year) ? 0 : year;
    };

    const yearA = getYear(a.date);
    const yearB = getYear(b.date);
    
    if (yearA !== yearB) {
      return yearA - yearB; // Sort by year ascending (oldest first)
    }

    // If same year, try to sort by full date
    const dateA = new Date(a.date || '1970-01-01');
    const dateB = new Date(b.date || '1970-01-01');
    return dateA - dateB;
  });

  // Extract and render year filter buttons
  const years = TimelineYearFilter.extractYears(sortedEntries);
  if (filterContainer && years.length > 0) {
    filterContainer.innerHTML = TimelineYearFilter.renderYearButtons(years);
  }

  // Render all timeline entries (now sorted)
  timelineContainer.innerHTML = sortedEntries.map((entry, index) => TimelineRenderer.renderEntry(entry, index)).join('');
  timelineContainer.classList.add('timeline');

  // Setup year filtering interactions
  TimelineYearFilter.setupYearFilter();
}

/**
 * Error display
 */
function showTimelineError() {
  const timelineContainer = document.querySelector('[data-page="timeline"][data-view="timeline"][data-role="list"]') || document.getElementById('timeline');
  const filterContainer = document.querySelector('[data-page="timeline"][data-role="filter"]') || document.getElementById('timeline-years');

  if (filterContainer) {
    filterContainer.innerHTML = '';
  }

  if (timelineContainer) {
    timelineContainer.innerHTML = `
      <div class="error-message" role="alert">
        <strong>Erro:</strong> Não foi possível carregar a timeline. Tente novamente mais tarde.
      </div>
    `;
  }
}

/**
 * Main entry point for timeline loading
 */
async function loadTimelineData() {
  try {
    const page = await TimelineUtils.fetchJson('/api/pages/timeline');
    if (!page || !page.id) {
      throw new Error('Timeline page not found');
    }

    const entries = await TimelineUtils.fetchJson(`/api/timeline/${page.id}`);
    if (!Array.isArray(entries)) {
      throw new Error('Invalid timeline response');
    }

    populateTimeline(entries || []);
  } catch (error) {
    console.error('Failed to load timeline:', error);
    showTimelineError();
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', loadTimelineData);