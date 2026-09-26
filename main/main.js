const path = require('path');
const { app, BrowserWindow, ipcMain, shell, powerMonitor, nativeImage, screen } = require('electron');
const log = require('electron-log/main');
const config = require('./config');
const store = require('./store');
const scheduler = require('./scheduler');
const reminder = require('./reminderWindow');
const tray = require('./tray');
const presence = require('./presence');
const updater = require('./updater');
const history = require('./history');
const mood = require('./mood');
const peeks = require('./peeks');
const customSound = require('./customSound');
const { dogIconPng } = require('./icon');

// Log to %APPDATA%\Timesheet Dog\logs\main.log and capture crashes there.
log.initialize();
log.errorHandler.startCatching();
Object.assign(console, log.functions);

const PRELOAD = path.join(__dirname, '..', 'preload.js');
let settingsWin = null;

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => openSettings());
  app.whenReady().then(boot);
}

// No main window: the app lives in the tray until "Quit".
app.on('window-all-closed', () => {});

app.on('child-process-gone', (_e, details) => {
  console.error('[app] child process gone:', details.type, details.reason);
});

function boot() {
  console.log(`[app] Timesheet Dog ${app.getVersion()} starting`);
  app.setAppUserModelId('com.timesheetdog.app');
  config.load();
  console.log(`[app] config from ${config.get().source || 'built-in defaults'}`);
  store.init();
  applyAutoStart(store.getSettings().autoStart);
  registerIpc();

  tray.create({
    testReminder: () => reminder.show('test'),
    openTimesheet,
    openSettings,
    openLogs: () => shell.openPath(path.dirname(log.transports.file.getFile().path)),
    quit: () => app.quit(),
  });

  scheduler.start({
    show: (mode) => {
      const shown = reminder.show(mode, { level: scheduler.moodLevel() });
      if (shown) history.markShown();
      return shown;
    },
    close: reminder.close,
    isBusy: reminder.isOpen,
    canShow: canInterrupt,
    onChange: () => tray.refresh(scheduler.status()),
  });

  peeks.start({ show: () => reminder.show('peek'), canShow: canInterrupt });

  // Catch up after sleep / lock so a missed 6 PM still shows.
  powerMonitor.on('resume', scheduler.tick);
  powerMonitor.on('unlock-screen', scheduler.tick);

  updater.start();

  if (store.isFirstRun() && !process.argv.includes('--hidden')) openSettings();
}

// False while a fullscreen app / presentation is running (if the user wants that respected).
async function canInterrupt() {
  if (!config.get().respectFullscreen) return true;
  return !(await presence.busyReason());
}

function applyAutoStart(enabled) {
  const options = { openAtLogin: enabled, args: ['--hidden'] };
  if (!app.isPackaged) {
    // In dev, launch electron.exe with this project folder.
    options.path = process.execPath;
    options.args = [path.resolve(app.getAppPath()), '--hidden'];
  }
  app.setLoginItemSettings(options);
}

function openTimesheet() {
  const url = store.getSettings().timesheetUrl;
  if (config.isValidUrl(url)) shell.openExternal(url);
}

function openSettings() {
  if (settingsWin && !settingsWin.isDestroyed()) {
    settingsWin.show();
    settingsWin.focus();
    return;
  }
  const { workArea } = screen.getPrimaryDisplay();
  settingsWin = new BrowserWindow({
    width: 480,
    height: Math.min(800, workArea.height - 40),
    useContentSize: true,
    resizable: false,
    maximizable: false,
    title: 'Timesheet Dog – Settings',
    icon: nativeImage.createFromBuffer(dogIconPng(64)),
    backgroundColor: '#FFF6EA',
    show: false,
    webPreferences: { preload: PRELOAD, contextIsolation: true, nodeIntegration: false },
  });
  settingsWin.setMenu(null);
  settingsWin.loadFile(path.join(__dirname, '..', 'renderer', 'settings', 'index.html'));
  settingsWin.once('ready-to-show', () => settingsWin.show());
  settingsWin.on('closed', () => { settingsWin = null; });
}

function registerIpc() {
  const fromReminder = (e) => reminder.owns(e.sender);
  const isTest = () => reminder.mode() === 'test';
  const level = () => reminder.options().level || 0;
  const allowedSnoozes = () => mood.snoozeOptionsFor(level(), config.get().snoozeOptions);

  // ── Reminder window ──
  ipcMain.handle('reminder:init', () => {
    const c = config.get();
    const s = store.getSettings();
    return {
      mode: reminder.mode(),
      solid: reminder.isSolid(),
      level: level(),
      skin: s.dogSkin,
      reminderTime: s.reminderTime,
      soundEnabled: s.soundEnabled,
      customSound: s.soundEnabled ? customSound.dataUrl() : null,
      snoozeOptions: allowedSnoozes(),
      happyDismissSeconds: c.happyDismissSeconds,
      fillFollowupMinutes: isTest() ? 0 : c.fillFollowupMinutes,
      streak: history.streakIfDoneToday(),
      snoozesToday: isTest() ? level() : scheduler.snoozesToday(),
    };
  });

  ipcMain.handle('reminder:answer', (e, answer) => {
    if (fromReminder(e) && answer === 'yes' && !isTest()) scheduler.markDone();
  });

  ipcMain.handle('reminder:fill', (e) => {
    if (!fromReminder(e)) return;
    openTimesheet();
    if (isTest()) return;
    const minutes = config.get().fillFollowupMinutes;
    if (minutes > 0) scheduler.snooze(minutes, { escalate: false });
    else scheduler.markAnswered();
  });

  ipcMain.handle('reminder:snooze', (e, minutes) => {
    if (!fromReminder(e) || !allowedSnoozes().includes(minutes)) return;
    if (isTest()) {
      // A test snooze brings back a grumpier test dog without touching the real schedule.
      const next = Math.min(level() + 1, mood.MAX_LEVEL);
      setTimeout(() => reminder.show('test', { level: next }), minutes * 60_000);
    } else {
      scheduler.snooze(minutes);
    }
  });

  ipcMain.on('reminder:close', (e) => {
    if (fromReminder(e)) reminder.close();
  });

  ipcMain.on('reminder:ignore-mouse', (e, ignore) => {
    if (fromReminder(e)) reminder.setIgnoreMouse(Boolean(ignore));
  });

  // ── Settings window ──
  ipcMain.handle('settings:get', () => ({
    settings: store.getSettings(),
    envSource: config.get().source,
    status: scheduler.status(),
  }));

  ipcMain.handle('settings:save', async (_e, input) => {
    const before = store.getSettings();
    let saved;
    try {
      saved = store.saveSettings(input);
    } catch (err) {
      return { ok: false, error: err.message };
    }
    if (before.autoStart !== saved.autoStart) applyAutoStart(saved.autoStart);
    if (before.reminderTime !== saved.reminderTime ||
        before.workdays.join() !== saved.workdays.join()) {
      scheduler.rescheduleToday();
    }
    await scheduler.tick();
    return { ok: true, settings: saved, status: scheduler.status() };
  });

  ipcMain.handle('settings:defaults', () => config.load().defaults);
  ipcMain.handle('settings:test', (_e, moodLevel = 0) => {
    const safe = Number.isInteger(moodLevel) ? Math.max(0, Math.min(moodLevel, mood.MAX_LEVEL)) : 0;
    return reminder.show('test', { level: safe });
  });
  ipcMain.handle('settings:peek', () => reminder.show('peek'));
  ipcMain.handle('settings:open-url', (_e, url) => {
    if (config.isValidUrl(url)) shell.openExternal(url);
  });

  ipcMain.handle('settings:choose-sound', async () => {
    try {
      return await customSound.choose(settingsWin);
    } catch (err) {
      console.error('[sound] choose failed:', err);
      return { ok: false, error: 'Could not use that file.' };
    }
  });
  ipcMain.handle('settings:clear-sound', () => {
    customSound.clear();
    return store.getSettings();
  });
  ipcMain.handle('settings:custom-sound', () => customSound.dataUrl());

  ipcMain.handle('history:get', () => history.summary());
}
