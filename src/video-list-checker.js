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

// Add a new entry here to support additional sites.
const SITE_CONFIGS = [
  {
    hostPattern: /^(www\.)?youtube\.com$/,
    isVideoUrl(url) { return url.includes('/watch?v=') || url.includes('/shorts/'); },

    // Approach A: <a> elements that are themselves the title link
    titleLinkSelector: 'a#video-title-link, a#video-title, a.shortsLockupViewModelHostOutsideMetadataEndpoint',

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
];

function checkUrl(url) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ type: 'checkLink', url }, (response) => {
        resolve(response || null);
      });
    } catch {
      resolve(null);
    }
  });
}

function getStatus(data) {
  if (!data) return 'error';
  if (!data.block) return 'open';
  if (data.block === 'unknown' || data.block === 'unknown-video' || data.block === 'indev') return 'unknown';
  return 'blocked';
}

function createBadge() {
  const badge = document.createElement('span');
  badge.className = 'nf-vbadge nf-vbadge--loading';
  return badge;
}

function updateBadge(badge, status) {
  badge.className = `nf-vbadge nf-vbadge--${status}`;
  badge.innerHTML = STATUS_CONFIG[status].icon;
  badge.title = STATUS_CONFIG[status].label;
}

// Approach A: anchor is both the URL source and badge target
function processAnchor(anchor, config) {
  if (anchor.dataset.nfChecked) return;
  if (!config.isVideoUrl(anchor.href)) return;

  anchor.dataset.nfChecked = 'checking';
  const badge = createBadge();
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
  if (!url || !config.isVideoUrl(url)) return;

  const ref = containerConfig.getBadgeRef(container);
  if (!ref) return;

  container.dataset.nfChecked = 'checking';
  const badge = createBadge();
  ref.parentNode.insertBefore(badge, ref);

  checkUrl(url).then((data) => {
    const status = getStatus(data);
    updateBadge(badge, status);
    container.dataset.nfChecked = status;
  });
}

function scanPage(config) {
  document.querySelectorAll(config.titleLinkSelector)
    .forEach(a => processAnchor(a, config));

  config.containers?.forEach(cc =>
    document.querySelectorAll(cc.selector)
      .forEach(el => processContainer(el, cc, config))
  );
}

function observeNewVideos(config) {
  const containerSelectors = config.containers?.map(c => c.selector) ?? [];

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== 1) continue;

        // Approach A
        if (node.matches?.(config.titleLinkSelector)) {
          processAnchor(node, config);
        }
        node.querySelectorAll?.(config.titleLinkSelector)
          .forEach(a => processAnchor(a, config));

        // Approach B
        config.containers?.forEach(cc => {
          if (node.matches?.(cc.selector)) processContainer(node, cc, config);
          node.querySelectorAll?.(cc.selector)
            .forEach(el => processContainer(el, cc, config));
        });
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

function resetPage(config) {
  document.querySelectorAll('[data-nf-checked]').forEach(el => {
    delete el.dataset.nfChecked;
    el.querySelector('.nf-vbadge')?.remove();
  });
  setTimeout(() => scanPage(config), 500);
}

const config = SITE_CONFIGS.find(c => c.hostPattern.test(location.hostname));

if (config) {
  observeNewVideos(config);
  scanPage(config);
  document.addEventListener('yt-navigate-finish', () => resetPage(config));
}

})();
