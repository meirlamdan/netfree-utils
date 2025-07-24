function replaceIframe(iframe) {
  const videoId = iframe.src?.split("embed/")[1]?.split("?")[0];
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  const link = `https://netfree.link/app/#/tickets/new?u=${encodeURIComponent(iframe.src)}&r=${encodeURIComponent(window.location.href)}&t=video`;

  const placeholder = document.createElement("div");
  placeholder.style.width = iframe.width + 'px';
  placeholder.style.height = iframe.height + 'px'
  placeholder.style.backgroundImage = `url(${thumbnailUrl})`;
  placeholder.className = "yt-placeholder";

  placeholder.innerHTML = `
    <a class="yt-placeholder-link" href="${link}" target="_blank" rel="noopener noreferrer">
      <div class="yt-placeholder-msg">שלח את הסרטון לבדיקה</div>
    </a>
  `;
  iframe.parentNode.replaceChild(placeholder, iframe);
}

function handleIframe(iframe) {
  try {
    chrome.runtime.sendMessage({ type: 'checkLink', url: iframe.src }, (response) => {
      if (response.block === 'unknown-video') {
        replaceIframe(iframe);
      }
    });
  } catch (err) {
    console.error(err);
  }
}

function replaceBlockedYouTubeIframes() {
  const iframes = document.querySelectorAll("iframe[src*='youtube.com/embed/']");
  iframes.forEach((iframe) => {
    handleIframe(iframe);
  });
}

replaceBlockedYouTubeIframes();

observeElements("iframe[src*='youtube.com/embed/']", (iframe) => {
  handleIframe(iframe);
});







