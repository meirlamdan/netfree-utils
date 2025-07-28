chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { type, url } = message;

  if (type === 'checkLink') {
    fetch(
      `https://www.google.com/~netfree/test-url?u=${encodeURIComponent(
        url
      )}`
    )
      .then(r => r.json())
      .then(data => {
        sendResponse(data);
      })
      .catch(console.error);

    return true;
  }
});

let blockedPerTab = {};
chrome.webRequest.onCompleted.addListener(
  function (details) {
    if (details.statusCode === 418 && details.tabId >= 0) {
      const tabId = details.tabId;

      if (!blockedPerTab[tabId]) {
        blockedPerTab[tabId] = [];
      }
      
      const existing = blockedPerTab[tabId].find(url => url === details.url);
      if (existing) {
        return;
      }

      blockedPerTab[tabId].push(
        details.url
      );

      chrome.storage.local.set({ blockedPerTab });

      chrome.action.setBadgeText({ text: blockedPerTab[tabId].length.toString(), tabId });
      chrome.action.setBadgeBackgroundColor({ color: "#ff0000", tabId });
    }
  },
  { urls: ["<all_urls>"] }
);

chrome.tabs.onRemoved.addListener(function (tabId) {
  delete blockedPerTab[tabId];
  chrome.storage.local.set({ blockedPerTab });
});
