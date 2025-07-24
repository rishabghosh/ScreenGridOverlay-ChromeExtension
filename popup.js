document.getElementById("lineForm").addEventListener("submit", function(e) {
  e.preventDefault();
  const form = e.target;
  const line = {
    type: form.type.value,
    position: parseInt(form.position.value),
    color: form.color.value,
    thickness: parseInt(form.thickness.value),
    group: form.group.value.trim() || 'Ungrouped', // Save group info, default to 'Ungrouped'
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
  chrome.storage.sync.get(["lines", "groupVisibility"], (data) => {
    const lines = data.lines || [];
    const groupVisibility = data.groupVisibility || {};
    // --- Add fold state for each group ---
    if (!window.groupFoldState) window.groupFoldState = {};
    const groupFoldState = window.groupFoldState;
    const listDiv = document.getElementById("linesList");
    listDiv.innerHTML = '';
    if (lines.length === 0) {
      listDiv.textContent = 'No lines added.';
      return;
    }
    // Group lines by group name
    const groups = {};
    lines.forEach((line, idx) => {
      const group = line.group || 'Ungrouped';
      if (!groups[group]) groups[group] = [];
      groups[group].push({ ...line, idx });
    });
    Object.keys(groups).forEach(groupName => {
      const groupDiv = document.createElement('div');
      groupDiv.style.marginBottom = '10px';
      // Allow group to be a drop target
      groupDiv.ondragover = (e) => { e.preventDefault(); groupDiv.style.background = '#3333'; };
      groupDiv.ondragleave = () => { groupDiv.style.background = ''; };
      groupDiv.ondrop = (e) => {
        e.preventDefault();
        groupDiv.style.background = '';
        const lineIdx = e.dataTransfer.getData('text/line-idx');
        if (lineIdx !== undefined && lines[lineIdx]) {
          lines[lineIdx].group = groupName;
          chrome.storage.sync.set({ lines }, () => {
            injectContentScript();
            renderLinesList();
          });
        }
      };
      // Group header with icons
      const header = document.createElement('div');
      header.style.display = 'flex';
      header.style.alignItems = 'center';
      header.style.justifyContent = 'space-between';
      header.style.fontWeight = 'bold';
      header.style.marginBottom = '4px';
      // Group name and rename/show/hide as icons
      const groupNameSpan = document.createElement('span');
      groupNameSpan.textContent = groupName;
      groupNameSpan.style.marginRight = '8px';
      header.appendChild(groupNameSpan);
      // --- Fold/Unfold button ---
      const foldBtn = document.createElement('button');
      const isFolded = groupFoldState[groupName] === true;
      foldBtn.innerHTML = isFolded ? '<span title="Unfold group" style="font-size:1.1em;">▶️</span>' : '<span title="Fold group" style="font-size:1.1em;">▼</span>';
      foldBtn.style.background = 'none';
      foldBtn.style.border = 'none';
      foldBtn.style.cursor = 'pointer';
      foldBtn.style.marginRight = '4px';
      foldBtn.onclick = () => {
        groupFoldState[groupName] = !isFolded;
        renderLinesList();
      };
      header.appendChild(foldBtn);
      // Rename icon button
      const renameBtn = document.createElement('button');
      renameBtn.innerHTML = '<span title="Rename group" style="font-size:1.1em;">✏️</span>';
      renameBtn.style.background = 'none';
      renameBtn.style.border = 'none';
      renameBtn.style.cursor = 'pointer';
      renameBtn.style.marginRight = '4px';
      renameBtn.onclick = () => {
        const newName = prompt('Rename group:', groupName);
        if (newName && newName.trim() && newName !== groupName) {
          chrome.storage.sync.get(["lines", "groupVisibility"], (data) => {
            const lines = data.lines || [];
            const groupVisibility = data.groupVisibility || {};
            lines.forEach(line => {
              if ((line.group || 'Ungrouped') === groupName) {
                line.group = newName.trim();
              }
            });
            if (groupVisibility[groupName] !== undefined) {
              groupVisibility[newName.trim()] = groupVisibility[groupName];
              delete groupVisibility[groupName];
            }
            chrome.storage.sync.set({ lines, groupVisibility }, () => {
              injectContentScript();
              renderLinesList();
            });
          });
        }
      };
      header.appendChild(renameBtn);
      // Show/hide icon button
      const toggleBtn = document.createElement('button');
      const visible = groupVisibility[groupName] !== false;
      toggleBtn.innerHTML = visible
        ? '<span title="Hide group overlays" style="font-size:1.1em;">🙈</span>'
        : '<span title="Show group overlays" style="font-size:1.1em;">👁️</span>';
      toggleBtn.style.background = 'none';
      toggleBtn.style.border = 'none';
      toggleBtn.style.cursor = 'pointer';
      toggleBtn.onclick = (e) => {
        e.stopPropagation(); // Prevent any accidental folding/unfolding
        // Only show/hide overlays, do not fold/unfold list
        chrome.storage.sync.get(["lines", "groupVisibility"], (data) => {
          const lines = data.lines || [];
          const groupVisibility = data.groupVisibility || {};
          const newVisible = !visible;
          groupVisibility[groupName] = newVisible;
          lines.forEach(line => {
            if ((line.group || 'Ungrouped') === groupName) {
              line.hidden = !newVisible;
            }
          });
          chrome.storage.sync.set({ lines, groupVisibility }, () => {
            injectContentScript();
            renderLinesList();
          });
        });
      };
      header.appendChild(toggleBtn);
      groupDiv.appendChild(header);
      // --- Only show overlays if not folded ---
      if (!isFolded && visible) {
        groups[groupName].forEach(({ idx, ...line }) => {
          const lineDiv = document.createElement('div');
          lineDiv.className = 'line-item';
          lineDiv.draggable = true;
          if (line.hidden) {
            lineDiv.style.opacity = '0.4';
            lineDiv.style.filter = 'grayscale(1)';
          } else {
            lineDiv.style.opacity = '';
            lineDiv.style.filter = '';
          }
          // Overlay content container
          const contentSpan = document.createElement('span');
          contentSpan.innerHTML = `<span style="width:16px;height:16px;display:inline-block;background:${line.color};border-radius:2px;"></span> <span>${line.name ? line.name + ' - ' : ''}${line.type} @ ${line.position}px, ${line.thickness}px</span>`;
          lineDiv.appendChild(contentSpan);
          // Action buttons container
          const actionsDiv = document.createElement('span');
          actionsDiv.style.display = 'flex';
          actionsDiv.style.gap = '4px'; // Slightly increase space between buttons
          actionsDiv.style.marginLeft = 'auto';
          actionsDiv.style.alignItems = 'center';
          actionsDiv.style.background = 'none';
          actionsDiv.style.boxShadow = 'none';
          actionsDiv.style.padding = '0';
          // Rename overlay button
          const renameOverlayBtn = document.createElement('button');
          renameOverlayBtn.innerHTML = '<span title="Rename overlay" style="font-size:1.1em;">✏️</span>';
          renameOverlayBtn.style.background = 'none';
          renameOverlayBtn.style.border = '1px solid #444';
          renameOverlayBtn.style.borderRadius = '5px';
          renameOverlayBtn.style.cursor = 'pointer';
          renameOverlayBtn.style.margin = '0';
          renameOverlayBtn.style.padding = '2px 6px';
          renameOverlayBtn.onclick = (e) => {
            e.preventDefault();
            // Create a popup for renaming and group selection
            const popup = document.createElement('div');
            popup.style.position = 'fixed';
            popup.style.left = Math.min(e.clientX, window.innerWidth - 320) + 'px';
            popup.style.top = Math.min(e.clientY, window.innerHeight - 180) + 'px';
            popup.style.background = '#23232b';
            popup.style.color = '#fff';
            popup.style.padding = '22px 26px 18px 26px';
            popup.style.borderRadius = '14px';
            popup.style.boxShadow = '0 8px 32px 0 #000c, 0 1.5px 8px #0006';
            popup.style.zIndex = 99999;
            popup.style.display = 'flex';
            popup.style.flexDirection = 'column';
            popup.style.gap = '14px';
            popup.style.minWidth = '240px';
            popup.style.maxWidth = '320px';
            popup.style.fontSize = '1.08em';
            // Name input
            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.value = line.name || '';
            nameInput.placeholder = 'Overlay name';
            nameInput.style.padding = '6px 10px';
            nameInput.style.borderRadius = '6px';
            nameInput.style.border = '1px solid #444';
            nameInput.style.background = '#181820';
            nameInput.style.color = '#fff';
            nameInput.style.fontSize = '1.08em';
            nameInput.style.width = '100%';
            // Group dropdown
            const groupSelect = document.createElement('select');
            Object.keys(groups).forEach(g => {
              const opt = document.createElement('option');
              opt.value = g;
              opt.textContent = g;
              if (g === line.group) opt.selected = true;
              groupSelect.appendChild(opt);
            });
            groupSelect.style.padding = '6px 10px';
            groupSelect.style.borderRadius = '6px';
            groupSelect.style.border = '1px solid #444';
            groupSelect.style.background = '#181820';
            groupSelect.style.color = '#fff';
            groupSelect.style.fontSize = '1.08em';
            groupSelect.style.width = '100%';
            // Save button
            const saveBtn = document.createElement('button');
            saveBtn.textContent = 'Save';
            saveBtn.style.background = '#444';
            saveBtn.style.color = '#fff';
            saveBtn.style.border = 'none';
            saveBtn.style.borderRadius = '6px';
            saveBtn.style.padding = '7px 18px';
            saveBtn.style.cursor = 'pointer';
            saveBtn.style.fontWeight = 'bold';
            saveBtn.style.boxShadow = '0 1px 4px #0002';
            saveBtn.onclick = () => {
              lines[idx].name = nameInput.value.trim();
              lines[idx].group = groupSelect.value;
              chrome.storage.sync.set({ lines }, () => {
                injectContentScript();
                renderLinesList();
                document.body.removeChild(popup);
              });
            };
            // Cancel button
            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Cancel';
            cancelBtn.style.background = 'none';
            cancelBtn.style.color = '#fff';
            cancelBtn.style.border = '1px solid #444';
            cancelBtn.style.borderRadius = '6px';
            cancelBtn.style.padding = '7px 18px';
            cancelBtn.style.cursor = 'pointer';
            cancelBtn.style.boxShadow = '0 1px 4px #0002';
            cancelBtn.onclick = () => document.body.removeChild(popup);
            // Add to popup
            popup.appendChild(nameInput);
            popup.appendChild(groupSelect);
            const btnRow = document.createElement('div');
            btnRow.style.display = 'flex';
            btnRow.style.gap = '8px';
            btnRow.style.justifyContent = 'flex-end';
            btnRow.appendChild(saveBtn);
            btnRow.appendChild(cancelBtn);
            popup.appendChild(btnRow);
            document.body.appendChild(popup);
            nameInput.focus();
          };
          actionsDiv.appendChild(renameOverlayBtn);
          // Hide/Show icon button
          const hideBtn = document.createElement('button');
          hideBtn.innerHTML = line.hidden
            ? '<span title="Show overlay" style="font-size:1.1em;">👁️</span>'
            : '<span title="Hide overlay" style="font-size:1.1em;">🙈</span>';
          hideBtn.style.background = 'none';
          hideBtn.style.border = '1px solid #444';
          hideBtn.style.borderRadius = '5px';
          hideBtn.style.cursor = 'pointer';
          hideBtn.style.margin = '0';
          hideBtn.style.padding = '2px 6px';
          hideBtn.onclick = () => {
            lines[idx].hidden = !lines[idx].hidden;
            chrome.storage.sync.set({ lines }, () => {
              injectContentScript();
              renderLinesList();
            });
          };
          actionsDiv.appendChild(hideBtn);
          // Remove icon button
          const removeBtn = document.createElement('button');
          removeBtn.innerHTML = '<span title="Remove overlay" style="font-size:1.1em;">🗑️</span>';
          removeBtn.style.background = 'none';
          removeBtn.style.border = '1px solid #444';
          removeBtn.style.borderRadius = '5px';
          removeBtn.style.cursor = 'pointer';
          removeBtn.style.margin = '0';
          removeBtn.style.padding = '2px 6px';
          removeBtn.onclick = () => {
            lines.splice(idx, 1);
            chrome.storage.sync.set({ lines }, () => {
              injectContentScript();
              renderLinesList();
            });
          };
          actionsDiv.appendChild(removeBtn);
          // Add actions to far right
          lineDiv.appendChild(actionsDiv);
          groupDiv.appendChild(lineDiv);
        });
      }
      listDiv.appendChild(groupDiv);
    });
  });
}

document.getElementById("toggleAll").addEventListener("click", function() {
  chrome.storage.sync.get(["lines"], (data) => {
    const lines = data.lines || [];
    const allHidden = lines.length > 0 && lines.every(line => line.hidden);
    lines.forEach(line => line.hidden = !allHidden);
    chrome.storage.sync.set({ lines }, () => {
      injectContentScript();
      renderLinesList();
      this.textContent = allHidden ? "🙈 Hide All" : "👁️ Show All";
    });
  });
});

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

  // Set initial toggleAll button state
  const toggleAllBtn = document.getElementById('toggleAll');
  chrome.storage.sync.get(["lines"], (data) => {
    const lines = data.lines || [];
    const allHidden = lines.length > 0 && lines.every(line => line.hidden);
    toggleAllBtn.textContent = allHidden ? "👁️ Show All" : "🙈 Hide All";
  });
});

// Call renderLinesList on popup open
renderLinesList();
