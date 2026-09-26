const { test, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const env = require('./helpers/mock-electron');
const config = require('../main/config');
const store = require('../main/store');
const scheduler = require('../main/scheduler');

// September 2026: 25 = Fri, 26 = Sat, 28 = Mon, 29 = Tue
const at = (day, hh, mm, ss = 0) => new Date(2026, 8, day, hh, mm, ss).getTime();
const setNow = (ms) => mock.timers.setTime(ms);

let shown;
let open;
let closed;
let canShow;

const hooks = {
  show: (reason) => {
    if (open) return false;
    open = true;
    shown.push(reason);
    return true;
  },
  close: () => {
    open = false;
    closed++;
  },
  isBusy: () => open,
  canShow: async () => canShow,
  onChange: () => {},
};

beforeEach(() => {
  env.reset();
  env.writeEnv('REMINDER_TIME=18:00\nWORKDAYS=1,2,3,4,5\nSNOOZE_OPTIONS=10,30,60\n');
  config.load();
  store.init();
  shown = [];
  open = false;
  closed = 0;
  canShow = true;
  mock.timers.enable({ apis: ['Date', 'setTimeout', 'setInterval'], now: at(28, 17, 59) });
});

afterEach(() => {
  scheduler.stop();
  mock.timers.reset();
});

test('shows at the reminder time on a workday, not before', async () => {
  await scheduler.start(hooks);
  assert.deepEqual(shown, []);
  setNow(at(28, 18, 0));
  await scheduler.tick();
  assert.deepEqual(shown, ['daily']);
});

test('does not show on a day that is not selected', async () => {
  setNow(at(26, 18, 30)); // Saturday
  await scheduler.start(hooks);
  assert.deepEqual(shown, []);
});

test('shows when the app starts after the reminder time (PC was off / asleep)', async () => {
  setNow(at(28, 21, 15));
  await scheduler.start(hooks);
  assert.deepEqual(shown, ['daily']);
});

test('never shows two dogs at once', async () => {
  setNow(at(28, 18, 0));
  await scheduler.start(hooks);
  await scheduler.tick();
  await scheduler.tick();
  assert.deepEqual(shown, ['daily']);
});

test('YES means done for today; the dog is back the next workday', async () => {
  setNow(at(28, 18, 0));
  await scheduler.start(hooks);
  scheduler.markDone();
  open = false;
  setNow(at(28, 20, 0));
  await scheduler.tick();
  assert.deepEqual(shown, ['daily']);
  setNow(at(29, 18, 0));
  await scheduler.tick();
  assert.deepEqual(shown, ['daily', 'daily']);
});

test('an unanswered dog (app quit or crashed) is shown again', async () => {
  setNow(at(28, 18, 0));
  await scheduler.start(hooks);
  open = false; // window gone without an answer
  await scheduler.tick();
  assert.deepEqual(shown, ['daily', 'daily']);
});

test('snooze brings the dog back after the chosen minutes, not before', async () => {
  setNow(at(28, 18, 0));
  await scheduler.start(hooks);
  scheduler.snooze(10);
  open = false;
  setNow(at(28, 18, 9));
  await scheduler.tick();
  assert.deepEqual(shown, ['daily']);
  setNow(at(28, 18, 10, 1));
  await scheduler.tick();
  assert.deepEqual(shown, ['daily', 'snooze']);
});

test('a snoozed dog left unanswered is shown again', async () => {
  setNow(at(28, 18, 0));
  await scheduler.start(hooks);
  scheduler.snooze(10);
  open = false;
  setNow(at(28, 18, 11));
  await scheduler.tick();
  open = false; // quit while the snoozed dog was up
  await scheduler.tick();
  assert.deepEqual(shown, ['daily', 'snooze', 'snooze']);
});

test('a snooze across midnight still fires', async () => {
  setNow(at(28, 23, 55));
  await scheduler.start(hooks);
  scheduler.snooze(10);
  open = false;
  setNow(at(29, 0, 6));
  await scheduler.tick();
  assert.deepEqual(shown, ['daily', 'snooze']);
});

test('a leftover snooze from an earlier day is dropped', async () => {
  setNow(at(28, 18, 0));
  await scheduler.start(hooks);
  scheduler.snooze(10);
  open = false;
  setNow(at(29, 12, 0)); // app was off overnight
  await scheduler.tick();
  assert.deepEqual(shown, ['daily']);
  assert.equal(store.getState().snoozeUntil, null);
  setNow(at(29, 18, 0));
  await scheduler.tick();
  assert.deepEqual(shown, ['daily', 'daily']);
});

test('a dog left on screen overnight is put away at the new day', async () => {
  setNow(at(28, 18, 0));
  await scheduler.start(hooks);
  setNow(at(29, 0, 1));
  await scheduler.tick();
  assert.equal(closed, 1);
  assert.equal(open, false);
  await scheduler.tick();
  assert.deepEqual(shown, ['daily']); // not re-shown before today's time
});

test('waits while the user is presenting / fullscreen', async () => {
  canShow = false;
  setNow(at(28, 18, 0));
  await scheduler.start(hooks);
  assert.deepEqual(shown, []);
  canShow = true;
  await scheduler.tick();
  assert.deepEqual(shown, ['daily']);
});

test('changing the reminder time re-arms today', async () => {
  setNow(at(28, 18, 0));
  await scheduler.start(hooks);
  scheduler.markAnswered();
  open = false;
  await scheduler.tick();
  assert.deepEqual(shown, ['daily']);
  scheduler.rescheduleToday();
  await scheduler.tick();
  assert.deepEqual(shown, ['daily', 'daily']);
});

test('each snooze raises the mood; "Fill Timesheet" follow-ups do not', async () => {
  setNow(at(28, 18, 0));
  await scheduler.start(hooks);
  assert.equal(scheduler.moodLevel(), 0);
  scheduler.snooze(10);
  scheduler.snooze(10);
  assert.equal(scheduler.moodLevel(), 2);
  scheduler.snooze(30, { escalate: false });
  assert.equal(scheduler.moodLevel(), 2);
  setNow(at(29, 18, 0)); // new day, fresh mood
  assert.equal(scheduler.moodLevel(), 0);
});

test('YES is written to history with the number of snoozes', async () => {
  setNow(at(28, 18, 0));
  await scheduler.start(hooks);
  scheduler.snooze(10);
  setNow(at(28, 18, 42));
  scheduler.markDone();
  assert.deepEqual(store.getState().history['2026-09-28'], {
    shown: true, done: true, snoozes: 1, doneAt: '18:42',
  });
});

test('surprise peeks only happen when enabled, on workdays, before the reminder', () => {
  const peeks = require('../main/peeks');
  const settings = store.getSettings();
  store.saveSettings({ ...settings, surprisePeeks: false });
  assert.equal(peeks.isGoodMoment(new Date(at(28, 11, 0))), false);
  store.saveSettings({ ...settings, surprisePeeks: true });
  assert.equal(peeks.isGoodMoment(new Date(at(28, 11, 0))), true);
  assert.equal(peeks.isGoodMoment(new Date(at(28, 8, 30))), false); // too early
  assert.equal(peeks.isGoodMoment(new Date(at(28, 17, 50))), false); // too close to 18:00
  assert.equal(peeks.isGoodMoment(new Date(at(26, 11, 0))), false); // Saturday
});

test('status text follows the state', async () => {
  await scheduler.start(hooks);
  assert.equal(scheduler.status(), 'Reminder today at 18:00');
  setNow(at(28, 18, 0));
  await scheduler.tick();
  scheduler.snooze(30);
  assert.match(scheduler.status(), /^Snoozed until /);
  scheduler.markDone();
  assert.equal(scheduler.status(), 'Done for today ✓');
});
