const { test } = require('node:test');
const assert = require('node:assert/strict');
require('./helpers/mock-electron');
const { currentStreak, bestStreak, prune } = require('../main/history');
const mood = require('../main/mood');

const WEEKDAYS = [1, 2, 3, 4, 5];
// September 2026: Mon 21 … Fri 25, Sat 26, Sun 27, Mon 28, Tue 29
const day = (d, hh = 19) => new Date(2026, 8, d, hh, 0);
const done = (...days) => Object.fromEntries(days.map((d) => [`2026-09-${String(d).padStart(2, '0')}`, { done: true }]));

test('streak counts consecutive workdays and skips weekends', () => {
  const h = done(22, 23, 24, 25, 28);
  assert.equal(currentStreak(h, WEEKDAYS, day(28)), 5);
});

test('today not answered yet does not break the streak', () => {
  const h = done(24, 25);
  assert.equal(currentStreak(h, WEEKDAYS, day(28, 10)), 2);
});

test('a missed workday breaks the streak', () => {
  const h = done(21, 22, 24, 25); // Wed 23 missed
  assert.equal(currentStreak(h, WEEKDAYS, day(25)), 2);
  assert.equal(currentStreak({}, WEEKDAYS, day(25)), 0);
});

test('weekend work counts when weekends are selected', () => {
  const h = done(25, 26, 27, 28);
  assert.equal(currentStreak(h, [0, 1, 2, 3, 4, 5, 6], day(28)), 4);
  assert.equal(currentStreak(h, WEEKDAYS, day(28)), 2);
});

test('best streak finds the longest run', () => {
  const h = { ...done(14, 15, 16, 17, 18, 21), ...done(23, 24) }; // 22nd missed
  assert.equal(bestStreak(h, WEEKDAYS, day(24)), 6);
  assert.equal(bestStreak({}, WEEKDAYS, day(24)), 0);
});

test('prune drops entries older than ~13 months', () => {
  const h = { '2024-01-01': { done: true }, '2026-09-01': { done: true } };
  prune(h, day(28));
  assert.deepEqual(Object.keys(h), ['2026-09-01']);
});

test('mood level follows today\'s snoozes and caps at 3', () => {
  assert.equal(mood.levelFor({}, '2026-09-28'), 0);
  assert.equal(mood.levelFor({ snoozeDay: '2026-09-28', snoozeCount: 2 }, '2026-09-28'), 2);
  assert.equal(mood.levelFor({ snoozeDay: '2026-09-28', snoozeCount: 9 }, '2026-09-28'), 3);
  assert.equal(mood.levelFor({ snoozeDay: '2026-09-25', snoozeCount: 3 }, '2026-09-28'), 0);
});

test('snooze choices shrink as the dog gets grumpier', () => {
  const options = [60, 10, 30];
  assert.deepEqual(mood.snoozeOptionsFor(0, options), [10, 30, 60]);
  assert.deepEqual(mood.snoozeOptionsFor(1, options), [10, 30, 60]);
  assert.deepEqual(mood.snoozeOptionsFor(2, options), [10, 30]);
  assert.deepEqual(mood.snoozeOptionsFor(3, options), [10]);
  assert.deepEqual(mood.snoozeOptionsFor(2, [15]), [15]);
});
