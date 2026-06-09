chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { type, url } = message;

  if (type === 'checkLink') {
    fetch(
      `https://www.google.com/~netfree/test-url?u=${encodeURIComponent(url)}&h=000000000000`
    )
      .then(r => r.json())
      .then(data => sendResponse(data))
      .catch(console.error);

    return true;
  }
});

async function getBlocked(tabId) {
  const res = await chrome.storage.session.get(`blocked_${tabId}`);
  return res[`blocked_${tabId}`] ?? [];
}

async function setBlocked(tabId, list) {
  await chrome.storage.session.set({ [`blocked_${tabId}`]: list });
}

async function clearBlocked(tabId) {
  await chrome.storage.session.remove(`blocked_${tabId}`);
}

async function fetchBlockReason(url) {
  try {
    const res = await fetch(url);
    if (res.status === 418) return await res.text();
  } catch {}
  return null;
}

chrome.webRequest.onCompleted.addListener(
  async (details) => {
    if (details.statusCode !== 418 || details.tabId < 0) return;
    const { tabId, url } = details;

    const list = await getBlocked(tabId);
    if (list.some(item => item.url === url)) return;

    const html = await fetchBlockReason(url);
    list.push({ url, html });
    await setBlocked(tabId, list);

    chrome.action.setBadgeText({ text: String(list.length), tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#ff0000', tabId });
  },
  { urls: ['<all_urls>'] }
);

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0) return;
  await clearBlocked(details.tabId);
  chrome.action.setBadgeText({ tabId: details.tabId, text: '' });
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  await clearBlocked(tabId);
});
