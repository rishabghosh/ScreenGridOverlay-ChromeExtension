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
      alert("Line added. Refresh the tab to see changes.");
      injectContentScript();
    });
  });
});

document.getElementById("clear").addEventListener("click", () => {
  chrome.storage.sync.set({ lines: [] }, () => {
    alert("All lines cleared. Refresh the tab.");
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
