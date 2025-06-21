document.getElementById("lineForm").addEventListener("submit", function(e) {
  e.preventDefault();
  const form = e.target;
  const line = {
    type: form.type.value,
    position: parseInt(form.position.value),
    color: form.color.value,
    thickness: parseInt(form.thickness.value)
  };

  chrome.storage.sync.get(["lines"], (data) => {
    const lines = data.lines || [];
    lines.push(line);
    chrome.storage.sync.set({ lines }, () => {
      showNotification("Line added. Refresh the tab to see changes.");
      injectContentScript();
    });
  });
});

document.getElementById("clear").addEventListener("click", () => {
  chrome.storage.sync.set({ lines: [] }, () => {
    showNotification("All lines cleared. Refresh the tab.");
    injectContentScript();
  });
});

function injectContentScript() {
  if (chrome.scripting && chrome.tabs) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        chrome.scripting.executeScript({
          target: {tabId: tabs[0].id},
          files: ["content.js"]
        });
      }
    });
  }
}

function showNotification(message) {
  let notif = document.createElement('div');
  notif.textContent = message;
  notif.style.position = 'fixed';
  notif.style.top = '16px';
  notif.style.right = '16px';
  notif.style.background = '#323232';
  notif.style.color = '#fff';
  notif.style.padding = '8px 16px';
  notif.style.borderRadius = '4px';
  notif.style.fontSize = '14px';
  notif.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
  notif.style.zIndex = 10000;
  notif.style.opacity = '0.95';
  document.body.appendChild(notif);
  setTimeout(() => notif.remove(), 2000);
}
