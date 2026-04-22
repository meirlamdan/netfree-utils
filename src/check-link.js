const tooltip = document.createElement('div');
tooltip.id = 'custom-ctrl-tooltip';
document.body.appendChild(tooltip);

let currentTarget = null;
let isLoading = false;

function extractDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

function buildTooltipHTML(icon, label, domain) {
  const domainRow = domain ? `<div class="nf-domain-row">${domain}</div>` : '';
  return `<div class="nf-status-row"><span class="nf-status-label">${label}</span><span class="nf-status-icon">${icon}</span></div>${domainRow}`;
}

const ICONS = {
  check:    `<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor" stroke-width="1.5"/><path d="M4 7.5L6.5 10L11 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  x:        `<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor" stroke-width="1.5"/><path d="M5 5L10 10M10 5L5 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  question: `<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor" stroke-width="1.5"/><path d="M5.5 5.5C5.5 4.4 6.4 3.5 7.5 3.5C8.6 3.5 9.5 4.4 9.5 5.5C9.5 6.6 8.6 7.5 7.5 7.5V9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="7.5" cy="11" r="0.8" fill="currentColor"/></svg>`,
  search:   `<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" stroke-width="1.5"/><path d="M10 10L13 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  warning:  `<svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.5 1.5L13.5 12.5H1.5L7.5 1.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M7.5 5.5V8.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="7.5" cy="10.5" r="0.8" fill="currentColor"/></svg>`,
};

const ALL_STATUS_CLASSES = ['nf-status--loading', 'nf-status--open', 'nf-status--blocked', 'nf-status--unknown', 'nf-status--error'];

function setStatus(cls) {
  tooltip.classList.remove(...ALL_STATUS_CLASSES);
  if (cls) tooltip.classList.add(cls);
}

function showTooltip() {
  tooltip.style.display = 'inline-block';
  tooltip.getBoundingClientRect();
  tooltip.style.opacity = '1';
}

function hideTooltip() {
  tooltip.style.display = 'none';
  tooltip.style.opacity = '0';
  currentTarget = null;
  isLoading = false;
  tooltip.classList.remove('arrow-up', 'arrow-down');
  setStatus(null);
}

const LOADING_DOTS = `<span class="nf-dots"><span></span><span></span><span></span></span>`;

document.addEventListener('mouseover', async (event) => {
  const link = event.target.closest('a');
  if (link && event.ctrlKey) {
    if (currentTarget !== link) {
      hideTooltip();
    } else if (isLoading) {
      return;
    }
    currentTarget = link;
    try {
      isLoading = true;
      setStatus('nf-status--loading');
      tooltip.innerHTML = buildTooltipHTML(LOADING_DOTS, 'בודק', '');
      showTooltip();
      updateSmartPosition(link);
      const data = await chrome.runtime.sendMessage({ type: 'checkLink', url: link.href });
      if (currentTarget === link) {
        const domain = extractDomain(link.href);
        if (!data) {
          setStatus('nf-status--error');
          tooltip.innerHTML = buildTooltipHTML(ICONS.warning, 'שגיאה בקבלת מידע', domain);
        } else if (!data.block) {
          setStatus('nf-status--open');
          tooltip.innerHTML = buildTooltipHTML(ICONS.check, 'פתוח', domain);
        } else if (data.block === 'unknown' || data.block === 'unknown-video') {
          setStatus('nf-status--unknown');
          tooltip.innerHTML = buildTooltipHTML(ICONS.question, 'לא נבדק', domain);
        } else if (data.block === 'indev') {
          setStatus('nf-status--unknown');
          tooltip.innerHTML = buildTooltipHTML(ICONS.search, 'מחפשים פתרונות', domain);
        } else {
          setStatus('nf-status--blocked');
          tooltip.innerHTML = buildTooltipHTML(ICONS.x, 'נחסם', domain);
        }
        updateSmartPosition(link);
      }
    } catch (e) {
      if (currentTarget === link) {
        setStatus('nf-status--error');
        tooltip.innerHTML = buildTooltipHTML(ICONS.warning, 'שגיאה בקבלת מידע', extractDomain(link.href));
        updateSmartPosition(link);
      }
    } finally {
      isLoading = false;
    }
  } else if (currentTarget && currentTarget !== link) {
    hideTooltip();
  }
});

document.addEventListener('mouseout', (event) => {
  const link = event.target.closest('a');
  if (link) {
    hideTooltip();
  }
});

document.addEventListener('keyup', (event) => {
  if (event.key === 'Control') {
    hideTooltip();
  }
});

function updateSmartPosition(element) {
  const rect = element.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const gap = 8;
  const padding = 10;

  tooltip.classList.remove('arrow-up', 'arrow-down');

  let top;
  let arrowDirection;

  const defaultTop = rect.bottom + gap;

  if (defaultTop + tooltipRect.height > window.innerHeight) {
    top = rect.top - tooltipRect.height - gap;
    arrowDirection = 'arrow-down';
  } else {
    top = defaultTop;
    arrowDirection = 'arrow-up';
  }

  tooltip.classList.add(arrowDirection);

  top += window.scrollY;

  let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);

  if (left < padding) {
    left = padding;
  } else if (left + tooltipRect.width > window.innerWidth - padding) {
    left = window.innerWidth - tooltipRect.width - padding;
  }

  left += window.scrollX;

  tooltip.style.top = `${top}px`;
  tooltip.style.left = `${left}px`;
}

window.addEventListener('scroll', () => {
  if (tooltip.style.display !== 'none' && currentTarget) {
    updateSmartPosition(currentTarget);
  }
});
