// Draws the dog-face icon procedurally and encodes it as PNG (no image assets needed).
const zlib = require('zlib');

// [cx, cy, rx, ry, color] in 0..1 units, painted in order.
const SHAPES = [
  [0.5, 0.56, 0.36, 0.34, '#F0AE6A'], // head
  [0.16, 0.54, 0.12, 0.25, '#8B5A34'], // left ear
  [0.84, 0.54, 0.12, 0.25, '#8B5A34'], // right ear
  [0.5, 0.71, 0.21, 0.15, '#FFF3E0'], // muzzle
  [0.37, 0.5, 0.06, 0.065, '#2B1B14'], // left eye
  [0.63, 0.5, 0.06, 0.065, '#2B1B14'], // right eye
  [0.5, 0.62, 0.075, 0.055, '#2B1B14'], // nose
].map(([cx, cy, rx, ry, hex]) => ({
  cx, cy, rx, ry,
  rgb: [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)),
}));

function renderRGBA(size) {
  const px = Buffer.alloc(size * size * 4);
  const SS = 4; // supersampling for smooth edges
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, n = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (x + (sx + 0.5) / SS) / size;
          const v = (y + (sy + 0.5) / SS) / size;
          for (let i = SHAPES.length - 1; i >= 0; i--) {
            const s = SHAPES[i];
            const dx = (u - s.cx) / s.rx;
            const dy = (v - s.cy) / s.ry;
            if (dx * dx + dy * dy <= 1) {
              r += s.rgb[0]; g += s.rgb[1]; b += s.rgb[2]; n++;
              break;
            }
          }
        }
      }
      if (n) {
        const o = (y * size + x) * 4;
        px[o] = Math.round(r / n);
        px[o + 1] = Math.round(g / n);
        px[o + 2] = Math.round(b / n);
        px[o + 3] = Math.round((255 * n) / (SS * SS));
      }
    }
  }
  return px;
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, body) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(body.length);
  const typed = Buffer.concat([Buffer.from(type, 'ascii'), body]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));
  return Buffer.concat([len, typed, crc]);
}

function dogIconPng(size) {
  const rgba = renderRGBA(size);
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0; // filter: none
    rgba.copy(raw, y * stride + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

module.exports = { dogIconPng };
