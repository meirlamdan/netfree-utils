chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
  const tabId = tabs[0].id;

  chrome.storage.local.get("blockedPerTab", (data) => {
    const list = data.blockedPerTab?.[tabId] || [];
    const container = document.getElementById("blocked-list");

    if (list.length === 0) {
      container.textContent = "לא זוהו חסימות בכרטיסייה זו.";
    } else {
      container.innerHTML = list
        .map(url => `<div class="blocked-url">${url}</div>`)
        .join("");
    }
  });
});