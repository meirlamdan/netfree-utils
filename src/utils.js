function observeElements(selector, callback) {
  const alreadyHandled = new WeakSet();

  function handle(el) {
    if (!alreadyHandled.has(el)) {
      alreadyHandled.add(el);
      callback(el);
    }
  }

  document.querySelectorAll(selector).forEach(handle);

  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== 1) return; // אלמנטים בלבד
        const el = /** @type {Element} */ (node);

        if (el.matches(selector)) handle(el);

        if (el.querySelectorAll) {
          el.querySelectorAll(selector).forEach(handle);
        }
      });
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

