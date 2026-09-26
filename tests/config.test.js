const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const env = require('./helpers/mock-electron');
const config = require('../main/config');
const store = require('../main/store');

beforeEach(() => env.reset());

test('uses built-in defaults when there is no .env', () => {
  const c = config.load();
  assert.equal(c.source, null);
  assert.equal(c.defaults.reminderTime, '18:00');
  assert.deepEqual(c.defaults.workdays, [1, 2, 3, 4, 5]);
  assert.deepEqual(c.snoozeOptions, [10, 30, 60]);
  assert.equal(c.windowMode, 'auto');
});

test('reads and normalises .env values', () => {
  env.writeEnv([
    'REMINDER_TIME=9:05',
    'WORKDAYS=5, 1,1',
    'SOUND_ENABLED=off',
    'SNOOZE_OPTIONS=60,5',
    'TIMESHEET_URL=https://hr.example.com/ts',
    'WINDOW_MODE=Solid',
  ].join('\n'));
  const c = config.load();
  assert.ok(c.source.endsWith('.env'));
  assert.equal(c.defaults.reminderTime, '09:05');
  assert.deepEqual(c.defaults.workdays, [1, 5]);
  assert.equal(c.defaults.soundEnabled, false);
  assert.deepEqual(c.snoozeOptions, [5, 60]);
  assert.equal(c.defaults.timesheetUrl, 'https://hr.example.com/ts');
  assert.equal(c.windowMode, 'solid');
});

test('invalid .env values fall back to defaults', (t) => {
  t.mock.method(console, 'warn', () => {});
  env.writeEnv([
    'REMINDER_TIME=25:00',
    'WORKDAYS=7',
    'TIMESHEET_URL=ftp://nope',
    'SNOOZE_OPTIONS=0,abc',
    'AUTO_START=maybe',
    'CHECK_INTERVAL_SECONDS=1',
    'WINDOW_MODE=glass',
  ].join('\n'));
  const c = config.load();
  assert.equal(c.defaults.reminderTime, '18:00');
  assert.deepEqual(c.defaults.workdays, [1, 2, 3, 4, 5]);
  assert.equal(c.defaults.timesheetUrl, 'https://example.com/timesheet');
  assert.deepEqual(c.snoozeOptions, [10, 30, 60]);
  assert.equal(c.defaults.autoStart, true);
  assert.equal(c.checkIntervalSeconds, 30);
  assert.equal(c.windowMode, 'auto');
  assert.equal(console.warn.mock.callCount(), 7);
});

test('time and URL validators', () => {
  assert.equal(config.normalizeTime('7:30'), '07:30');
  assert.equal(config.normalizeTime('23:59'), '23:59');
  assert.equal(config.normalizeTime('24:00'), null);
  assert.equal(config.normalizeTime('18:60'), null);
  assert.equal(config.normalizeTime('six'), null);
  assert.equal(config.isValidUrl('https://a.com'), true);
  assert.equal(config.isValidUrl('http://localhost:3000/x'), true);
  assert.equal(config.isValidUrl('javascript:alert(1)'), false);
  assert.equal(config.isValidUrl('not a url'), false);
});

test('saved settings override .env and are validated', () => {
  env.writeEnv('REMINDER_TIME=17:00\n');
  config.load();
  store.init();
  assert.equal(store.getSettings().reminderTime, '17:00');

  const saved = store.saveSettings({
    reminderTime: '9:15',
    timesheetUrl: ' https://hr.example.com ',
    workdays: [6, '1', 1, 9],
    soundEnabled: 1,
    autoStart: 0,
  });
  assert.equal(saved.reminderTime, '09:15');
  assert.equal(saved.timesheetUrl, 'https://hr.example.com');
  assert.deepEqual(saved.workdays, [1, 6]);
  assert.equal(saved.soundEnabled, true);
  assert.equal(saved.autoStart, false);

  store.init(); // survives a restart
  assert.equal(store.getSettings().reminderTime, '09:15');

  assert.throws(() => store.saveSettings({ ...saved, reminderTime: '25:00' }), /HH:MM/);
  assert.throws(() => store.saveSettings({ ...saved, timesheetUrl: 'file:///c:/x' }), /http/);
  assert.throws(() => store.saveSettings({ ...saved, workdays: [] }), /at least one day/);
});
