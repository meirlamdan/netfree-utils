chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
  const tabId = tabs[0].id;

  chrome.storage.local.get("blockedPerTab", (data) => {
    const list = data.blockedPerTab?.[tabId] || [];
    const container = document.getElementById("blocked-list");

    if (list.length === 0) {
      container.textContent = "לא זוהו חסימות בכרטיסייה זו.";
    } else {
      container.innerHTML = list
        .map(url => `
          <div class="blocked-url-card">
            <a href="${url}" target="_blank" class="blocked-url">${url}</a>
            <button class="copy-btn" data-url="${url}" title="העתק כתובת">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="6" y="6" width="12" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/>
                <rect x="8" y="4" width="10" height="10" rx="2" fill="white" stroke="currentColor" stroke-width="1.5"/>
              </svg>
            </button>
          </div>
        `)
        .join("");

      document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const urlToCopy = this.getAttribute('data-url');
          navigator.clipboard.writeText(urlToCopy).then(() => {
            // Visual feedback - change SVG to checkmark
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
