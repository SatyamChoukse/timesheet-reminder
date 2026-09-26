// Asks Windows whether now is a bad moment for a pop-up (fullscreen app, presentation).
// Uses shell32!SHQueryUserNotificationState via PowerShell so no native module is needed.
const { execFile } = require('child_process');

const SCRIPT = `
Add-Type -Namespace TimesheetDog -Name Shell -MemberDefinition '[DllImport("shell32.dll")] public static extern int SHQueryUserNotificationState(out int state);'
$s = 0
[void][TimesheetDog.Shell]::SHQueryUserNotificationState([ref]$s)
$s`;
const ENCODED = Buffer.from(SCRIPT, 'utf16le').toString('base64');

// QUERY_USER_NOTIFICATION_STATE values that mean "don't interrupt"
const BUSY_STATES = new Map([
  [2, 'fullscreen app'], // QUNS_BUSY
  [3, 'fullscreen Direct3D app'], // QUNS_RUNNING_D3D_FULL_SCREEN
  [4, 'presentation mode'], // QUNS_PRESENTATION_MODE
]);

function notificationState() {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') return resolve(null);
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', ENCODED],
      { timeout: 10_000, windowsHide: true },
      (err, stdout) => {
        if (err) {
          console.warn('[presence] could not query notification state:', err.message);
          return resolve(null);
        }
        const n = Number.parseInt(String(stdout).trim(), 10);
        resolve(Number.isInteger(n) ? n : null);
      },
    );
  });
}

// Resolves to a reason string when the user shouldn't be interrupted, otherwise null.
async function busyReason() {
  const state = await notificationState();
  return BUSY_STATES.get(state) || null;
}

module.exports = { busyReason, notificationState };
