// Decides when the dog should appear: daily reminder + snoozes.
//
// State (persisted in store):
//   lastAnsweredDate – day the user answered (YES, snooze or Fill). Until then the
//                      reminder is retried, e.g. if the app was quit while the dog was up.
//   lastDoneDate     – day the user said YES; nothing else shows that day.
//   snoozeUntil      – epoch ms of a pending "remind me later".
//   snoozeDay/Count  – how many times the user snoozed today (drives escalation).
const store = require('./store');
const config = require('./config');
const history = require('./history');
const mood = require('./mood');
const { dateKey } = require('./dates');

let interval = null;
let snoozeTimer = null;
let checking = false;
let openedOn = null; // day the dog currently on screen was opened
let hooks = {
  show: () => false,
  close: () => {},
  isBusy: () => false,
  canShow: async () => true,
  onChange: () => {},
};

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const minutesOfDay = (d) => d.getHours() * 60 + d.getMinutes();
const clock = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

function start(h) {
  hooks = { ...hooks, ...h };
  stop();
  interval = setInterval(tick, config.get().checkIntervalSeconds * 1000);
  const { snoozeUntil } = store.getState();
  if (snoozeUntil) armSnoozeTimer(snoozeUntil);
  return tick();
}

function stop() {
  clearInterval(interval);
  clearTimeout(snoozeTimer);
  interval = null;
  snoozeTimer = null;
}

async function tick() {
  if (checking) return;
  checking = true;
  try {
    await check();
  } catch (err) {
    console.error('[scheduler] check failed:', err);
  } finally {
    checking = false;
    hooks.onChange();
  }
}

async function check() {
  const now = new Date();
  const today = dateKey(now);

  if (hooks.isBusy()) {
    // A dog left unanswered overnight: put it away so the new day starts fresh.
    if (openedOn && openedOn !== today) {
      openedOn = null;
      store.setState({ snoozeUntil: null });
      hooks.close();
    }
    return; // never stack reminders
  }
  openedOn = null;

  const reason = dueReason(now);
  if (!reason) return;

  // Presenting / fullscreen app: wait and try again on the next tick.
  if (!(await hooks.canShow())) {
    console.log('[scheduler] reminder due but user is busy (fullscreen/presenting) – deferring');
    return;
  }
  if (hooks.isBusy()) return;
  if (hooks.show(reason)) openedOn = today;
}

// 'snooze' | 'daily' | null
function dueReason(now) {
  const today = dateKey(now);
  const state = store.getState();

  if (state.lastDoneDate === today) {
    if (state.snoozeUntil) store.setState({ snoozeUntil: null });
    return null;
  }

  if (state.snoozeUntil) {
    if (dateKey(new Date(state.snoozeUntil)) === today) {
      // Kept until answered, so a crash while the dog is up re-shows it.
      return now.getTime() >= state.snoozeUntil ? 'snooze' : null;
    }
    if (state.snoozeUntil < now.getTime()) {
      store.setState({ snoozeUntil: null }); // leftover from an earlier day
    } else {
      return null; // snoozed past midnight
    }
  }

  if (state.lastAnsweredDate === today) return null;

  const settings = store.getSettings();
  if (!settings.workdays.includes(now.getDay())) return null;
  if (minutesOfDay(now) < toMinutes(settings.reminderTime)) return null;
  return 'daily';
}

function armSnoozeTimer(until) {
  clearTimeout(snoozeTimer);
  // setTimeout caps at ~24.8 days; snoozes are far shorter.
  snoozeTimer = setTimeout(tick, Math.max(0, until - Date.now()) + 500);
}

const snoozesToday = (state = store.getState()) =>
  (state.snoozeDay === dateKey() ? state.snoozeCount || 0 : 0);

// `escalate: false` for friendly follow-ups (after "Fill Timesheet").
function snooze(minutes, { escalate = true } = {}) {
  const until = Date.now() + minutes * 60_000;
  const patch = { snoozeUntil: until, lastAnsweredDate: dateKey() };
  if (escalate) Object.assign(patch, { snoozeDay: dateKey(), snoozeCount: snoozesToday() + 1 });
  store.setState(patch);
  armSnoozeTimer(until);
  hooks.onChange();
}

const moodLevel = () => mood.levelFor(store.getState(), dateKey());

// Answered without a follow-up (e.g. "Fill Timesheet" with no follow-up configured).
function markAnswered() {
  clearTimeout(snoozeTimer);
  store.setState({ lastAnsweredDate: dateKey(), snoozeUntil: null });
  hooks.onChange();
}

function markDone() {
  clearTimeout(snoozeTimer);
  const today = dateKey();
  history.markDone(snoozesToday());
  store.setState({ lastDoneDate: today, lastAnsweredDate: today, snoozeUntil: null });
  hooks.onChange();
}

// After the reminder time/days change, allow today's reminder to fire again.
function rescheduleToday() {
  const state = store.getState();
  const today = dateKey();
  if (state.lastAnsweredDate === today && state.lastDoneDate !== today) {
    store.setState({ lastAnsweredDate: null });
  }
}

function status() {
  const now = new Date();
  const today = dateKey(now);
  const state = store.getState();
  const settings = store.getSettings();

  if (state.lastDoneDate === today) return 'Done for today ✓';
  if (state.snoozeUntil && state.snoozeUntil > now.getTime()) {
    return `Snoozed until ${clock(new Date(state.snoozeUntil))}`;
  }
  const isWorkday = settings.workdays.includes(now.getDay());
  if (isWorkday && state.lastAnsweredDate !== today &&
      minutesOfDay(now) < toMinutes(settings.reminderTime)) {
    return `Reminder today at ${settings.reminderTime}`;
  }
  if (state.lastAnsweredDate === today || (isWorkday && hooks.isBusy())) {
    return 'Reminded today – timesheet pending';
  }
  for (let i = 1; i <= 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    if (settings.workdays.includes(d.getDay())) {
      return `Next reminder: ${d.toLocaleDateString([], { weekday: 'short' })} ${settings.reminderTime}`;
    }
  }
  return 'No reminder scheduled';
}

module.exports = {
  start, stop, tick, snooze, markAnswered, markDone, rescheduleToday, status, moodLevel, snoozesToday,
};
