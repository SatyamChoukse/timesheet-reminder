// Auto-update via electron-updater. Only active in an installed build whose
// package.json "build.publish" is configured (see README → Auto-update).
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const log = require('electron-log/main');

const CHECK_EVERY_MS = 6 * 60 * 60 * 1000;

function start() {
  if (!app.isPackaged) return;
  // electron-builder only writes app-update.yml when "build.publish" is configured.
  if (!fs.existsSync(path.join(process.resourcesPath, 'app-update.yml'))) {
    log.info('[updater] auto-update not configured (no publish target) – skipping');
    return;
  }
  const { autoUpdater } = require('electron-updater');
  autoUpdater.logger = log;
  autoUpdater.on('error', (err) => log.warn('[updater]', err.message));

  const check = () => autoUpdater.checkForUpdatesAndNotify()
    .catch((err) => log.warn('[updater] check failed:', err.message));
  setTimeout(check, 60_000);
  setInterval(check, CHECK_EVERY_MS);
}

module.exports = { start };
