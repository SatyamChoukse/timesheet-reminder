// Writes build/icon.png (256px) and a multi-size build/icon.ico for electron-builder.
const fs = require('fs');
const path = require('path');
const { dogIconPng } = require('../main/icon');

const dir = path.join(__dirname, '..', 'build');
fs.mkdirSync(dir, { recursive: true });

fs.writeFileSync(path.join(dir, 'icon.png'), dogIconPng(256));

// ICO with PNG-compressed entries (supported since Windows Vista).
const sizes = [16, 24, 32, 48, 64, 128, 256];
const images = sizes.map((s) => dogIconPng(s));
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: icon
header.writeUInt16LE(sizes.length, 4);

let offset = 6 + 16 * sizes.length;
const entries = sizes.map((size, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(size === 256 ? 0 : size, 0); // width (0 = 256)
  e.writeUInt8(size === 256 ? 0 : size, 1); // height
  e.writeUInt8(0, 2); // palette colors
  e.writeUInt8(0, 3); // reserved
  e.writeUInt16LE(1, 4); // color planes
  e.writeUInt16LE(32, 6); // bits per pixel
  e.writeUInt32LE(images[i].length, 8);
  e.writeUInt32LE(offset, 12);
  offset += images[i].length;
  return e;
});

fs.writeFileSync(path.join(dir, 'icon.ico'), Buffer.concat([header, ...entries, ...images]));
console.log(`Wrote ${path.join(dir, 'icon.png')} and icon.ico (${sizes.join(', ')}px)`);
