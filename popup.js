function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const BLOCK_LABELS = {
  'deny':         { text: 'נבדק ונחסם',       color: '#c92a2a', bg: '#fff5f5', border: '#ffa8a8' },
  'special-site': { text: 'אתר מיוחד',        color: '#856404', bg: '#fff9db', border: '#ffe066' },
  'risk-type':    { text: 'סוג קובץ לא נתמך', color: '#d9480f', bg: '#fff4e6', border: '#ffc078',
    buildRequestUrl: (url) => `https://netfree.link/app/#/tickets/new?u=${encodeURIComponent(url)}&r=&t=file&bi=` },
  'unknown':       { text: 'טרם נבדק',         color: '#1971c2', bg: '#e7f5ff', border: '#74c0fc',
    buildRequestUrl: (url) => `https://netfree.link/app/#/tickets/new?u=${encodeURIComponent(url)}&r=&t=site&bi=` },
  'unknown-video': { text: 'וידאו טרם נבדק',  color: '#5f3dc4', bg: '#f3f0ff', border: '#b197fc',
    buildRequestUrl: (url) => `https://netfree.link/app/#/tickets/new?u=${encodeURIComponent(url)}&r=&t=video&bi=` },
  'indev':         { text: 'בבדיקה',           color: '#2f9e44', bg: '#ebfbee', border: '#8ce99a' },
  'badwords':      { text: 'רובוט זיהה תוכן לא ראוי', color: '#862e9c', bg: '#f8f0fc', border: '#da77f2' },
};

function parseBlockReason(html) {
  if (!html) return null;
  try {
    const match = html.match(/\/\/netfree\.link\/block\/#([^"]+)/);
    if (!match) return null;
    const json = JSON.parse(decodeURIComponent(match[1]));
    return {
      block: json.block ?? null,
      url: json.page_info?.url ?? null,
      technicalInfo: json.blockTechnicalInfo ?? null,
    };
  } catch {
    return null;
  }
}

function getBlockInfo(item) {
  if (!item || !item.html) return { accentColor: '#e8eaed', footerHtml: '' };

  const parsed = parseBlockReason(item.html);
  // const label = parsed?.block ? (BLOCK_LABELS[parsed.block] ?? { text: parsed.block, color: '#5c5f66', bg: '#f8f9fa', border: '#dee2e6' }) : null;
  const label =  BLOCK_LABELS[parsed?.block] || null;

  if (label) {
    let text = label.text;
    if (parsed.block === 'special-site' && parsed.url) {
      try { text = new URL(parsed.url).hostname + ' — ' + label.text; } catch {}
    }

    const requestUrl = label.buildRequestUrl && parsed.url ? label.buildRequestUrl(parsed.url) : null;
    const requestLink = requestUrl
      ? `<a class="request-link" href="${escapeHtml(requestUrl)}" target="_blank">שלח לבדיקה ←</a>`
      : '';

    const copyTechBtn = parsed.technicalInfo
      ? `<button class="copy-tech-btn" data-tech="${escapeHtml(parsed.technicalInfo)}">העתק פרטי חסימה</button>`
      : '';

    const badge = `<span class="block-tag" style="color:${label.color};background:${label.bg};border-color:${label.border}"><span class="block-dot" style="background:${label.color}"></span>${escapeHtml(text)}${requestLink}${copyTechBtn}</span>`;

    return {
      accentColor: label.color,
      footerHtml: `<div class="card-footer">${badge}</div>`,
    };
  }

  return {
    accentColor: '#e8eaed',
    footerHtml: `
      <div class="block-reason-wrap">
        <button class="copy-html-btn" data-html="${escapeHtml(item.html)}">העתק HTML</button>
        <pre class="block-reason">${escapeHtml(item.html)}</pre>
      </div>`,
  };
}

chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
  const tabId = tabs[0].id;

  chrome.storage.session.get(`blocked_${tabId}`, (data) => {
    const list = data[`blocked_${tabId}`] || [];
    const container = document.getElementById("blocked-list");

    if (list.length === 0) {
      container.textContent = "לא זוהו חסימות בכרטיסייה זו.";
    } else {
      container.innerHTML = list
        .map(item => {
          const { footerHtml } = getBlockInfo(item);
          return `
            <div class="blocked-url-card">
              <a href="${escapeHtml(item.url)}" target="_blank" class="blocked-url">${escapeHtml(item.url)}</a>
              <button class="copy-btn" data-url="${escapeHtml(item.url)}" title="העתק כתובת">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="6" y="6" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/>
                  <rect x="8" y="4" width="10" height="10" rx="2" fill="white" stroke="currentColor" stroke-width="1.5"/>
                </svg>
              </button>
              ${footerHtml}
            </div>`;
        })
        .join("");

      document.querySelectorAll('.copy-html-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const html = this.getAttribute('data-html');
          navigator.clipboard.writeText(html).then(() => {
            const orig = this.textContent;
            this.textContent = '✓';
            this.style.color = 'green';
            setTimeout(() => { this.textContent = orig; this.style.color = ''; }, 1000);
          });
        });
      });

      document.querySelectorAll('.copy-tech-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const tech = this.getAttribute('data-tech');
          navigator.clipboard.writeText(tech).then(() => {
            const orig = this.textContent;
            this.textContent = '✓ הועתק';
            setTimeout(() => { this.textContent = orig; }, 1200);
          });
        });
      });

      document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const urlToCopy = this.getAttribute('data-url');
          navigator.clipboard.writeText(urlToCopy).then(() => {
            const originalSVG = this.innerHTML;
            this.innerHTML = `
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            `;
            this.style.color = 'green';
            setTimeout(() => {
              this.innerHTML = originalSVG;
              this.style.color = '';
            }, 1000);
          }).catch(err => {
            console.error('Failed to copy: ', err);
          });
        });
      });
    }
  });
});
