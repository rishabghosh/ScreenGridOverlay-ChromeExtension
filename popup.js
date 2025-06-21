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
    });
  });
});

document.getElementById("clear").addEventListener("click", () => {
  chrome.storage.sync.set({ lines: [] }, () => {
    alert("All lines cleared. Refresh the tab.");
  });
});