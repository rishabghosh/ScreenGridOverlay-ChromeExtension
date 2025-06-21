// Draw stored lines on every page
chrome.storage.sync.get(["lines"], (data) => {
  const lines = data.lines || [];
  drawLines(lines);
});

function drawLines(lines) {
  document.querySelectorAll('.screen-grid-overlay-line').forEach(el => el.remove());
  lines.forEach(line => {
    if (line.hidden) return; // skip hidden lines
    const div = document.createElement('div');
    div.className = 'screen-grid-overlay-line';
    div.style.position = 'fixed';
    div.style.backgroundColor = line.color;
    div.style.zIndex = 999999;
    if (line.type === 'vertical') {
      div.style.top = 0;
      div.style.bottom = 0;
      div.style.left = line.position + 'px';
      div.style.width = line.thickness + 'px';
    } else {
      div.style.left = 0;
      div.style.right = 0;
      div.style.top = line.position + 'px';
      div.style.height = line.thickness + 'px';
    }
    document.body.appendChild(div);
  });
}
