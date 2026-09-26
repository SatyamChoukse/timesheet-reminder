// Stands in for the `electron` module so main-process code runs under plain Node.
const fs = require('fs');
const os = require('os');
const path = require('path');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'timesheet-dog-test-'));
const appDir = path.join(root, 'app');
const userData = path.join(root, 'userData');
fs.mkdirSync(appDir, { recursive: true });
fs.mkdirSync(userData, { recursive: true });

// Don't let a machine-wide config on the dev box leak into tests.
delete process.env.PROGRAMDATA;

const electronPath = require.resolve('electron');
require.cache[electronPath] = {
  id: electronPath,
  filename: electronPath,
  loaded: true,
  exports: {
    app: {
      isPackaged: false,
      getAppPath: () => appDir,
      getPath: () => userData,
    },
  },
};

function writeEnv(text) {
  fs.writeFileSync(path.join(appDir, '.env'), text);
}

function reset() {
  fs.rmSync(path.join(appDir, '.env'), { force: true });
  fs.rmSync(path.join(userData, 'settings.json'), { force: true });
}

module.exports = { appDir, userData, writeEnv, reset };
