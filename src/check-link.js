let popup = null;
let isHovering = false;
let isKeyPressed = false;
let currentLink = null;

const messages = {
  unknown: 'לא נבדק ❓',
  'unknown-video': 'לא נבדק ❓',
  custom: 'נחסם ❌',
  deny: 'נחסם ❌',
  'special-site': 'נחסם ❌',
  indev: 'מחפשים פתרונות... 🤔',
}
popup = document.createElement('div');
popup.dir = 'rtl';
popup.className = 'popup';
popup.style.pointerEvents = 'none';
popup.style.display = 'none';
document.body.appendChild(popup);

function updatePopupPosition(e) {
  popup.style.left = `${e.clientX + 10}px`;
  popup.style.top = `${e.clientY + 10}px`;
}

function showPopup(text, e) {
  popup.textContent = text;
  updatePopupPosition(e);
  popup.style.display = 'block';
}

function hidePopup() {
  popup.style.display = 'none';
}

function fetchLinkInfo(url) {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage({ type: 'checkLink', url }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    } catch (err) {
      reject(err);
    }
  });
}

async function maybeShowInfo(link, e) {
  if (isHovering && isKeyPressed) {
    showPopup("בודק ...", e);
  }
  try {
    const data = await fetchLinkInfo(link.href);
    if (isHovering && isKeyPressed && currentLink === link) {
      showPopup(!data ? '⚠️ שגיאה בקבלת מידע' : !data.block ? 'פתוח ✅' : messages[data.block] || data.block, e);
    }
  } catch (err) {
    showPopup('⚠️ שגיאה בקבלת מידע', e);
  }
}

function addEventListenerToLink(link) {
  link.addEventListener('mouseenter', (e) => {
    isHovering = true;
    currentLink = link;
    maybeShowInfo(link, e);
  });

  link.addEventListener('mousemove', (e) => {
    updatePopupPosition(e);
  });

  link.addEventListener('mouseleave', () => {
    isHovering = false;
    hidePopup();
  });
}

document.querySelectorAll('a').forEach(link => {
  addEventListenerToLink(link);
});

function handleKeyDown(e) {
  if (e.altKey || e.ctrlKey) {
    isKeyPressed = true;
    if (isHovering && currentLink) {
      maybeShowInfo(currentLink, e);
    }
  }
}

function handleKeyUp(e) {
  if (!e.altKey && !e.ctrlKey) {
    isKeyPressed = false;
    hidePopup();
  }
}

document.addEventListener('keydown', handleKeyDown);
document.addEventListener('keyup', handleKeyUp);
document.body.addEventListener('keydown', handleKeyDown);
document.body.addEventListener('keyup', handleKeyUp);

observeElements("a", (link) => {
  addEventListenerToLink(link);
});

