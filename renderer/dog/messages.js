// Everything the dog says. Arrays are picked at random; the index into the
// per-level arrays is the mood level (0 friendly … 3 furious).
// Placeholders: {Woof}/{woof}/{WOOF} → the pet's voice, {threat} → a pet-appropriate threat,
// {m} → snooze length.
window.DogMessages = (() => {
  const VOICES = {
    dog: { Woof: 'Woof', woof: 'woof', WOOF: 'WOOF', burst: 'WOOF!', threat: 'chew your charger 🔌' },
    cat: { Woof: 'Meow', woof: 'meow', WOOF: 'HISS', burst: 'HISS!', threat: 'knock your coffee off the desk ☕' },
  };

  const ask = [
    [
      'Have you filled your timesheet?',
      'Timesheet time! Did you fill it in? 📝',
      'Psst… is your timesheet done?',
      'Knock knock! 🐾 Timesheet filled?',
      'Before you log off — timesheet done?',
      'Quick check: timesheet filled? 🦴',
    ],
    [
      "I'm back! Timesheet filled yet? 🤨",
      'Hellooo? Did you do it this time?',
      'Round two! Is it done now?',
    ],
    [
      'Again?! Timesheet. Filled. Yes or no? 😤',
      "I'm getting grumpy… is it done?",
      'Third time asking! Filled it yet?',
    ],
    [
      "THAT'S IT. TIMESHEET. NOW. 😡",
      "I'm not leaving until it's done! 🔥",
      'No more excuses — is it filled?!',
    ],
  ];

  const angry = [
    [
      '{Woof}! Go fill your timesheet! 🐕',
      "{Woof} {woof}! Timesheets don't fill themselves!",
      'Grr… go on, it only takes a minute! ⏱️',
    ],
    [
      '{Woof}! You said later. It IS later! 🙄',
      'Seriously? Go fill it! 🐾',
    ],
    [
      "{WOOF}! I'm running out of patience! 😤",
      'Less snoozing, more timesheeting!',
    ],
    [
      '{WOOF} {WOOF}!! FILL IT NOW! 🤬',
      'Last chance before I {threat}!',
    ],
  ];

  const happy = {
    dog: ['Good job! 🎉', 'Good human! 🦴', "You're pawsome! 🐾", 'Best human ever! 💛', 'Treat time! 🍖'],
    cat: ['Purr-fect! 😺', 'Acceptable, human. 😼', "You're pawsome! 🐾", 'Fine. Good job. 🎉'],
  };

  const snoozeBye = [
    ["Okay… I'll be back in {m} ⏰", 'Fine, {m}. Not a minute more! ⏰'],
    ["Hmph. {m}. I'm counting! ⏳"],
    ['{m}. And then I WILL be back. 😤'],
    ['{m}!! Last snooze, I mean it! 🔥'],
  ];

  const peek = ['👀', 'Just checking on you!', 'Hi! 👋', '*sniff sniff*', 'Working hard? 🐾', 'See you at {time}! 🦴'];

  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const clampLevel = (level) => Math.max(0, Math.min(3, level | 0));

  function fill(text, voice, vars = {}) {
    const v = VOICES[voice] || VOICES.dog;
    return text.replace(/\{(\w+)\}/g, (all, key) => vars[key] ?? v[key] ?? all);
  }

  function streakLine(streak, snoozes) {
    if ([5, 10, 20, 30, 50, 100].includes(streak)) return `🏆 ${streak}-day streak! Legendary!`;
    if (streak >= 2) return `🔥 ${streak} days in a row!`;
    if (snoozes > 0) return 'Better late than never 😉';
    return 'A new streak starts today! 🌱';
  }

  return {
    burst: (voice) => (VOICES[voice] || VOICES.dog).burst,
    ask: (level, voice) => fill(pick(ask[clampLevel(level)]), voice),
    angry: (level, voice) => fill(pick(angry[clampLevel(level)]), voice),
    happy: (voice) => pick(happy[voice] || happy.dog),
    streak: streakLine,
    snoozeBye: (level, voice, m) => fill(pick(snoozeBye[clampLevel(level)]), voice, { m }),
    peek: (voice, time) => fill(pick(peek), voice, { time }),
  };
})();
