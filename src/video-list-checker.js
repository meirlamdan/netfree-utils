(() => {

const ICONS = {
  check:    `<svg width="10" height="10" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 7.5L6.5 11L12 4" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  x:        `<svg width="10" height="10" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4L11 11M11 4L4 11" stroke="white" stroke-width="2.2" stroke-linecap="round"/></svg>`,
  question: `<svg width="10" height="10" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5.5 5.5C5.5 4.4 6.4 3.5 7.5 3.5C8.6 3.5 9.5 4.4 9.5 5.5C9.5 6.6 8.6 7.5 7.5 7.5V9" stroke="white" stroke-width="1.8" stroke-linecap="round"/><circle cx="7.5" cy="11" r="1" fill="white"/></svg>`,
  warning:  `<svg width="10" height="10" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.5 2L13.5 12.5H1.5L7.5 2Z" stroke="white" stroke-width="1.8" stroke-linejoin="round"/><path d="M7.5 6V9" stroke="white" stroke-width="1.8" stroke-linecap="round"/><circle cx="7.5" cy="11" r="0.8" fill="white"/></svg>`,
};

const STATUS_CONFIG = {
  loading: { icon: '',             label: 'בודק...' },
  open:    { icon: ICONS.check,    label: 'פתוח' },
  blocked: { icon: ICONS.x,       label: 'נחסם' },
  unknown: { icon: ICONS.question, label: 'לא נבדק' },
  error:   { icon: ICONS.warning,  label: 'שגיאה' },
};

// Page-level CSS (index.css) does not reach shadow roots, so badge styles
// are duplicated here and injected into every shadow root we scan.
const BADGE_CSS = `
.nf-vbadge {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 16px !important;
  height: 16px !important;
  min-width: 16px !important;
  border-radius: 50% !important;
  flex-shrink: 0 !important;
  cursor: default !important;
  /* pointer-events must stay enabled for the title tooltip to show on hover,
     and the badge must sit above transparent click-overlays (YouTube lockups) */
  pointer-events: auto !important;
  position: relative !important;
  z-index: 100 !important;
  text-decoration: none !important;
  box-shadow: none !important;
  box-sizing: border-box !important;
  visibility: visible !important;
  opacity: 1 !important;
  line-height: 0 !important;
  margin-inline-end: 5px !important;
}
.nf-vbadge--loading {
  background: transparent !important;
  border: 2px solid #dee2e6 !important;
  border-top-color: #4dabf7 !important;
  animation: nf-vbadge-spin 0.75s linear infinite !important;
}
.nf-vbadge--open    { background: #40c057 !important; }
.nf-vbadge--blocked { background: #fa5252 !important; }
.nf-vbadge--unknown { background: #fab005 !important; }
.nf-vbadge--error   { background: #fd7e14 !important; }
.nf-vbadge--sm {
  width: 12px !important;
  height: 12px !important;
  min-width: 12px !important;
}
.nf-vbadge--sm svg {
  width: 8px !important;
  height: 8px !important;
}
@keyframes nf-vbadge-spin {
  to { transform: rotate(360deg); }
}
`;

// Add a new entry here to support additional sites.
const SITE_CONFIGS = [
  {
    // YouTube: badge video links in lists
    hostPattern: /^(www\.)?youtube\.com$/,
    resetEvent: 'yt-navigate-finish',
    isCheckableUrl(url) { return url.includes('/watch?v=') || url.includes('/shorts/'); },

    // Approach A: <a> elements that are themselves the title link
    titleLinkSelector: 'a#video-title-link, a#video-title, a.shortsLockupViewModelHostOutsideMetadataEndpoint, a.ytLockupMetadataViewModelTitle',

    // Approach B: container elements where the title is a non-link element
    // getUrl returns the video URL; getBadgeRef returns the element to prepend the badge before
    containers: [
      {
        selector: 'ytd-playlist-panel-video-renderer',
        getUrl:       (el) => el.querySelector('a#wc-endpoint')?.href,
        getBadgeRef:  (el) => el.querySelector('span#video-title'),
      },
    ],
  },
  {
    // Reddit: badge every element that visibly displays a community name
    // ("r/xxx"). The check URL is derived from the displayed name itself, so
    // link structure (overlay links, screen-reader text, nav tabs) is
    // irrelevant. Parts of the UI (e.g. the search dropdown) render inside
    // open shadow roots, hence shadowDom: true.
    hostPattern: /(^|\.)reddit\.com$/,
    shadowDom: true,
    smallBadge: true,

    // Approach C: leaf elements whose entire text is a community name
    nameElements: {
      pattern: /^\/?r\/(\w+)\/?$/,
      getUrl: (name) => `https://www.reddit.com/r/${name.toLowerCase()}/`,
    },
  },
];

const checkCache = new Map(); // check URL -> Promise<result>

function checkUrl(url) {
  if (checkCache.has(url)) return checkCache.get(url);

  const promise = new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ type: 'checkLink', url }, (response) => {
        void chrome.runtime.lastError;
        resolve(response || null);
      });
    } catch {
      resolve(null);
    }
  });

  checkCache.set(url, promise);
  promise.then((data) => { if (!data) checkCache.delete(url); }); // don't cache errors
  return promise;
}

function getStatus(data) {
  if (!data) return 'error';
  if (!data.block) return 'open';
  if (data.block === 'unknown' || data.block === 'unknown-video' || data.block === 'indev') return 'unknown';
  return 'blocked';
}

function createBadge(config) {
  const badge = document.createElement('span');
  badge.className = `nf-vbadge nf-vbadge--loading${config.smallBadge ? ' nf-vbadge--sm' : ''}`;
  badge.title = `NetFree - ${STATUS_CONFIG.loading.label}`;
  return badge;
}

function updateBadge(badge, status) {
  badge.classList.remove('nf-vbadge--loading');
  badge.classList.add(`nf-vbadge--${status}`);
  badge.innerHTML = STATUS_CONFIG[status].icon;
  badge.title = `NetFree - ${STATUS_CONFIG[status].label}`;
}

// Approach A: anchor is both the URL source and badge target
function processAnchor(anchor, config) {
  if (anchor.dataset.nfChecked) return;
  if (!config.isCheckableUrl(anchor.href)) return;

  anchor.dataset.nfChecked = 'checking';
  const badge = createBadge(config);
  anchor.prepend(badge);

  checkUrl(anchor.href).then((data) => {
    const status = getStatus(data);
    updateBadge(badge, status);
    anchor.dataset.nfChecked = status;
  });
}

// Approach B: container holds the link and a separate title element
function processContainer(container, containerConfig, config) {
  if (container.dataset.nfChecked) return;

  const url = containerConfig.getUrl(container);
  if (!url || !config.isCheckableUrl(url)) return;

  const ref = containerConfig.getBadgeRef(container);
  if (!ref) return;

  container.dataset.nfChecked = 'checking';
  const badge = createBadge(config);
  ref.parentNode.insertBefore(badge, ref);

  checkUrl(url).then((data) => {
    const status = getStatus(data);
    updateBadge(badge, status);
    container.dataset.nfChecked = status;
  });
}

// Approach C: leaf element whose entire visible text is the checkable name
function isNameElement(el, nameConfig) {
  if (el.childElementCount !== 0) return false;
  const text = el.textContent;
  if (!text || text.length > 40) return false;
  return nameConfig.pattern.test(text.trim());
}

function processNameElement(el, config) {
  if (el.dataset.nfChecked) {
    // A framework re-render may drop the badge while reusing the element
    if (el.querySelector('.nf-vbadge')) return;
    delete el.dataset.nfChecked;
  }
  if (el.isContentEditable) return;
  // Skip invisible elements (screen-reader text, hidden templates); they are
  // not marked, so the periodic rescan retries them if they become visible
  if (el.offsetWidth < 8) return;

  // If an ancestor already carries a badge for this text (the site re-wrapped
  // the text in a new inner element after it was badged), don't add another
  for (let anc = el.parentElement; anc; anc = anc.parentElement) {
    if (anc.querySelector(':scope > .nf-vbadge')) return;
  }

  const name = el.textContent.trim().match(config.nameElements.pattern)[1];

  el.dataset.nfChecked = 'checking';
  const badge = createBadge(config);
  el.prepend(badge);

  checkUrl(config.nameElements.getUrl(name)).then((data) => {
    const status = getStatus(data);
    updateBadge(badge, status);
    el.dataset.nfChecked = status;
  });
}

function scanNames(node, config) {
  if (!config.nameElements) return;
  if (node.nodeType === 1 && isNameElement(node, config.nameElements)) {
    processNameElement(node, config);
  }
  node.querySelectorAll?.('*').forEach((el) => {
    if (isNameElement(el, config.nameElements)) processNameElement(el, config);
  });
}

// ── Shadow DOM support ──

const seenShadowRoots = new WeakSet();
let badgeSheet = null;

function styleShadowRoot(root) {
  try {
    if (!badgeSheet) {
      badgeSheet = new CSSStyleSheet();
      badgeSheet.replaceSync(BADGE_CSS);
    }
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, badgeSheet];
  } catch {
    const style = document.createElement('style');
    style.textContent = BADGE_CSS;
    root.appendChild(style);
  }
}

function attachShadowRoot(root, config) {
  if (seenShadowRoots.has(root)) return;
  seenShadowRoots.add(root);
  styleShadowRoot(root);
  observeRoot(root, config);
  scanRoot(root, config);
}

function discoverShadowRoots(node, config) {
  if (node.shadowRoot) attachShadowRoot(node.shadowRoot, config);
  node.querySelectorAll?.('*').forEach((el) => {
    if (el.shadowRoot) attachShadowRoot(el.shadowRoot, config);
  });
}

// ── Scanning ──

function scanRoot(root, config) {
  if (config.titleLinkSelector) {
    root.querySelectorAll(config.titleLinkSelector)
      .forEach(a => processAnchor(a, config));
  }

  config.containers?.forEach(cc =>
    root.querySelectorAll(cc.selector)
      .forEach(el => processContainer(el, cc, config))
  );

  const base = root === document ? document.body : root;
  scanNames(base, config);
  if (config.shadowDom) discoverShadowRoots(base, config);
}

function observeRoot(root, config) {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== 1) continue;

        // Approach A
        if (config.titleLinkSelector) {
          if (node.matches?.(config.titleLinkSelector)) {
            processAnchor(node, config);
          }
          node.querySelectorAll?.(config.titleLinkSelector)
            .forEach(a => processAnchor(a, config));
        }

        // Approach B
        config.containers?.forEach(cc => {
          if (node.matches?.(cc.selector)) processContainer(node, cc, config);
          node.querySelectorAll?.(cc.selector)
            .forEach(el => processContainer(el, cc, config));
        });

        // Approach C
        scanNames(node, config);

        if (config.shadowDom) discoverShadowRoots(node, config);
      }
    }
  });

  observer.observe(root === document ? document.body : root, { childList: true, subtree: true });
}

function resetPage(config) {
  document.querySelectorAll('[data-nf-checked]').forEach(el => {
    delete el.dataset.nfChecked;
    el.querySelector('.nf-vbadge')?.remove();
  });
  setTimeout(() => scanRoot(document, config), 500);
}

const config = SITE_CONFIGS.find(c => c.hostPattern.test(location.hostname));

if (config) {
  observeRoot(document, config);
  scanRoot(document, config);

  if (config.shadowDom || config.nameElements) {
    // Catches shadow roots attached after insertion and name elements that
    // were hidden (offsetWidth 0) when first seen.
    setInterval(() => scanRoot(document, config), 2000);
  }

  if (config.resetEvent) {
    document.addEventListener(config.resetEvent, () => resetPage(config));
  }
}

})();
