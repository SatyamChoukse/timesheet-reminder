# 🐶 Timesheet Dog

A cute dog that pops out from the right side of your screen every day (6 PM by default) and asks whether you've filled in your timesheet.

- **YES**: happy dog, confetti and a chime, then the dog slides away.
- **NO**: angry bark, then **Fill Timesheet** (opens your URL) or **Remind me later** (10 min / 30 min / 1 hr).

### The fun stuff

- 🔥 **Streaks:** the happy screen celebrates "5 days in a row!", with trophies at 5, 10, 20, 30, 50 and 100 days.
  **Settings → History** shows your current and best streak and a calendar: green on time, yellow after snoozing, red missed.
- 😤 **Escalation:** every snooze makes the pet grumpier: annoyed brows → angry red cheeks → furious, with a red face, steam and a nonstop tremble.
  Barks get longer and louder, the 1 hr option disappears at level 2, and only the shortest snooze is left at level 3. YES forgives everything.
- 🐕 **Pets:** Buddy the Beagle, Mochi the Shiba, Biscuit the Corgi, Luna the Husky, or Whiskers the Cat (who meows and hisses).
  You can also pick your own bark sound (MP3 / WAV / OGG / M4A, up to 3 MB) in **Settings → Dog**.
- 🎲 **Variety:** different lines every time, depending on mood and pet. While waiting, the dog looks around, sniffs, scratches, tilts its head, or ducks behind the screen edge and peeks back out.
- 👀 **Surprise peeks** (off by default): a few times a workday (09:00 until 15 min before the reminder), the pet pokes its head out somewhere along the screen edge, says hi, and disappears.
  Peeks can't be clicked and never get in your way.

**Settings → Dog** has preview buttons for every mood and for a peek.

## Run

```bash
npm install
npm start
```

The app lives in the **system tray**. Click the dog icon for:
**Test reminder now**, **Open timesheet**, **Settings…**, **Open logs folder** and **Quit**.
The Settings window opens automatically on first launch. Its status line shows when the dog will next appear.

> If Electron starts as plain Node (`Cannot find module 'electron'`), your shell has `ELECTRON_RUN_AS_NODE` set.
> Clear it with `Remove-Item Env:ELECTRON_RUN_AS_NODE` (PowerShell) or `unset ELECTRON_RUN_AS_NODE` (bash).

### Keyboard

Once the dog window has focus (click it, or set `REMINDER_TAKES_FOCUS=true`):

| Screen | Keys |
|---|---|
| Question | **Y** yes · **N** no · **Esc** remind me later (shortest) |
| After NO | **F** fill timesheet · **1 / 2 / 3** snooze options · **Esc** shortest snooze |

Tab, Enter and Space work as usual. The bubble is announced to screen readers as an alert dialog.

## Develop

```bash
npm test          # unit tests: scheduler + config (Node's built-in test runner)
npm run lint      # ESLint
```

Tests replace Electron with a small mock and fake the clock, so they run in plain Node in under a second.

## Build a Windows installer

```bash
npm run dist      # → dist/Timesheet Dog-Setup-1.0.0.exe
```

- `predist` copies `.env.example` to `.env` if `.env` is missing (`.env` is git-ignored), and generates `build/icon.ico` / `icon.png`.
- On Node older than 22.12 the build needs `--experimental-require-module`, which the `dist` script passes.
  Upgrading to the latest Node 22/24 LTS is recommended anyway.
- Uninstalling removes the "Start with Windows" entry ([installer/installer.nsh](installer/installer.nsh)). Updates don't remove it.

### Code signing (removes the SmartScreen "Unknown publisher" warning)

Buy a code-signing certificate (OV or EV) and set these before `npm run dist`:

```powershell
$env:CSC_LINK = "C:\path\to\certificate.pfx"   # or a base64 string
$env:CSC_KEY_PASSWORD = "••••••"
npm run dist
```

electron-builder signs the app, uninstaller and installer automatically. Set `"author"` in `package.json` to your company name. It shows up as the publisher.

### Auto-update

The app already checks for updates in installed builds ([main/updater.js](main/updater.js)): 1 minute after start, then every 6 hours.
To turn it on, add a `publish` target to `build` in `package.json`, then upload each release's `latest.yml` and `.exe` there:

```jsonc
// GitHub Releases
"publish": [{ "provider": "github", "owner": "your-org", "repo": "timesheet-dog" }]
// …or any static web server / file share
"publish": [{ "provider": "generic", "url": "https://updates.your-company.com/timesheet-dog/" }]
```

Bump `version`, run `npm run dist` and publish. Installed copies download the update in the background, show a Windows notification, and install it the next time the app quits.
Until `publish` is set, update checks just log a warning.

## Configuration (`.env`)

Common defaults live in `.env` (template: [`.env.example`](.env.example)):

| Key | Default | Meaning |
|---|---|---|
| `REMINDER_TIME` | `18:00` | Daily reminder time (HH:MM, 24h) |
| `SNOOZE_OPTIONS` | `10,30,60` | "Remind me later" choices, in minutes |
| `WORKDAYS` | `1,2,3,4,5` | Days to remind (0 = Sun … 6 = Sat) |
| `TIMESHEET_URL` | `https://example.com/timesheet` | Opened by "Fill Timesheet" |
| `SOUND_ENABLED` | `true` | Barks and chimes |
| `AUTO_START` | `true` | Start with Windows |
| `DOG_SKIN` | `beagle` | `beagle`, `shiba`, `corgi`, `husky` or `cat` |
| `SURPRISE_PEEKS` | `false` | Occasional peeks during the workday |
| `HAPPY_DISMISS_SECONDS` | `3` | How long the happy dog stays |
| `FILL_FOLLOWUP_MINUTES` | `30` | Ask again this long after "Fill Timesheet" (0 = never) |
| `CHECK_INTERVAL_SECONDS` | `30` | Scheduler tick |
| `RESPECT_FULLSCREEN` | `true` | Wait while a fullscreen app / presentation is running |
| `REMINDER_TAKES_FOCUS` | `false` | Focus the dog when it appears (keyboard works immediately) |
| `WINDOW_MODE` | `auto` | `transparent`, `solid`, or `auto` (solid over Remote Desktop / without GPU compositing) |
| `DOG_WIDTH` / `DOG_HEIGHT` / `SCREEN_MARGIN` | `390` / `510` / `8` | Dog window size and offset (px) |

**Priority:** values saved in Settings → `.env` → built-in fallbacks. Invalid values are logged and replaced by the fallback.
The **Reset to defaults** button in Settings reloads the `.env`.

`.env` is looked up in this order (first match wins):
1. next to `Timesheet Dog.exe`
2. `%ProgramData%\Timesheet Dog\.env` (machine-wide, for IT)
3. the installed app's `resources\` folder (the installer ships the `.env` it was built with)
4. the project root: `.env`, then `.env.example` (dev)

## Company rollout

- **Silent install** (per user, no admin needed): `"Timesheet Dog-Setup-1.0.0.exe" /S`
- **Shared defaults:** deploy one `.env` to `%ProgramData%\Timesheet Dog\.env` (e.g. with the company timesheet URL and time) via GPO or Intune.
  Users can still change their own settings.
- **Privacy:** Timesheet Dog collects nothing and sends nothing. Its only network activity is opening your timesheet URL in the browser and, if configured, checking the update server.
  Settings and reminder state are in `%APPDATA%\Timesheet Dog\settings.json`, and logs are in `%APPDATA%\Timesheet Dog\logs\`.

## How it works

```
main/
  main.js            app lifecycle, single-instance lock, IPC, settings window, auto-start, logging
  config.js          .env → typed + validated CONFIG
  store.js           settings.json (settings + reminder state)
  scheduler.js       daily trigger, snooze, overnight clean-up, tray status text
  history.js         answer history, current / best streak
  mood.js            escalation level and shrinking snooze options
  peeks.js           surprise-peek timing
  customSound.js     user-chosen bark file
  dates.js           local-date helpers
  presence.js        asks Windows whether a fullscreen app / presentation is running
  reminderWindow.js  transparent (or solid fallback), frameless, always-on-top dog window
  tray.js            tray icon + menu
  updater.js         electron-updater (installed builds only)
  icon.js            draws the dog icon and encodes it as PNG in code
preload.js           safe bridge (window.dogApi)
renderer/
  dog/               bubble, animations, moods, antics, peeks, confetti, keyboard, messages.js
  settings/          settings screen (General · Dog · History)
  shared/dog-art.*   one SVG + CSS skins, used by the reminder and the Settings previews
  shared/sounds.js   bark / meow / chime synthesised with Web Audio (no audio files)
installer/           NSIS uninstall step
scripts/             icon generation, .env preparation
tests/               node:test unit tests
```

- **Only one dog at a time.** A new reminder never opens while one is already on screen.
- **Nothing is missed.** A day counts as answered only when you click YES, snooze or Fill Timesheet. If the app is quit or crashes while the dog is up, it comes back. If the PC was asleep or off at reminder time, the dog shows when you log back in or wake the PC.
- **Overnight.** A dog nobody answered is put away at midnight. Snoozes left over from an earlier day are dropped.
- **Doesn't interrupt presentations.** While Windows reports a fullscreen app, a Direct3D game or presentation mode, the dog waits and checks again every 30s.
  Windows doesn't expose Focus Assist / Do Not Disturb to apps, so that setting isn't detected.
- **Multi-monitor / any resolution.** The dog appears on the monitor with your mouse, anchored to that monitor's work area (above the taskbar).
- **Click-through.** Transparent parts of the dog window let clicks pass through. Only the bubble and the dog's head are clickable (click the head to pet the dog 🐾).
- **Test reminders** (tray or Settings) are marked `TEST`. Nothing you do in them, snooze included, affects the real schedule.

> Note: with `AUTO_START=true`, running `npm start` in dev registers the dev build (`electron.exe` + this folder) to start with Windows.
> Turn it off in Settings if you don't want that.
