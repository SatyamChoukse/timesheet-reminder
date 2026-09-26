// A user-chosen bark sound, copied into userData so the original file can move.
const fs = require('fs');
const path = require('path');
const { app, dialog } = require('electron');
const store = require('./store');

const TYPES = { '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4' };
const MAX_BYTES = 3 * 1024 * 1024;

const dir = () => path.join(app.getPath('userData'), 'sounds');

function clear() {
  fs.rmSync(dir(), { recursive: true, force: true });
  store.setCustomSound(null);
}

async function choose(parentWindow) {
  const result = await dialog.showOpenDialog(parentWindow, {
    title: 'Choose a bark sound',
    filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'm4a'] }],
    properties: ['openFile'],
  });
  const source = result.filePaths[0];
  if (result.canceled || !source) return { ok: false };

  const ext = path.extname(source).toLowerCase();
  if (!TYPES[ext]) return { ok: false, error: 'Pick an MP3, WAV, OGG or M4A file.' };
  if (fs.statSync(source).size > MAX_BYTES) return { ok: false, error: 'That sound is over 3 MB.' };

  clear();
  fs.mkdirSync(dir(), { recursive: true });
  const file = `custom-bark${ext}`;
  fs.copyFileSync(source, path.join(dir(), file));
  const settings = store.setCustomSound({ file, label: path.basename(source) });
  console.log(`[sound] custom bark set to ${path.basename(source)}`);
  return { ok: true, settings };
}

// The sound as a data: URL for the renderer (null when none / missing).
function dataUrl() {
  const custom = store.getSettings().customSound;
  if (!custom?.file) return null;
  try {
    const bytes = fs.readFileSync(path.join(dir(), custom.file));
    return `data:${TYPES[path.extname(custom.file)]};base64,${bytes.toString('base64')}`;
  } catch (err) {
    console.warn('[sound] custom bark unreadable:', err.message);
    return null;
  }
}

module.exports = { choose, clear, dataUrl };
