document.getElementById("lineForm").addEventListener("submit", function(e) {
  e.preventDefault();
  const form = e.target;
  const line = {
    type: form.type.value,
    position: parseInt(form.position.value),
    color: form.color.value,
    thickness: parseInt(form.thickness.value),
    hidden: false // new lines will be visible by default
  };

  chrome.storage.sync.get(["lines"], (data) => {
    const lines = data.lines || [];
    lines.push(line);
    chrome.storage.sync.set({ lines }, () => {
      showNotification("Line added!");
      injectContentScript();
      renderLinesList();
    });
  });
});

document.getElementById("clear").addEventListener("click", () => {
  chrome.storage.sync.set({ lines: [] }, () => {
    showNotification("All lines cleared!");
    injectContentScript();
    renderLinesList();
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

// Render the list of lines with remove/hide controls
function renderLinesList() {
  chrome.storage.sync.get(["lines"], (data) => {
    const lines = data.lines || [];
    const listDiv = document.getElementById("linesList");
    listDiv.innerHTML = '';
    if (lines.length === 0) {
      listDiv.textContent = 'No lines added.';
      return;
    }
    lines.forEach((line, idx) => {
      const lineDiv = document.createElement('div');
      lineDiv.style.display = 'flex';
      lineDiv.style.alignItems = 'center';
      lineDiv.style.margin = '4px 0';
      lineDiv.style.gap = '8px';
      lineDiv.innerHTML = `
        <span style="width:16px;height:16px;display:inline-block;background:${line.color};border-radius:2px;"></span>
        <span>${line.type} @ ${line.position}px, ${line.thickness}px</span>
      `;
      // Hide/Show button
      const hideBtn = document.createElement('button');
      hideBtn.textContent = line.hidden ? 'Show' : 'Hide';
      hideBtn.onclick = () => {
        lines[idx].hidden = !lines[idx].hidden;
        chrome.storage.sync.set({ lines }, () => {
          injectContentScript();
          renderLinesList();
        });
      };
      // Remove button
      const removeBtn = document.createElement('button');
      removeBtn.textContent = 'Remove';
      removeBtn.onclick = () => {
        lines.splice(idx, 1);
        chrome.storage.sync.set({ lines }, () => {
          injectContentScript();
          renderLinesList();
        });
      };
      lineDiv.appendChild(hideBtn);
      lineDiv.appendChild(removeBtn);
      listDiv.appendChild(lineDiv);
    });
  });
}

// --- Quick Colors and Spectrum Picker ---
const quickColors = [
  '#ff0000', // Red
  '#00ff00', // Green
  '#ffff00', // Yellow
  '#00ffff', // Cyan
  '#ff00ff', // Magenta
  '#ffa500'  // Orange
];

window.addEventListener('DOMContentLoaded', () => {
  const quickColorsDiv = document.getElementById('quickColors');
  const colorInput = document.querySelector('input[name="color"]');
  quickColors.forEach(color => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.style.background = color;
    btn.style.width = '24px';
    btn.style.height = '24px';
    btn.style.border = '1px solid #ccc';
    btn.style.borderRadius = '4px';
    btn.style.cursor = 'pointer';
    btn.title = color;
    btn.onclick = () => {
      colorInput.value = color;
    };
    quickColorsDiv.appendChild(btn);
  });

  // Spectrum picker
  const colorPickerBtn = document.getElementById('colorPickerBtn');
  const spectrumColor = document.getElementById('spectrumColor');
  colorPickerBtn.onclick = () => {
    spectrumColor.click();
  };
  spectrumColor.oninput = (e) => {
    colorInput.value = e.target.value;
  };
});

// Collapsible for added lines
const toggleBtn = document.getElementById('toggleLinesList');
const collapsibleContent = document.getElementById('collapsibleLinesList');
let collapsed = false;

toggleBtn.addEventListener('click', () => {
  collapsed = !collapsed;
  toggleBtn.classList.toggle('collapsed', collapsed);
  collapsibleContent.classList.toggle('collapsed', collapsed);
});

// Call renderLinesList on popup open
renderLinesList();
