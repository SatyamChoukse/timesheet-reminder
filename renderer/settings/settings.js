(async () => {
  const api = window.dogApi;
  const art = window.DogArt;
  const $ = (id) => document.getElementById(id);
  const DAYS = [[1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri'], [6, 'Sat'], [0, 'Sun']];
  let selectedDays = new Set();
  let selectedSkin = 'beagle';
  let customSoundLabel = null;
  let toastTimer = null;

  // ── Tabs ──
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const name = tab.dataset.tab;
      document.querySelectorAll('.tab').forEach((t) => {
        t.classList.toggle('active', t === tab);
        t.setAttribute('aria-selected', String(t === tab));
      });
      document.querySelectorAll('.tab-panel').forEach((p) => {
        p.classList.toggle('active', p.dataset.panel === name);
      });
      document.body.classList.toggle('history-open', name === 'history');
      if (name === 'history') loadHistory();
    });
  });

  // ── General ──
  function renderDays() {
    const box = $('days');
    box.replaceChildren();
    for (const [day, label] of DAYS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `day${selectedDays.has(day) ? ' on' : ''}`;
      b.textContent = label;
      b.addEventListener('click', () => {
        if (selectedDays.has(day)) selectedDays.delete(day);
        else selectedDays.add(day);
        renderDays();
      });
      box.append(b);
    }
  }

  // ── Dog ──
  function drawPet(el, skinId, viewBox) {
    el.dataset.skin = skinId;
    el.innerHTML = art.svg;
    if (viewBox) el.querySelector('svg').setAttribute('viewBox', viewBox);
  }

  function renderSkins() {
    const box = $('skins');
    box.replaceChildren();
    for (const skin of art.SKINS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `skin${skin.id === selectedSkin ? ' on' : ''}`;
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(skin.id === selectedSkin));
      b.setAttribute('aria-label', `${skin.name}, ${skin.breed}`);
      const pic = document.createElement('span');
      drawPet(pic, skin.id, '10 10 200 190');
      const name = document.createElement('b');
      name.textContent = skin.name;
      const breed = document.createElement('small');
      breed.textContent = skin.breed;
      b.append(pic, name, breed);
      b.addEventListener('click', () => {
        selectedSkin = skin.id;
        renderSkins();
        drawPet($('logo'), selectedSkin, '28 12 154 154');
      });
      box.append(b);
    }
  }

  function renderSoundLabel() {
    $('soundLabel').textContent = customSoundLabel ? `Custom: ${customSoundLabel}` : 'Built-in bark';
    $('clearSound').disabled = !customSoundLabel;
  }

  function fill(s) {
    $('reminderTime').value = s.reminderTime;
    $('timesheetUrl').value = s.timesheetUrl;
    $('soundEnabled').checked = s.soundEnabled;
    $('autoStart').checked = s.autoStart;
    $('surprisePeeks').checked = s.surprisePeeks;
    selectedDays = new Set(s.workdays);
    selectedSkin = s.dogSkin;
    customSoundLabel = s.customSound?.label || null;
    renderDays();
    renderSkins();
    renderSoundLabel();
    drawPet($('logo'), selectedSkin, '28 12 154 154');
  }

  function read() {
    return {
      reminderTime: $('reminderTime').value,
      timesheetUrl: $('timesheetUrl').value.trim(),
      soundEnabled: $('soundEnabled').checked,
      autoStart: $('autoStart').checked,
      workdays: [...selectedDays],
      dogSkin: selectedSkin,
      surprisePeeks: $('surprisePeeks').checked,
    };
  }

  function toast(message) {
    const el = $('toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  const setError = (msg) => { $('error').textContent = msg || ''; };

  async function save() {
    const result = await api.saveSettings(read());
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    setError('');
    fill(result.settings);
    $('status').textContent = result.status;
    return true;
  }

  // Previews use the saved settings, so save first (e.g. a newly picked dog).
  const saveThen = (action) => async () => {
    if (await save()) action();
  };

  const { settings, envSource, status } = await api.getSettings();
  fill(settings);
  $('status').textContent = status;
  $('source').textContent = envSource
    ? `Defaults loaded from ${envSource}`
    : 'No .env file found – using built-in defaults';

  $('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (await save()) toast('Saved ✓ Woof!');
  });

  $('reset').addEventListener('click', async () => {
    fill({ ...(await api.getDefaults()), customSound: customSoundLabel ? { label: customSoundLabel } : null });
    setError('');
    toast('Defaults loaded – click Save to keep them');
  });

  $('test').addEventListener('click', saveThen(() => api.testReminder(0)));
  document.querySelectorAll('.mood').forEach((b) => {
    b.addEventListener('click', saveThen(() => api.testReminder(Number(b.dataset.level))));
  });
  $('previewPeek').addEventListener('click', saveThen(() => api.testPeek()));

  $('openUrl').addEventListener('click', () => {
    const url = $('timesheetUrl').value.trim();
    if (/^https?:\/\//i.test(url)) api.openUrl(url);
    else setError('Timesheet URL must start with http:// or https://');
  });

  // ── Bark sound ──
  $('playSound').addEventListener('click', async () => {
    const custom = customSoundLabel ? await api.getCustomSound() : null;
    window.DogSounds.bark({ voice: art.skin(selectedSkin).voice, custom });
  });
  $('chooseSound').addEventListener('click', async () => {
    const result = await api.chooseSound();
    if (result.error) setError(result.error);
    if (!result.ok) return;
    setError('');
    customSoundLabel = result.settings.customSound?.label || null;
    renderSoundLabel();
    toast('New bark saved 🔊');
  });
  $('clearSound').addEventListener('click', async () => {
    await api.clearSound();
    customSoundLabel = null;
    renderSoundLabel();
    toast('Back to the built-in bark');
  });

  // ── History ──
  let history = null;
  let viewMonth = null; // Date on the 1st of the shown month

  const pad = (n) => String(n).padStart(2, '0');
  const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  async function loadHistory() {
    history = await api.getHistory();
    $('statStreak').textContent = history.streak;
    $('statBest').textContent = history.best;
    if (!viewMonth) {
      const now = new Date();
      viewMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    renderCalendar();
  }

  function renderCalendar() {
    const { history: days, workdays, today } = history;
    const grid = $('calendar');
    grid.replaceChildren();
    $('monthLabel').textContent = viewMonth.toLocaleDateString([], { month: 'long', year: 'numeric' });

    for (const [, label] of DAYS) {
      const h = document.createElement('span');
      h.className = 'cal-dow';
      h.textContent = label.slice(0, 2);
      grid.append(h);
    }
    const offset = (viewMonth.getDay() + 6) % 7; // Monday-first
    for (let i = 0; i < offset; i++) grid.append(document.createElement('span'));

    let done = 0;
    let due = 0;
    const month = viewMonth.getMonth();
    for (let d = new Date(viewMonth); d.getMonth() === month; d.setDate(d.getDate() + 1)) {
      const key = keyOf(d);
      const entry = days[key];
      const cell = document.createElement('span');
      cell.textContent = d.getDate();
      const classes = ['cal-day'];
      const isWorkday = workdays.includes(d.getDay());
      if (key > today) classes.push('future');
      if (!isWorkday && !entry?.done) classes.push('off');
      if (entry?.done) classes.push(entry.snoozes > 0 ? 'late' : 'ontime');
      else if (entry?.shown && key < today) classes.push('missed');
      if (key === today) classes.push('today');
      cell.className = classes.join(' ');
      cell.title = entry?.done
        ? `Filled at ${entry.doneAt}${entry.snoozes ? ` after ${entry.snoozes} snooze${entry.snoozes > 1 ? 's' : ''}` : ''}`
        : entry?.shown && key < today ? 'Reminder not answered with YES' : '';
      grid.append(cell);
      if (isWorkday && key <= today) {
        due++;
        if (entry?.done) done++;
      }
    }
    $('statMonth').textContent = `${done}/${due}`;
  }

  $('prevMonth').addEventListener('click', () => {
    viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1);
    renderCalendar();
  });
  $('nextMonth').addEventListener('click', () => {
    viewMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
    renderCalendar();
  });
})();
