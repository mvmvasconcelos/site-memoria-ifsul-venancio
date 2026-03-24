/**
 * API Contract Validation Module
 * Defines and validates data structures for CMS endpoints
 */

/**
 * Card schema - used by /api/cards/{page_id}
 * @typedef {Object} Card
 * @property {number} id - Unique card identifier
 * @property {number} page_id - Parent page identifier (campus, territorio, trabalhos)
 * @property {string} title - Card title/heading
 * @property {string} description - Card content (plain text or HTML)
 * @property {string|null} image_path - Media file path, e.g., "uploads/campus/photo.jpg"
 * @property {string|null} date_label - Display label for date (e.g., "Junho 2015", "2017")
 * @property {string|null} source - Attribution or source metadata
 * @property {number} order_index - Sort order within page (asc)
 * @property {string|null} media_file - Alternative file reference
 * @property {string} created_at - ISO timestamp
 * @property {string} updated_at - ISO timestamp
 */
export const CARD_SCHEMA = {
  id: 'number',
  page_id: 'number',
  title: 'string',
  description: 'string',
  image_path: ['string', 'null'],
  date_label: ['string', 'null'],
  source: ['string', 'null'],
  order_index: 'number',
  media_file: ['string', 'null'],
  created_at: 'string',
  updated_at: 'string',
};

/**
 * Timeline entry schema - used by /api/timeline/{page_id}
 * @typedef {Object} TimelineEntry
 * @property {number} id - Unique entry identifier
 * @property {number} page_id - Parent page identifier (timeline)
 * @property {string} title - Timeline event title
 * @property {string} date - Display date (e.g., "1989", "15 de Março")
 * @property {string|null} image_path - Media file path
 * @property {string|null} source - Attribution or source metadata
 * @property {string} description - Event description
 * @property {number} order_index - Sort order (asc)
 * @property {string} created_at - ISO timestamp
 * @property {string} updated_at - ISO timestamp
 */
export const TIMELINE_SCHEMA = {
  id: 'number',
  page_id: 'number',
  title: 'string',
  date: 'string',
  image_path: ['string', 'null'],
  source: ['string', 'null'],
  description: 'string',
  order_index: 'number',
  created_at: 'string',
  updated_at: 'string',
};

/**
 * Page content schema - used by /api/pages/{slug}
 * @typedef {Object} PageContent
 * @property {number} id - Page identifier
 * @property {string} slug - URL-friendly identifier (campus, territorio, etc.)
 * @property {string} type - Page type (home, cards, timeline, content)
 * @property {string|null} title - Page title
 * @property {string|null} content - Main page content (HTML or markdown)
 * @property {string} created_at - ISO timestamp
 * @property {string} updated_at - ISO timestamp
 */
export const PAGE_SCHEMA = {
  id: 'number',
  slug: 'string',
  type: 'string',
  title: ['string', 'null'],
  content: ['string', 'null'],
  created_at: 'string',
  updated_at: 'string',
};

/**
 * Menu schema - used by /api/menu
 * @typedef {Object} MenuItem
 * @property {string} label - Display text
 * @property {string} href - Link URL
 * @property {boolean} [active] - Whether item is current page
 * @property {MenuItem[]} [children] - Nested menu items
 */
export const MENU_SCHEMA = {
  items: 'array',
  // Each item:
  // {
  //   label: string,
  //   href: string,
  //   active: boolean (optional),
  //   children: MenuItem[] (optional)
  // }
};

/**
 * Data attribute contract for runtime DOM elements
 * Used to replace legacy hardcoded IDs (#territorio, #timeline, etc.)
 */
export const DATA_ATTRIBUTES = {
  page: '[data-page="campus|territorio|trabalhos|timeline|home"]',
  view: '[data-view="cards|timeline|content"]',
  role: '[data-role="container|list|item|filter|sort"]',
  year: '[data-year="2015|2016|...|__all__"]', // for filtering
  id: '[data-id="<card_or_entry_id>"]', // unique identifier
};

/**
 * Validates an object against a simple schema
 * @param {Object} data - Object to validate
 * @param {Object} schema - Schema definition
 * @returns {boolean} True if valid, false otherwise
 */
export function validateSchema(data, schema) {
  if (!data || !schema) return false;
  if (typeof data !== 'object') return false;

  for (const [key, expectedType] of Object.entries(schema)) {
    const value = data[key];
    const types = Array.isArray(expectedType) ? expectedType : [expectedType];

    let valid = false;
    for (const t of types) {
      if (t === 'null' && value === null) {
        valid = true;
        break;
      }
      if (typeof value === t) {
        valid = true;
        break;
      }
    }

    if (!valid) {
      console.warn(`Validation failed: ${key} expected ${types}, got ${typeof value}`);
      return false;
    }
  }

  return true;
}

/**
 * Validates an array of cards
 * @param {Array<Card>} cards - Array of card objects
 * @returns {boolean} True if all cards valid
 */
export function validateCards(cards) {
  if (!Array.isArray(cards)) return false;
  return cards.every((card) => validateSchema(card, CARD_SCHEMA));
}

/**
 * Validates an array of timeline entries
 * @param {Array<TimelineEntry>} entries - Array of timeline objects
 * @returns {boolean} True if all entries valid
 */
export function validateTimeline(entries) {
  if (!Array.isArray(entries)) return false;
  return entries.every((entry) => validateSchema(entry, TIMELINE_SCHEMA));
}

/**
 * Validates page content
 * @param {PageContent} page - Page object
 * @returns {boolean} True if page valid
 */
export function validatePage(page) {
  return validateSchema(page, PAGE_SCHEMA);
}
