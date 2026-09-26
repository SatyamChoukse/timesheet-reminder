const { Tray, Menu, nativeImage } = require('electron');
const { dogIconPng } = require('./icon');

let tray = null;
let actions = {};
let lastStatus = null;

function trayImage() {
  const img = nativeImage.createEmpty();
  for (const scale of [1, 1.25, 1.5, 2]) {
    const size = Math.round(16 * scale);
    img.addRepresentation({
      scaleFactor: scale,
      width: size,
      height: size,
      dataURL: `data:image/png;base64,${dogIconPng(size).toString('base64')}`,
    });
  }
  return img;
}

function create(handlers) {
  actions = handlers;
  tray = new Tray(trayImage());
  tray.setToolTip('Timesheet Dog');
  tray.on('click', () => tray.popUpContextMenu());
  tray.on('double-click', () => actions.openSettings());
  refresh('Starting…');
}

function refresh(status) {
  if (!tray || status === lastStatus) return;
  lastStatus = status;
  tray.setToolTip(`Timesheet Dog – ${status}`);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Timesheet Dog', enabled: false },
    { label: status, enabled: false },
    { type: 'separator' },
    { label: 'Test reminder now', click: actions.testReminder },
    { label: 'Open timesheet', click: actions.openTimesheet },
    { label: 'Settings…', click: actions.openSettings },
    { label: 'Open logs folder', click: actions.openLogs },
    { type: 'separator' },
    { label: 'Quit', click: actions.quit },
  ]));
}

module.exports = { create, refresh };
