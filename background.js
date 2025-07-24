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
      .catch(console.error)

    return true;
  }
});
