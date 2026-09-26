// The installer ships .env (extraResources). .env is git-ignored, so on a fresh
// clone / CI create it from .env.example instead of failing the build.
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const env = path.join(root, '.env');
const example = path.join(root, '.env.example');

if (fs.existsSync(env)) {
  console.log('.env found – bundling it into the installer');
} else {
  fs.copyFileSync(example, env);
  console.log('.env missing – created it from .env.example');
}
