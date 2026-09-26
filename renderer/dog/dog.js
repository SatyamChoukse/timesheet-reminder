(async () => {
  const api = window.dogApi;
  const say = window.DogMessages;
  const $ = (sel) => document.querySelector(sel);
  const stage = $('#stage');
  const dog = $('#dog');
  const fx = $('#fx');
  const bubble = $('#bubble');

  const cfg = await api.init();
  const skin = window.DogArt.skin(cfg.skin);
  const voice = skin.voice;
  const level = cfg.level || 0;
  let answered = false;
  let leaving = false;

  // ── Draw the pet ──
  dog.dataset.skin = skin.id;
  dog.innerHTML = window.DogArt.svg;
  if (skin.id !== 'beagle') stage.classList.add('tall-ears');
  if (level) dog.classList.add(`mood-${level}`);
  const head = dog.querySelector('.head');

  // ── Helpers ──
  const formatMinutes = (m) => {
    if (m < 60) return `${m} min`;
    if (m % 60 === 0) return `${m / 60} hr`;
    return `${Math.floor(m / 60)}h ${m % 60}m`;
  };
  const rand = (min, max) => min + Math.random() * (max - min);
  const play = (name, opts) => {
    if (!cfg.soundEnabled) return;
    try { window.DogSounds[name](opts); } catch (err) { console.warn('sound failed', err); }
  };
  const bark = () => play('bark', { level, voice, custom: cfg.customSound });

  let panel = 'ask';
  function showPanel(name) {
    panel = name;
    document.querySelectorAll('.panel').forEach((p) => {
      p.classList.toggle('active', p.dataset.panel === name);
    });
    const first = bubble.querySelector('.panel.active button:not(:disabled)');
    if (first) first.focus({ preventScroll: true });
  }

  function setMood(mood) {
    dog.classList.remove('is-happy', 'is-angry');
    void dog.offsetWidth; // restart CSS animations
    if (mood) dog.classList.add(`is-${mood}`);
  }

  function lockButtons() {
    bubble.querySelectorAll('button').forEach((b) => { b.disabled = true; });
  }

  function leave(delay = 0) {
    if (leaving) return;
    leaving = true;
    stopAntics();
    setTimeout(() => {
      stage.classList.remove('enter');
      stage.classList.add('exit');
      setTimeout(() => api.close(), 950);
    }, delay);
  }

  function spawn(className, vars, text = '') {
    const el = document.createElement('span');
    el.className = className;
    el.textContent = text;
    for (const [k, v] of Object.entries(vars)) el.style.setProperty(`--${k}`, v);
    el.addEventListener('animationend', () => el.remove());
    fx.append(el);
  }

  function confetti(amount = 44) {
    const r = bubble.getBoundingClientRect();
    const colors = ['#FFB23F', '#35C27A', '#FF6B6B', '#6C5CE7', '#4FC3F7', '#FFD93D'];
    for (let i = 0; i < amount; i++) {
      spawn('confetti', {
        x: `${rand(r.left + 20, r.right - 20)}px`,
        y: `${r.top + r.height / 2}px`,
        c: colors[i % colors.length],
        dx: `${rand(-140, 140)}px`,
        up: `${rand(-150, -60)}px`,
        fall: `${rand(120, 260)}px`,
        r: `${rand(-540, 540)}deg`,
        d: `${rand(1.1, 1.8)}s`,
      });
    }
  }

  function floaters(chars, count = 5) {
    const box = head.getBoundingClientRect();
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        spawn('float', {
          x: `${rand(box.left + 10, box.right - 40)}px`,
          y: `${box.top + rand(0, 30)}px`,
          dx: `${rand(-30, 30)}px`,
        }, chars[i % chars.length]);
      }, i * 140);
    }
  }

  function woofs() {
    const box = head.getBoundingClientRect();
    const count = 2 + Math.min(level, 2);
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        spawn('woof', {
          x: `${box.left - 80 + (i % 2) * 22 + rand(-6, 6)}px`,
          y: `${box.top + 40 + i * 30}px`,
          r: `${i % 2 ? 10 : -12}deg`,
        }, say.burst(voice));
      }, i * 280);
    }
  }

  // ── Idle antics: the dog fidgets (and ducks behind the edge) while you decide ──
  let anticTimer = null;
  function scheduleAntic() {
    anticTimer = setTimeout(() => {
      if (leaving) return;
      const moves = level >= 3 ? ['stomp', 'look'] : ['look', 'sniff', 'tilt', 'scratch', 'duck'];
      const move = moves[Math.floor(Math.random() * moves.length)];
      dog.classList.add(`antic-${move}`);
      if (move === 'tilt') floaters(['❓'], 1);
      setTimeout(() => dog.classList.remove(`antic-${move}`), 2300);
      scheduleAntic();
    }, rand(8000, 14000));
  }
  function stopAntics() {
    clearTimeout(anticTimer);
  }

  // ── Surprise peek: pop out, say hi, vanish. Nothing to click. ──
  if (cfg.mode === 'peek') {
    $('#peekNote').textContent = say.peek(voice, cfg.reminderTime);
    stage.classList.add('peek');
    setTimeout(() => api.close(), 4800);
    return;
  }

  // ── Click-through: only the bubble and the dog's head catch the mouse ──
  if (cfg.solid) {
    document.body.classList.add('solid');
  } else {
    let ignoring = true;
    window.addEventListener('mousemove', (e) => {
      const over = Boolean(e.target.closest && e.target.closest('.interactive'));
      if (over === ignoring) {
        ignoring = !over;
        api.setIgnoreMouse(ignoring);
      }
    });
    document.addEventListener('mouseleave', () => {
      if (!ignoring) {
        ignoring = true;
        api.setIgnoreMouse(true);
      }
    });
  }

  // ── Build UI ──
  if (cfg.mode === 'test') stage.classList.add('is-test');
  $('#askTitle').textContent = say.ask(level, voice);
  if (level >= 3) $('#laterLabel').textContent = 'One. Last. Snooze.';

  const chips = $('#chips');
  cfg.snoozeOptions.forEach((minutes, i) => {
    const b = document.createElement('button');
    b.className = 'chip';
    b.textContent = formatMinutes(minutes);
    b.setAttribute('aria-label', `Remind me in ${formatMinutes(minutes)}`);
    if (i < 9) b.setAttribute('aria-keyshortcuts', String(i + 1));
    b.addEventListener('click', () => snooze(minutes));
    chips.append(b);
  });
  const n = Math.min(cfg.snoozeOptions.length, 9);
  $('#snoozeKeys').innerHTML = n > 1 ? `<kbd>1</kbd>–<kbd>${n}</kbd>` : '<kbd>1</kbd>';

  // ── Actions ──
  $('#btnYes').addEventListener('click', () => {
    if (answered) return;
    answered = true;
    stopAntics();
    lockButtons();
    $('#happyTitle').textContent = say.happy(voice);
    $('#happySub').textContent = say.streak(cfg.streak, cfg.snoozesToday);
    showPanel('happy');
    dog.classList.remove('mood-1', 'mood-2', 'mood-3'); // all is forgiven
    setMood('happy');
    play('happy');
    confetti(cfg.streak >= 5 ? 70 : 44);
    floaters(cfg.streak >= 2 ? ['🔥', '❤️', '✨'] : ['❤️', '💛', '✨']);
    api.answer('yes');
    leave(cfg.happyDismissSeconds * 1000);
  });

  $('#btnNo').addEventListener('click', () => {
    if (answered) return;
    answered = true;
    $('#angryTitle').textContent = say.angry(level, voice);
    showPanel('angry');
    setMood('angry');
    bark();
    woofs();
    api.answer('no');
  });

  $('#btnFill').addEventListener('click', async () => {
    lockButtons();
    await api.fill();
    $('#byeText').textContent = cfg.fillFollowupMinutes > 0
      ? `Good human! I'll check again in ${formatMinutes(cfg.fillFollowupMinutes)} 👀`
      : 'Go go go! 🏃💨';
    showPanel('bye');
    dog.classList.remove('mood-1', 'mood-2', 'mood-3');
    setMood('happy');
    leave(1800);
  });

  let snoozed = false;
  async function snooze(minutes) {
    if (snoozed) return;
    snoozed = true;
    lockButtons();
    await api.snooze(minutes);
    $('#byeText').textContent = say.snoozeBye(level, voice, formatMinutes(minutes));
    showPanel('bye');
    setMood(level >= 2 ? 'angry' : null);
    leave(1800);
  }

  // ── Keyboard (once the dog window has focus) ──
  window.addEventListener('keydown', (e) => {
    if (leaving || e.repeat) return;
    const key = e.key.toLowerCase();
    const click = (sel) => { e.preventDefault(); $(sel).click(); };
    if (panel === 'ask') {
      if (key === 'y') click('#btnYes');
      else if (key === 'n') click('#btnNo');
      else if (key === 'escape') { e.preventDefault(); snooze(cfg.snoozeOptions[0]); }
    } else if (panel === 'angry') {
      const index = Number.parseInt(key, 10) - 1;
      if (key === 'f') click('#btnFill');
      else if (index >= 0 && index < cfg.snoozeOptions.length) {
        e.preventDefault();
        snooze(cfg.snoozeOptions[index]);
      } else if (key === 'escape') { e.preventDefault(); snooze(cfg.snoozeOptions[0]); }
    }
  });

  // Pet the dog!
  head.addEventListener('click', () => {
    if (dog.classList.contains('is-angry') || leaving) return;
    if (level >= 2) {
      floaters(['😤'], 1); // too grumpy to be petted
      return;
    }
    dog.classList.remove('pet');
    void dog.offsetWidth;
    dog.classList.add('pet');
    play('boop');
    floaters(['❤️'], 2);
  });

  // ── Entrance ──
  requestAnimationFrame(() => stage.classList.add('enter'));
  setTimeout(() => {
    if (level >= 2) bark(); else play('arrive');
    $('#btnYes').focus({ preventScroll: true });
    scheduleAntic();
  }, 1250);
})();
