// Loads the .env defaults into one typed, validated CONFIG object.
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const dotenv = require('dotenv');

const FALLBACK = {
  REMINDER_TIME: '18:00',
  SNOOZE_OPTIONS: '10,30,60',
  WORKDAYS: '1,2,3,4,5',
  TIMESHEET_URL: 'https://example.com/timesheet',
  SOUND_ENABLED: 'true',
  AUTO_START: 'true',
  DOG_SKIN: 'beagle',
  SURPRISE_PEEKS: 'false',
  HAPPY_DISMISS_SECONDS: '3',
  FILL_FOLLOWUP_MINUTES: '30',
  CHECK_INTERVAL_SECONDS: '30',
  RESPECT_FULLSCREEN: 'true',
  REMINDER_TAKES_FOCUS: 'false',
  WINDOW_MODE: 'auto',
  DOG_WIDTH: '390',
  DOG_HEIGHT: '510',
  SCREEN_MARGIN: '8',
};

const SKINS = ['beagle', 'shiba', 'corgi', 'husky', 'cat'];

let current = null;

// First match wins: next to the .exe (easy to edit after install), a machine-wide
// copy IT can deploy, the packaged resources folder, then the project root in dev.
function candidates() {
  const list = [path.join(path.dirname(process.execPath), '.env')];
  if (process.env.PROGRAMDATA) list.push(path.join(process.env.PROGRAMDATA, 'Timesheet Dog', '.env'));
  if (app.isPackaged) list.push(path.join(process.resourcesPath, '.env'));
  list.push(path.join(app.getAppPath(), '.env'));
  list.push(path.join(app.getAppPath(), '.env.example'));
  return list;
}

function normalizeTime(value) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(value).trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
}

function isValidUrl(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

const toBool = (s) => {
  if (/^(true|1|yes|on)$/i.test(s)) return true;
  if (/^(false|0|no|off)$/i.test(s)) return false;
  return null;
};
const toInt = (s) => (/^\s*-?\d+\s*$/.test(s) ? Number(s) : NaN);
const toIntList = (s) =>
  String(s).split(',').map((x) => x.trim()).filter(Boolean).map(toInt);

const inRange = (min, max) => (n) => Number.isInteger(n) && n >= min && n <= max;
const listOf = (check) => (l) => l.length > 0 && l.every(check);
const isBool = (v) => typeof v === 'boolean';

function load() {
  const source = candidates().find((p) => fs.existsSync(p)) || null;
  const raw = source ? dotenv.parse(fs.readFileSync(source)) : {};
  const env = { ...FALLBACK, ...raw };

  const pick = (key, parse, valid) => {
    let value = parse(env[key]);
    if (value === null || !valid(value)) {
      console.warn(`[config] Invalid ${key}="${env[key]}", using ${FALLBACK[key]}`);
      value = parse(FALLBACK[key]);
    }
    return value;
  };
  const uniqueSorted = (l) => [...new Set(l)].sort((a, b) => a - b);

  current = Object.freeze({
    source,
    // User-editable defaults (Settings overrides these)
    defaults: Object.freeze({
      reminderTime: pick('REMINDER_TIME', normalizeTime, Boolean),
      timesheetUrl: pick('TIMESHEET_URL', (s) => s.trim(), isValidUrl),
      soundEnabled: pick('SOUND_ENABLED', toBool, isBool),
      autoStart: pick('AUTO_START', toBool, isBool),
      workdays: uniqueSorted(pick('WORKDAYS', toIntList, listOf(inRange(0, 6)))),
      dogSkin: pick('DOG_SKIN', (s) => s.trim().toLowerCase(), (v) => SKINS.includes(v)),
      surprisePeeks: pick('SURPRISE_PEEKS', toBool, isBool),
    }),
    snoozeOptions: uniqueSorted(pick('SNOOZE_OPTIONS', toIntList, listOf(inRange(1, 1440)))),
    happyDismissSeconds: pick('HAPPY_DISMISS_SECONDS', toInt, inRange(1, 60)),
    fillFollowupMinutes: pick('FILL_FOLLOWUP_MINUTES', toInt, inRange(0, 1440)),
    checkIntervalSeconds: pick('CHECK_INTERVAL_SECONDS', toInt, inRange(5, 300)),
    respectFullscreen: pick('RESPECT_FULLSCREEN', toBool, isBool),
    reminderTakesFocus: pick('REMINDER_TAKES_FOCUS', toBool, isBool),
    windowMode: pick('WINDOW_MODE', (s) => s.trim().toLowerCase(),
      (v) => ['auto', 'transparent', 'solid'].includes(v)),
    window: Object.freeze({
      width: pick('DOG_WIDTH', toInt, inRange(300, 1000)),
      height: pick('DOG_HEIGHT', toInt, inRange(360, 1000)),
      margin: pick('SCREEN_MARGIN', toInt, inRange(0, 200)),
    }),
  });
  return current;
}

function get() {
  return current || load();
}

module.exports = { load, get, normalizeTime, isValidUrl, SKINS };
