// Global JS Error Logger for diagnostics
window.addEventListener('error', function(e) {
  const errDiv = document.createElement('div');
  errDiv.style.position = 'fixed';
  errDiv.style.top = '0';
  errDiv.style.left = '0';
  errDiv.style.width = '100%';
  errDiv.style.backgroundColor = '#ef4444';
  errDiv.style.color = '#ffffff';
  errDiv.style.padding = '12px';
  errDiv.style.zIndex = '99999';
  errDiv.style.fontSize = '0.9rem';
  errDiv.style.fontFamily = 'monospace';
  errDiv.style.whiteSpace = 'pre-wrap';
  errDiv.innerHTML = `<strong>JS ERROR:</strong> ${e.message} at ${e.filename}:${e.lineno}:${e.colno}`;
  document.body.appendChild(errDiv);
});

// Active Database (will be dynamically populated from LocalStorage, data.json, or data.js fallback)
let timelineData = [];
let chaptersData = [];
let sectionsData = [];
let searchIndexData = null;

// Application State
const state = {
  activeTab: 'dashboard',
  theme: 'dark',
  
  // Explorer State
  selectedChapterId: 'ch2',
  selectedSectionId: null,
  expandedChapters: new Set(['ch2']), // Start with Chapter II expanded by default
  explorerBaseVersion: '1994',
  explorerTargetVersion: 'Latest',
  explorerDiffMode: false,

  // Compare Engine State
  compareSectionId: 'sec66', // Default to Section 66 (most interesting)
  compareVersionA: '1994',
  compareVersionB: 'Latest',
  compareLayout: 'inline',

  // Timeline State
  selectedTimelineIndex: 0, // Start with first milestone (Principal Act Enactment)

  // Search Queries
  globalSearchQuery: '',
  readerSearchQuery: '',
  readerShowVp: true,
  readerShowZp: true
};

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  await loadDatabase();
  generateMissingSections();
  initTheme();
  setupEventListeners();
  renderAll();
});

// Load active database (LocalStorage -> data/structure.json)
async function loadDatabase() {
  const localDb = localStorage.getItem('goa-panchayat-db');
  
  if (localDb) {
    try {
      const db = JSON.parse(localDb);
      timelineData = db.timeline || [];
      chaptersData = db.chapters || [];
      sectionsData = db.sections || [];
      
      updateDbStatusIndicator(true);
      return;
    } catch (e) {
      console.error("Error parsing custom database, resetting to default...", e);
      localStorage.removeItem('goa-panchayat-db');
    }
  }

  // Fetch partitioned structure.json
  try {
    const response = await fetch('data/structure.json');
    if (response.ok) {
      const db = await response.json();
      timelineData = db.timeline || [];
      chaptersData = db.chapters || [];
      sectionsData = db.sections || [];
      
      updateDbStatusIndicator(false);
      return;
    }
  } catch (e) {
    console.error("Failed to fetch database structure from data/structure.json:", e);
  }

  updateDbStatusIndicator(false, true);
}

// Lazy load individual section details on demand
async function loadSectionDetails(sectionId) {
  const section = sectionsData.find(s => s.id === sectionId);
  if (!section) return null;
  
  // If the section already has versions loaded, return it instantly
  if (section.versions && Object.keys(section.versions).length > 0) {
    return section;
  }
  
  try {
    const response = await fetch(`data/sections/${sectionId}.json`);
    if (response.ok) {
      const data = await response.json();
      section.versions = data.versions || {};
      section.history = data.history || [];
    }
  } catch (e) {
    console.error(`Failed to load details for section ${sectionId}:`, e);
  }
  return section;
}

function updateDbStatusIndicator(isCustom, isFallback = false) {
  const dot = document.getElementById('db-status-dot');
  const text = document.getElementById('db-status-text');
  const resetBtn = document.getElementById('db-reset-btn');
  
  if (!dot || !text || !resetBtn) return;
  
  if (isCustom) {
    dot.className = 'status-dot status-custom';
    text.textContent = 'Using custom user-uploaded database (stored in browser)';
    resetBtn.style.display = 'inline-block';
  } else {
    dot.className = 'status-dot status-active';
    if (isFallback) {
      text.textContent = 'Using offline fallback';
    } else {
      text.textContent = 'Using default database (structure.json)';
    }
    resetBtn.style.display = 'none';
  }
}

// Dynamic Section Generator for complete Act outline
function generateMissingSections() {
  // Database outline is pre-compiled. No dynamic placeholders needed.
}

function parseSecNumObject(numStr) {
  const match = numStr.match(/^(\d+)(.*)$/);
  if (!match) return { num: 999, suffix: '' };
  return {
    num: parseInt(match[1], 10),
    suffix: match[2] || ''
  };
}

// Theme Management
function initTheme() {
  const savedTheme = localStorage.getItem('goa-tracker-theme');
  if (savedTheme) {
    state.theme = savedTheme;
  }
  applyTheme();
}

function applyTheme() {
  const body = document.body;
  const btnText = document.getElementById('theme-text');
  const sunIcon = document.querySelector('.sun-icon');
  const moonIcon = document.querySelector('.moon-icon');

  if (state.theme === 'light') {
    body.classList.remove('dark-theme');
    body.classList.add('light-theme');
    btnText.textContent = 'Dark Mode';
    sunIcon.style.display = 'none';
    moonIcon.style.display = 'inline-block';
  } else {
    body.classList.remove('light-theme');
    body.classList.add('dark-theme');
    btnText.textContent = 'Light Mode';
    sunIcon.style.display = 'inline-block';
    moonIcon.style.display = 'none';
  }
  localStorage.setItem('goa-tracker-theme', state.theme);
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
}

// Tab Switching
function switchTab(tabId) {
  state.activeTab = tabId;
  
  // Dynamically inject the Search Results tab pane if it is missing from the HTML
  if (tabId === 'search' && !document.getElementById('tab-search')) {
    const viewport = document.querySelector('.content-viewport');
    if (viewport) {
      const tabSearch = document.createElement('section');
      tabSearch.id = 'tab-search';
      tabSearch.className = 'tab-pane';
      tabSearch.style.overflowY = 'auto';
      tabSearch.style.paddingBottom = '40px';
      tabSearch.style.height = '100%';
      tabSearch.innerHTML = `
        <div class="card card-wide search-results-card" style="max-width: 800px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px; width: 100%;">
          <h3>Search Results</h3>
          <p id="search-results-summary" style="font-size: 0.95rem; color: var(--text-secondary);">Enter a keyword in the sidebar search box to search the entire Act.</p>
          <div class="search-results-list" id="search-results-output" style="display: flex; flex-direction: column; gap: 12px;">
            <!-- Dynamically populated search matches -->
          </div>
        </div>
      `;
      viewport.appendChild(tabSearch);
    }
  }
  
  // Update nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    if (btn.getAttribute('data-tab') === tabId) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Update tab panes
  document.querySelectorAll('.tab-pane').forEach(pane => {
    if (pane.id === `tab-${tabId}`) {
      pane.classList.add('active');
    } else {
      pane.classList.remove('active');
    }
  });

  // Update Header title and sub-title
  const viewTitle = document.getElementById('current-view-title');
  const viewSubtitle = document.getElementById('current-view-subtitle');

  switch (tabId) {
    case 'dashboard':
      viewTitle.textContent = 'Dashboard Overview';
      viewSubtitle.textContent = 'Goa Panchayat Raj Act, 1994 Consolidated Dashboard';
      break;
    case 'reader':
      viewTitle.textContent = 'Full Act Reader';
      viewSubtitle.textContent = 'Read the consolidated Act continuously in its current form';
      break;
    case 'explorer':
      viewTitle.textContent = 'Act Explorer';
      viewSubtitle.textContent = 'Browse chapters, view sections, and toggle history';
      break;
    case 'timeline':
      viewTitle.textContent = 'Amendment Timeline';
      viewSubtitle.textContent = 'Chronology of legislative amendments and bills';
      break;
    case 'compare':
      viewTitle.textContent = 'Compare Engine';
      viewSubtitle.textContent = 'Side-by-side and inline difference tracker';
      break;
    case 'database':
      viewTitle.textContent = 'Manage Database';
      viewSubtitle.textContent = 'Export, backup, or import custom JSON databases';
      break;
    case 'search':
      viewTitle.textContent = 'Search Results';
      viewSubtitle.textContent = 'Contextual references for your keyword search';
      break;
  }

  // Perform render for specific views
  renderView(tabId);
}

// Setup Event Listeners
function setupEventListeners() {
  // Theme Toggle
  document.getElementById('theme-toggle-btn').addEventListener('click', toggleTheme);

  // Tab Navigation
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.getAttribute('data-tab'));
    });
  });

  // Secret keyboard shortcut (Ctrl + Alt + D) to toggle Admin Database Manager
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.altKey && (e.code === 'KeyD' || e.keyCode === 68 || e.key.toLowerCase() === 'd')) {
      e.preventDefault();
      const dbContainer = document.getElementById('nav-db-container');
      if (dbContainer) {
        const isHidden = dbContainer.style.display === 'none';
        dbContainer.style.display = isHidden ? 'block' : 'none';
        if (isHidden) {
          switchTab('database');
        }
      }
    }
  });

  // Global Search Input
  const searchInput = document.getElementById('global-search-input');
  const searchClear = document.getElementById('search-clear-btn');
  
  searchInput.addEventListener('keyup', (e) => {
    state.globalSearchQuery = e.target.value.toLowerCase().trim();
    if (state.globalSearchQuery.length > 0) {
      searchClear.style.display = 'block';
    } else {
      searchClear.style.display = 'none';
    }
    
    // Automatically switch to search tab if query is 3+ characters long
    if (state.globalSearchQuery.length >= 3) {
      if (state.activeTab !== 'search') {
        switchTab('search');
      } else {
        renderSearchResults();
      }
    } else {
      renderView(state.activeTab);
    }
  });

  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      state.globalSearchQuery = searchInput.value.trim();
      if (state.globalSearchQuery.length > 0) {
        switchTab('search');
      }
    }
  });

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    state.globalSearchQuery = '';
    searchClear.style.display = 'none';
    if (state.activeTab === 'search') {
      switchTab('dashboard');
    } else {
      renderView(state.activeTab);
    }
  });

  // Reader Toolbar Filters
  const rSearch = document.getElementById('reader-search-input');
  rSearch.addEventListener('keyup', (e) => {
    state.readerSearchQuery = e.target.value.toLowerCase().trim();
    renderFullActReader();
  });

  document.getElementById('filter-show-vp').addEventListener('change', (e) => {
    state.readerShowVp = e.target.checked;
    renderFullActReader();
  });

  document.getElementById('filter-show-zp').addEventListener('change', (e) => {
    state.readerShowZp = e.target.checked;
    renderFullActReader();
  });

  // Dashboard Quick Links
  document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const secId = btn.getAttribute('data-sec-id');
      navigateToSection(secId);
    });
  });

  // Compare Engine Selection Changes
  document.getElementById('compare-section-select').addEventListener('change', (e) => {
    state.compareSectionId = e.target.value;
    updateCompareVersionSelectors();
    renderCompareEngine();
  });

  document.getElementById('compare-version-a').addEventListener('change', (e) => {
    state.compareVersionA = e.target.value;
    renderCompareEngine();
  });

  document.getElementById('compare-version-b').addEventListener('change', (e) => {
    state.compareVersionB = e.target.value;
    renderCompareEngine();
  });

  document.getElementById('compare-mode-toggle').addEventListener('change', (e) => {
    state.compareLayout = e.target.value;
    renderCompareEngine();
  });

  // Database Manager Export (Compiles sliced sections in parallel before downloading)
  document.getElementById('db-export-btn').addEventListener('click', async () => {
    const btn = document.getElementById('db-export-btn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<strong>Compiling database...</strong>';
    
    try {
      const fetchPromises = sectionsData.map(s => loadSectionDetails(s.id));
      await Promise.all(fetchPromises);
      
      const dataToExport = {
        timeline: timelineData,
        chapters: chaptersData,
        sections: sectionsData
      };
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToExport, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "goa_panchayat_act_db.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      console.error("Failed to compile database for export:", e);
      alert("Error compiling database: " + e.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  });

  // Database Manager Import Click
  const dropzone = document.getElementById('db-upload-dropzone');
  const fileInput = document.getElementById('db-file-input');
  
  dropzone.addEventListener('click', () => {
    fileInput.click();
  });

  // Database File Upload Change
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleDatabaseUpload(file);
  });

  // Drag and Drop
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) {
      handleDatabaseUpload(file);
    }
  });

  // Database Reset
  document.getElementById('db-reset-btn').addEventListener('click', () => {
    if (confirm("Are you sure you want to reset the database to default? Any custom uploaded files will be cleared.")) {
      localStorage.removeItem('goa-panchayat-db');
      window.location.reload();
    }
  });
}

function handleDatabaseUpload(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const db = JSON.parse(e.target.result);
      if (!db.timeline || !db.chapters || !db.sections) {
        throw new Error("Invalid database schema. Missing timeline, chapters, or sections.");
      }
      
      // Save to localStorage
      localStorage.setItem('goa-panchayat-db', JSON.stringify(db));
      alert("Database imported successfully! Reloading application...");
      window.location.reload();
    } catch (err) {
      alert("Failed to import database: " + err.message);
    }
  };
  reader.readAsText(file);
}

// Navigation Helper
function navigateToSection(sectionId) {
  const section = sectionsData.find(s => s.id === sectionId);
  if (!section) return;

  // Set the selected chapter to section's parent chapter
  state.selectedChapterId = section.chapterId;
  state.selectedSectionId = sectionId;

  // If section has amendments, configure default compare states
  if (section.amendedYears.length > 0) {
    state.explorerBaseVersion = '1994';
    state.explorerTargetVersion = 'Latest';
    state.explorerDiffMode = false;
    
    state.compareSectionId = sectionId;
    state.compareVersionA = '1994';
    state.compareVersionB = 'Latest';
  }

  switchTab('explorer');
}

// Navigation Helper for Compare Engine Specifically
function navigateToCompareSection(sectionId) {
  state.compareSectionId = sectionId;
  const section = sectionsData.find(s => s.id === sectionId);
  if (section && section.amendedYears.length > 0) {
    state.compareVersionA = '1994';
    state.compareVersionB = 'Latest';
  }
  updateCompareVersionSelectors();
  switchTab('compare');
}

// Render Handler based on Active Tab
function renderAll() {
  renderDashboard();
  renderFullActReader();
  renderExplorerTOC();
  renderExplorerDetail();
  renderTimeline();
  renderCompareEngine();
}

function renderView(viewId) {
  switch (viewId) {
    case 'dashboard':
      renderDashboard();
      break;
    case 'reader':
      renderFullActReader();
      break;
    case 'explorer':
      renderExplorerTOC();
      renderExplorerDetail();
      break;
    case 'timeline':
      renderTimeline();
      break;
    case 'compare':
      updateCompareVersionSelectors();
      renderCompareEngine();
      break;
    case 'search':
      renderSearchResults();
      break;
  }
}

// 1. Render Dashboard
function renderDashboard() {
  // Update stats counters
  document.getElementById('stat-chapters').textContent = chaptersData.length;
  document.getElementById('stat-sections').textContent = sectionsData.length;
  
  const totalAmendments = timelineData.length - 1; // Subtract base 1994 enactment
  document.getElementById('stat-amendments').textContent = totalAmendments;
  
  const latestAct = timelineData[timelineData.length - 1];
  document.getElementById('stat-latest-year').textContent = latestAct.year;

  // Wires up quick-access items
  document.querySelectorAll('.quick-btn').forEach(btn => {
    // Clone to remove old listeners and prevent duplicates
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener('click', () => {
      const secId = newBtn.getAttribute('data-sec-id');
      navigateToSection(secId);
    });
  });
}

// Helper to escape regex special characters
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 2. Render Full Act Reader (Lazy-loads search index for full-text reader display)
async function renderFullActReader() {
  const container = document.getElementById('full-act-text-container');
  if (!container) return;

  if (!searchIndexData) {
    container.innerHTML = `
      <div class="no-selection-placeholder">
        <div class="loading-spinner"></div>
        <p style="margin-top: 10px;">Loading Act reader content...</p>
      </div>
    `;
    try {
      const response = await fetch('data/search_index.json');
      if (response.ok) {
        searchIndexData = await response.json();
      }
    } catch (e) {
      console.error("Failed to load search index:", e);
      container.innerHTML = `
        <div class="no-selection-placeholder">
          <p style="color: var(--del-color);">Error loading Act content. Please check your connection.</p>
        </div>
      `;
      return;
    }
  }

  container.innerHTML = '';
  let outputHtml = '';

  chaptersData.forEach(chapter => {
    // Get sections for this chapter
    let chapterSections = sectionsData.filter(s => s.chapterId === chapter.id);

    // Apply Tier filters
    chapterSections = chapterSections.filter(s => {
      if (s.tier === 'Village Panchayat' && !state.readerShowVp) return false;
      if (s.tier === 'Zilla Panchayat' && !state.readerShowZp) return false;
      return true;
    });

    // Apply Search filter
    if (state.readerSearchQuery.length > 0) {
      chapterSections = chapterSections.filter(s => {
        const titleMatch = s.title.toLowerCase().includes(state.readerSearchQuery);
        const numMatch = s.number.toLowerCase().includes(state.readerSearchQuery);
        const bodyText = searchIndexData[s.id] || '';
        const textMatch = bodyText.toLowerCase().includes(state.readerSearchQuery);
        return titleMatch || numMatch || textMatch;
      });
    }

    if (chapterSections.length === 0) return; // Skip empty chapters in filtered views

    outputHtml += `
      <div class="reader-chapter-block">
        <h2>${chapter.title}</h2>
    `;

    chapterSections.forEach(sec => {
      const hasAmendments = sec.amendedYears.length > 0;
      const tierClass = sec.tier === 'General' ? 'general' : (sec.tier === 'Village Panchayat' ? 'vp' : 'zp');
      
      let badgeHtml = `<span class="badge badge-tier-${tierClass}">${sec.tier}</span>`;
      let ctaHtml = '';

      if (hasAmendments) {
        const lastYear = sec.amendedYears[sec.amendedYears.length - 1];
        ctaHtml = `<button class="cta-amended-badge" data-sec-id="${sec.id}">Amended (${lastYear}) - View History</button>`;
      }

      // Format legal body text
      let bodyText = formatLegalText(searchIndexData[sec.id] || '');

      outputHtml += `
        <div class="reader-section-item" id="reader-sec-${sec.id}">
          <div class="reader-section-header">
            <h3 class="reader-section-title"><strong>Section ${sec.number}</strong> ${sec.title}</h3>
            <div class="reader-section-meta">
              ${badgeHtml}
              ${ctaHtml}
            </div>
          </div>
          <div class="reader-section-body">${bodyText}</div>
        </div>
      `;
    });

    outputHtml += `</div>`;
  });

  if (outputHtml === '') {
    container.innerHTML = `
      <div class="no-selection-placeholder">
        <p>No sections match the current filters or search query.</p>
      </div>
    `;
  } else {
    container.innerHTML = outputHtml;
    
    // Highlight search query safely in DOM text nodes
    if (state.readerSearchQuery.length >= 3) {
      highlightSearchQueryInElement(container, state.readerSearchQuery);
    }
    
    // Add click listeners to CTA badges
    container.querySelectorAll('.cta-amended-badge').forEach(badge => {
      badge.addEventListener('click', (e) => {
        const secId = e.target.getAttribute('data-sec-id');
        navigateToCompareSection(secId);
      });
    });
  }
}

// 3. Render Explorer Sidebar Table of Contents
function renderExplorerTOC() {
  const chapterSelect = document.getElementById('chapter-select');
  const tocList = document.getElementById('explorer-toc-list');
  
  // Populate chapter dropdown if empty
  if (chapterSelect.options.length === 0) {
    chapterSelect.innerHTML = chaptersData.map(chap => 
      `<option value="${chap.id}" ${state.selectedChapterId === chap.id ? 'selected' : ''}>${chap.title}</option>`
    ).join('');
    
    // Add change listener
    chapterSelect.addEventListener('change', (e) => {
      state.selectedChapterId = e.target.value;
      renderExplorerTOC();
    });
  } else {
    // Sync dropdown with state
    chapterSelect.value = state.selectedChapterId;
  }

  tocList.innerHTML = '';

  // Get sections for selected chapter
  let chapterSections = sectionsData.filter(s => s.chapterId === state.selectedChapterId);

  // Apply global sidebar search query
  if (state.globalSearchQuery.length > 0) {
    // If search is active, show matches from ALL chapters
    chapterSections = sectionsData.filter(s => {
      const titleMatch = s.title.toLowerCase().includes(state.globalSearchQuery);
      const numMatch = s.number.toLowerCase().includes(state.globalSearchQuery);
      let textMatch = false;
      if (searchIndexData) {
        const latestText = searchIndexData[s.id] || '';
        textMatch = latestText.toLowerCase().includes(state.globalSearchQuery);
      }
      return titleMatch || numMatch || textMatch;
    });
  }

  if (chapterSections.length === 0) {
    tocList.innerHTML = `
      <div class="no-selection-placeholder" style="padding: 24px; font-size: 0.88rem; text-align: center;">
        <p>No matching sections found.</p>
      </div>
    `;
    return;
  }

  // Render flat list of section buttons
  chapterSections.forEach(sec => {
    const secBtn = document.createElement('button');
    secBtn.className = `toc-sec-btn ${state.selectedSectionId === sec.id ? 'active' : ''}`;
    secBtn.style.padding = '12px 14px';
    secBtn.style.marginBottom = '6px';
    secBtn.style.border = '1px solid var(--border-color)';
    secBtn.style.backgroundColor = 'var(--bg-tertiary)';
    secBtn.style.flexDirection = 'column';
    secBtn.style.alignItems = 'stretch';
    secBtn.style.gap = '2px';
    
    secBtn.innerHTML = `
      <strong style="font-family: var(--font-mono); font-size: 0.72rem; color: var(--accent-light);">Section ${sec.number}</strong>
      <span style="font-size: 0.84rem; font-weight: 500; color: var(--text-primary); line-height: 1.35;">${sec.title}</span>
    `;
    
    secBtn.addEventListener('click', () => {
      state.selectedSectionId = sec.id;
      renderExplorerDetail();
      // Remove active class from previous
      tocList.querySelectorAll('.toc-sec-btn').forEach(btn => btn.classList.remove('active'));
      secBtn.classList.add('active');
    });
    
    tocList.appendChild(secBtn);
  });
}

// 4. Render Explorer Section Details Workspace (Lazy-loads details before rendering)
async function renderExplorerDetail() {
  const panel = document.getElementById('explorer-content-panel');
  if (!state.selectedSectionId) {
    panel.innerHTML = `
      <div class="no-selection-placeholder">
        <svg viewBox="0 0 24 24" width="48" height="48"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
        <p>Select a section from the Chapter Table of Contents to begin tracking its amendment history.</p>
      </div>
    `;
    return;
  }

  // Show a loading skeleton
  panel.innerHTML = `
    <div class="no-selection-placeholder">
      <div class="loading-spinner"></div>
      <p style="margin-top: 10px;">Loading section text...</p>
    </div>
  `;

  const section = await loadSectionDetails(state.selectedSectionId);
  if (!section || !section.versions) {
    panel.innerHTML = `
      <div class="no-selection-placeholder">
        <p style="color: var(--del-color);">Error loading section text. Please check your connection.</p>
      </div>
    `;
    return;
  }

  const hasAmendments = section.amendedYears.length > 0;
  const tierClass = section.tier === 'General' ? 'general' : (section.tier === 'Village Panchayat' ? 'vp' : 'zp');

  // Setup Version Options list
  const availableVersions = Object.keys(section.versions); // E.g. ['1994', '2001', 'Latest']
  
  // Ensure selection values match available versions
  if (!availableVersions.includes(state.explorerBaseVersion)) {
    state.explorerBaseVersion = availableVersions[0];
  }
  if (!availableVersions.includes(state.explorerTargetVersion)) {
    state.explorerTargetVersion = availableVersions[availableVersions.length - 1];
  }

  let optionsBaseHtml = '';
  let optionsTargetHtml = '';
  availableVersions.forEach(v => {
    optionsBaseHtml += `<option value="${v}" ${state.explorerBaseVersion === v ? 'selected' : ''}>Version ${v}</option>`;
    optionsTargetHtml += `<option value="${v}" ${state.explorerTargetVersion === v ? 'selected' : ''}>Version ${v}</option>`;
  });

  // Main details outline HTML
  panel.innerHTML = `
    <div class="section-view-header">
      <h2><strong>Section ${section.number}</strong> ${section.title}</h2>
      <div class="section-meta-row">
        <span class="badge badge-tier-${tierClass}">${section.tier}</span>
        ${hasAmendments 
          ? `<span class="badge badge-danger">Amended (${section.amendedYears.join(', ')})</span>` 
          : `<span class="badge badge-outline">Unamended (Original Form)</span>`}
      </div>
    </div>

    <div class="version-selector-bar">
      <div class="version-selectors">
        <div class="version-select-box">
          <label for="explorer-base-v">View Version:</label>
          <select id="explorer-base-v">
            ${optionsBaseHtml}
          </select>
        </div>
        
        ${hasAmendments ? `
          <div class="version-select-box" id="explorer-target-v-box" style="display: ${state.explorerDiffMode ? 'flex' : 'none'};">
            <label for="explorer-target-v">Compare With:</label>
            <select id="explorer-target-v">
              ${optionsTargetHtml}
            </select>
          </div>
        ` : ''}
      </div>

      ${hasAmendments ? `
        <div class="toggle-switch-wrapper">
          <span>Show Changes (Diff)</span>
          <label class="switch">
            <input type="checkbox" id="explorer-diff-toggle" ${state.explorerDiffMode ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </div>
      ` : ''}
    </div>

    <!-- Text Workspace -->
    <div class="text-display-pane ${state.explorerDiffMode ? 'mono' : ''}" id="explorer-text-workspace"></div>

    <!-- History Timeline cards list -->
    ${hasAmendments ? `
      <div class="section-history-box">
        <h3>Amendment History</h3>
        <div class="history-timeline-cards">
          ${section.history.map(hist => `
            <div class="history-card">
              <div class="history-card-header">
                <h4>${hist.act}</h4>
                <span>Notification Year: ${hist.year}</span>
              </div>
              <p>${hist.details}</p>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
  `;

  // Content render helper
  const textPane = document.getElementById('explorer-text-workspace');
  
  if (state.explorerDiffMode && hasAmendments) {
    const textBase = section.versions[state.explorerBaseVersion] || '';
    const textTarget = section.versions[state.explorerTargetVersion] || '';
    const diff = diffLines(textBase, textTarget);
    
    let diffHtml = '';
    diff.forEach(item => {
      if (item.type === 'delete') {
        diffHtml += `<span class="del">- ${escapeHtml(item.text)}</span>\n`;
      } else if (item.type === 'insert') {
        diffHtml += `<span class="ins">+ ${escapeHtml(item.text)}</span>\n`;
      } else {
        diffHtml += `  ${escapeHtml(item.text)}\n`;
      }
    });
    textPane.style.whiteSpace = 'pre-wrap';
    textPane.innerHTML = diffHtml;
  } else {
    // Normal single-version text
    const normalText = section.versions[state.explorerBaseVersion] || '';
    textPane.style.whiteSpace = 'normal';
    textPane.innerHTML = formatLegalText(normalText);
    const query = state.globalSearchQuery.trim();
    if (query.length >= 3) {
      highlightSearchQueryInElement(textPane, query);
    }
  }

  // Bind dropdown and toggle events
  document.getElementById('explorer-base-v').addEventListener('change', (e) => {
    state.explorerBaseVersion = e.target.value;
    renderExplorerDetail();
  });

  if (hasAmendments) {
    document.getElementById('explorer-target-v').addEventListener('change', (e) => {
      state.explorerTargetVersion = e.target.value;
      renderExplorerDetail();
    });

    document.getElementById('explorer-diff-toggle').addEventListener('change', (e) => {
      state.explorerDiffMode = e.target.checked;
      renderExplorerDetail();
    });
  }
}

// 5. Render Timeline
function renderTimeline() {
  const track = document.getElementById('timeline-navigation-track');
  const panel = document.getElementById('timeline-detail-panel');
  
  if (!track || !panel) return;
  track.innerHTML = '';
  
  // Render timeline nodes
  timelineData.forEach((act, idx) => {
    const isActive = state.selectedTimelineIndex === idx;
    const navItem = document.createElement('button');
    navItem.className = `timeline-nav-item ${isActive ? 'active' : ''}`;
    navItem.innerHTML = `
      <span class="timeline-nav-year">${act.year}</span>
      <span class="timeline-nav-act">${act.actNumber}</span>
    `;
    navItem.addEventListener('click', () => {
      state.selectedTimelineIndex = idx;
      renderTimeline();
    });
    track.appendChild(navItem);
  });

  // Render detail panel for selected index
  const activeAct = timelineData[state.selectedTimelineIndex];
  if (!activeAct) return;

  // Find all sections amended in this year
  const amendedSecs = sectionsData.filter(s => s.amendedYears.includes(activeAct.year) || (activeAct.year === 1994 && (!s.insertedYear || s.insertedYear <= 1994)));

  panel.innerHTML = `
    <div class="timeline-content-header">
      <h2>${activeAct.title}</h2>
      <p>Official Legislative Gazette Date: <strong>${activeAct.date}</strong> | <strong>${activeAct.actNumber}</strong></p>
    </div>
    
    <div class="timeline-content-body">
      <h3>Summary Description</h3>
      <p>${activeAct.description}</p>
      
      <div class="timeline-changes-list">
        <h4>Key Clause Changes</h4>
        <ul>
          ${activeAct.keyChanges.map(change => `
            <li class="timeline-change-li">
              <svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" /></svg>
              <span>${change}</span>
            </li>
          `).join('')}
        </ul>
      </div>

      <div class="timeline-changes-list" style="margin-top: 24px;">
        <h4>Impacted Act Sections</h4>
        <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 12px;">
          ${amendedSecs.map(s => `
            <div class="timeline-impacted-sec-btn" data-sec-id="${s.id}" style="padding: 12px 16px; background-color: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--border-radius-md); display: flex; gap: 12px; align-items: center; font-size: 0.9rem; color: var(--text-secondary); cursor: pointer; transition: all var(--transition-fast);">
              <strong style="font-family: var(--font-mono); color: var(--accent-light); font-size: 0.85rem; background-color: var(--bg-tertiary); padding: 2px 6px; border-radius: 4px;">Section ${s.number}</strong>
              <span style="font-weight: 500; flex-grow: 1;">${s.title}</span>
              <span style="color: var(--text-muted); font-size: 1.1rem; transition: transform var(--transition-fast);">&rarr;</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  // Bind click events and hover animations for impacted sections in timeline
  panel.querySelectorAll('.timeline-impacted-sec-btn').forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      btn.style.borderColor = 'var(--accent-color)';
      btn.style.transform = 'translateY(-1px)';
      const arrow = btn.querySelector('span:last-child');
      if (arrow) arrow.style.transform = 'translateX(2px)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.borderColor = 'var(--border-color)';
      btn.style.transform = 'translateY(0)';
      const arrow = btn.querySelector('span:last-child');
      if (arrow) arrow.style.transform = 'translateX(0)';
    });
    btn.addEventListener('click', () => {
      const secId = btn.getAttribute('data-sec-id');
      navigateToSection(secId);
    });
  });
}

// 6. Compare Engine Version Selector Updates
async function updateCompareVersionSelectors() {
  const sectionSelect = document.getElementById('compare-section-select');
  
  // Populate section selections once (only sections with amendments)
  if (sectionSelect.options.length === 0) {
    const amendedSections = sectionsData.filter(s => s.amendedYears.length > 0);
    sectionSelect.innerHTML = amendedSections.map(s => 
      `<option value="${s.id}" ${state.compareSectionId === s.id ? 'selected' : ''}>Section ${s.number} - ${s.title}</option>`
    ).join('');
  }

  const section = await loadSectionDetails(state.compareSectionId);
  if (!section || !section.versions) return;

  const availableVersions = Object.keys(section.versions);

  // Validate selection states
  if (!availableVersions.includes(state.compareVersionA)) {
    state.compareVersionA = availableVersions[0];
  }
  if (!availableVersions.includes(state.compareVersionB)) {
    state.compareVersionB = availableVersions[availableVersions.length - 1];
  }

  const vASelect = document.getElementById('compare-version-a');
  const vBSelect = document.getElementById('compare-version-b');

  vASelect.innerHTML = availableVersions.map(v => 
    `<option value="${v}" ${state.compareVersionA === v ? 'selected' : ''}>Version ${v}</option>`
  ).join('');

  vBSelect.innerHTML = availableVersions.map(v => 
    `<option value="${v}" ${state.compareVersionB === v ? 'selected' : ''}>Version ${v}</option>`
  ).join('');

  // Make sure layout matches state
  document.getElementById('compare-mode-toggle').value = state.compareLayout;
}

// 7. Render Compare Engine Workspace (Lazy-loads details before rendering comparisons)
async function renderCompareEngine() {
  const workspace = document.getElementById('compare-workspace-output');
  workspace.innerHTML = `
    <div class="no-selection-placeholder">
      <div class="loading-spinner"></div>
      <p style="margin-top: 10px;">Loading comparison data...</p>
    </div>
  `;

  const section = await loadSectionDetails(state.compareSectionId);
  if (!section || !section.versions) {
    workspace.innerHTML = `
      <div class="no-selection-placeholder">
        <p style="color: var(--del-color);">Error loading comparison data.</p>
      </div>
    `;
    return;
  }

  workspace.innerHTML = '';

  const textA = section.versions[state.compareVersionA] || '';
  const textB = section.versions[state.compareVersionB] || '';

  const diffResult = diffLines(textA, textB);

  if (state.compareLayout === 'inline') {
    // Render inline track changes
    const inlineContainer = document.createElement('div');
    inlineContainer.className = 'diff-view-inline';
    
    let outputHtml = '';
    diffResult.forEach(item => {
      if (item.type === 'delete') {
        outputHtml += `<span class="del">- ${escapeHtml(item.text)}</span>\n`;
      } else if (item.type === 'insert') {
        outputHtml += `<span class="ins">+ ${escapeHtml(item.text)}</span>\n`;
      } else {
        outputHtml += `  ${escapeHtml(item.text)}\n`;
      }
    });

    inlineContainer.innerHTML = outputHtml;
    workspace.appendChild(inlineContainer);
  } else {
    // Render Side-by-Side Comparison
    const sideWrapper = document.createElement('div');
    sideWrapper.className = 'diff-view-side-wrapper';

    const { left, right } = alignDiffs(diffResult);

    // Left Column (Older base version)
    const leftCol = document.createElement('div');
    leftCol.className = 'diff-side-column';
    leftCol.innerHTML = `
      <div class="diff-side-header">Version ${state.compareVersionA}</div>
      <div class="diff-side-content" id="side-scroll-left"></div>
    `;

    // Right Column (Newer target version)
    const rightCol = document.createElement('div');
    rightCol.className = 'diff-side-column';
    rightCol.innerHTML = `
      <div class="diff-side-header">Version ${state.compareVersionB}</div>
      <div class="diff-side-content" id="side-scroll-right"></div>
    `;

    const leftContent = leftCol.querySelector('.diff-side-content');
    const rightContent = rightCol.querySelector('.diff-side-content');

    let leftHtml = '';
    let rightHtml = '';

    for (let k = 0; k < left.length; k++) {
      const leftLine = left[k];
      const rightLine = right[k];

      if (leftLine === null) {
        // Insertion occurred: left is empty, right has inserted text
        leftHtml += `<div class="diff-empty-line">&nbsp;</div>\n`;
        rightHtml += `<span class="ins">+ ${escapeHtml(rightLine)}</span>\n`;
      } else if (rightLine === null) {
        // Deletion occurred: left has text, right is empty
        leftHtml += `<span class="del">- ${escapeHtml(leftLine)}</span>\n`;
        rightHtml += `<div class="diff-empty-line">&nbsp;</div>\n`;
      } else if (leftLine !== rightLine) {
        // Replace occurred: left has deleted, right has inserted text
        leftHtml += `<span class="del">- ${escapeHtml(leftLine)}</span>\n`;
        rightHtml += `<span class="ins">+ ${escapeHtml(rightLine)}</span>\n`;
      } else {
        // Unchanged
        leftHtml += `  ${escapeHtml(leftLine)}\n`;
        rightHtml += `  ${escapeHtml(rightLine)}\n`;
      }
    }

    leftContent.innerHTML = leftHtml;
    rightContent.innerHTML = rightHtml;

    sideWrapper.appendChild(leftCol);
    sideWrapper.appendChild(rightCol);
    workspace.appendChild(sideWrapper);

    // Sync scrollbars between columns
    leftContent.addEventListener('scroll', () => {
      rightContent.scrollTop = leftContent.scrollTop;
    });
    rightContent.addEventListener('scroll', () => {
      leftContent.scrollTop = rightContent.scrollTop;
    });
  }
}

// ==========================================
// CORE UTILITY FUNCTIONS
// ==========================================

// Longest Common Subsequence (LCS) line-level diff algorithm
function diffLines(textA, textB) {
  const linesA = textA.split('\n');
  const linesB = textB.split('\n');
  const n = linesA.length;
  const m = linesB.length;
  
  // LCS table initialization
  const dp = Array(n + 1).fill(null).map(() => Array(m + 1).fill(0));
  
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (linesA[i - 1] === linesB[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  // Backtracking
  let i = n, j = m;
  const result = [];
  
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && linesA[i - 1] === linesB[j - 1]) {
      result.unshift({ type: 'unchanged', text: linesA[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'insert', text: linesB[j - 1] });
      j--;
    } else {
      result.unshift({ type: 'delete', text: linesA[i - 1] });
      i--;
    }
  }
  
  return result;
}

// Align deletes and inserts for side-by-side display
function alignDiffs(diffResult) {
  const left = [];
  const right = [];
  
  let pendingDels = [];
  let pendingIns = [];
  
  function flush() {
    const max = Math.max(pendingDels.length, pendingIns.length);
    for (let k = 0; k < max; k++) {
      const delLine = pendingDels[k] !== undefined ? pendingDels[k] : null;
      const insLine = pendingIns[k] !== undefined ? pendingIns[k] : null;
      
      left.push(delLine);
      right.push(insLine);
    }
    pendingDels = [];
    pendingIns = [];
  }
  
  for (const item of diffResult) {
    if (item.type === 'delete') {
      pendingDels.push(item.text);
    } else if (item.type === 'insert') {
      pendingIns.push(item.text);
    } else {
      flush();
      left.push(item.text);
      right.push(item.text);
    }
  }
  flush();
  
  return { left, right };
}

// Escape HTML tags to prevent execution in diff output
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Escape regular expression characters
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 7. Render Search Results (Lazy-loads search index on query key-up)
async function renderSearchResults() {
  const output = document.getElementById('search-results-output');
  const summary = document.getElementById('search-results-summary');
  
  if (!output || !summary) return;
  
  output.innerHTML = '';
  
  const query = state.globalSearchQuery.toLowerCase().trim();
  if (query.length < 3) {
    summary.textContent = 'Enter at least 3 characters in the search box to search the entire Act.';
    output.innerHTML = `
      <div class="no-selection-placeholder" style="padding: 40px; text-align: center; color: var(--text-muted);">
        <p>Please enter a keyword of 3 or more characters to begin searching.</p>
      </div>
    `;
    return;
  }

  // Lazy-load search index if not loaded yet
  if (!searchIndexData) {
    output.innerHTML = `
      <div class="no-selection-placeholder" style="padding: 40px; text-align: center;">
        <div class="loading-spinner"></div>
        <p style="margin-top: 10px;">Loading search index...</p>
      </div>
    `;
    try {
      const response = await fetch('data/search_index.json');
      if (response.ok) {
        searchIndexData = await response.json();
      }
    } catch (e) {
      console.error("Failed to load search index:", e);
      output.innerHTML = `
        <div class="no-selection-placeholder" style="padding: 40px; text-align: center; color: var(--del-color);">
          <p>Error loading search results. Please check your connection.</p>
        </div>
      `;
      return;
    }
    output.innerHTML = '';
  }
  
  // Find matches
  const matches = [];
  sectionsData.forEach(sec => {
    const text = (searchIndexData[sec.id] || '').toLowerCase();
    const title = sec.title.toLowerCase();
    const number = sec.number.toLowerCase();
    
    if (text.includes(query) || title.includes(query) || number.includes(query)) {
      // Find first matched sentence containing the query
      const sentences = (searchIndexData[sec.id] || '').split(/[.\n]+/);
      let snippetText = '';
      for (const sentence of sentences) {
        if (sentence.toLowerCase().includes(query)) {
          snippetText = sentence.trim();
          break;
        }
      }
      if (!snippetText) {
        snippetText = (searchIndexData[sec.id] || '').substring(0, 120).trim();
      }
      
      matches.push({
        section: sec,
        snippet: snippetText
      });
    }
  });
  
  summary.innerHTML = `Found <strong>${matches.length}</strong> sections referencing <strong>"${escapeHtml(state.globalSearchQuery)}"</strong>.`;
  
  if (matches.length === 0) {
    output.innerHTML = `
      <div class="no-selection-placeholder" style="padding: 40px; text-align: center; color: var(--text-muted);">
        <p>No matches found. Try searching for other terms like "quorum", "license", "member", or "tax".</p>
      </div>
    `;
    return;
  }
  
  // Render cards
  matches.forEach(match => {
    const sec = match.section;
    const card = document.createElement('div');
    card.className = 'search-result-card';
    card.style.padding = '18px';
    card.style.marginBottom = '12px';
    card.style.backgroundColor = 'var(--bg-tertiary)';
    card.style.border = '1px solid var(--border-color)';
    card.style.borderRadius = 'var(--border-radius-md)';
    card.style.cursor = 'pointer';
    card.style.transition = 'all var(--transition-fast)';
    
    card.addEventListener('mouseenter', () => {
      card.style.borderColor = 'var(--accent-color)';
      card.style.transform = 'translateY(-2px)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.borderColor = 'var(--border-color)';
      card.style.transform = 'translateY(0)';
    });
    
    card.addEventListener('click', () => {
      navigateToSection(sec.id);
    });
    
    // Highlight query in the single-line snippet
    const regex = new RegExp(`(${escapeRegExp(state.globalSearchQuery)})`, 'gi');
    const highlightedSnippet = match.snippet.replace(regex, '<span class="highlight-match">$1</span>');
    
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <h4 style="margin: 0; font-family: var(--font-title); font-size: 1.05rem; color: var(--accent-light);">
          Section ${sec.number}: ${sec.title}
        </h4>
        <span class="badge badge-tier-${sec.tier === 'General' ? 'general' : (sec.tier === 'Village Panchayat' ? 'vp' : 'zp')}" style="font-size: 0.72rem;">
          ${sec.tier}
        </span>
      </div>
      <p style="font-size: 0.88rem; color: var(--text-secondary); line-height: 1.45; margin: 0; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; display: block;">
        ${highlightedSnippet || 'Keyword found in title or section index reference.'}
      </p>
    `;
    
    output.appendChild(card);
  });
}

function formatLegalText(text) {
  if (!text) return '';
  
  // Clean raw lines
  const rawLines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // First, split heading and first subsection if they are combined on the same line
  const cleanedLines = [];
  rawLines.forEach(line => {
    const splitMatch = line.match(/^(\d+(?:-[A-Z]+)?(?:-Z-[A-Z]+)?\.\s+[A-Z][^.—]*?[.——\s]*)\s*(?:[—\s-]*)\s*(\(\d+[A-Z]?\)\s*.*)$/s);
    if (splitMatch) {
      cleanedLines.push(splitMatch[1].trim());
      cleanedLines.push(splitMatch[2].trim());
    } else {
      cleanedLines.push(line);
    }
  });
  
  const paragraphs = [];
  
  // Helpers to detect new block markers
  const isNewBlock = (line) => {
    // 1. Heading (e.g. "3. Declaration...—")
    if (/^\d+(?:-[A-Z]+)?(?:-Z-[A-Z]+)?\.\s+[A-Z]/.test(line)) return true;
    // 2. Subsection (e.g. "— (1)")
    if (/^[—\s]*\(\d+[A-Z]?\)/.test(line)) return true;
    // 3. Clause (e.g. "— (a)")
    if (/^[—\s]*\([a-z]+\)/.test(line)) return true;
    // 4. Subclause (e.g. "— (i)")
    if (/^[—\s]*\([ivx]+\)/.test(line)) return true;
    // 5. Proviso (e.g. "Provided that")
    if (line.startsWith('Provided that') || line.startsWith('Provided further that') || line.startsWith('Provided, however, that')) return true;
    // 6. Explanation (e.g. "Explanation:")
    if (line.startsWith('Explanation') || line.startsWith('Explanation:')) return true;
    
    return false;
  };
  
  // Merge split lines
  cleanedLines.forEach(line => {
    if (paragraphs.length === 0) {
      paragraphs.push(line);
      return;
    }
    
    const lastIndex = paragraphs.length - 1;
    const lastLine = paragraphs[lastIndex];
    let shouldMerge = false;
    
    if (!isNewBlock(line)) {
      const endsWithTerminal = /[.;:]\s*$/.test(lastLine);
      if (!endsWithTerminal) {
        shouldMerge = true;
      } else {
        const startsWithLowercase = /^[a-z]/.test(line);
        if (startsWithLowercase) {
          shouldMerge = true;
        }
      }
    }
    
    if (shouldMerge) {
      paragraphs[lastIndex] = lastLine + ' ' + line;
    } else {
      paragraphs.push(line);
    }
  });
  
  let html = '';
  paragraphs.forEach(para => {
    // Section Title Heading (e.g. "3. Declaration...—")
    const titleRegex = /^(\d+(?:-[A-Z]+)?(?:-Z-[A-Z]+)?)\.\s+([A-Z][a-zA-Z\s,()&'’:\n-]{3,100}?)[.——]/;
    if (titleRegex.test(para)) {
      html += `<div class="legal-header">${para}</div>`;
      return;
    }
    
    // Provisos
    if (para.startsWith('Provided that') || para.startsWith('Provided further that') || para.startsWith('Provided, however, that')) {
      html += `<div class="legal-proviso">${para}</div>`;
      return;
    }
    
    // Explanations
    if (para.startsWith('Explanation') || para.startsWith('Explanation:')) {
      html += `<div class="legal-explanation">${para}</div>`;
      return;
    }
    
    // Sub-sections starting with (1), (2), (10), etc. (allowing leading dashes/spaces)
    const subSecMatch = para.match(/^[—\s]*\((\d+[A-Z]?)\)\s*(.*)$/s);
    if (subSecMatch) {
      html += `
        <div class="legal-subsection">
          <span class="legal-num">(${subSecMatch[1]})</span>
          <span class="legal-body">${subSecMatch[2]}</span>
        </div>
      `;
      return;
    }
    
    // Clauses starting with (a), (b), (z), (aa), etc.
    const clauseMatch = para.match(/^[—\s]*\(([a-z]+)\)\s*(.*)$/s);
    if (clauseMatch) {
      html += `
        <div class="legal-clause">
          <span class="legal-num">(${clauseMatch[1]})</span>
          <span class="legal-body">${clauseMatch[2]}</span>
        </div>
      `;
      return;
    }
    
    // Sub-clauses starting with (i), (ii), (iv), (ix), etc.
    const subClauseMatch = para.match(/^[—\s]*\(([ivx]+)\)\s*(.*)$/s);
    if (subClauseMatch) {
      html += `
        <div class="legal-subclause">
          <span class="legal-num">(${subClauseMatch[1]})</span>
          <span class="legal-body">${subClauseMatch[2]}</span>
        </div>
      `;
      return;
    }
    
    // Fallback paragraph
    html += `<p class="legal-paragraph">${para}</p>`;
  });
  
  return html;
}

// Walk DOM nodes to safely highlight search terms without corrupting tags
function highlightSearchQueryInElement(element, query) {
  if (!query || query.length < 3) return;
  const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
  
  function walk(node) {
    if (node.nodeType === 3) { // Text node
      const parent = node.parentNode;
      if (parent && parent.classList && parent.classList.contains('highlight-match')) {
        return;
      }
      
      const text = node.nodeValue;
      if (regex.test(text)) {
        const span = document.createElement('span');
        span.innerHTML = text.replace(regex, '<span class="highlight-match">$1</span>');
        parent.replaceChild(span, node);
      }
    } else {
      const children = Array.from(node.childNodes);
      children.forEach(walk);
    }
  }
  walk(element);
}
