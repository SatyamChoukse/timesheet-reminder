// Escalation: every snooze today makes the dog grumpier and the snooze choices shorter.
//   0 friendly · 1 annoyed · 2 angry (longest snooze gone) · 3 furious (shortest only)
const MAX_LEVEL = 3;

function levelFor(state, today) {
  if (state.snoozeDay !== today) return 0;
  return Math.min(state.snoozeCount || 0, MAX_LEVEL);
}

function snoozeOptionsFor(level, options) {
  const sorted = [...options].sort((a, b) => a - b);
  if (level >= 3) return sorted.slice(0, 1);
  if (level >= 2 && sorted.length > 1) return sorted.slice(0, -1);
  return sorted;
}

module.exports = { MAX_LEVEL, levelFor, snoozeOptionsFor };
