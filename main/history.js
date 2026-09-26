// Answer history for streaks and the calendar. Stored in state.history as
//   { 'YYYY-MM-DD': { shown: true, done: true, snoozes: 2, doneAt: '18:42' } }
const store = require('./store');
const { dateKey, parseKey, addDays, clockTime } = require('./dates');

const KEEP_DAYS = 400;

// Consecutive selected workdays with a YES, counting back from today.
// Today only breaks the streak once it's over, so "not yet" doesn't reset it.
function currentStreak(history, workdays, now = new Date()) {
  const today = dateKey(now);
  let count = 0;
  for (let i = 0; i < KEEP_DAYS; i++) {
    const day = addDays(now, -i);
    if (!workdays.includes(day.getDay())) continue;
    const key = dateKey(day);
    if (history[key]?.done) count++;
    else if (key !== today) break;
  }
  return count;
}

function bestStreak(history, workdays, now = new Date()) {
  const keys = Object.keys(history).sort();
  if (!keys.length) return 0;
  const today = dateKey(now);
  let best = 0;
  let run = 0;
  for (let day = parseKey(keys[0]); dateKey(day) <= today; day = addDays(day, 1)) {
    if (!workdays.includes(day.getDay())) continue;
    const key = dateKey(day);
    if (history[key]?.done) best = Math.max(best, ++run);
    else if (key !== today) run = 0;
  }
  return best;
}

function prune(history, now = new Date()) {
  const oldest = dateKey(addDays(now, -KEEP_DAYS));
  for (const key of Object.keys(history)) if (key < oldest) delete history[key];
  return history;
}

// ── Persisted helpers ──
function getHistory() {
  return store.getState().history || {};
}

function record(patch, now = new Date()) {
  const history = { ...getHistory() };
  const key = dateKey(now);
  history[key] = { ...history[key], ...patch };
  store.setState({ history: prune(history, now) });
}

const markShown = (now = new Date()) => record({ shown: true }, now);

const markDone = (snoozes, now = new Date()) =>
  record({ shown: true, done: true, snoozes, doneAt: clockTime(now) }, now);

function summary(now = new Date()) {
  const history = getHistory();
  const { workdays } = store.getSettings();
  return {
    history,
    workdays,
    today: dateKey(now),
    streak: currentStreak(history, workdays, now),
    best: bestStreak(history, workdays, now),
  };
}

// Streak the user will have if they say YES today.
function streakIfDoneToday(now = new Date()) {
  const history = { ...getHistory() };
  const key = dateKey(now);
  history[key] = { ...history[key], done: true };
  return currentStreak(history, store.getSettings().workdays, now);
}

module.exports = {
  currentStreak, bestStreak, prune, record, markShown, markDone, summary, streakIfDoneToday,
};
