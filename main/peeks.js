// Surprise peeks: now and then during the workday the dog pokes its head out of
// the screen edge for a few seconds, then disappears. Click-through, no questions.
const store = require('./store');

const MIN_GAP_MINUTES = 50;
const MAX_GAP_MINUTES = 130;
const DAY_START = 9 * 60; // not before 09:00
const QUIET_BEFORE_REMINDER = 15; // …and not in the 15 min before the real reminder

let timer = null;
let hooks = { show: () => false, canShow: async () => true };

function start(h) {
  hooks = { ...hooks, ...h };
  scheduleNext();
}

function stop() {
  clearTimeout(timer);
  timer = null;
}

function scheduleNext() {
  clearTimeout(timer);
  const minutes = MIN_GAP_MINUTES + Math.random() * (MAX_GAP_MINUTES - MIN_GAP_MINUTES);
  timer = setTimeout(tryPeek, minutes * 60_000);
}

function isGoodMoment(now = new Date()) {
  const settings = store.getSettings();
  if (!settings.surprisePeeks || !settings.workdays.includes(now.getDay())) return false;
  const [h, m] = settings.reminderTime.split(':').map(Number);
  const minutes = now.getHours() * 60 + now.getMinutes();
  return minutes >= DAY_START && minutes <= h * 60 + m - QUIET_BEFORE_REMINDER;
}

async function tryPeek() {
  scheduleNext();
  if (!isGoodMoment() || !(await hooks.canShow())) return;
  hooks.show();
}

module.exports = { start, stop, isGoodMoment };
