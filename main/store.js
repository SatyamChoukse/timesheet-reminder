// Persists user settings + scheduler state as JSON in the app's userData folder.
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const config = require('./config');

let file = null;
let data = { settings: null, state: {} };
let firstRun = false;

function init() {
  file = path.join(app.getPath('userData'), 'settings.json');
  firstRun = !fs.existsSync(file);
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    data = { settings: parsed.settings || null, state: parsed.state || {} };
  } catch {
    data = { settings: null, state: {} };
  }
}

function persist() {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

// Saved settings win over .env defaults.
function getSettings() {
  return { ...config.get().defaults, ...(data.settings || {}) };
}

function sanitize(input = {}) {
  const reminderTime = config.normalizeTime(input.reminderTime ?? '');
  if (!reminderTime) throw new Error('Reminder time must be in HH:MM format.');

  const timesheetUrl = String(input.timesheetUrl ?? '').trim();
  if (!config.isValidUrl(timesheetUrl)) {
    throw new Error('Timesheet URL must start with http:// or https://');
  }

  const workdays = Array.isArray(input.workdays)
    ? [...new Set(input.workdays.map(Number))]
        .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
        .sort((a, b) => a - b)
    : [];
  if (!workdays.length) throw new Error('Pick at least one day for the reminder.');

  const dogSkin = String(input.dogSkin ?? getSettings().dogSkin);
  if (!config.SKINS.includes(dogSkin)) throw new Error('Unknown dog.');

  return {
    reminderTime,
    timesheetUrl,
    soundEnabled: Boolean(input.soundEnabled),
    autoStart: Boolean(input.autoStart),
    workdays,
    dogSkin,
    surprisePeeks: Boolean(input.surprisePeeks),
  };
}

function saveSettings(input) {
  // customSound is managed separately (file picker), so keep it across form saves.
  data.settings = { ...sanitize(input), customSound: getSettings().customSound ?? null };
  persist();
  return getSettings();
}

function setCustomSound(fileName) {
  data.settings = { ...getSettings(), customSound: fileName };
  persist();
  return getSettings();
}

function getState() {
  return { lastShownDate: null, lastDoneDate: null, snoozeUntil: null, ...data.state };
}

function setState(patch) {
  data.state = { ...data.state, ...patch };
  persist();
}

const isFirstRun = () => firstRun;

module.exports = {
  init, getSettings, saveSettings, setCustomSound, getState, setState, isFirstRun,
};
