// The transparent, frameless, always-on-top window the dog lives in.
const path = require('path');
const { app, BrowserWindow, screen } = require('electron');
const config = require('./config');

let win = null;
let currentMode = null;
let currentOptions = {};
let solid = false;

const isOpen = () => win !== null && !win.isDestroyed();

// Transparent windows can render black or not at all over Remote Desktop
// or when GPU compositing is off; fall back to a solid card there.
function useSolidWindow() {
  const mode = config.get().windowMode;
  if (mode !== 'auto') return mode === 'solid';
  if (/^RDP-/i.test(process.env.SESSIONNAME || '')) return true;
  const gpu = app.getGPUFeatureStatus();
  return String(gpu.gpu_compositing || '').startsWith('disabled');
}

// mode: 'daily' | 'snooze' | 'test' | 'peek' (a short surprise visit, not a reminder)
// options: { level } – the dog's mood (0–3)
function show(mode = 'daily', options = {}) {
  if (isOpen()) return false; // only one dog at a time

  const c = config.get();
  const { width, height, margin } = c.window;
  const peek = mode === 'peek';
  // Appear on the monitor the user is working on, flush with its right edge.
  const { workArea } = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const w = Math.min(width, workArea.width);
  const h = Math.min(height, workArea.height);
  // Reminders sit at the bottom; peeks pop up somewhere along the edge.
  const y = peek
    ? workArea.y + Math.random() * Math.max(0, workArea.height - h)
    : workArea.y + workArea.height - h - margin;

  solid = !peek && useSolidWindow();
  currentMode = mode;
  currentOptions = options;
  console.log(`[reminder] showing (${mode}${options.level ? `, mood ${options.level}` : ''}${solid ? ', solid window' : ''})`);

  win = new BrowserWindow({
    width: w,
    height: h,
    x: Math.round(workArea.x + workArea.width - w),
    y: Math.round(y),
    focusable: !peek,
    transparent: !solid,
    backgroundColor: solid ? '#FFF6EA' : '#00000000',
    frame: false,
    hasShadow: solid,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      autoplayPolicy: 'no-user-gesture-required',
    },
  });

  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true);
  // Let clicks pass through transparent areas; the page re-enables them over the dog/bubble.
  if (peek) win.setIgnoreMouseEvents(true); // a peek never gets in the way
  else if (!solid) win.setIgnoreMouseEvents(true, { forward: true });
  win.loadFile(path.join(__dirname, '..', 'renderer', 'dog', 'index.html'));
  win.once('ready-to-show', () => {
    if (c.reminderTakesFocus && !peek) {
      win.show();
      win.focus();
    } else {
      win.showInactive(); // stay on top without stealing keyboard focus
    }
    win.moveTop();
  });
  win.webContents.on('render-process-gone', (_e, details) => {
    console.error('[reminder] renderer gone:', details.reason);
    close();
  });
  win.on('closed', () => {
    win = null;
    currentMode = null;
    currentOptions = {};
  });
  return true;
}

function close() {
  if (isOpen()) win.close();
}

function setIgnoreMouse(ignore) {
  if (isOpen() && !solid && currentMode !== 'peek') win.setIgnoreMouseEvents(ignore, { forward: true });
}

const owns = (webContents) => isOpen() && win.webContents === webContents;
const mode = () => currentMode;
const options = () => currentOptions;
const isSolid = () => solid;

module.exports = { show, close, isOpen, setIgnoreMouse, owns, mode, options, isSolid };
